'use strict'
const { getDb } = require('../database')
const database = getDb()
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })

const getWKID = async (layer, oktmoId) => {
  const profile = await profileHelper.getProfile(oktmoId, ['spatialDataRegistersSchema', 'coordinateSystem'])

  const sridQuery = `
  SELECT srid
  FROM geometry_columns
  where f_table_name = '${layer.featureClass}' and f_table_schema = '${layer.schema}'`

  const sridResult = await database.sequelize.query(sridQuery, { type: database.Sequelize.QueryTypes.INSERT })

  return sridResult[0][0].srid || profile.coordinateSystem
}

module.exports = { getWKID }
