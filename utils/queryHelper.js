'use strict'

const moment = require('moment')
const _difference = require('lodash/difference')
const { getDb } = require('../database')
const database = getDb()
const sequelize = database.sequelize
const Sequelize = database.Sequelize

function getFieldAggregationFunction (aggregationFunction, field) {
  switch (aggregationFunction) {
    case 'count':
      return sequelize.fn(aggregationFunction, sequelize.col(field))
    case 'sum':
      return sequelize.fn(aggregationFunction, sequelize.col(field))
    case 'min':
    case 'avg':
      return sequelize.fn('round', sequelize.fn(aggregationFunction, sequelize.col(field)), 6)
  }
}

function getFilterExpression (filter, literals) {
  const foundLiteral = literals.find(x => x.column === filter.column)

  if (foundLiteral) {
    const filterOperator = Object.keys(filterOperators).find(x => filterOperators[x] === filter.operator)
    return Sequelize.where(Sequelize.literal(foundLiteral.literal), filterOperator, filter.value)
  }

  if (filter.type && filter.type === 'datetime' && filter.operator === '$eq') {
    return Sequelize.where(Sequelize.fn('date', Sequelize.col(filter.column)), Sequelize.fn('date', filter.value))
  }
  if (filter.type && (filter.type === 'date' || filter.type === 'datetime')) {
    return {
      [filter.column]: {
        [filter.operator]: Sequelize.fn('date', filter.value)
      }
    }
  }
  return {
    [filter.column]: {
      [filter.operator]: filter.value
    }
  }
}

function getCollectionDiff (oldCollection, newCollection, keyField = 'id') {
  const oldCollectionIdList = oldCollection.map(x => x[keyField])
  const newCollectionList = newCollection.filter(x => x[keyField] == null)
  const newExistingCollectionIdList = newCollection.filter(x => x[keyField] != null).map(x => x[keyField])
  const removeIdList = _difference(oldCollectionIdList, newExistingCollectionIdList)
  const updateCollectionList = newCollection.filter(x => x[keyField] != null && !removeIdList.includes(x[keyField]))

  return {
    deleteItems: oldCollection.filter(x => removeIdList.includes(x[keyField])),
    newItems: newCollectionList,
    updateItems: updateCollectionList
  }
}

module.exports = {
  getQueryOptions ({ page, size, filters = [], sorting = [], mainModel, defaultSortingField, literals = [] }) {
    const mappedLiteral = literals.map(x => ({
      literal: x[0],
      column: x[1]
    }))
    const sortColumns = [...sorting]
    if (defaultSortingField) {
      sortColumns.push({ field: defaultSortingField, direction: 'asc' })
    }
    if (sortColumns.length && !sortColumns.every(x => x.field)) {
      throw new Error('В параметрах сортировки отсутствует колонка')
    }

    if ((page !== 0 && size === 0) || (page === 0 && size !== 0)) {
      throw new Error('Неправильные параметры разбиения на страницы')
    }

    const whereClause = {}

    if (filters.length > 0) {
      let mappedConditionsWithHideEmptyAndValue = filters
        .filter(x => x.value != null && x.hideEmpty)
        .map(condition => ({
          column: condition.field,
          operator: getFilterOperator(condition.operator),
          value: getFilterValue(condition.operator, condition.value, condition.type),
          type: condition.type
        }))
      let mappedConditions = filters
        .filter(x => x.value != null && !x.hideEmpty)
        .map(condition => ({
          column: condition.field,
          operator: getFilterOperator(condition.operator),
          value: getFilterValue(condition.operator, condition.value, condition.type),
          type: condition.type
        }))
      const hideEmptyConditions = filters
        .filter(x => x.hideEmpty)
        .map(condition => ({
          column: condition.field,
          operator: getFilterOperator('!='),
          value: null
        }))

      if (mappedConditionsWithHideEmptyAndValue.length) {
        // mappedConditions = mappedConditions.concat(hideEmptyConditions)
        mappedConditions = [...mappedConditionsWithHideEmptyAndValue, ...hideEmptyConditions]
      } else {
        // mappedConditions = mappedConditionsWithHideEmptyAndValue.concat(hideEmptyConditions)
        mappedConditions = [...mappedConditions, ...hideEmptyConditions]
      }

      const incorrectFiltersExist = mappedConditions
        .some(condition => !condition.column ||
          !condition.operator ||
          condition.value === undefined)
      if (incorrectFiltersExist) {
        throw new Error('Неправильные параметры фильтрации')
      }

      // TODO избавиться от $and
      whereClause['$and'] = mappedConditions.map(filterCondition => getFilterExpression(filterCondition, mappedLiteral))
    }

    const orderClause = sortColumns.map(x => {
      if (x.field.indexOf('.') !== -1) {
        const splitted = x.field.split('.')
        const [model, column] = splitted
        if (mainModel) {
          return [{ model: mainModel.associations[model].target, as: model }, column, x.direction]
        }
        return [...splitted, x.direction]
      }
      const foundLiteral = mappedLiteral.find(xx => xx.column === x.field)

      if (foundLiteral) {
        return Sequelize.literal(`${foundLiteral.literal} ${x.direction}`)
      }

      return [x.field, x.direction]
    })

    const queryOptions = {
      where: whereClause,
      order: orderClause
    }

    if (page && size) {
      queryOptions.offset = (page - 1) * size
      queryOptions.limit = size
    }
    return queryOptions
  },

  getWhere (filter) {
    return {
      [filter.field]: {
        [getFilterOperator(filter.operator)]: getFilterValue(filter.operator, filter.value)
      }
    }
  },

  getAggregations (aggregationFunction, fields) {
    if (!aggregationFunction || !fields || !fields.length) {
      return []
    }
    if (!isValidAggregationFunction) {
      throw new Error('Неправильная функция агрегации')
    }
    return fields.map(x => [getFieldAggregationFunction(aggregationFunction, x), x])
  },

  getFilterValue,
  getCollectionDiff
}

function getFilterValue (operator, value, type) {
  switch (operator) {
    case 'ilike':
      return `%${value}%`
    case '=':
    case '>':
    case '>=':
    case '<':
    case '<=':
      if (type && (type === 'date' || type === 'datetime')) {
        return moment(value, ['DD.MM.YYYY', 'DD.MM', 'YYYY-MM-DD']).format('YYYY-MM-DD')
      }
      return value
    default:
      return value
  }
}

function isValidAggregationFunction (func) {
  switch (func) {
    case 'avg':
    case 'AVG':
    case 'count':
    case 'COUNT':
    case 'max':
    case 'MAX':
    case 'min':
    case 'MIN':
    case 'sum':
    case 'SUM':
      return true
    default: return false
  }
}

const filterOperators = {
  ilike: '$iLike',
  '=': '$eq',
  '!=': '$ne',
  '>': '$gt',
  '>=': '$gte',
  '<': '$lt',
  '<=': '$lte',
  '$and': '$and',
  '$notIn': '$notIn',
  '$in': '$in'
}

function getFilterOperator (operator) {
  return filterOperators[operator]
}
