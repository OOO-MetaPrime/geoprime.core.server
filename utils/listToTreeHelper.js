'use strict'

const _groupBy = require('lodash/groupBy')
const _sortBy = require('lodash/sortBy')
const _keyBy = require('lodash/keyBy')

function addChildren (parent, groupedAll) {
  parent.children = _sortBy(groupedAll[parent.id] || [], x => x.id)
  for (const child of parent.children) {
    addChildren(child, groupedAll)
  }
}

function convertListToTree ({ list, idField = 'id', headField = 'parent_id', sortField }) {
  const groupedAll = _groupBy(list, item => item[headField])
  const groupById = _keyBy(list, item => item[idField])

  const parentList = _sortBy(
    list.filter(item => !item[headField] || !groupById[item[headField]]),
    x => x[sortField])

  for (const parent of parentList) {
    addChildren(parent, groupedAll)
  }
  return parentList
}

module.exports = { convertListToTree }
