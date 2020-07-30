'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const { getDb } = require('../database')
const database = getDb()

class UrbanPlanningObjectController {
  get router () {
    const router = Router()

    router.get('/', wrap(this.index))

    return router
  }

  async index (req, res) {
    const planningObjects = await database.organization.findAll({
      where: { is_deleted: false },
      attributes: ['id', 'name', 'oktmo_id'],
      order: [['name', 'ASC']]
    })

    res.json(planningObjects)
  }
}

module.exports = UrbanPlanningObjectController
