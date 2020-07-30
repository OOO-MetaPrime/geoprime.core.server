'use strict'

const axios = require('axios')
const ProfileHelper = require('./profileHelper')

function getXmlFilter (layerName, layerField, searchValue) {
  return `<?xml version="1.0"?>
  <wfs:GetFeature xmlns:gml="http://www.opengis.net/gml"
    xmlns:ogc="http://www.opengis.net/ogc"
    xmlns:wfs="http://www.opengis.net/wfs"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.opengis.net/wfs ../wfs/1.1.0/WFS.xsd"
    service="WFS"
    maxFeatures="50"
    outputFormat="application/json"
    version="1.1.0"
  >
  <wfs:Query typeName="${layerName}"
  srsName="EPSG:3857">
   <ogc:Filter>
    <ogc:PropertyIsEqualTo escapeChar="/" singleChar="?" wildCard="*" matchCase="false">
      <ogc:PropertyName> ${layerField} </ogc:PropertyName>
      <ogc:Literal> ${searchValue} </ogc:Literal>
    </ogc:PropertyIsEqualTo>
   </ogc:Filter>
 </wfs:Query>
  </wfs:GetFeature>
`
}

function getDescribeLayerUrl (layer) {
  return layer.url +
    '?service=WMS&version=1.1.1' +
    '&request=DescribeLayer' +
    '&layers=' + layer.serviceLayersValue +
    '&output_format=application/json'
}

async function getLayerDescriptions (layer) {
  const url = getDescribeLayerUrl(layer)
  const config = {}
  if (layer.authorizationString) {
    config.headers = { 'Authorization': 'Basic ' + layer.authorizationString }
  }
  const { data: descriptions } = await axios.get(url, config)
  return descriptions.layerDescriptions
}

async function isGeometryContainsGeometry (database, innerGeojsonGeometry, geoJsonGeometry) {
  const sqlQuery = `SELECT ST_Within(inner_geom,geom) as contains FROM (SELECT ST_GeomFromGeoJSON($innerGeometry) AS inner_geom,  ST_GeomFromGeoJSON($geometry) AS geom ) AS getargs 
    WHERE ST_IsValid(getargs.inner_geom) AND ST_IsValid(getargs.geom)`
  const diffResult = await database.sequelize.query(sqlQuery, {
    type: database.Sequelize.QueryTypes.SELECT,
    bind: {
      innerGeometry: innerGeojsonGeometry,
      geometry: geoJsonGeometry
    }
  })

  return diffResult[0].contains
}

function getGeoJSONWithCrs (geojsonGeometry, crs) {
  const geometryWithCrs = {
    ...geojsonGeometry,
    crs: {
      type: 'name',
      properties: {
        name: `EPSG:${crs}`
      }
    }
  }
  return geometryWithCrs
}

class GeometryRepository {
  constructor ({ database }) {
    this.database = database
    this.profileHelper = new ProfileHelper({ database })
    this.getGeoJSONWithCrs = getGeoJSONWithCrs
  }

  async geometryProjection (geometry, originalProjection, projection) {
    let result = await this.database.sequelize.query(
      'SELECT ST_AsText(ST_Transform(ST_GeomFromText(?,?),?)) AS geom',
      {
        replacements: [geometry, originalProjection, projection],
        type: this.database.Sequelize.QueryTypes.SELECT
      })

    return result[0].geom
  }

  async geojsonGeometryProjection (geometry, originalProjection, projection) {
    const geometryWithCrs = getGeoJSONWithCrs(geometry, originalProjection)
    let result = await this.database.sequelize.query(
      'SELECT ST_AsGeoJSON(ST_Transform(ST_GeomFromGeoJSON(?),?)) AS geom',
      {
        replacements: [JSON.stringify(geometryWithCrs), projection],
        type: this.database.Sequelize.QueryTypes.SELECT
      })

    return JSON.parse(result[0].geom)
  }

  async searchLayerGeometries (layer, layerField, searchValue) {
    const typeNames = await getLayerDescriptions(layer)

    const xmlFilter = getXmlFilter(layer.serviceLayersValue, layerField, searchValue)

    const config = {
      headers: { 'Content-Type': 'text/xml' }
    }

    if (layer.authorizationString) {
      config.headers['Authorization'] = 'Basic ' + layer.authorizationString
    }
    const { data: features } = await axios.post(typeNames[0].owsURL, xmlFilter, config)
    if (!(features instanceof Object)) {
      return []
    }

    return features
  }

  async getOktmoGeoJsonGeometry (profileOktmoId, oktmoCode) {
    const profile = await this.profileHelper.getProfile(profileOktmoId, {
      attributes: ['oktmoLayerId', 'oktmoGeneralField', 'coordinateSystem'],
      include: [{
        model: this.database.layer,
        as: 'OktmoLayer'
      }, this.database.oktmo]
    })

    const oktmoLayer = profile.OktmoLayer
    if (!oktmoLayer || !profile.oktmo) {
      return {
        error: 'В настройках отсутствует слой ОКТМО. ФЛК по границам территории не пройден'
      }
    }

    const featureServiceCollection = await this.searchLayerGeometries(oktmoLayer, profile.oktmoGeneralField, oktmoCode)
    if (!featureServiceCollection.features.length) {
      return {
        error: 'В слое ОКТМО не определены границы территории. ФЛК по границам территории не пройден'
      }
    }

    const oktmoFeature = featureServiceCollection.features[0]

    return getGeoJSONWithCrs(oktmoFeature.geometry, profile.coordinateSystem)
  }

  async isOktmoLayerContainsGeometry (profileOktmoId, oktmoCode, geoJsonGeometry, wkid) {
    const oktmoGeometryResult = await this.getOktmoGeoJsonGeometry(profileOktmoId, oktmoCode)
    if (oktmoGeometryResult.error) {
      return {
        error: oktmoGeometryResult.error
      }
    }

    const oktmoGeometry = oktmoGeometryResult
    const isContainsResult = await this.isOktmoGeometryContainsGeometry(oktmoGeometry, geoJsonGeometry, wkid)

    return isContainsResult
  }

  async isOktmoGeometryContainsGeometry (oktmoGeometry, geoJsonGeometry, wkid) {
    const geometryWithCrs = wkid ? getGeoJSONWithCrs(geoJsonGeometry, wkid) : geoJsonGeometry
    const isContains = await isGeometryContainsGeometry(this.database, geometryWithCrs, oktmoGeometry)

    return isContains ? true : {
      error: 'Данные выходят за границы территории, установленной в документе. ФЛК не пройден'
    }
  }
}

module.exports = GeometryRepository
