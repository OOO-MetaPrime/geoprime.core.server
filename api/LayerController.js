'use strict'
const { Router } = require('express')
const wrap = require('express-async-wrap')
const { getDb } = require('../database')
const database = getDb()
const layerHelpers = require('./layerHelpers')

class LayerController {
  get router () {
    const router = Router()

    router.get('/tree', wrap(this.getLayersTree))
    router.get('/:id', wrap(this.get))
    return router
  }
  async get (req, res) {
    const id = req.params.id

    const layer = await database.layer.findById(id, {
      include: [database.layerSettings]
    })

    res.json({
      id: layer.id,
      layerSetting: layer.layerSetting,
      name: layer.name,
      type: layer.layerType,
      layers: layer.serviceLayersValue,
      url: layer.url,
      authorizationString: layer.serviceLogin ? layerHelpers.getBasicAuthorization(layer.serviceLogin, layer.servicePassword) : '',
      style: layerHelpers.parseStyles(layer),
      opacity: 100
    })
  }

  async getLayersTree (req, res) {
    const user = req.user

    const additionalFilter = `
      AND (spatial_data_pd.access_restriction = 20 OR
           spatial_data_pd.access_restriction IS NULL OR
           spatial_data_pd.access_restriction = 10 OR
           spatial_data_gd.registrar_organization_id = $organizationId OR
           (spatial_data_pd.access_restriction = 30 AND spatial_data_pd.owner_id = $organizationId)) `
    const options = {
      type: database.sequelize.QueryTypes.SELECT
    }
    if (user) {
      options.bind = { organizationId: user.urbanPlanningObjectId }
    }

    const layers = (await database.sequelize.query(getLayersTreeQuery(additionalFilter), options))
      .map(value => ({
        id: value.id,
        type: value.layer_type,
        name: value.name,
        url: value.url,
        oktmo: value.oktmo,
        thematicPart: value.thematicpart,
        serviceLogin: value.service_login,
        servicePassword: value.service_password,
        spatialCardName: value.name_pd_card,
        layers: value.layers,
        pointStyle: value.point_style,
        lineStyle: value.line_style,
        polygonStyle: value.polygon_style,
        isClustering: value.is_clustering
      }))

    const tree = getLayersTree(layers)
    res.json(tree)
  }
}

function getLayersTreeQuery (additionalFilters) {
  return `
  SELECT layer.id, layer.layer_type, oktmo.name AS oktmo, thematic_section.name AS thematicPart,layer.url AS url,layer.name AS name,layer.service_layers_value AS layers,
  layer.service_login,layer.service_password, layer.point_style, layer.line_style, layer.polygon_style, layer.is_clustering, spatial_data_gd.name AS name_pd_card
  FROM layer
  INNER JOIN layers_group ON layer.layers_group_id = layers_group.id
  INNER JOIN spatial_data_pd ON layers_group.spatial_data_id = spatial_data_pd.id
  INNER JOIN spatial_data_gd ON spatial_data_pd.id = spatial_data_gd.id
  INNER JOIN urban_planning_object ON spatial_data_pd.owner_id = urban_planning_object.id
  INNER JOIN oktmo ON urban_planning_object.oktmo_id = oktmo.id
  INNER JOIN thematic_section ON spatial_data_pd.thematic_section_id = thematic_section.id
  WHERE layer.layer_type <> 60 AND spatial_data_gd.is_deleted = false AND layer.is_deleted = false AND spatial_data_pd.status <> 30
  ${additionalFilters}
  ORDER BY oktmo.code ASC, thematic_section.name ASC, spatial_data_gd.name ASC, layer.name ASC`
}

function getLayersTree (layers) {
  var resultModel = []
  layers.forEach(
    function (value) {
      var oktmoNode = resultModel.find(oktmoItem => oktmoItem.name === value.oktmo)
      if (!oktmoNode) {
        oktmoNode = {
          name: value.oktmo,
          itemType: 'oktmo',
          visible: true,
          children: []
        }
        resultModel.push(oktmoNode)
      }

      var thematicPart = oktmoNode.children.find(thematicPartItem => thematicPartItem.name === value.thematicPart)
      if (!thematicPart) {
        thematicPart = {
          name: value.thematicPart,
          itemType: 'thematicSection',
          visible: true,
          children: []
        }
        oktmoNode.children.push(thematicPart)
      }

      var spatialCardName = thematicPart.children.find(spatialCardItem => spatialCardItem.name === value.spatialCardName)
      if (!spatialCardName) {
        spatialCardName = {
          name: value.spatialCardName,
          itemType: 'spatialCard',
          visible: true,
          children: []
        }
        thematicPart.children.push(spatialCardName)
      }

      var layer = {
        id: value.id,
        name: value.name,
        layers: value.layers,
        url: value.url,
        type: value.type,
        itemType: 'layer',
        visible: true,
        children: [],
        style: layerHelpers.parseStyles(value)
      }

      if (value.serviceLogin) {
        layer.authorizationString = layerHelpers.getBasicAuthorization(value.serviceLogin, value.servicePassword)
      }

      spatialCardName.children.push(layer)
    }
  )
  return resultModel
}

module.exports = LayerController
