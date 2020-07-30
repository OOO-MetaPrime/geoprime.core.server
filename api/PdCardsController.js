'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const path = require('path')
const axios = require('axios')
const moment = require('moment')
const mime = require('mime')
const multer = require('multer')
const upload = multer()
const xlsx = require('xlsx')
const _uniq = require('lodash/uniq')
const _difference = require('lodash/difference')
const _get = require('lodash/get')
const { getDb } = require('../database')
const database = getDb()
const { getQueryOptions } = require('../utils/queryHelper')
const AccessRestrictions = require('../database/models/public/enums/AccessRestrictions')
const { mapLayersGroupsToLayers } = require('../utils/layersHelper')
const { getFileInfoContent } = require('../utils/fileHelper')
const { authorizeAction } = require('../auth')
const resources = require('../auth/resources')
const actions = require('../auth/actions')
const systemLog = require('../utils/systemLog')
const spatialDataPdStatusTypes = require('../database/models/public/enums/SpatialDataPdStatusTypes')
const Op = database.Sequelize.Op

const systemLogTarget = 'Карточка каталога георесурсов'
const publicRestriction = 20

class PdCardsController {
  get router () {
    const router = Router()

    router.get('/thematic-sections', wrap(this.getThematicSections))
    router.get('/coordinate-systems', wrap(this.getCoordinateSystems))
    router.post('/check-pd-card-layers', authorizeAction(resources.spatialDataPd, actions.delete), wrap(this.checkPdCardLayers))
    router.get('/scales', wrap(this.getScales))
    router.post('/filter', wrap(this.filterCards))
    router.get('/:id', authorizeAction(resources.spatialDataPd, actions.read), wrap(this.getById))
    router.get('/:id/files/:fileId', authorizeAction(resources.spatialDataPd, actions.read), wrap(this.getFile))
    router.post('/', authorizeAction(resources.spatialDataPd, actions.create), upload.array('file'), wrap(this.create))
    router.put('/send-to-archive/:id', authorizeAction(resources.spatialDataPd, actions.update), wrap(this.sendDocumentToArchive))
    router.put('/:id', authorizeAction(resources.spatialDataPd, actions.update), upload.array('file'), wrap(this.update))
    router.delete('/:id', authorizeAction(resources.spatialDataPd, actions.delete), wrap(this.destroy))
    router.post('/check-layers', authorizeAction(resources.spatialDataPd, actions.delete), wrap(this.checkLayers))
    router.post('/export', wrap(this.exportToExcel))
    router.post('/gettransforedgeometry', wrap(this.getTransformedCoordinates))
    return router
  }

  async sendDocumentToArchive (req, res) {
    const { id } = req.params

    await database.sequelize.transaction(async transaction => {
      await database.spatialDataPd.update({
        status: spatialDataPdStatusTypes.archive
      }, {
        where: {
          id
        },
        transaction
      })

      await database.settingsProfile.update({
        oktmoMapId: null,
        oktmoLayerId: null,
        oktmoGeneralField: null,
        defaultMapId: null
      }, {
        where: {
          oktmoMapId: id
        },
        transaction
      })

      await database.baseSpatialData.destroy({
        where: {
          spatialDataPdId: id
        },
        transaction
      })

      await database.entitySpatialSetting.destroy({
        where: {
          spatialDataPdId: id
        },
        transaction
      })

      const layersGroupList = await database.layersGroup.findAll({
        where: {
          spatialDataId: id
        },
        transaction
      })

      const layersGroupIdsList = layersGroupList
        .map(x => x.get({ plain: true }))
        .map(x => x.id)

      const layersList = await database.layer.findAll({
        where: {
          layersGroupId: {
            [Op.in]: layersGroupIdsList
          }
        },
        transaction
      })

      const layersIdsList = layersList
        .map(x => x.get({ plain: true }))
        .map(x => x.id)

      await database.settingsProfileModuleLayer.destroy({
        where: {
          layerId: {
            [Op.in]: layersIdsList
          }
        },
        transaction
      })

      await database.spatialDataRegistry.update({
        spatialDataPdId: null,
        layerId: null,
        spatialDataField: null,
        mapIdField: null
      }, {
        where: {
          spatialDataPdId: id
        },
        transaction
      })

      let portalThematicSet = await database.portalThematicSet.findAll()

      portalThematicSet = portalThematicSet.map(x => x.get({ plain: true }))

      for (const item of portalThematicSet) {
        let { layers } = item
        let { layersIds, selectedLayer } = item.basemaps

        layersIds = layersIds.filter(x => !layersIdsList.includes(x))
        selectedLayer = layersIdsList.includes(selectedLayer) ? null : selectedLayer

        layers = layers.filter(x => !layersIdsList.includes(x.id))

        await database.portalThematicSet.update({
          basemaps: { layersIds, selectedLayer },
          layers
        }, {
          where: {
            id: item.id
          },
          transaction
        })
      }
    })

    res.end()
  }

  async checkPdCardLayers (req, res) {
    const layersIds = req.body.map(x => x.id)

    const layersSettings = await database.layerSettings.findAll({
      include: [database.layer]
    })

    const settingsFiltered = layersSettings.filter(x => x.settings && x.settings.connectedLayers && x.settings.connectedLayers.length)
    let result = []
    for (const layerId of layersIds) {
      const uselayers = settingsFiltered.filter(x => x.settings.connectedLayers.find(xx => xx.layerId === layerId))
      if (uselayers) {
        for (const item of uselayers) {
          result.push(item)
        }
      }
    }

    res.json({
      isUse: !!result.length,
      layersName: _uniq(result.map(x => x.layer.name))
    })
  }

  async getFile (req, res) {
    const fileId = req.params.fileId
    const isDownload = !!req.query.download

    const fileInfoContent = await getFileInfoContent(req, fileId)
    if (fileInfoContent.error) {
      res.status(400).end(fileInfoContent.error)
      return
    }
    const { content, fileInfo } = fileInfoContent

    if (!fileInfoContent.fileInfo) {
      res.status(404).end()
    }

    const fileName = encodeURIComponent(`${fileInfo.name}${fileInfo.file_type}`)
    const objectParams = {
      'Content-Type': mime.lookup(fileName),
      'Content-Length': content.byteLength
    }
    const contentDispostion = isDownload ? 'attachment' : 'inline'
    objectParams['Content-Disposition'] = `${contentDispostion};filename="${fileName}"`
    res.writeHead(200, objectParams)

    res.end(content)
  }

  async checkLayers (req, res) {
    const layers = req.body.layers
    const isRemoveCard = req.body.isRemoveCard

    for (const layer of layers) {
      const errors = []
      // Поиск слоя по Реестрам ПД
      const spatialDataRegistry = await database.spatialDataRegistry.findAll({
        where: {
          layerId: layer.id
        }
      })
      if (spatialDataRegistry.length) {
        errors.push({
          layerId: layer.id,
          message: 'Реестр ПД'
        })
      }
      // Поиск слоя по Системным объектам
      const entitySpatialSetting = await database.entitySpatialSetting.findAll({
        where: {
          layerId: layer.id
        }
      })
      if (entitySpatialSetting.length) {
        errors.push({
          layerId: layer.id,
          message: 'Системный объект'
        })
      }
      // Поиск слоя по Аналитическим отчетам
      const analyticSettings = await database.analyticSettings.findAll()
      const maps = analyticSettings.map(x => x.map)
      for (const map of maps) {
        for (const key in map) {
          if (map[key] === layer.id) {
            errors.push({
              layerId: layer.id,
              message: 'Аналитический отчет'
            })
          }
          if (key === 'baseMaps') {
            let result = map[key].filter(x => x === layer.id)
            if (result.length) {
              errors.push({
                layerId: layer.id,
                message: 'Аналитический отчет'
              })
            }
          }
        }
      }
      // Поиск слоя по инструментам профиля настроек
      // --тематический поиск
      const thematicSearchLayer = await database.thematicSearchLayer.findAll({
        where: {
          layerId: layer.id
        }
      })
      if (thematicSearchLayer.length) {
        errors.push({
          layerId: layer.id,
          message: 'Инструменты профиля'
        })
      }
      // --топооснова
      const baseSpatialData = await database.baseSpatialData.findAll({
        include: [
          {
            model: database.spatialDataPd,
            required: true,
            include: [{
              model: database.layersGroup,
              required: true,
              include: [{
                model: database.layer,
                required: true,
                where: {
                  id: layer.id
                }
              }]
            }]
          }
        ]
      })
      if (baseSpatialData.length) {
        errors.push({
          layerId: layer.id,
          message: 'Инструменты профиля'
        })
      }
      // --отображение по умолчанию в модулях
      const moduleSpatialData = await database.moduleSpatialData.findAll({
        include: [
          {
            model: database.spatialDataPd,
            required: true,
            include: [{
              model: database.layersGroup,
              required: true,
              include: [{
                model: database.layer,
                required: true,
                where: {
                  id: layer.id
                }
              }]
            }]
          }
        ]
      })
      if (moduleSpatialData.length) {
        errors.push({
          layerId: layer.id,
          message: 'Инструменты профиля'
        })
      }
      if (!errors.length) {
        continue
      }
      if (errors.length === 1) {
        if (isRemoveCard) {
          if (errors[0].message === 'Реестр ПД') {
            res.json({
              message: 'Слои карточки связаны с реестром пространственных данных. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Системный объект') {
            res.json({
              message: 'Слои карточки связаны с системным объектом. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Аналитический отчет') {
            res.json({
              message: 'Слои карточки используются при построении аналитических отчетов. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Инструменты профиля') {
            res.json({
              message: 'Слои карточки используются в профилях настроек территориальных служб. Подтвердите удаление'
            })
            return
          }
        }
        if (!isRemoveCard) {
          if (errors[0].message === 'Реестр ПД') {
            res.json({
              message: 'Слой связан с реестром пространственных данных. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Системный объект') {
            res.json({
              message: 'Слой связан с системным объектом. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Аналитический отчет') {
            res.json({
              message: 'Слой карточки используются при построении аналитических отчетов. Подтвердите удаление'
            })
            return
          }
          if (errors[0].message === 'Инструменты профиля') {
            res.json({
              message: 'Слой используется в профилях настроек территориальных служб. Подтвердите удаление'
            })
            return
          }
        }
      }
      if (errors.length > 1) {
        if (isRemoveCard) {
          res.json({
            message: 'Слои карточки связаны с объектами или/и настройками Системы. Подтвердите удаление'
          })
          return
        }
        if (!isRemoveCard) {
          res.json({
            message: 'Слой связан с объектами или/и настройками Системы. Подтвердите удаление'
          })
          return
        }
      }
    }
    res.json({
      message: 'ok'
    })
  }

  async destroy (req, res) {
    const id = req.params.id
    await database.sequelize.transaction(async transaction => {
      const spatialDataPd = await database.spatialDataPd.findById(id, {
        include: [
          {
            model: database.layersGroup,
            include: [database.layer]
          }
        ]
      })
      const pdFiles = await database.spatialDataPd.findById(id, {
        include: [
          {
            model: database.FileInfo,
            include: [
              {
                model: database.File,
                attributes: [
                  'id',
                  [database.sequelize.fn('length', database.sequelize.col('content')), 'fileSize']
                ]
              }
            ]
          }
        ]
      })
      const result = spatialDataPd.get({
        plain: true
      })
      const layers = mapLayersGroupsToLayers(result.layersGroups)
      const layersGroupIds = layers.map(x => x.layersGroupId)
      const filesIds = pdFiles.FileInfos.map(x => x.file_id)
      await database.spatialDataGd.destroy({
        where: {
          id: id
        },
        transaction
      })
      await database.FileInfo.destroy({
        where: {
          file_id: {
            $in: filesIds
          }
        },
        transaction
      })
      await database.File.destroy({
        where: {
          id: {
            $in: filesIds
          }
        },
        transaction
      })
      await database.layersGroup.destroy({
        where: {
          id: {
            $in: layersGroupIds
          }
        },
        transaction
      })
      await database.layer.destroy({
        where: {
          layersGroupId: {
            $in: layersGroupIds
          }
        },
        transaction
      })
      await database.layer.update(
        {
          layersGroupId: null
        },
        {
          where: {
            layersGroupId: {
              $in: layersGroupIds
            }
          },
          paranoid: false,
          transaction
        }
      )
      await systemLog.logDelete(req.user, systemLogTarget, `${id} ${result.name}`, transaction)
    })
    res.end()
  }

  async update (req, res) {
    const data = JSON.parse(req.body.data)
    const id = req.params.id
    const rawFiles = req.files
    const pdFiles = await database.spatialDataPd.findById(id, {
      include: [
        {
          model: database.FileInfo,
          include: [
            {
              model: database.File,
              attributes: [
                'id',
                [database.sequelize.fn('length', database.sequelize.col('content')), 'fileSize']
              ]
            }
          ]
        }
      ]
    })

    const oldFilesIds = pdFiles.FileInfos.map(x => x.file_id)
    const updatedFilesIds = data.files.map(x => x.file_id)
    const deletedFilesIds = _difference(oldFilesIds, updatedFilesIds)
    const deletedFileInfoIds = pdFiles.FileInfos.filter(x => deletedFilesIds.includes(x.file_id)).map(x => x.id)

    const spatialDataPd = await database.spatialDataPd.findById(id, {
      include: [
        database.spatialDataGd,
        {
          model: database.layersGroup,
          include: [database.layer]
        }
      ]
    })

    const result = spatialDataPd.get({
      plain: true
    })

    const layers = mapLayersGroupsToLayers(result.layersGroups)
    const oldLayersIds = layers.map(x => x.id)
    const updatedLayers = data.layers.filter(x => x.id)
    const updatedLayersIds = updatedLayers.map(x => x.id)
    const deletedLayersIds = _difference(oldLayersIds, updatedLayersIds)
    const newLayers = data.layers.filter(x => !x.id)

    const systemParam = await database.systemParameters.findOne({
      attributes: ['maxFileSize', 'filesStore']
    })

    const maxFileSize = systemParam.maxFileSize * (1024 * 1024)
    const filesStore = systemParam.filesStore
    const bigFiles = rawFiles.filter(x => {
      return x.size > maxFileSize
    })
    const smallFiles = rawFiles.filter(x => {
      return x.size <= maxFileSize
    })

    await database.sequelize.transaction(async transaction => {
      await database.spatialDataGd.update({
        name: data.name,
        createdBy: req.user.fullName
      }, { where: { id: id }, transaction })

      await database.spatialDataPd.update({
        scaleId: data.scaleId,
        description: data.description,
        ownerId: data.ownerId,
        thematicSectionId: data.thematicSectionId,
        reason: data.reason,
        coordinateProjectionId: data.coordinateProjectionId,
        accessRestriction: data.accessRestriction,
        pdType: data.pdType,
        accuracy: data.accuracy,
        manufacturer: data.manufacturer,
        yearCorrespondence: data.yearCorrespondence,
        accessPurchaseAndUseTerms: data.accessPurchaseAndUseTerms,
        characteristics: data.characteristics,
        status: data.status
      }, { where: { id: id }, transaction })

      for (const smallFile of smallFiles) {
        const File = await database.File.create({
          content: smallFile.buffer,
          createdBy: req.user.fullName
        }, { transaction })
        const fileExtension = path.extname(smallFile.originalname)
        const fileNameWithoutExt = path.basename(smallFile.originalname, fileExtension)

        const FileInfo = await database.FileInfo.create({
          name: fileNameWithoutExt,
          file_type: fileExtension,
          upload_date: new Date(),
          createdBy: req.user.fullName,
          file_id: File.id,
          externalStorageId: null
        }, { transaction })
        await database.spatialDataPdFile.create({
          id: FileInfo.id,
          spatialDataPdId: id
        }, { transaction })
      }

      for (const bigFile of bigFiles) {
        const { data: result } = await axios.post(`${filesStore}/file/${encodeURIComponent(resources.spatialDataPd)}`, bigFile.buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            Cookie: `connect.sid=${req.cookies['connect.sid']}`
          }
        })
        if (!result.fileId) {
          res.status(400).send(result.error)
          return
        }
        bigFile.fileId = result.fileId
      }

      for (const bigFile of bigFiles) {
        const File = await database.File.create({
          content: null,
          createdBy: req.user.fullName
        }, { transaction })
        const fileExtension = path.extname(bigFile.originalname)
        const fileNameWithoutExt = path.basename(bigFile.originalname, fileExtension)
        const FileInfo = await database.FileInfo.create({
          name: fileNameWithoutExt,
          file_type: fileExtension,
          createdBy: req.user.fullName,
          file_id: File.id,
          externalStorageId: bigFile.fileId
        }, { transaction })
        await database.spatialDataPdFile.create({
          id: FileInfo.id,
          spatialDataPdId: id
        }, { transaction })
      }

      for (const file of data.files) {
        const fileExtension = path.extname(file.name)
        const fileNameWithoutExt = path.basename(file.name, fileExtension)
        await database.FileInfo.update({
          name: fileNameWithoutExt,
          file_type: fileExtension
        }, { where: { file_id: file.file_id }, transaction })
      }

      await database.File.destroy({
        where: {
          id: {
            $in: deletedFilesIds
          }
        },
        transaction
      })

      await database.FileInfo.destroy({
        where: {
          file_id: {
            $in: deletedFilesIds
          }
        },
        transaction
      })

      await database.spatialDataPdFile.destroy({
        where: {
          id: {
            $in: deletedFileInfoIds
          }
        },
        transaction
      })
      await database.layer.update(
        {
          layersGroupId: null
        },
        {
          where: {
            id: {
              $in: deletedLayersIds
            }
          },
          transaction
        }
      )
      await database.layer.destroy({
        where: {
          id: {
            $in: deletedLayersIds
          }
        },
        transaction
      })

      const layersGroup = await database.layersGroup.findOne({
        order: ['id'],
        where: {
          spatialDataId: id
        }
      })

      for (const layer of newLayers) {
        await database.layer.create({
          name: layer.name,
          layerType: layer.layerType,
          wkid: layer.wkid,
          wkt: layer.wkt,
          pointStyle: layer.pointStyle,
          polygonStyle: layer.polygonStyle,
          lineStyle: layer.lineStyle,
          url: layer.url,
          serviceLayersValue: layer.serviceLayersValue,
          tokenUrl: layer.tokenUrl,
          serviceLogin: layer.serviceLogin,
          servicePassword: layer.servicePassword,
          geometryType: layer.geometryType,
          featureClass: layer.featureClass,
          isClustering: layer.isClustering,
          orderIndex: layer.orderIndex,
          layersGroupId: layersGroup.id,
          originalLayerId: layer.originalLayerId,
          ignoreGetMapUrl: layer.ignoreGetMapUrl,
          schema: layer.schema,
          semantics: layer.semantics
        }, { transaction })
      }

      for (const layer of updatedLayers) {
        await database.layer.update({
          name: layer.name,
          layerType: layer.layerType,
          wkid: layer.wkid,
          wkt: layer.wkt,
          pointStyle: layer.pointStyle,
          polygonStyle: layer.polygonStyle,
          lineStyle: layer.lineStyle,
          url: layer.url,
          serviceLayersValue: layer.serviceLayersValue,
          tokenUrl: layer.tokenUrl,
          serviceLogin: layer.serviceLogin,
          servicePassword: layer.servicePassword,
          geometryType: layer.geometryType,
          featureClass: layer.featureClass,
          isClustering: layer.isClustering,
          orderIndex: layer.orderIndex,
          originalLayerId: layer.originalLayerId,
          ignoreGetMapUrl: layer.ignoreGetMapUrl,
          schema: layer.schema,
          semantics: layer.semantics
        }, { where: { id: layer.id }, transaction })
      }
      await systemLog.logEdit(req.user, systemLogTarget, `${id} ${data.name}`, transaction)
    })

    res.end()
  }

  async create (req, res) {
    const data = JSON.parse(req.body.data)
    const rawFiles = req.files
    const systemParam = await database.systemParameters.findOne({
      attributes: ['maxFileSize', 'filesStore', 'rfpdOperatorId']
    })

    const maxFileSize = systemParam.maxFileSize * (1024 * 1024)
    const filesStore = systemParam.filesStore
    const bigFiles = rawFiles.filter(x => {
      return x.size > maxFileSize
    })
    const smallFiles = rawFiles.filter(x => {
      return x.size <= maxFileSize
    })

    let spatialDataGd
    await database.sequelize.transaction(async transaction => {
      const registratorId = systemParam.rfpdOperatorId || req.user.urbanPlanningObjectId
      spatialDataGd = await database.spatialDataGd.create({
        name: data.name,
        registrarOrganizationId: registratorId,
        createdBy: req.user.fullName
      }, { transaction })

      const spatialDataPd = await database.spatialDataPd.create({
        id: spatialDataGd.id,
        scaleId: data.scaleId,
        description: data.description,
        ownerId: data.ownerId,
        thematicSectionId: data.thematicSectionId,
        reason: data.reason,
        coordinateProjectionId: data.coordinateProjectionId,
        accessRestriction: data.accessRestriction,
        pdType: data.pdType,
        accuracy: data.accuracy,
        manufacturer: data.manufacturer,
        yearCorrespondence: data.yearCorrespondence,
        accessPurchaseAndUseTerms: data.accessPurchaseAndUseTerms,
        characteristics: data.characteristics,
        status: data.status
      }, { transaction })

      // если карточка ПД создается на основе спец. части документа ГД, то необходимо заполнить ссылку на создаваемую карточку в спец. части
      if (data.spatialDataRdId) {
        await database.spatialDataRd.update({
          spatialDataPdId: spatialDataPd.id
        }, {
          where: {
            id: data.spatialDataRdId
          },
          transaction
        })
      }
      for (const smallFile of smallFiles) {
        const File = await database.File.create({
          content: smallFile.buffer,
          createdBy: req.user.fullName
        }, { transaction })
        const fileExtension = path.extname(smallFile.originalname)
        const fileNameWithoutExt = path.basename(smallFile.originalname, fileExtension)
        const FileInfo = await database.FileInfo.create({
          name: fileNameWithoutExt,
          file_type: fileExtension,
          upload_date: new Date(),
          createdBy: req.user.fullName,
          file_id: File.id,
          externalStorageId: null
        }, { transaction })
        await database.spatialDataPdFile.create({
          id: FileInfo.id,
          spatialDataPdId: spatialDataPd.id
        }, { transaction })
      }

      for (const bigFile of bigFiles) {
        const { data: result } = await axios.post(`${filesStore}/file/${encodeURIComponent(resources.spatialDataPd)}`, bigFile.buffer, {
          headers: {
            'Content-Type': 'application/octet-stream',
            Cookie: `connect.sid=${req.cookies['connect.sid']}`
          }
        })
        if (!result.fileId) {
          res.status(400).send(result.error)
          return
        }
        bigFile.fileId = result.fileId
      }

      for (const bigFile of bigFiles) {
        const File = await database.File.create({
          content: null,
          createdBy: req.user.fullName
        }, { transaction })
        const fileExtension = path.extname(bigFile.originalname)
        const fileNameWithoutExt = path.basename(bigFile.originalname, fileExtension)
        const FileInfo = await database.FileInfo.create({
          name: fileNameWithoutExt,
          file_type: fileExtension,
          createdBy: req.user.fullName,
          file_id: File.id,
          externalStorageId: bigFile.fileId
        }, { transaction })
        await database.spatialDataPdFile.create({
          id: FileInfo.id,
          spatialDataPdId: spatialDataPd.id
        }, { transaction })
      }

      const layers = data.layers
      const groupName = 'Группа 01'
      const layersGroup = await database.layersGroup.create({
        name: groupName,
        orderIndex: 1,
        spatialDataId: spatialDataGd.id
      }, { transaction })

      for (const layer of layers) {
        await database.layer.create({
          name: layer.name,
          layerType: layer.layerType,
          wkid: layer.wkid,
          wkt: layer.wkt,
          pointStyle: layer.pointStyle,
          polygonStyle: layer.polygonStyle,
          lineStyle: layer.lineStyle,
          url: layer.url,
          serviceLayersValue: layer.serviceLayersValue,
          tokenUrl: layer.tokenUrl,
          serviceLogin: layer.serviceLogin,
          servicePassword: layer.servicePassword,
          geometryType: layer.geometryType,
          featureClass: layer.featureClass,
          isClustering: layer.isClustering,
          orderIndex: layer.orderIndex,
          layersGroupId: layersGroup.id,
          originalLayerId: layer.originalLayerId,
          ignoreGetMapUrl: layer.ignoreGetMapUrl,
          schema: layer.schema,
          semantics: layer.semantics
        }, { transaction })
      }
      await systemLog.logAdd(req.user, systemLogTarget, `${spatialDataGd.id} ${spatialDataGd.name}`, transaction)
    })

    res.json({
      id: spatialDataGd.id
    })
  }

  async getById (req, res) {
    const id = req.params.id
    const spatialDataPd = await database.spatialDataPd.findById(id, {
      include: [
        database.spatialDataGd,
        {
          model: database.layersGroup,
          include: [database.layer]
        },
        {
          model: database.FileInfo,
          include: [
            {
              model: database.File,
              attributes: [
                'id',
                [database.sequelize.fn('length', database.sequelize.col('content')), 'fileSize']
              ]
            }
          ]
        }
      ]
    })
    const result = spatialDataPd.get({
      plain: true
    })
    const systemParam = await database.systemParameters.findOne({
      attributes: ['filesStore']
    })
    const filesStore = systemParam.filesStore

    for (const fileInfo of result.FileInfos) {
      if (fileInfo.externalStorageId) {
        const { data } = await axios.get(`${filesStore}/file/${fileInfo.externalStorageId}/info`, {
          headers: {
            Cookie: `connect.sid=${req.cookies['connect.sid']}`
          }
        })
        fileInfo.File.fileSize = data.size
      }
    }

    const layers = mapLayersGroupsToLayers(result.layersGroups)

    res.json({
      name: result.spatialDataGd.name,
      description: result.description,
      ownerId: result.ownerId,
      registrarOrganizationId: result.spatialDataGd.registrarOrganizationId,
      thematicSectionId: result.thematicSectionId,
      reason: result.reason,
      scaleId: result.scaleId,
      accessRestriction: result.accessRestriction || publicRestriction,
      pdType: result.pdType,
      coordinateProjectionId: result.coordinateProjectionId,
      accuracy: result.accuracy,
      manufacturer: result.manufacturer,
      yearCorrespondence: result.yearCorrespondence,
      accessPurchaseAndUseTerms: result.accessPurchaseAndUseTerms,
      characteristics: result.characteristics,
      status: result.status,
      layers: layers,
      files: result.FileInfos.map(x => {
        x.created = moment(x.created).format('L')
        return x
      })
    })
  }

  async exportToExcel (req, res) {
    const options = JSON.parse(req.body.options)
    const params = options.params
    const titles = options.titles
    let {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = params
    page = null
    size = null

    filters.push({ field: 'registrarOrganizationId', operator: '!=', value: null })

    const queryOptions = getQueryOptions({ page, size, filters, sorting })
    queryOptions.subQuery = false

    queryOptions.include = [
      {
        model: database.spatialDataPd,
        required: true,
        include: [
          {
            model: database.thematicSection,
            required: true
          },
          {
            model: database.organization,
            required: true,
            as: 'owner'
          },
          {
            model: database.layersGroup,
            required: true,
            include: database.layer
          }
        ]
      },
      {
        model: database.organization,
        required: true,
        as: 'registrar'
      }
    ]

    const spatialDataGd = await database.spatialDataGd.findAll(queryOptions)

    const rows = spatialDataGd.map(x => mapSpatialDataGd(x.get({ plain: true })))

    const worksheetData = rows.map(x => ([
      x.name,
      x.accessRestrictionName,
      x.ownerName,
      x.thematicSectionName,
      x.registrarName
    ]))

    worksheetData.unshift(titles)

    const workBook = xlsx.utils.book_new()
    const workSheet = xlsx.utils.aoa_to_sheet(worksheetData)

    xlsx.utils.book_append_sheet(workBook, workSheet, 'Лист 1')

    const buf = xlsx.write(workBook, { type: 'buffer', bookType: 'xlsx' })

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment;filename=export${Math.round(new Date().getTime() / 1000.0)}.xlsx`
    })

    res.end(buf)
  }

  async getThematicSections (req, res) {
    const thematicSections = await database.thematicSection.findAll({
      where: {
        isObsolete: false
      },
      order: [['name', 'asc']]
    })
    res.json(thematicSections)
  }

  async getCoordinateSystems (req, res) {
    const coordinateProjections = await database.coordinateProjection.findAll({
      attributes: {
        exclude: ['created', 'updated', 'deleted']
      },
      where: {
        isDeleted: false
      },
      order: [['name', 'asc'], ['projection', 'asc'], ['wkid', 'asc'], ['inputMaskName', 'asc']]
    })
    res.json(coordinateProjections.map(x => x.get({ plain: true })))
  }

  async getScales (req, res) {
    const scales = await database.scale.findAll()
    res.json(scales)
  }

  async filterCards (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body

    const userOrganizationId = req.user.urbanPlanningObjectId
    filters.push({
      field: 'registrarOrganizationId', operator: '!=', value: null
    })

    const queryOptions = getQueryOptions({ page, size, filters, sorting })
    queryOptions.subQuery = false

    queryOptions.where['$and'].push({
      $or: {
        '$spatialDataPd.access_restriction$': {
          $ne: AccessRestrictions.owner
        },
        $and: {
          '$spatialDataPd.access_restriction$': AccessRestrictions.owner,
          $or: {
            '$spatialDataPd.owner_id$': userOrganizationId,
            'registrarOrganizationId': userOrganizationId
          }
        }
      }
    })

    queryOptions.include = [
      {
        model: database.spatialDataPd,
        required: true,
        include: [
          {
            model: database.thematicSection,
            required: true
          },
          {
            model: database.organization,
            required: true,
            as: 'owner'
          },
          {
            model: database.layersGroup,
            separate: true,
            include: database.layer
          }
        ]
      },
      {
        model: database.organization,
        required: true,
        as: 'registrar'
      }
    ]

    const countInclude = [
      {
        model: database.spatialDataPd,
        required: true,
        include: [
          {
            model: database.thematicSection,
            required: true
          },
          {
            model: database.organization,
            required: true,
            as: 'owner'
          }
        ]
      },
      {
        model: database.organization,
        required: true,
        as: 'registrar'
      }
    ]

    const spatialDataGd = await database.spatialDataGd.findAll(queryOptions)

    const rows = spatialDataGd.map(x => mapSpatialDataGd(x.get({ plain: true })))

    const count = await database.spatialDataGd.count({
      where: queryOptions.where,
      include: countInclude
    })

    res.json({ rows, count })
  }

  async getTransformedCoordinates (req, res) {
    const { geometry, oldSrid = 3857, srid } = req.body
    if (!geometry || !srid) {
      res.status(500).end()
      return
    }
    const query = `
      SELECT ST_AsGeoJSON(
        ST_Transform(
          ST_SetSRID(ST_GeomFromText('${geometry}'), ${oldSrid}), 
          ${srid}
        )
      ) as geom`
    const result = await database.sequelize.query(query)
    res.json(result[0][0]['geom'])
  }
}

function mapSpatialDataGd (x) {
  const { accessRestriction: accesRestriction, thematicSection, layersGroups, status } = x.spatialDataPd
  const validAccessRestriction = accesRestriction || publicRestriction
  return {
    id: x.id,
    name: x.name,
    thematicSectionName: thematicSection.name,
    accessRestrictionName: AccessRestrictions.toDisplayName(validAccessRestriction),
    accessRestriction: validAccessRestriction,
    ownerName: _get(x, 'spatialDataPd.owner.name'),
    layers: mapLayersGroupsToLayers(layersGroups),
    registrarName: _get(x, 'registrar.name'),
    registrarOrganizationId: x.registrarOrganizationId,
    ownerId: _get(x, 'spatialDataPd.ownerId'),
    status: status
  }
}

module.exports = PdCardsController
