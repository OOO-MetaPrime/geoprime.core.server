'use strict'

const moment = require('moment')
const { getDb } = require('../database')
const database = getDb()
const SystemActions = require('../database/models/public/enums/SystemActions')

function getCurrentDateAsUTC () {
  return moment()
}

async function createUserLogRecord (action, user, target, comment, transaction) {
  const currentDateAsUTC = getCurrentDateAsUTC()
  // Запись действия в системный журнал.
  await database.systemLogRecord.create({
    created: currentDateAsUTC,
    action: action,
    target,
    comment,
    createdBy: user.fullName
  }, { transaction })
}

async function createSystemLogRecord (action, target, comment, transaction) {
  const currentDateAsUTC = getCurrentDateAsUTC()
  // Запись действия в системный журнал.
  await database.systemLogRecord.create({
    created: currentDateAsUTC,
    action: action,
    target,
    comment,
    createdBy: 'Система'
  }, { transaction })
}

module.exports = {
  async createUserLogRecord ({ action, user, target, comment, transaction }) {
    return createUserLogRecord(action, user, target, comment, transaction)
  },
  async logDelete (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.delete, user, target, comment, transaction)
  },
  async logEdit (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.edit, user, target, comment, transaction)
  },
  async logAdd (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.add, user, target, comment, transaction)
  },
  async logEnter (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.enter, user, target, comment, transaction)
  },
  async logLogout (userFullName, transaction) {
    const comment = `Пользователь "${userFullName}" вышел из системы`
    await createSystemLogRecord(SystemActions.logout, 'Система', comment, transaction)
  },
  async аutomatedDownload (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.аutomatedDownloadCreateObject, user, target, comment, transaction)
  },
  async lastAutomatedDownload (user, target, comment, transaction) {
    await createUserLogRecord(SystemActions.аutomatedDownload, user, target, comment, transaction)
  }
}
