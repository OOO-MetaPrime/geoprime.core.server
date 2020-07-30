'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const path = require('path')
const Sequelize = require('sequelize')
const babel = require('babel-core')
const mime = require('mime')
const requireFromString = require('require-from-string')
const { getDb } = require('../database')
const database = getDb()
const libre = require('libreoffice-convert')

const Op = Sequelize.Op

class ReportTemplatesController {
  constructor ({ config, database, logger }) {
    this.config = config
    this.database = database
    this.logger = logger
  }

  get router () {
    const router = Router()

    router.get('/:resourceId', wrap(this.getTemplates))
    router.post('/:id/print', wrap(this.print.bind(this)))

    return router
  }

  async getTemplates (req, res) {
    const whereClause = {
      is_deleted: false,
      script_file_name: {
        [Op.iLike]: '%.js'
      }
    }

    if (!req.query.all) {
      whereClause.oktmo_id = req.user.oktmo_id
    }

    whereClause['template_resource'] = req.params.resourceId

    if (req.query.resourceId) {
      whereClause['template_print_type'] = req.query.resourceId
    }

    const templates = await database.reportTemplate
      .findAll({
        attributes: ['id', 'name', 'script_file_name'],
        where: whereClause
      })

    res.json(templates)
  }

  async print (req, res) {
    const { dev } = this.config
    const reportTemplate = await database.reportTemplate.findById(
      req.params.id, { include: [{ all: true }] }
    )

    if (!reportTemplate) {
      res.status(404).end()
      return
    }

    if (!reportTemplate.reportTemplateScript || !reportTemplate.reportTemplateScript.content) {
      res.status(400).end()
      return
    }

    const options = req.body

    options.user = req.user
    options.CurrentUser = req.user.fullName

    const oktmo = await req.user.getOktmo()
    options.CurrentOktmo = oktmo.name

    const subject = await getSubject(oktmo)
    options.Subject = subject

    const region = await getRegion(oktmo)
    options.Region = region

    const dateFormat = await getDateFormat(req.user)
    options.DateFormat = dateFormat

    const code = babel.transform(reportTemplate.reportTemplateScript.content, {
      plugins: [
        require('babel-plugin-transform-es2015-destructuring'),
        require('babel-plugin-transform-object-rest-spread')
        // require('babel-plugin-transform-async-to-generator')
      ]
    }).code

    const reportFactory = requireFromString(code, {
      prependPaths: [
        // По умолчанию добавлены только пути от корня проекта.6
        path.join(__dirname, dev ? '../../../node_modules' : '../../node_modules')
      ]
    })

    const report = await reportFactory.create({
      sequelize: database.sequelize,
      options,
      reportTemplate
    })

    const isPDFMode = options.isPDFMode
    const isXMLMode = path.parse(reportTemplate.file_name).ext === '.xml'
    const contentDispostion = 'attachment'

    let fileName
    let objectParams

    if (isPDFMode) {
      fileName = encodeURIComponent(path.parse(report.filename).name) + '.pdf'
      objectParams = {
        'Content-Type': mime.lookup(fileName),
        'Content-Disposition': `${contentDispostion}; filename="${fileName}"`
      }
    } else if (isXMLMode) {
      fileName = encodeURIComponent(path.parse(report.filename).name) + '.xml'
      objectParams = {
        'Content-Type': mime.lookup(fileName),
        'Content-Disposition': `${contentDispostion}; filename="${fileName}"`
      }
    } else {
      fileName = encodeURIComponent(path.parse(report.filename).name) + path.parse(report.filename).ext
      objectParams = {
        'Content-Type': mime.lookup(fileName),
        'Content-Disposition': `${contentDispostion}; filename="${fileName}"`
      }
    }

    res.writeHead(200, objectParams)

    let content = []

    report.stream.on('data', chunk => {
      content.push(chunk)
    })

    report.stream.on('end', () => {
      const result = Buffer.concat(content)

      if (isPDFMode) {
        libre.convert(result, '.pdf', undefined, (err, done) => {
          if (err) {
            this.logger.error(`Error converting file: ${err}`)
            res.status(500).send(`Не удалось сконвертировать отчет "${report.filename}" в формат PDF`)
            return
          }
          this.logger.debug(`Файл "${report.filename}" успешно сконвертирован в формат PDF`)

          res.end(done)
        })

        return
      }

      res.end(result)
    })
  }
}

async function getSubject (oktmo) {
  if (!oktmo.parent_id) {
    return oktmo.name
  }

  const parentOktmo = await database.oktmo.findById(oktmo.parent_id)

  return getSubject(parentOktmo)
}

async function getRegion (oktmo) {
  if (!oktmo.parent_id) {
    return oktmo.name
  }
  const oktmoList = []
  let parentId = oktmo.parent_id
  do {
    const parentOktmo = await database.oktmo.findById(parentId)
    oktmoList.unshift(parentOktmo)
    parentId = parentOktmo.parent_id
  } while (parentId)
  oktmoList.push(oktmo)
  return oktmoList.map(x => x.name).join('. ')
}

async function getDateFormat (user) {
  const profileId = await user.getProfileId()
  const profile = await database.settingsProfile.findById(profileId)
  const dateFormat = profile.displayDateFormat || 'дд.ММ.гггг'
  return dateFormat.replace(/г/g, 'y').replace(/М/g, 'M').replace(/д/g, 'd')
}

module.exports = ReportTemplatesController
