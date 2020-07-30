'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const _get = require('lodash/get')
const { getDb } = require('../database')
const database = getDb()
const resources = require('../auth/resources')
const actions = require('../auth/actions')
const { authorizeAction } = require('../auth')
const { getQueryOptions } = require('../utils/queryHelper')
const layerHelpers = require('../api/layerHelpers')
const Op = database.Sequelize.Op

class SettingsProfilesController {
  get router () {
    const router = Router()

    router.post('/search', authorizeAction(resources.settingsProfile, actions.read), wrap(this.search))
    router.get('/:profileId/modules/:moduleId/layers', wrap(this.getModuleLayers))
    return router
  }

  async search (req, res) {
    const {
      filters = [],
      sorting = []
    } = req.body

    const queryOptions = getQueryOptions({ filters, sorting })

    const settings = await database.settingsProfile.findAll({
      ...queryOptions,
      include: [database.oktmo]
    })

    res.json(settings.map(x => ({
      id: x.id,
      name: x.name,
      oktmoId: x.oktmoId,
      oktmoName: _get(x, 'oktmo.name')
    })))
  }

  async getModuleLayers (req, res) {
    const { moduleId, profileId } = req.params

    const layers = await database.settingsProfileModuleLayer.findAll({
      include: [
        {
          model: database.layer,
          required: true
        }
      ],
      where: {
        [Op.and]: [{ settingsProfileId: profileId }, { moduleId }]
      },
      order: [['sortOrder', 'ASC'], ['layer', 'name', 'ASC']]
    })

    const result = layers.map(x => ({
      ...x.layer.get({ plain: true }),
      isVisible: x.isVisible,
      opacity: x.opacity,
      type: x.layer.layerType,
      layers: x.layer.serviceLayersValue,
      style: layerHelpers.parseStyles(x.layer),
      disableRemove: true
    }))

    res.json(result)
  }
}

module.exports = SettingsProfilesController
