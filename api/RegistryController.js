'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const Sequelize = require('sequelize')
const multer = require('multer')
const upload = multer()
const mime = require('mime')
const xlsx = require('xlsx')
const pMemoize = require('p-memoize')
const axios = require('axios')
const layerHelpers = require('./layerHelpers')
const actions = require('../auth/actions')
const { getDb } = require('../database')
const database = getDb()
const UserHelper = require('../utils/userHelper')
const userHelper = new UserHelper({ database })
const systemLog = require('../utils/systemLog')
const registryClaim = 'Раздел Ведение реестров ПД'
const {
  getRegistryMetadata,
  setNoAccessToRegistryStatus,
  setOktmoNoAccessToRegistryStatus,
  createModel:
  createRegistryModel,
  getRegistryQueryOptions,
  canRegistry,
  createItem,
  editItem,
  getAllFiles,
  deleteItem,
  createRecordGeometry,
  mapFiles,
  getFileSizeFromExternalStorage,
  writeGeometryWithoutHistory,
  changeRecordGisId,
  getAssociateName,
  getItemSystemAttributes,
  writeGeometryHistory
} = require('../utils/registriesHelper')
const Op = database.Sequelize.Op

const memGetRegistryMetadata = pMemoize(getRegistryMetadata, { maxAge: 10000 })

async function canRegistries (req) {
  return req.user.can(registryClaim, actions.read)
}

class RegistryController {
  get router () {
    const router = Router()

    router.post('/paginate', wrap(this.registriesPaginate))
    router.get('/registry/:id', wrap(this.getRegistry))
    router.get('/registry/layer/:id', wrap(this.getRegistryByLayerId))
    router.post('/registry/paginate/:id', wrap(this.registryPaginate))
    router.get('/registry/allrecords/:registryid', wrap(this.getAllRecordsInRegistry))

    router.post('/registry/item/:registryid', upload.array('file'), wrap(this.createItem))
    router.put('/registry/item/:registryid', upload.array('file'), wrap(this.editItem))
    router.delete('/registry/item/:registryid/:id', wrap(this.deleteItem))
    router.get('/registry/item/data/:registryid/:id/deletecheck', wrap(this.getCheckBeforeDeleteItem))
    router.get('/registry/item/data/:registryid/:id', wrap(this.getItem))
    router.post('/registry/item/data/:registryId', wrap(this.getItemByCustomColumn))
    router.get('/registry/item/databygisid/:registryid/:id', wrap(this.getItemByGisId))
    router.delete('/registry/item/file/delete/:id', wrap(this.deleteFile))
    router.get('/registry/item/files/:registryid/:recordId/:id', wrap(this.getFile))
    router.get('/registry/item/files/:registryid/:id', wrap(this.getItemFiles))
    router.get('/registry/item/turning-points/:registryid/:id', wrap(this.getItemTurningPoints))
    router.get('/registry/item/data', wrap(this.getItemOriginalData))

    router.post('/registry/:id/export', wrap(this.exportToExcel))
    router.get('/registry/:id/layers', wrap(this.getLayers))
    router.get('/registry/layers/:cardid', wrap(this.getLayersFromSpatialCard))
    router.get('/registry/:registryid/:recordid/:gisid', wrap(this.changeGisId))
    router.post('/registry/creategeometry', wrap(this.createGeometry))
    router.post('/registry/editgeometry', wrap(this.editGeometry))
    router.delete('/registry/deletegeometry/:registryid/:objectid/:recordId', wrap(this.deleteGeometry))
    router.get('/registry/geometry/getgeometrycount/:registryid/:objectid', wrap(this.getGeometryCount))
    router.get('/check-multiple-layer/:layerId', wrap(this.checkMultipleLayerSpatialSettings))

    return router
  }

  /**
   * Получить запись по ГИС иденитфикатору.
   */
  async getItemByGisId (req, res) {
    const registryId = req.params.registryid
    const gisId = req.params.id
    const { name = null, value = null } = req.params.rowItem
    if (!name || !value) {
      res.status(500).end()
      return
    }
    const registry = await memGetRegistryMetadata(registryId)
    const model = await createRegistryModel(registry, true)
    let where = {}
    where[registry.mapIdField] = gisId
    const item = await model.findOne({
      where: where
    })
    res.json(item)
  }

  async getItemByCustomColumn (req, res) {
    const registryId = req.params.registryId
    const { name = null, value = null } = req.body
    if (!name || !value) {
      res.status(500).end()
      return
    }
    const registry = await memGetRegistryMetadata(registryId)
    const model = await createRegistryModel(registry, true)
    const where = {
      [`${name}`]: value
    }
    // where[registry.mapIdField] = gisId
    const item = await model.findOne({
      where: where
    })
    res.json(item)
  }

  async getItemOriginalData (req, res) {
    const { registryId = null, dataFieldName = null, dataFieldValue = null } = req.params
    if (!registryId || !dataFieldName || !dataFieldValue) {
      res.status(500).end()
      return
    }

    const registry = await memGetRegistryMetadata(registryId)
    if (!registry) {
      res.status(500).end()
    }

    const result = await database.Sequelize.query(`
      SELECT * 
      FROM ${registry.table_name} 
      WHERE ${dataFieldName} = ${dataFieldValue}
    `)

    res.json(result)
  }

  /**
   * Получить запись.
   */
  async getItem (req, res) {
    const registryId = req.params.registryid
    const recordId = req.params.id
    const registry = await memGetRegistryMetadata(registryId)
    const model = await createRegistryModel(registry, true)
    const primaryKey = registry.columns.find(a => a.isPrimaryKey).key
    const where = {}
    where[primaryKey] = recordId
    const item = await model.findOne({
      where: where
    })
    const itemData = item.dataValues
    const manyToMany = registry.columns.filter(a => a.isManyToMany)
    for (let nm of manyToMany) {
      const records = await database.sequelize.query(`SELECT ${nm.manyToManySecondColumn} FROM ${nm.foreignTable} WHERE ${nm.foreignTableKeyColumn} = ?`, {
        replacements: [recordId],
        type: database.Sequelize.QueryTypes.SELECT
      })
      itemData[nm.id] = records.map(a => a[nm.manyToManySecondColumn])
    }
    itemData.systemAttributes = await getItemSystemAttributes(itemData)
    itemData.files = []
    itemData.newFiles = []
    res.json(itemData)
  }

  /**
   * Удаление геометрии.
   */
  async deleteGeometry (req, res) {
    const registryId = req.params.registryid
    const objectId = req.params.objectid
    const recordId = req.params.recordId

    const registry = await memGetRegistryMetadata(registryId)
    const layer = await database.layer.findOne({ where: { id: registry.layerId } })

    if (!await req.user.can(registry.resourceName, actions.update)) {
      setNoAccessToRegistryStatus(res, registry, actions.update)
      return
    }

    if (registry.storeHistory) {
      await deleteGeometryFromHistory(registry, layer, objectId)
      res.status(200).end()
      return
    }
    const item = await getRegistryItemById(registry, recordId)
    if (item.oktmo_id !== req.user.oktmo_id) {
      setOktmoNoAccessToRegistryStatus(res, registry, actions.update)
      return
    }
    const query = `delete from  ${layer.schema}.${layer.featureClass} WHERE ${registry.spatialDataField} = ?`
    await database.sequelize.query(query, {
      replacements: [objectId],
      type: database.Sequelize.QueryTypes.INSERT
    })

    const queryItems = `update register.${registry.tableName} SET ${registry.mapIdField} = '' WHERE ${registry.mapIdField} = ?`
    await database.sequelize.query(queryItems, {
      replacements: [objectId],
      type: database.Sequelize.QueryTypes.INSERT
    })

    res.status(200).end()
  }

  async getGeometryCount (req, res) {
    const registryId = req.params.registryid
    const objectId = req.params.objectid

    const registry = await memGetRegistryMetadata(registryId)

    const layer = await database.layer.findOne({ where: { id: registry.layerId } })

    const query = `select COUNT(*) AS countGeometries FROM ${layer.schema}.${layer.featureClass} WHERE ${registry.spatialDataField} = ?`
    const counts = await database.sequelize.query(query, {
      replacements: [objectId],
      type: database.Sequelize.QueryTypes.SELECT
    })

    res.json({ count: parseInt(counts[0].countgeometries) })
  }

  /**
   * Создать новый объект геометрии.
   */
  async createGeometry (req, res) {
    const projection = req.body.wkid != null ? parseInt(req.body.wkid) : 3857
    const registryId = req.body.registryId
    const recordId = req.body.recordId
    const geometry = req.body.geometry
    const registry = await memGetRegistryMetadata(registryId)
    if (!await req.user.can(registry.resourceName, actions.update)) {
      setNoAccessToRegistryStatus(res, registry, actions.update)
      return
    }
    const item = await getRegistryItemById(registry, recordId)
    if (item.oktmo_id !== req.user.oktmo_id) {
      setOktmoNoAccessToRegistryStatus(res, registry, actions.update)
      return
    }

    const layer = await database.layer.findOne({ where: { id: registry.layerId } })

    const gisId = await createRecordGeometry({ registry, layer, projection, geometry, recordId, oktmoId: req.user.oktmo_id })

    res.json({ gisId, entityField: registry.mapIdField })
  }

  /**
   * Отредактировать геометрию.
   */
  async editGeometry (req, res) {
    try {
      const projection = 3857 // WORKAROUND: считаем что на карте всегда 3857
      const registryId = req.body.registryId
      const recordId = req.body.recordId
      const objectId = req.body.objectId
      const geometry = req.body.geometry

      const registry = await memGetRegistryMetadata(registryId)

      if (!await req.user.can(registry.resourceName, actions.update)) {
        setNoAccessToRegistryStatus(res, registry, actions.update)
        return
      }

      const item = await getRegistryItemById(registry, recordId)
      if (item.oktmo_id !== req.user.oktmo_id) {
        setOktmoNoAccessToRegistryStatus(res, registry, actions.update)
        return
      }
      const layer = await database.layer.findOne({ where: { id: registry.layerId } })

      // для случая хранения истории изменения геометрии
      if (registry.storeHistory) {
        await writeGeometryHistory({ registry, layer, objectId, geometry, projection, oktmoId: req.user.oktmo_id })
      } else {
        await writeGeometryWithoutHistory({ registry, layer, objectId, geometry, projection, oktmoId: req.user.oktmo_id })
      }

      res.status(200).end()
    } catch (error) {
      res.status(500).end()
    }
  }

  /**
   * Изменить ГИС Идентификатор у записи реестра.
   */
  async changeGisId (req, res) {
    const registryId = req.params.registryid
    const recordId = req.params.recordid
    const gisId = req.params.gisid

    const registry = await memGetRegistryMetadata(registryId)
    await changeRecordGisId(registry, recordId, gisId)
    res.status(200).end()
  }

  /**
   * Получить слои в карточке ПД.
   */
  async getLayersFromSpatialCard (req, res) {
    const cardId = req.params.cardid

    const layers = await getSpatialCardLayers(cardId)

    res.json(layers.map(a => layerHelpers.getLayerModel(a)))
  }

  /**
   * Получить слои реестра.
   */
  async getLayers (req, res) {
    const registryId = req.params.id
    const registry = await database.spatialDataRegistry.findById(registryId, {
      include: [database.layer]
    })

    if (!registry.layer) {
      res.json(null)
      return
    }

    var result = layerHelpers.getLayerModel(registry.layer)
    res.json(result)
  }

  /**
   * Экспорт списка в Excel.
   */
  async exportToExcel (req, res) {
    const registryId = req.params.id

    const registry = await memGetRegistryMetadata(registryId)

    if (!await canRegistry(req, registry.resourceName, actions.read)) {
      setNoAccessToRegistryStatus(res, registry, actions.read)
      return
    }

    const options = JSON.parse(req.body.options)
    const {
      sorting = [],
      filters = []
    } = options

    const model = await createRegistryModel(registry, true)

    const queryOptions = await getRegistryQueryOptions({
      sorting,
      filters,
      registry,
      user: req.user,
      model
    })

    const rows = await model.findAll(queryOptions)

    const headers = registry.columns
      .filter(a => !a.isPrimaryKey && a.isVisibleInGrid)
      .map(column => {
        return column.title
      })
    const worksheetData = rows.map(item => {
      return registry.columns
        .filter(a => !a.isPrimaryKey && a.isVisibleInGrid)
        .map(column => {
          if (column.isClassifier) {
            const associate = getAssociateName(column)
            if (item[associate] && item[associate][column.foreignTableDisplayColumn]) {
              return item[associate][column.foreignTableDisplayColumn]
            } else {
              return 'Не указано'
            }
          }
          return item[column.key]
        })
    })
    worksheetData.unshift(headers)

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

  /**
   * Проверка связей записи перед удалением.
   */
  async getCheckBeforeDeleteItem (req, res) {
    const registryId = req.params.registryid
    const recordId = req.params.id
    // const registry = await memGetRegistryMetadata(registryId)
    const itemLinks = await database.registrySectionItem.findAll({
      where: {
        registryItemId: recordId
      },
      include: [{
        model: database.registrySection,
        required: true,
        attributes: ['id', 'documentId'],
        where: {
          registryId: registryId
        },
        include: [{
          required: true,
          model: database.developedDocument,
          attributes: ['id', 'docNumber', 'documentTypeId'],
          include: [{
            required: true,
            model: database.developedDocumentType,
            as: 'DocumentType',
            attributes: ['id', 'name']
          }]
        }]
      }]
    })

    const plainLinks = itemLinks.map(x => x.get({ plain: true }))

    res.json(plainLinks.map(x => ({
      documentTypeName: x.registrySection.developedDocument.DocumentType.name,
      docNumber: x.registrySection.developedDocument.docNumber
    })))
  }

  /**
   * Удалить запись реестра.
   */
  async deleteItem (req, res) {
    /*
    const registryId = req.params.registryid
    const recordId = req.params.id

    const registry = await memGetRegistryMetadata(registryId)

    if (!await canRegistry(req, registry.resourceName, actions.delete)) {
      setNoAccessToRegistryStatus(res, registry, actions.delete)
      return
    }

    const model = await createRegistryModel(registry, true)
    const primaryKey = registry.columns.find(a => a.isPrimaryKey).key
    const where = {}
    where[primaryKey] = recordId
    const item = await model.findOne({
      where: where
    })

    await database.sequelize.transaction(async function (transaction) {
      await item.destroy({ transaction })

      // удалить все файлы
      const fileInfos = await getAllFiles(registryId, recordId)
      for (let fileInfo of fileInfos) {
        const file = await database.registerfile.findOne({
          where: {
            id: fileInfo.fileId
          }
        })
        await fileInfo.destroy({ transaction })
        await file.destroy({ transaction })
      }

      await systemLog.logDelete(req.user, `Реестр '${registry.name}'`, `${recordId}`, transaction)
    })
    res.status(200).end()
    */

    const registryId = req.params.registryid
    const recordId = req.params.id
    const registry = await memGetRegistryMetadata(registryId)

    if (!await canRegistry(req, registry.resourceName, actions.delete)) {
      setNoAccessToRegistryStatus(res, registry, actions.delete)
      return
    }
    await database.sequelize.transaction(async function (transaction) {
      await deleteItem(registry, recordId, transaction, true)
      await systemLog.logDelete(req.user, `Реестр '${registry.name}'`, `${recordId}`, transaction)
      res.status(200).end()
    })
  }

  /**
   * Удалить файл.
   */
  async deleteFile (req, res) {
    // TODO Транзакция
    const fileId = req.params.id

    const fileInfo = await database.registerfileinfo.findOne({
      where: {
        fileId: fileId
      }
    })
    // TODO await
    fileInfo.destroy()

    const file = await database.registerfile.findOne({
      where: {
        id: fileId
      }
    })
    // TODO await
    file.destroy()

    res.status(200).end()
  }

  /**
   * Получить содержимое файла по идентификатору файла.
   */
  async getFile (req, res) {
    const id = req.params.id
    const options = !!req.query.download
    const file = await database.registerfile.findOne({
      include: [
        {
          model: database.registerfileinfo
        }
      ],
      where: {
        id: id
      }
    })
    const fileInfo = file.dataValues.registerfileinfos[0]
    let content
    if (fileInfo.externalStorageId) {
      const systemParam = await database.systemParameters.findOne({
        attributes: ['filesStore']
      })
      const filesStore = systemParam.filesStore
      const { data: result } = await axios.get(`${filesStore}/file/${fileInfo.externalStorageId}`, {
        responseType: 'arraybuffer',
        headers: {
          Cookie: `connect.sid=${req.cookies['connect.sid']}`
        }
      })
      if (!result) {
        res.status(400).end(result.error)
      }
      content = result
    } else {
      content = file.content
    }
    const objectParams = {
      'Content-Type': mime.lookup(`${fileInfo.name}${fileInfo.fileType}`),
      'Content-Length': content.byteLength
    }
    const contentDispostion = options ? 'attachment' : 'inline'
    const fileName = encodeURIComponent(`${fileInfo.name}${fileInfo.fileType}`)
    objectParams['Content-Disposition'] = `${contentDispostion};filename=${fileName}`

    res.writeHead(200, objectParams)

    res.end(content)
  }

  /**
   * Получить файлы для записи реестра.
   */
  async getItemFiles (req, res) {
    const files = await getAllFiles(req.params.registryid, req.params.id)
    const result = files.map(item => {
      return item.get({
        plain: true
      })
    })
    const systemParam = await database.systemParameters.findOne({
      attributes: ['filesStore']
    })
    const filesStore = systemParam.filesStore
    for (const file of result) {
      await getFileSizeFromExternalStorage(req, file, filesStore)
    }
    res.json(mapFiles(result))
  }

  /**
   * Получить поворотные точки для записи реестра.
   */
  async getItemTurningPoints (req, res) {
    if (req.params.id === 'null') {
      res.json([])
    } else {
      const turningPoints = await database.registryTurningPoint.findAll({
        where: {
          registryId: req.params.registryid,
          itemId: req.params.id
        }
      })
      const plainPoints = turningPoints.map(item => item.get({ plain: true }))
      res.json(plainPoints)
    }
  }

  /**
   * Изменить существующую запись реестра.
   */
  async editItem (req, res) {
    const cardData = JSON.parse(req.body.data)
    await database.sequelize.transaction(async transaction => {
      const {
        registry,
        primaryKeyValue,
        item
      } = await editItem(req, req.params.registryid, cardData, req.files, req.body.projection, transaction)
      await systemLog.logEdit(req.user, `Реестр '${registry.name}'`, `${primaryKeyValue}`, transaction)
      res.json(item)
    })
  }

  async createItem (req, res) {
    const registry = await memGetRegistryMetadata(req.params.registryid)

    if (!await canRegistry(req, registry.resourceName, actions.create)) {
      setNoAccessToRegistryStatus(res, registry, actions.create)
      return
    }

    const cardData = JSON.parse(req.body.data)
    await database.sequelize.transaction(async function (transaction) {
      let result = {}
      try {
        result = await createItem(req, registry, cardData, req.files, transaction)
      } catch (err) {
        res.status(400).end(err.toString())
        return
      }
      const {
        entity,
        primaryKey
      } = result

      await systemLog.logAdd(req.user, `Реестр '${registry.name}'`, `${entity[primaryKey]}`, transaction)
      res.json({
        id: entity[primaryKey]
      })
    })
  }

  getSequelizeType (dataType) {
    switch (dataType) {
      case 'boolean': return Sequelize.BOOLEAN
      case 'date': return Sequelize.DATEONLY
      case 'timestamp without time zone': return Sequelize.DATE
      case 'timestamp with time zone': return Sequelize.DATE
      case 'text': return Sequelize.TEXT
      case 'uuid': return Sequelize.UUID
      case 'integer': return Sequelize.INTEGER
      case 'numeric': return Sequelize.INTEGER
      case 'double precision': return Sequelize.DOUBLE
      case 'bigint': return Sequelize.BIGINT
      case 'character varying': return Sequelize.STRING
      case 'bytea': return Sequelize.BLOB
      default: throw new Error(`Not supported type ${dataType}`)
    }
  }

  /**
   * Получить все записи реестра для грида.
   * @param {*} req
   * @param {*} res
   */
  async getAllRecordsInRegistry (req, res) {
    const registry = await memGetRegistryMetadata(req.params.registryid)
    const model = await createRegistryModel(registry, true)

    const includes = registry.columns
      .filter(a => a.isClassifier)
      .map(column => {
        const result = {
          model: database[column.foreignTableName],
          required: false,
          attributes: [column.foreignTableDisplayColumn],
          as: getAssociateName(column)
        }
        return result
      })

    const rows = await model.findAll({
      include: includes
    })

    res.json(rows)
  }

  /**
   * Получить настройки запроса для списка записей реестра.
   * @param {*} registryId Идентификатор реестра.
   * @param {*} searchFilter Поисковый фильтр.
   * @param {*} sortingColumn Колонка для сортировки.
   * @param {*} sortingDescending Направление сортировки.
   */
  async getRegistryQuerySettings (registryId, searchFilter, sortingColumn, sortingDescending) {
    const registry = await memGetRegistryMetadata(registryId)
    const model = await createRegistryModel(registry, true)
    const orderClause = []
    if (sortingColumn) {
      const sortColumn = registry.columns.find(a => a.key === sortingColumn)
      let sortModel
      if (sortColumn.isClassifier) {
        sortModel = database[sortColumn.foreignTable.substring(sortColumn.foreignTable.indexOf('.') + 1)]
        orderClause.push([
          {
            model: sortModel,
            as: getAssociateName(sortColumn)
          },
          sortColumn.foreignTableDisplayColumn,
          sortingDescending ? 'DESC' : 'ASC'
        ])
      } else {
        orderClause.push([sortingColumn, sortingDescending ? 'DESC' : 'ASC'])
      }
    } else {
      const primaryColumn = registry.columns.find(a => a.isPrimaryKey)
      if (primaryColumn) {
        orderClause.push([primaryColumn.key, 'ASC'])
      }
    }
    let where = {}
    if (searchFilter) {
      where = {
        $or: registry.columns
          .filter(a => !a.isManyToMany && (a.isText || a.isClassifier))
          .map(column => {
            if (column.isText) {
              let result = {}
              result[column.key] = { $iLike: `%${searchFilter}%` }
              return result
            }
            return Sequelize.literal(
              `"${getAssociateName(column)}"."${column.foreignTableDisplayColumn}" ILIKE '%${searchFilter}%'`
            )
          }
          )
      }
    }
    const includes = registry.columns
      .filter(a => a.isClassifier)
      .map(column => {
        const result = {
          model: database[column.foreignTable.substring(column.foreignTable.indexOf('.') + 1)],
          required: false,
          attributes: [column.foreignTableDisplayColumn],
          as: getAssociateName(column)
        }
        return result
      })
    return {
      includes: includes,
      where: where,
      order: orderClause,
      registry: registry,
      model: model
    }
  }

  /**
   * Пагинация для реестра.
   */
  async registryPaginate (req, res) {
    const registryId = req.params.id
    const allRecords = !!req.query.allRecords
    const registry = await memGetRegistryMetadata(registryId)

    if (!await canRegistry(req, registry.resourceName, actions.read)) {
      setNoAccessToRegistryStatus(res, registry, actions.read)
      return
    }

    const {
      page,
      size,
      sorting = [],
      filters = []
    } = req.body

    const model = await createRegistryModel(registry, true)

    const queryOptions = await getRegistryQueryOptions({
      page,
      size,
      sorting,
      filters,
      registry,
      user: !allRecords ? req.user : null,
      model
    })

    if (!allRecords) {
      const userOktmo = await req.user.getUserOktmo()
      queryOptions.where['oktmo_id'] = {
        [Op.in]: userOktmo.map(x => x.id)
      }
    }

    const rows = await model.findAll(queryOptions)

    const count = await model.count({
      include: queryOptions.include,
      where: queryOptions.where
    })

    res.json({
      count: count,
      rows: rows
    })
  }

  /**
   * Данные о реестре.
   */
  async getRegistry (req, res) {
    try {
      const registry = await getRegistryMetadata(req.params.id)
      if (!registry) {
        res.status(400).end()
        return
      }
      const [ readClaim, updateClaim, deleteClaim, createClaim ] = await Promise.all([req.user.can(registry.resourceName, actions.read),
        req.user.can(registry.resourceName, actions.update),
        req.user.can(registry.resourceName, actions.delete),
        req.user.can(registry.resourceName, actions.create)])
      registry.claims = {
        read: readClaim,
        update: updateClaim,
        delete: deleteClaim,
        create: createClaim
      }

      res.json(registry)
    } catch (error) {
      res.status(500).end(error.message)
    }
  }

  async getRegistryByLayerId (req, res) {
    const { id } = req.params
    if (!id) {
      res.status(500).end()
    }
    const registryByLayer = await database.spatialDataRegistry.findOne({
      where: {
        layerId: id
      },
      attributes: ['id']
    })
    if (!registryByLayer) {
      res.status(500).end()
    }
    try {
      const registry = await memGetRegistryMetadata(registryByLayer.id)
      if (!registry) {
        res.status(400).end()
        return
      }
      registry.claims = {
        read: await req.user.can(registry.resourceName, actions.read),
        update: await req.user.can(registry.resourceName, actions.update),
        delete: await req.user.can(registry.resourceName, actions.delete),
        create: await req.user.can(registry.resourceName, actions.create)
      }
      res.json(registry)
    } catch (error) {
      res.status(500).end(error.message)
    }
  }

  /**
   * Пагинация списка реестров.
   */
  async registriesPaginate (req, res) {
    if (!await canRegistries(req)) {
      res.status(403).send(`Отсутствуют права на ${actions.read.toLowerCase()} ресурса "${registryClaim}"`)
      return
    }

    const page = req.body.page
    const pageSize = req.body.pageSize
    const searchFilter = req.body.filter
    const sortingColumn = req.body.sortingColumn
    const sortingDescending = req.body.sortingDescending

    const orderClause = []
    let whereClause = {}
    if (sortingColumn) {
      switch (sortingColumn) {
        case 'name':
          orderClause.push([sortingColumn, sortingDescending ? 'DESC' : 'ASC'])
          break
        case 'oktmoId':
          orderClause.push([database.oktmo, 'name', sortingDescending ? 'DESC' : 'ASC'])
          break
        case 'urbanPlanningObjectId':
          orderClause.push([database.organization, 'name', sortingDescending ? 'DESC' : 'ASC'])
          break
      }
    }
    if (searchFilter) {
      whereClause = {
        $or: [
          {
            name: { $iLike: `%${searchFilter}%` }
          },
          Sequelize.literal(`"oktmo"."name" ILIKE '%${searchFilter}%'`),
          Sequelize.literal(`"organization"."name" ILIKE '%${searchFilter}%'`)
        ]

      }
    }
    const include = [
      { model: database.oktmo, required: false, attributes: ['name'] },
      { model: database.resource, required: false, attributes: ['code'] },
      { model: database.organization, required: false, attributes: ['name'] }
    ]

    const permissions = await userHelper.getUserPermissions(req.user)

    var rowsAll = await database.spatialDataRegistry.findAll({
      include: include,
      order: orderClause,
      where: whereClause
    }).filter(a => userHelper.isResourceIdActionAllowed({ permissions, resourceId: a.resourceId, actionName: actions.read }))

    var count = rowsAll.length
    var rowResult = getArrayPage(rowsAll, page, pageSize).map(value => {
      value = value.dataValues
      if (value.oktmo) {
        value.oktmoId = value.oktmo.name
      }
      if (value.organization) {
        value.urbanPlanningObjectId = value.organization.name
      }
      return value
    })
    res.json({
      count: count,
      rows: rowResult
    })
  }

  async checkMultipleLayerSpatialSettings (req, res) {
    const layerId = req.params.layerId
    const spatialCheckResult = await database.spatialDataRegistry.findAll({
      where: {
        layerId
      }
    })

    const entityCheckResult = await database.entitySpatialSetting.findAll({
      where: {
        layerId
      }
    })

    const result = spatialCheckResult.length > 1 || entityCheckResult.length > 1

    res.json({ result })
  }
}
async function getRegistryItemById (registry, itemId) {
  const model = await createRegistryModel(registry, true)
  return model.findById(itemId)
}

async function removeGisIdFromRecord (registry, gisId) {
  await database.sequelize.query(
    `update register.${registry.tableName} SET ${registry.mapIdField} = '' WHERE ${registry.mapIdField} = ?`, {
      replacements: [gisId]
    })
}

async function deleteGeometryFromHistory (registry, layer, gisid, recordId) {
  const counts = await database.sequelize.query(
    `select COUNT(*) AS countGeometries FROM ${layer.schema}.${layer.featureClass} WHERE ${registry.spatialDataField} = ?`, {
      replacements: [gisid],
      type: database.Sequelize.QueryTypes.SELECT
    })
  const count = parseInt(counts[0].countgeometries)

  // если это последняя геометрия то удаляем ее и отвязываем объект от записи
  if (count === 1) {
    await database.sequelize.query(`delete from  ${layer.schema}.${layer.featureClass} WHERE ${registry.spatialDataField} = ?`, {
      replacements: [gisid],
      type: database.Sequelize.QueryTypes.INSERT
    })
    await removeGisIdFromRecord(registry, gisid)
  }
  // если геометрий несколько то просто удалем последнюю и делаем
  if (count > 1) {
    await database.sequelize.query(
      `delete from  ${layer.schema}.${layer.featureClass}
      WHERE ${registry.spatialDataField} = ? AND "end_date" IS NULL`, {
        replacements: [gisid],
        type: database.Sequelize.QueryTypes.SELECT
      })
    await database.sequelize.query(
      `update ${layer.schema}.${layer.featureClass} SET "end_date" = NULL
      WHERE ${registry.spatialDataField} = ? AND "end_date" IN (SELECT MAX("end_date") from ${layer.schema}.${layer.featureClass})`, {
        replacements: [gisid],
        type: database.Sequelize.QueryTypes.SELECT
      })
  }
}

  /**
   *
   * @param {*} cardId
   */
async function getSpatialCardLayers (cardId) {
  const layers = await database.layer.findAll({
    include: [
      {
        model: database.layersGroup,
        where: {
          spatialDataId: cardId
        }
      }
    ],
    order: [
      ['orderIndex', 'ASC']
    ]
  })
  return layers
}

/**
 * Получить страницу в массиве.
 * @param {*} page Текущая страница.
 * @param {*} pageSize Размер страницы.
 */
function getArrayPage (arr, page, pageSize) {
  const offset = (page - 1) * pageSize
  const end = offset + pageSize
  return arr.slice(offset, end < arr.length ? end : undefined)
}

module.exports = RegistryController
