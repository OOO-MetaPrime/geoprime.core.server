'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const _ = require('lodash')
const moment = require('moment')
const pMemoize = require('p-memoize')
const { getDb } = require('../database')
const database = getDb()
const { createModel: createRegistryModel, getTableMetadata } = require('../utils/registriesHelper')

async function getClassifierItems (fullTableName, keyColumn, displayColumn, user, additionalColumns, isTechnogen) {
  const [schema, tableName] = fullTableName.split('.')
  // любой выбор ОКТМО должен быть ограничет территориями, разрешенными пользователю
  if (fullTableName === 'register.ref_xmao_tn_mining_licences' && isTechnogen) {
    const userOktmo = await user.getUserOktmo()
    const userOktmoIds = userOktmo.map(x => x.id)
    if (!userOktmoIds.some(x => x.id === user.oktmo_id)) {
      userOktmoIds.push(user.oktmo_id)
    }
    const items = await database.sequelize.query(`
      select distinct rxtml.*
      from register.ref_xmao_tn_mining_licences rxtml
      left join
      register.ref_xmao_mining_licences_territory rxmlt on (rxtml.id = rxmlt.licence_id)
      where rxmlt.territory_id in(:userOktmoIds);
    `, {
      type: database.sequelize.QueryTypes.SELECT,
      replacements: { userOktmoIds: userOktmoIds }
    })

    return items
  }
  if (fullTableName === 'public.oktmo') {
    const userOktmo = await user.getUserOktmo()
    const oktmoList = _.sortBy(userOktmo, displayColumn)
    if (!oktmoList.some(x => x.id === user.oktmo_id)) {
      const oktmo = await user.getOktmo()
      return [oktmo].concat(oktmoList)
    }
    return oktmoList
  } else {
    // При подключении реестров действует правило одного уровня т.е. классификаторы не ссылающиеся непосредственно или через
    // многие ко многим добавляются в sequelize, но не исключен тот факт что прямой ссылке где-то нет поэтому необходимо подстраховаться здесь
    if (!(tableName in database) || schema === 'register') {
      database[tableName] = await createRegistryModel(await getTableMetadata(tableName, schema), false)
    }
    if (fullTableName === 'register.xmao_catalog_fkko') {
      additionalColumns.push('parent_id')
      additionalColumns.push('code')
      additionalColumns.push('name')
    }
    const items = await database[tableName].findAll({
      attributes: [keyColumn, displayColumn, ...additionalColumns],
      order: [displayColumn]
    })

    return items
  }
}

async function getClassifier (fullTableName, keyColumn, displayColumn, user, additionalColumns = [], isTechnogen) {
  const items = await getClassifierItems(fullTableName, keyColumn, displayColumn, user, additionalColumns, isTechnogen)

  const result = items.map(value => {
    const result = {
      title: value[displayColumn],
      id: value[keyColumn]
    }
    additionalColumns.forEach(x => {
      result[x] = value[x]
    })
    return result
  })

  return result
}

async function getClassifierByQuery (requestQuery, user) {
  const fullTableName = requestQuery.tableName
  const keyColumn = requestQuery.keyColumn
  const displayColumn = requestQuery.displayColumn

  const isTimeRestricted = requestQuery.isTimeRestricted === 'true'
  const isLicences = requestQuery.isLicences === 'true'
  const year = parseInt(requestQuery.filterClassifiersField)
  const selectingOrganizationId = requestQuery.selectingOrganizationId
  const isTerritoryFilter = requestQuery.isTerritoryFilterField === 'true'

  const isRegistryClassifier = fullTableName.indexOf('register.ref_') === 0 && fullTableName !== 'register.ref_xmao_tn_mining_licences'
  const attributes = []
  if (isTimeRestricted) {
    attributes.push('start_date')
    attributes.push('end_date')
  } else if (isRegistryClassifier) {
    attributes.push('oktmo_id')
    if (isTerritoryFilter) {
      attributes.push('territory_id')
    }
  } else if (isLicences) {
    attributes.push('start_date')
    attributes.push('end_date')
    attributes.push('enterprise_id')
    attributes.push('license')
    attributes.push('oilfield_name')
  }
  let result = await getClassifier(fullTableName, keyColumn, displayColumn, user, attributes, isTerritoryFilter)
  if (isRegistryClassifier) {
    const userOktmo = await user.getUserOktmo()
    const userOktmoIds = userOktmo.map(x => x.id)
    if (isTerritoryFilter) {
      result = result.filter(x => userOktmoIds.includes(x.territory_id))
    } else {
      result = result.filter(x => userOktmoIds.includes(x.oktmo_id))
    }
  }

  if (isTimeRestricted) {
    result = result.filter(x => checkTimePeriod(x, year))
  }

  if (isLicences) {
    const technogenLicenseSuffixes = ['НР', 'НЭ', 'НП', 'НГ']
    result = result.filter(x => checkTimePeriod(x, year) && technogenLicenseSuffixes.includes(x.license.slice(-2).toUpperCase()))
    if (selectingOrganizationId) {
      const parentEnterprisesWithLicences = await getParentEnterprisesWithLicences(selectingOrganizationId)
      result = result.filter(x => x.enterprise_id === selectingOrganizationId || parentEnterprisesWithLicences.includes(x.enterprise_id))
    }
  }

  return result
}

const memGetClassifierByQuery = pMemoize(getClassifierByQuery, { maxAge: 10000 })

function checkTimePeriod (item, year) {
  const catalogStartDate = item.start_date || `${year}-12-30`
  const catalogEndDate = item.end_date || `${year + 1}-12-31`

  const startYear = moment(catalogStartDate, 'YYYY-MM-DD').year()
  const endYear = moment(catalogEndDate, 'YYYY-MM-DD').year()

  if (year >= startYear && year <= endYear) {
    return true
  }

  return false
}

function checkEnterpriseList (children, list, parents) {
  const parentList = parents
  const parent = list.find(x => x.id === children.head_id)
  if (!parent) {
    return parentList
  } else {
    parentList.push(parent.id)
    checkEnterpriseList(parent, list, parentList)
  }

  return parentList
}

async function getParentEnterprisesWithLicences (selectedOrganizationId) {
  const list = await database.sequelize.query(`
    select * from register.ref_xmao_enterprises;
  `, {
    type: database.sequelize.QueryTypes.SELECT
  })

  const targetEnterprise = list.find(x => x.id === selectedOrganizationId)

  const result = checkEnterpriseList(targetEnterprise, list, [])

  return result
}

class ClassifierController {
  constructor ({ config, database }) {
    this.config = config
    this.database = database
  }
  get router () {
    const router = Router()

    router.get('/classifier', wrap(this.getClassifierMiddleware))
    router.get('/columns/:table/:key/:display', wrap(this.getClassifierColumns))

    router.get('/real-property-types', wrap(this.getSpecifiedClassifier({ classifier: 'realPropertyType', keyColumn: 'code', displayColumn: 'name' })))
    router.get('/event-types', wrap(this.getEventTypes))
    router.get('/event-access-levels', wrap(this.getSpecifiedClassifier({ classifier: 'eventAccessLevel' })))
    router.get('/enums', this.getEnums)
    router.get('/coordinatesprojectionlist', wrap(this.getCoordinateProjections))

    return router
  }

  getSpecifiedClassifier ({ classifier, keyColumn = 'id', displayColumn = 'name', additionalColumns = [] }) {
    return async (req, res) => {
      const tableName = database[classifier].getTableName()
      const result = await getClassifier(`${tableName.schema}.${tableName.tableName}`, keyColumn, displayColumn, req.user, additionalColumns)
      res.json(result)
    }
  }

  async getEventTypes (req, res) {
    const eventTypes = await database.eventType.findAll()

    res.json(eventTypes.map(x => ({
      id: x.id,
      code: x.code,
      title: x.name,
      icon: x.icon ? 'data:image/png;base64,' + x.icon.toString('base64') : null
    })))
  }

  async getClassifierMiddleware (req, res) {
    const result = await memGetClassifierByQuery(req.query, req.user)
    res.json(result)
  }

  /**
   * Вернуть структуру классификатора.
   */
  async getClassifierColumns (req, res) {
    const fullTableName = req.params.table
    const displayColumn = req.params.display
    const tableName = fullTableName.substring(fullTableName.indexOf('.') + 1)
    const schema = fullTableName.substring(0, fullTableName.indexOf('.'))

    const data = await getTableMetadata(tableName, schema, false)

    // если это реестр то выводиться все колонки, если обычный классификатор то одна колонка с настроенная в связи.
    if (data.id) {
      res.json(data)
    } else {
      res.json({
        columns: [data.columns.find(a => a.key === displayColumn)]
      })
    }
  }

  getEnums (req, res) {
    const enums = database.enums
    res.json(enums)
  }

  // Получение справочника систем координат
  async getCoordinateProjections (req, res) {
    const result = await database.coordinateProjection.findAll({ attributes: { exclude: ['created', 'updated', 'deleted'] }, where: { isDeleted: false }, raw: true })
    res.json(result)
  }
}

module.exports = ClassifierController
