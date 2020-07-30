'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const { getDb } = require('../database')
const database = getDb()

class CustomDirectoryController {
  get router () {
    const router = Router()
    router.get('/', wrap(this.getDirectoryRecords))

    return router
  }

  async getDirectoryRecords (req, res) {
    const {
      page,
      size,
      search,
      tablename,
      keyField = 'id',
      nameField = 'name'
    } = req.query

    const where = search && nameField ? `where ${nameField} ilike '%${search}%'` : ''

    const query = `
      select ${keyField} as id, ${nameField} as name 
      from ${tablename} 
      ${where} 
      group by ${keyField}
      limit ${size} 
      offset ${page === 1 ? 0 : (page - 1) * 10}
    `
    const countQuery = `
      select count(*) 
      from ${tablename}
      ${where}
    `
    let result, count
    try {
      result = await database.sequelize.query(query, { type: database.sequelize.QueryTypes.SELECT })
      count = await database.sequelize.query(countQuery, { type: database.sequelize.QueryTypes.SELECT })
    } catch (err) {
      res.status(500).send(err)
      return
    }
    const rowsCount = count[0].count
    const more = page * size < rowsCount || false
    res.json({
      results: result,
      pagination: {
        more: more
      }
    })
  }
}

module.exports = CustomDirectoryController
