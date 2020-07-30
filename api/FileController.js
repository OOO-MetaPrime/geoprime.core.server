'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
// const axios = require('axios')
// const { getDb } = require('../database')
// const database = getDb()
// const { getQueryOptions } = require('../utils/queryHelper')
// const { authorizeAction } = require('../auth')
// const resources = require('../auth/resources')
// const actions = require('../auth/actions')
// const systemLog = require('../utils/systemLog')
// const spatialDataPdStatusTypes = require('../database/models/public/enums/SpatialDataPdStatusTypes')
// const Op = database.Sequelize.Op

const fileHelper = require('../utils/fileHelper')

class FileController {
  get router () {
    const router = Router()

    router.post('/zip', wrap(this.getZippedFiles))
    return router
  }

  async getZippedFiles (req, res) {
    const { fileInfoIds } = req.body
    await fileHelper.getZippedFiles(req, res, fileInfoIds)
  }
}

module.exports = FileController
