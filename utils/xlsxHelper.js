'use strict'

const xlsx = require('xlsx')
const _get = require('lodash/get')
const moment = require('moment')

async function sendXslx (data, res, { columns, fileName }) {
  const formattedData = formatDataToRowsArray(data, columns)
  const file = getXlsxFile(formattedData)
  const encodedFileName = encodeURIComponent(`${fileName}.xlsx`)
  res.writeHead(200, {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment;filename="${encodedFileName}"`
  })
  res.end(file)
}

function formatDataToRowsArray (data, columns) {
  const result = []
  const headers = columns.map(x => x.title)
  const fields = columns.map(x => x.field)
  result.push(headers)
  data.forEach(x => {
    const row = []
    for (const field of fields) {
      row.push(_get(x, field))
    }
    result.push(row)
  })
  return result
}

function getXlsxFile (data) {
  const workBook = xlsx.utils.book_new()
  const type = data.every(el => Array.isArray(el))
  let workSheet
  if (type) {
    workSheet = xlsx.utils.aoa_to_sheet(data)
  } else {
    workSheet = xlsx.utils.json_to_sheet(data)
  }

  xlsx.utils.book_append_sheet(workBook, workSheet, 'Лист 1')

  return xlsx.write(workBook, { type: 'buffer', bookType: 'xlsx' })
}

function formatDate (date) {
  if (date) {
    return moment(date).format('L')
  }

  return ''
}

function getSingleWorkSheet (data, listName) {
  const workBook = xlsx.utils.book_new()
  const workSheet = xlsx.utils.aoa_to_sheet(data)

  let shortenedListName = 'Лист 1'
  if (listName) {
    if (listName.length > 28) {
      shortenedListName = listName.substring(0, 28) + '...'
    } else {
      shortenedListName = listName
    }
  }
  xlsx.utils.book_append_sheet(workBook, workSheet, shortenedListName)

  return xlsx.write(workBook, { type: 'buffer', bookType: 'xlsx' })
}

module.exports = { getXlsxFile, sendXslx, formatDate, getSingleWorkSheet }
