'use strict'

const { Router } = require('express')
const resources = require('../auth/resources')
const actions = require('../auth/actions')

class SecurityController {
  constructor ({ config, database }) {
    this.config = config
    this.database = database
  }
  get router () {
    const router = Router()

    router.get('/resources', this.getResources)

    return router
  }
  async getResources (req, res) {
    res.json({
      resources,
      actions
    })
  }
}

module.exports = SecurityController
