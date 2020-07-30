'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const moment = require('moment')
const { getDb } = require('../database')
const db = getDb()
const SystemActions = require('../database/models/public/enums/SystemActions')
const { getQueryOptions } = require('../utils/queryHelper')
const resources = require('../auth/resources')
const actions = require('../auth/actions')
const { authorizeAction } = require('../auth')

const systemActions = {
  10: 'Аутентификация',
  20: 'Восстановление удаленного объекта',
  30: 'Экспорт файла',
  40: 'Закрытие',
  50: 'Редактирование объекта',
  55: 'Связывание объекта',
  60: 'Создание объекта',
  70: 'Удаление объекта',
  80: 'Вход',
  90: 'Выход из системы',
  100: 'Автоматизированная загрузка',
  110: 'Автоматизированная загрузка.Создание объекта'
}

class SystemLogController {
  get router () {
    const router = Router()

    router.post('/enter', wrap(this.enter))
    router.post('/', authorizeAction(resources.systemLogSection, actions.read), wrap(this.index))

    return router
  }

  async enter (req, res) {
    await db.systemLogRecord.create({
      action: SystemActions.enter,
      target: req.body.target,
      createdBy: req.user.fullName,
      created: moment()
    })
    res.end()
  }

  async index (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'createdAt', direction: 'desc' }]
    } = req.body
    const queryOptions = getQueryOptions({ page, size, filters, sorting })

    const rows = await db.systemLogRecord
      .findAll(queryOptions)
      .map(x => ({
        id: x.id,
        action: systemActions[x.action],
        target: x.target,
        comment: x.comment,
        createdBy: x.createdBy,
        createdAt: x.createdAt ? moment(x.createdAt).format('L LT') : null
      }))
    const count = await db.systemLogRecord.count({ where: queryOptions.where })
    res.json({
      rows,
      count
    })
  }
}

module.exports = SystemLogController
