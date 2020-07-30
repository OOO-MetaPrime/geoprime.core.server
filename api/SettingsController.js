'use strict'

const { Router } = require('express')

class SettingsController {
  constructor ({ config, database }) {
    this.config = config
    this.database = database
  }
  get router () {
    const router = Router()

    router.get('/', this.index.bind(this))

    return router
  }
  async index (req, res) {
    res.json({
      portalUrl: this.config.portalUrl,
      title: this.config.title || 'Отраслевые интерфейсы',
      adminMail: this.config.adminMail
    })
  }
}

module.exports = SettingsController
