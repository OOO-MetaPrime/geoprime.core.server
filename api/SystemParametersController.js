'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const { getDb } = require('../database')
const database = getDb()
const actions = require('../auth/actions')
const { authorizeAction } = require('../auth')
const resources = require('../auth/resources')

class SystemParametersController {
  get router () {
    const router = Router()
    router.get('/', wrap(this.getOptions))
    router.put('/', authorizeAction(resources.systemParametersSection, actions.update), wrap(this.updateOptions))
    return router
  }

  async getOptions (req, res) {
    const options = await database.systemParameters.findOne()
    if (!options) {
      res.end()
      return
    }
    res.json(options)
  }

  async updateOptions (req, res) {
    const attributes = req.body
    const options = {
      geoserverUrl: attributes.geoserverUrl,
      geoserverUsername: attributes.geoserverUsername,
      geoserverPassword: attributes.geoserverPassword,
      geoserverWorkspace: attributes.geoserverWorkspace,
      geoserverDatastore: attributes.geoserverDatastore,
      extentXmin: attributes.extentXmin,
      extentYmin: attributes.extentYmin,
      extentXmax: attributes.extentXmax,
      extentYmax: attributes.extentYmax,
      filesStore: attributes.filesStore,
      maxFileSize: attributes.maxFileSize,
      rfpdOperatorId: attributes.rfpdOperatorId,
      useGdDocuments: attributes.useGdDocuments,
      isSignatureRequired: attributes.isSignatureRequired,
      geometryServiceUrl: attributes.geometryServiceUrl,
      geometryServiceMaxFileSize: attributes.geometryServiceMaxFileSize,
      geometryServiceMaxGeomCount: attributes.geometryServiceMaxGeomCount
    }
    await database.systemParameters.update(options, {
      where: {}
    })

    res.end()
  }
}

module.exports = SystemParametersController
