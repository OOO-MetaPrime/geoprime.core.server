'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const colorLibrary = require('color')
const { getDb } = require('../database')
const database = getDb()
const multer = require('multer')
const upload = multer()
const settingsProfile = require('../utils/settingsProfile')
const layerHelpers = require('./layerHelpers')
const { getShapeColumnDescription } = require('../database/helpers/geometry')
const GeometryRepository = require('../utils/geometryHelper')
const geometryRepository = new GeometryRepository({ database })
const GeometryImportHelper = require('../utils/geometryImportHelper')

class MapController {
  constructor ({ database, logger }) {
    this.database = database
    this.logger = logger
  }
  get router () {
    const router = Router()

    router.post('/projection', wrap(this.projection))
    router.post('/projection/geojson', wrap(this.geojsonprojection))
    router.get('/basemaps', wrap(this.getBasemaps))
    router.get('/topology-control-settings', wrap(this.getTopologyControlSettings))
    router.post('/topology-collisions', wrap(this.getTopologyCollisions))
    router.post('/export', upload.single('file'), wrap(this.export))
    router.post('/import-geometry-file', upload.single('file'), wrap(this.importGeometryFile.bind(this)))
    router.get('/entitytypes/:code/geometry/params', wrap(this.getGeometryParams))

    return router
  }

  async getGeometryParams (req, res) {
    const entityType = req.params.code
    const entitySpatialSettings = await database
      .entitySpatialSetting
      .findOne({
        where: {
          settingsProfileId: await req.user.getProfileId(),
          '$entityType.code$': entityType
        },
        include: [
          database.entityType,
          database.layer
        ]
      })
    const layerDescription = layerHelpers.getLayerModel(entitySpatialSettings.layer)
    const geometryColumnDescription = await getShapeColumnDescription(entitySpatialSettings.layer.schema, entitySpatialSettings.layer.featureClass)
    res.json({
      layer: layerDescription,
      layerField: entitySpatialSettings.layerField,
      geometry: geometryColumnDescription
    })
  }

  async getBasemaps (req, res) {
    const profileId = await req.user.getProfileId()

    const baseSpatialDatas = await database.baseSpatialData.findAll({
      where: {
        settingsProfileId: profileId,
        is_deleted: false
      },
      include: [
        {
          model: database.spatialDataPd,
          attributes: ['id'],
          include: [
            {
              model: database.spatialDataGd,
              attributes: ['id', 'name']
            }
          ]
        }
      ]
    })

    const cards = []
    const groupedLayers = await settingsProfile.getCardLayers(baseSpatialDatas.map(x => x.spatialDataPdId))
    for (const baseSpatialData of baseSpatialDatas) {
      cards.push({
        card: {
          id: baseSpatialData.spatialDataPdId,
          name: baseSpatialData.spatialDataPd.spatialDataGd.name
        },
        layers: groupedLayers[baseSpatialData.spatialDataPdId]
      })
    }

    res.json(cards)
  }

  async getTopologyControlSettings (req, res) {
    const profileId = await req.user.getProfileId()

    const settings = await database.topologyControlSetting.findAll({
      attributes: ['id', 'name'],
      where: {
        settingsProfileId: profileId,
        is_deleted: false
      },
      order: ['name']
    })

    res.json(settings)
  }

  async getTopologyCollisions (req, res) {
    const { settingId, xmin, ymin, xmax, ymax, srid } = req.body
    const collisions = await database.sequelize.query('select layer1, layer2, "type", st_geomfromewkb(shape) as shape, attr1, attr2, checkid from public.execute_topology_control($settingId, $xmin, $ymin, $xmax, $ymax, $srid)', {
      bind: {
        settingId, xmin, ymin, xmax, ymax, srid
      },
      type: database.Sequelize.QueryTypes.SELECT
    })
    res.json(collisions)
  }

  getDefaultCellStyle () {
    return {
      opts: {
        b: true,
        color: '000000',
        shd: {
          fill: '00FFFFFF',
          color: '00FFFFFF'
        }
      }
    }
  }

  getDocxCell (value, style) {
    return Object.assign({ val: value }, style)
  }

  getHexColor (color) {
    const cloneColor = Object.assign({}, color)
    delete cloneColor.a
    return colorLibrary(cloneColor).hex().replace('#', '')
  }

  /**
   * Экспорт изображения карты.
   */
  async export (req, res) {
    var imageData = decodeBase64Image(req.body.file)

    res.writeHead(200, {
      'Content-Type': imageData.type,
      'Content-Disposition': 'attachment;filename=map.' + imageData.type.replace('image/', '')
    })

    res.end(Buffer.from(imageData.dataraw, 'base64'))
  }

  /**
   * Импорт геометрий из файла.
   */
  async importGeometryFile (req, res) {
    const data = JSON.parse(req.body.data)
    const { isChangeCoords } = data
    const geometryImportHelper = new GeometryImportHelper({ database, logger: this.logger, isChangeCoords })
    const result = await geometryImportHelper.import(req.file)

    res.json(result)
  }

  /**
   * Выполнить перепроецирование WKT геометрии.
   */
  async projection (req, res) {
    var geometry = req.body.geometry
    var projection = parseInt(req.body.projection, 10)
    var originalProjection = parseInt(req.body.originalProjection, 10)

    if (Array.isArray(geometry)) {
      const transformedGeometries = []
      for (const geom of geometry) {
        const result = await geometryRepository.geometryProjection(geom, originalProjection, projection)
        transformedGeometries.push(result)
      }
      res.json(transformedGeometries)
    } else {
      const result = await geometryRepository.geometryProjection(geometry, originalProjection, projection)
      res.json(result)
    }
  }

  /**
   * Выполнить перепроецирование геометрий GeoJSON-фич.
   */
  async geojsonprojection (req, res) {
    var featureCollection = req.body.features
    var projection = parseInt(req.body.projection, 10)
    var originalProjection = parseInt(req.body.originalProjection, 10)

    for (const feature of featureCollection.features) {
      const result = await geometryRepository.geojsonGeometryProjection(feature.geometry, originalProjection, projection)
      feature.geometry = result
    }
    res.json(featureCollection)
  }
}

function decodeBase64Image (dataString) {
  var matches = dataString.match(/^data:(.*);base64,(.+)$/)
  if (!matches || matches.length !== 3) {
    return new Error('Invalid input string')
  }

  return {
    type: matches[1],
    // Пробелы заменяются на плюсы потому что они преобразуются при передаче (из плюса в пробел)
    dataraw: matches[2].replace(/ /g, '+')
  }
}

module.exports = MapController
