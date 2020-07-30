'use strict'

const _groupBy = require('lodash/groupBy')
const layerHelpers = require('../api/layerHelpers')
const { getDb } = require('../database')
const database = getDb()
const Op = database.Sequelize.Op
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })

/**
 * Получить профиль по идентификатору ОКТМО.
 * @param {*} oktmoId Идентификатор ОКТМО.
 */
exports.get = async function (oktmoId) {
  const territoryProfile = await profileHelper.getProfile(oktmoId, ['id', 'spatialDataRegistersSchema'])
  return territoryProfile
}

/**
 * Получить все слои карточек пространственных данных.
 */
exports.getCardLayers = async function (cardIdList) {
  const layers = await database.layer.findAll({
    include: [
      {
        model: database.layersGroup,
        attributes: ['id', 'spatialDataId'],
        where: {
          spatialDataId: {
            [Op.in]: cardIdList
          }
        }
      }
    ],
    order: [
      ['orderIndex', 'ASC']
    ]
  })
  const groupedLayers = _groupBy(layers.map(x => x.get({ plain: true })), x => x.layersGroup.spatialDataId)
  for (const spatialDataId of Object.keys(groupedLayers)) {
    groupedLayers[spatialDataId] = groupedLayers[spatialDataId].map(l => layerHelpers.getLayerModel(l))
  }
  return groupedLayers
}
