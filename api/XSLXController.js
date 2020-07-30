'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const uuidv4 = require('uuid/v4')
const multer = require('multer')
const upload = multer()
const xlsx = require('xlsx')
const moment = require('moment')
const { getRegistryMetadata, createModel } = require('../utils/registriesHelper')
const { getDb } = require('../database')
const database = getDb()
const { getXlsxFile, sendXslx, getSingleWorkSheet } = require('../utils/xlsxHelper')
const systemLog = require('../utils/systemLog')

const errorLogsCache = {}

class XSLXController {
  get router () {
    const router = Router()

    router.post('/registry/import/:registryid', upload.single('file_data'), wrap(this.importRegistryItems))
    router.get('/registry/import/errorlog/:logid', wrap(this.getErrorLog))
    router.get('/registry/template/:registryid', wrap(this.registryTemplate))
    router.post('/objects/export', wrap(this.getXlsxFile))
    router.post('/generate', wrap(this.generateXlsxFile))

    return router
  }

  /**
   * Генерация файла из массива данных и массива колонок
   */
  async generateXlsxFile (req, res) {
    const { data, columns, fileName } = req.body
    sendXslx(data, res, { columns, fileName })
  }

  /**
   * Получить всеь классификатор.
   * @param {*} column Данные о колонке для связи.
   */
  async getClassifier (column) {
    const [schema, table] = column.foreignTable.split('.')
    const modelKeys = Object.keys(database.sequelize.models)
    const modelDescriptions = modelKeys.map(x => ({
      model: database.sequelize.models[x],
      table: database.sequelize.models[x].getTableName()
    }))
    const modelDescription = modelDescriptions.find(x => x.table.schema === schema && x.table.tableName === table)
    // All number types (INTEGER, BIGINT, FLOAT, DOUBLE, REAL, DECIMAL) expose the properties UNSIGNED and ZEROFILL
    const rows = await modelDescription.model.findAll()
    return rows
  }

  /**
   * Импортировать записи реестра ПД.
   */
  async importRegistryItems (req, res) {
    let errors = []

    try {
      const file = req.file

      const registry = await getRegistryMetadata(req.params.registryid)
      const registryModel = await createModel(registry, true)
      const columns = registry.columns.map(column => column.key)
      const workbook = xlsx.read(file.buffer, { type: 'buffer' })

      const rows = xlsx.utils
        .sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
        .slice(1)

      const classifiers = {}
      const local = XSLXController
      let completeRows = 0
      let incompleteRows = 0
      const errorColumns = columns.concat(['__errors'])
      const errorData = [
        errorColumns,
        errorColumns.map(a => {
          const column = registry.columns.find(col => col.key === a)
          return column ? column.title : a
        })
      ]

      for (const row of rows) {
        errors = []
        const newRow = {}
        registry.columns.filter(a => !a.isPrimaryKey).forEach(column => {
          if (column.isNotNull && !row[column.key]) {
            errors.push(`Колонка ${column.key}, не указано значение для обязательного поля`)
          }
        })
        for (const a of Object.keys(row)) {
          const column = registry.columns.find(column => column.key === a)
          if (!column || column.isPrimaryKey) {
            continue
          }
          if (column.isClassifier && row[a]) {
            // TODO: получать одно значение для каждой строки и поля, с кэшированием
            if (!(column.foreignTable in classifiers)) {
              classifiers[column.foreignTable] = await local.getClassifier(column)
            }
            const classifierTitle = row[a]
            const classifierValue = classifiers[column.foreignTable].find(x => {
              const iterattorValue = x[column.foreignTableDisplayColumn]
              if (typeof iterattorValue !== 'number') {
                return iterattorValue === classifierTitle
              }
              const trimmedClassifierTitle = classifierTitle.trim()
              const numberClassifierTitle = Number(trimmedClassifierTitle)
              if (!trimmedClassifierTitle || isNaN(numberClassifierTitle)) {
                const errorMessage = `Колонка ${a}, невозможно получить числовое значение из ${row[a]}`
                if (!errors.includes(errorMessage)) {
                  errors.push(errorMessage)
                }
                return
              }
              return iterattorValue === numberClassifierTitle
            })
            if (classifierValue) {
              newRow[a] = classifierValue[column.foreignTableKeyColumn]
              continue
            } else {
              errors.push(`Колонка ${a}, значение ${row[a]} не найдено в классификаторе`)
            }
          }
          if (column.isBoolean && row[a]) {
            newRow[a] = row[a] === 'Да' ? true : (row[a] === 'Нет' ? false : null)
          }
          if (column.isNumeric && row[a]) {
            newRow[a] = parseFloat(row[a])
            if (newRow[a] == null || isNaN(newRow[a])) {
              errors.push(`Колонка ${a}, невозможно получить числовое значение из ${row[a]}`)
            }
          }
          if (column.isText && row[a]) {
            if (moment(row[a], 'MM/DD/YYYY', true).isValid() || moment(row[a], 'MM/DD/YY', true).isValid()) {
              const date = moment(row[a], ['MM/DD/YYYY', 'MM/DD/YY']).toDate()
              newRow[a] = `${moment(date).format('L')}`
            } else {
              newRow[a] = row[a]
            }
          }
          if ((column.isDate || column.isDateTime) && row[a]) {
            try {
              // пакет xlsx по умолчанию превращает колонки даты в формат MM/DD/YYYY
              newRow[a] = moment(row[a], ['MM/DD/YYYY', 'MM/DD/YY', 'DD.MM.YYYY'], true).toDate()
            } catch (error) {
              errors.push(`Колонка ${a} не корректный формат даты ${row[a]}`)
            }
          }
        }
        // отсутствие всех столбцов считается ошибкой
        if (Object.keys(newRow).length === 0) {
          errors.push('Не найдены служебные имена столбцов для загрузки')
          throw new Error('Не найдены служебные имена столбцов для загрузки.')
        }
        if (!newRow.oktmo_id) {
          newRow.oktmo_id = req.user.oktmo_id
        }
        if (errors.length > 0) {
          row.__errors = errors.join(', ')
          errorData.push(getErrorRow(errorColumns, row))
          incompleteRows++
          continue
        }
        try {
          const object = await registryModel.create(newRow)
          completeRows++
          const primaryKeyColumn = registry.columns.find(a => a.isPrimaryKey)
          await database.sequelize.transaction(async transaction => {
            await systemLog.аutomatedDownload(req.user, registry.name, object[primaryKeyColumn.key], transaction)
          })
        } catch (error) {
          row.__errors = 'Ошибка сохранения в базу данных'
          errorData.push(getErrorRow(errorColumns, row))
          incompleteRows++
        }
      }
      const result = { complete: true, completed: completeRows, incompleted: incompleteRows }
      if (incompleteRows > 0) {
        const errorKey = uuidv4()
        errorLogsCache[errorKey] = errorData
        result.logId = errorKey
      }
      await database.sequelize.transaction(async transaction => {
        if (result.complete && !result.incompleted) {
          await systemLog.lastAutomatedDownload(req.user, registry.name, `Было импортировано ${result.completed} записей.`, transaction)
        }
        if (result.complete && result.incompleted) {
          await systemLog.lastAutomatedDownload(req.user, registry.name, `Было импортировано ${result.completed} и не импортировано ${result.incompleted} записей. См. сохраненный лог`, transaction)
        }
      })
      res.json(result)
    } catch (error) {
      res.json({
        complete: false,
        errors: errors.join('\n')
      })
    }
  }

  async getErrorLog (req, res) {
    if (!(req.params.logid in errorLogsCache)) {
      res.status(500).end()
      return
    }

    const data = errorLogsCache[req.params.logid]
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment;filename=${encodeURIComponent(`Лог${req.params.logid}`)}.xlsx`
    })

    const result = await getSingleWorkSheet(data)
    res.end(result)

    errorLogsCache[req.params.logid] = null
  }

  /**
   * Скачать XLSX файл для карточки поиска.
   */
  async getXlsxFile (req, res) {
    const { attributes, name } = req.body.data

    const result = getXlsxFile(attributes)

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment;filename="${encodeURIComponent(`${name}`)}.xlsx"`
    })

    res.end(result)
  }

  /**
   * Сформировать XLSX шаблон со всеми колонками реестра.
   */
  async registryTemplate (req, res) {
    const registryId = req.params.registryid

    const registry = await getRegistryMetadata(registryId)

    const data = [
      registry.columns.map(column => column.key),
      registry.columns.map(column => column.title)
    ]

    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment;filename=${encodeURIComponent(registry.name)}.xlsx`
    })

    const result = await getSingleWorkSheet(data)
    res.end(result)
  }
}

function getErrorRow (columns, row) {
  return columns.map(key => row[key] || '')
}

module.exports = XSLXController
