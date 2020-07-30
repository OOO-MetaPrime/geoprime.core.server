'use strict'

const log4js = require('log4js')

let logger = null

function configure (logConfig) {
  if (logConfig) {
    log4js.configure(logConfig)
  }

  const log4jsLogger = log4js.getLogger()
  logger = {
    info: log4jsLogger.info.bind(log4jsLogger),
    error: log4jsLogger.error.bind(log4jsLogger),
    debug: log4jsLogger.debug.bind(log4jsLogger),
    trace: log4jsLogger.trace.bind(log4jsLogger),
    warn: log4jsLogger.warn.bind(log4jsLogger),
    /**
     * Запись в файл осуществляется асинхронно.
     * Необходимо вызывать этот метод перед завершением процесса
     * для завершения записи в файл.
     */
    shutdown: () => new Promise(resolve => log4js.shutdown(() => resolve()))
  }
}

function getLogger () {
  return logger
}

module.exports = {
  configure,
  getLogger
}
