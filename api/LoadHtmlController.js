'use strict'

const fs = require('fs')
const { Router } = require('express')
const wrap = require('express-async-wrap')
const path = require('path')

class LoadHtmlController {
  constructor ({ config, database }) {
    this.config = config
    this.database = database
  }
  get router () {
    const router = Router()

    router.get('/', wrap(this.loadIndexInfo.bind(this)))

    return router
  }

  async loadIndexInfo (req, res) {
    const { dev } = this.config
    const pathToFile = path.join(__dirname, dev ? '../../../local/index_info.html' : '../../local/index_info.html')
    fs.open(pathToFile, 'r', (err, fd) => {
      if (err) {
        res.json({ content: null })
        return
      }

      fs.readFile(fd, 'utf8', (err, data) => {
        if (err) {
          res.status(500).res.end()
        }

        res.json({ content: data })
      })
    })
  }
}

module.exports = LoadHtmlController
