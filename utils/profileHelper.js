'use strict'

const Sequelize = require('sequelize')
const { Op } = Sequelize

class ProfileHelper {
  constructor ({ database }) {
    this.database = database
  }

  // Профиль пользователя определяется территорией пользователя (oktmoId).
  // Находим профиль для территории пользователя.
  // Если не найден, то берем базовый.
  async getProfile (oktmoId, options) {
    const { attributes, include } = options || {}

    const queryOptions = {
      where: {
        [Op.or]: [
          { oktmoId },
          { oktmoId: null }
        ]
      },
      order: ['oktmoId'],
      raw: true
    }
    if (attributes && attributes.length) {
      queryOptions.attributes = attributes
    }
    if (include && include.length) {
      queryOptions.include = include
      queryOptions.raw = false
    }
    const profile = await this.database.settingsProfile.findOne(queryOptions)
    return profile
  }
}

module.exports = ProfileHelper
