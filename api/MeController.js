'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const path = require('path')
const _get = require('lodash/get')
const { getDb } = require('../database')
const database = getDb()
const layerHelpers = require('./layerHelpers')
const UserHelper = require('../utils/userHelper')
const userHelper = new UserHelper({ database })
const AccessRestrictions = require('../database/models/public/enums/AccessRestrictions')
const OktmoHelper = require('../utils/oktmoHelper')
const oktmoHelper = new OktmoHelper({ database })
const OpenAPIClientAxios = require('openapi-client-axios').default
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })

const apiKey = '02781B89-5ED7-45EC-8090-C811049379B4'
const { Op } = database.Sequelize

function mapLayer (layer) {
  if (!layer) {
    return null
  }

  return {
    id: layer.id,
    featureClass: layer.featureClass,
    geometryType: layer.geometryType,
    ignoreGetMapUrl: layer.ignoreGetMapUrl,
    isClustering: layer.isClustering,
    type: layer.layerType,
    lineStyle: layer.lineStyle,
    name: layer.name,
    pointStyle: layer.pointStyle,
    polygonStyle: layer.polygonStyle,
    schema: layer.schema,
    semantics: layer.semantics,
    layers: layer.serviceLayersValue,
    serviceLogin: layer.serviceLogin,
    servicePassword: layer.servicePassword,
    url: layer.url,
    wkid: layer.wkid
  }
}

function mapThematicSearch (thematicSearch) {
  return {
    id: thematicSearch.id,
    icon: thematicSearch.icon,
    name: thematicSearch.name,
    typeSearch: thematicSearch.typeSearch,
    layers: thematicSearch.layers.map(layer => ({
      id: layer.id,
      attribute: layer.attribute,
      isNotCaseSensetive: layer.isNotCaseSensetive,
      isPartiallyMatch: layer.isPartiallyMatch,
      layer: {
        id: layer.layer.id,
        featureClass: layer.layer.featureClass,
        geometryType: layer.layer.geometryType,
        ignoreGetMapUrl: layer.layer.ignoreGetMapUrl,
        isClustering: layer.layer.isClustering,
        type: layer.layer.layerType,
        lineStyle: layer.layer.lineStyle,
        name: layer.layer.name,
        pointStyle: layer.layer.pointStyle,
        polygonStyle: layer.layer.polygonStyle,
        schema: layer.layer.schema,
        semantics: layer.layer.semantics,
        layers: layer.layer.serviceLayersValue,
        serviceLogin: layer.layer.serviceLogin,
        servicePassword: layer.layer.servicePassword,
        url: layer.layer.url,
        wkid: layer.layer.wkid
      }
    }))
  }
}

class MeController {
  get router () {
    const router = Router()

    router.get('/', wrap(this.me))
    router.get('/profile', wrap(this.getProfile))
    router.get('/test', wrap(this.getTestData))

    return router
  }

  async getTestData (req, res) {
    // const apiUrl = 'https://object.ric-ul.ru/QA/Api'
    const apiUrl = 'https://gisgkh.lenreg.ru/object/Api'
    const filePath = path.join(__dirname, '../utils/test/openapi.yaml')
    const api = new OpenAPIClientAxios({ definition: filePath, strict: true })
    await api.init(apiUrl)
    const client = await api.getClient()
    const { data: houses } = await client.getHouseListForFPD(apiKey)
    const { data: boilers } = await client.getBoilerListForFPD(apiKey)
    res.json({
      houses,
      boilers
    })
  }
  async me (req, res) {
    const [userOktmo, allOktmo, userLibraryOktmo] = await Promise.all([
      req.user.getUserOktmo(),
      oktmoHelper.getAllOktmo(),
      req.user.getUserLibraryOktmo()
    ])

    const territories = allOktmo.map(oktmoHelper.mapOktmo)
    const userOktmoList = userOktmo.map(oktmoHelper.mapOktmo)

    const [userOktmoTree, oktmo, organization, permissions, userLibraryOktmoTree, roles] = await Promise.all([
      oktmoHelper.getOktmoTree(userOktmoList, territories),
      req.user.getOktmo(),
      req.user.getUserOrganization(),
      userHelper.getUserPermissions(req.user),
      oktmoHelper.getOktmoTree(userLibraryOktmo, territories),
      userHelper.getUserRoles(req.user.id)
    ])

    res.json({
      username: req.user.fullName,
      oktmoId: req.user.oktmo_id,
      oktmo: oktmo,
      libraryOktmo: userLibraryOktmo,
      libraryOktmoTree: userLibraryOktmoTree,
      urbanPlanningObjectId: req.user.urbanPlanningObjectId,
      UrbanPlanningObject: organization,
      isPasswordChangeRequired: req.user.isPasswordChangeRequired,
      id: req.user.id,
      allowedOktmoTree: userOktmoTree,
      allowedOktmoList: userOktmoList,
      permissions: permissions.claimsByName,
      roles: roles.map(x => x.roleCode),
      territories
    })
  }

  async getProfile (req, res) {
    const profile = await profileHelper.getProfile(req.user.oktmo_id, {
      include: [
        {
          model: database.layer,
          as: 'oktmoLayer'
        }
      ]
    })

    if (!profile) {
      throw new Error('Отсутствует базовый профиль.')
    }

    const eventsProfileSettingPromise = database.eventsProfileSetting.findOne({
      where: {
        settingsProfileId: profile.id
      },
      include: [{
        model: database.eventsProfileLayer,
        separate: true
      }]
    })
    const thematicSearchesPromise = database.thematicSearch.findAll({
      where: {
        profile_id: profile.id
      },
      include: [{
        model: database.thematicSearchLayer,
        as: 'layers',
        include: [database.layer]
      }]
    })
    const moduleSpatialSettingsPromise = database
      .moduleSpatialData
      .findAll({
        where: {
          settingsProfileId: profile.id,
          isDeleted: false
        },
        order: ['order'],
        include: [
          {
            model: database.spatialDataPd,
            where: {
              [Op.or]: {
                accessRestriction: {
                  [Op.or]: {
                    [Op.eq]: null,
                    [Op.in]: [AccessRestrictions.private, AccessRestrictions.public]
                  }
                },
                [Op.and]: {
                  accessRestriction: AccessRestrictions.owner,
                  ownerId: req.user.urbanPlanningObjectId
                }
              }
            },
            include: [
              {
                model: database.spatialDataGd
              },
              {
                model: database.layersGroup,
                order: ['orderIndex'],
                required: true,
                include: [
                  {
                    model: database.layer,
                    required: true
                  }
                ]
              }
            ]
          }
        ]
      })
      .map(x => ({
        id: x.spatialDataPd.id,
        moduleId: x.moduleId,
        isVisible: x.isVisible,
        opacity: x.opacity,
        groups: x.spatialDataPd.layersGroups.map(g => ({
          id: g.id,
          name: g.name,
          layers: g.layers.map(layerHelpers.getLayerModel)
        }))
      }))

    const entitySpatialSettingsPromise = database
      .entitySpatialSetting
      .findAll({
        where: {
          settingsProfileId: profile.id
        },
        include: [
          database.entityType,
          database.layer
        ]
      })
      .map(x => ({
        id: x.id,
        entityField: x.entityField,
        layerField: x.layerField,
        entityTypeCode: x.entityType.code,
        layer: layerHelpers.getLayerModel(x.layer)
      }))

    const smevRequestTypesPromise = database.smevRequestType
      .findAll({
        attributes: ['id', 'name', 'code', 'isManualDownload'],
        include: [{
          model: database.smevRequestSetting,
          where: {
            settingsProfileId: profile.id
          }
        }],
        where: {
          isDeleted: false,
          isObsolete: false
        }
      })
      .map(x => ({
        id: x.id,
        name: x.name,
        code: x.code,
        isManualDownload: x.isManualDownload
      }))

    const [moduleSpatialSettings, entitySpatialSettings, smevRequestTypes, eventsProfileSetting, thematicSearches] = await Promise.all([
      moduleSpatialSettingsPromise,
      entitySpatialSettingsPromise,
      smevRequestTypesPromise,
      eventsProfileSettingPromise,
      thematicSearchesPromise
    ])

    res.json({
      eventsProfileSetting: {
        layers: _get(eventsProfileSetting, 'eventsProfileLayers', []).map(x => x.layerId),
        startTime: _get(eventsProfileSetting, 'startTime'),
        endTime: _get(eventsProfileSetting, 'endTime')
      },
      extentXMin: profile.extentXMin,
      extentYMin: profile.extentYMin,
      extentXMax: profile.extentXMax,
      extentYMax: profile.extentYMax,
      defaultMapId: profile.defaultMapId,
      minimumMapAutoScale: profile.minimumMapAutoScale,
      moduleSpatialSettings,
      entitySpatialSettings,
      thematicSearches: thematicSearches.map(mapThematicSearch),
      smevRequestTypes: smevRequestTypes,
      oktmoLayer: mapLayer(profile.oktmoLayer),
      oktmoField: profile.oktmoGeneralField,
      maxFileSize: profile.maxFileSize,
      id: profile.id,
      coordinateSystem: profile.coordinateSystem
    })
  }
}

module.exports = MeController
