'use strict'

const camelCase = require('lodash/camelCase')
const snakeCase = require('lodash/snakeCase')

function getFieldNames (fieldName) {
  return {
    camelCase: camelCase(fieldName),
    snakeCase: snakeCase(fieldName)
  }
}

module.exports = {
  getFieldNames
}
