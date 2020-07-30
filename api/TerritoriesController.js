'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const _groupBy = require('lodash/groupBy')
const { getDb } = require('../database')
const database = getDb()

class TerritoriesController {
  get router () {
    const router = Router()

    router.get('/', wrap(this.index))

    return router
  }

  async index (req, res) {
    const oktmos = await database.oktmo
      .findAll({
        where: { is_deleted: false },
        order: [['code']]
      })
      .map(x => ({
        id: x.id,
        parent_id: x.parent_id,
        code: x.code,
        name: x.name
      }))
    if ('tree' in req.query) {
      const treeOktmoList = convertToTree(oktmos)
      res.json(treeOktmoList)
      return
    }
    res.json(oktmos)
  }
}

function convertToTree (oktmos) {
  const parentOktmoList = oktmos.filter(x => !x.parent_id)
  const groupedByParent = _groupBy(oktmos, 'parent_id')
  for (const parentOktmo of parentOktmoList) {
    addChildren(parentOktmo, groupedByParent)
  }
  return parentOktmoList
}

function addChildren (parentOktmo, groupedByParent) {
  const children = groupedByParent[parentOktmo.id] || []
  for (const child of children) {
    addChildren(child, groupedByParent)
  }
  parentOktmo.children = children
}

module.exports = TerritoriesController
