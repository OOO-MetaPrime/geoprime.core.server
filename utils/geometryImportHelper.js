'use strict'

const axios = require('axios')
const path = require('path')
const FormData = require('form-data')
const pMemoize = require('p-memoize')

const GeometryMaxGeomCount = 10000
const GeometryMaxFileSize = 1024 * 1024 * 300

class GeometryImportHelper {
  constructor ({ database, logger, isChangeCoords }) {
    this.database = database
    this.logger = logger
    this.memGetSystemParameters = pMemoize(this.getSystemParameters.bind(this), { maxAge: 20000 })
    this.isChangeCoords = isChangeCoords
  }

  async getSystemParameters () {
    const systemParams = await this.database.systemParameters.findOne({
      attributes: ['geometryServiceUrl', 'geometryServiceMaxFileSize', 'geometryServiceMaxGeomCount']
    })
    return systemParams
  }

  async import (file, returnAsBuffer = false) {
    const systemParams = await this.memGetSystemParameters()
    const { geometryServiceUrl, geometryServiceMaxGeomCount, geometryServiceMaxFileSize } = systemParams

    if (!geometryServiceUrl) {
      return {
        error: 'В общесистемных настройках не задан адрес сервиса импорта геометрии'
      }
    }

    const { buffer, originalname: fileName } = file
    const fileExtension = path.extname(fileName).slice(1)
    let url = `${geometryServiceUrl}/file?filetype=${fileExtension}`
    if (geometryServiceMaxGeomCount != null && geometryServiceMaxGeomCount > 0) {
      url += `&maxCount=${geometryServiceMaxGeomCount}`
    }
    if (geometryServiceMaxFileSize != null && geometryServiceMaxFileSize > 0) {
      url += `&maxSize=${geometryServiceMaxFileSize}`
    }

    if (this.isChangeCoords) {
      url += `&isChangeCoords=true`
    } else {
      url += `&isChangeCoords=false`
    }

    try {
      const requestOptions = {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      }
      if (returnAsBuffer) {
        requestOptions.responseType = 'arraybuffer'
      }
      const { data: result } = await axios.post(url, buffer, requestOptions)
      return result
    } catch (err) {
      this.logger.error(`Ошибка получения геометрии из файла: ${err.message}`)
      this.logger.error(err)
      return {
        error: 'Ошибка получения геометрии из файла: сервис импорта геометрии не доступен'
      }
    }
  }

  async importMulti ({ files, fileExtension, returnAsBuffer = false, overrideMaxLimits = false }) {
    const systemParams = await this.memGetSystemParameters()
    const { geometryServiceUrl } = systemParams
    const geometryMaxGeomCount = overrideMaxLimits ? GeometryMaxGeomCount : systemParams.geometryServiceMaxGeomCount
    const geometryMaxFileSize = overrideMaxLimits ? GeometryMaxFileSize : systemParams.geometryServiceMaxFileSize

    if (!geometryServiceUrl) {
      return {
        error: 'В общесистемных настройках не задан адрес сервиса импорта геометрии'
      }
    }

    let url = `${geometryServiceUrl}/files?filetype=${fileExtension}`
    if (geometryMaxGeomCount != null && geometryMaxGeomCount > 0) {
      url += `&maxCount=${geometryMaxGeomCount}`
    }
    if (geometryMaxFileSize != null && geometryMaxFileSize > 0) {
      url += `&maxSize=${geometryMaxFileSize}`
    }

    try {
      const formData = new FormData()
      formData.append('geometry', files.geometry.content, files.geometry.name)
      if (files.attributes) {
        formData.append('attributes', files.attributes.content, files.attributes.name)
      }
      const { data: result } = await axios.post(url, formData.getBuffer(), {
        headers: {
          ...formData.getHeaders()
        }
      })
      return result
    } catch (err) {
      this.logger.error(`Ошибка получения геометрии из файла: ${err.message}`)
      this.logger.error(err)
      return {
        error: 'Ошибка получения геометрии из файла: сервис импорта геометрии не доступен'
      }
    }
  }
}

module.exports = GeometryImportHelper
