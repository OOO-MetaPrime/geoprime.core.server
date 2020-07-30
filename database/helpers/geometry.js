'use strict'

const { getDb } = require('../index')
const database = getDb()
const { getWKID } = require('../../utils/wkidHelper')
const { getFieldNames } = require('../../utils/systemObject')

const sourceGeometryProjection = 3857 // WORKAROUND: считаем что на карте всегда 3857

/**
   * Получить данные о колонке с геометрией.
   * @param {*} schema Схема.
   * @param {*} tableName Имя таблицы.
*/
async function getShapeColumnDescription (schema, tableName) {
  const getShapeQuery = `SELECT f_geometry_column, "type" FROM public.geometry_columns  WHERE f_table_schema='${schema}' and f_table_name = '${tableName}'`

  const result = await database.sequelize.query(getShapeQuery, {
    type: database.Sequelize.QueryTypes.SELECT
  })

  return result.length === 0 ? {} : { geometryColumn: result[0].f_geometry_column, type: result[0].type }
}

async function createLayerGeometry ({ layer, geometry, storeHistory, objectIdField, coordinateSystem, transaction }) {
  const { geometryColumn } = await getShapeColumnDescription(layer.schema, layer.featureClass)

  return createGeometry({ schema: layer.schema, table: layer.featureClass, geometryColumn, projection: sourceGeometryProjection, wkid: coordinateSystem, geometry, storeHistory, objectIdField, transaction })
}

async function createGeometry ({ schema, table, geometryColumn, projection, wkid, geometry, storeHistory, objectIdField, transaction }) {
  const query = `
  insert into "${schema}"."${table}" (objectid,"${geometryColumn}")
  values ((SELECT COALESCE(MAX(objectid), 0) + 1 FROM "${schema}"."${table}"), ST_Transform(ST_GeomFromText('${geometry}',${projection}),${wkid}))
  returning ${(objectIdField || 'objectid')} AS objectid`
  const insertResult = await database.sequelize.query(query, { type: database.Sequelize.QueryTypes.INSERT, transaction })
  const gisId = insertResult[0][0].objectid
  return gisId
}

async function updateLayerGeometry ({ layer, geometry, layerField, gisId, coordinateSystem, transaction }) {
  const { geometryColumn } = await getShapeColumnDescription(layer.schema, layer.featureClass)

  return updateGeometry({ schema: layer.schema, table: layer.featureClass, geometryColumn, projection: sourceGeometryProjection, wkid: coordinateSystem, geometry, layerField, gisId, transaction })
}

async function updateGeometry ({ schema, table, geometryColumn, projection, wkid, geometry, layerField = 'objectid', gisId, transaction }) {
  const query = `
  update  "${schema}"."${table}" SET "${geometryColumn}" = ST_Transform(ST_GeomFromText('${geometry}',${projection}),${wkid}) WHERE "${layerField}" = ?`
  await database.sequelize.query(query, {
    replacements: [gisId],
    type: database.Sequelize.QueryTypes.UPDATE,
    transaction
  })
}

async function deleteLayerGeometry ({ layer, layerField, gisId, transaction }) {
  return deleteGeometry({ schema: layer.schema, table: layer.featureClass, layerField, gisId, transaction })
}

async function deleteGeometry ({ schema, table, layerField = 'objectid', gisId, transaction }) {
  const query = `delete from  ${schema}.${table} WHERE "${layerField}" = ?`
  await database.sequelize.query(query, {
    replacements: [gisId],
    type: database.Sequelize.QueryTypes.DELETE,
    transaction
  })
}

async function getEntitySpatialSetting ({ user, entityTypeCode }) {
  const entitySpatialSettings = await database.entitySpatialSetting
  .findOne({
    where: {
      settingsProfileId: await user.getProfileId(),
      '$entityType.code$': entityTypeCode
    },
    include: [
      database.entityType,
      database.layer
    ]
  })

  return entitySpatialSettings
}

async function createEntityGeometry ({ user, entityTypeCode, entity, geometry, transaction }) {
  const entitySpatialSettings = await getEntitySpatialSetting({ user, entityTypeCode })
  const wkid = await getWKID(entitySpatialSettings.layer, user.oktmo_id)

  const gisId = await createLayerGeometry({
    layer: entitySpatialSettings.layer,
    geometry,
    objectIdField: entitySpatialSettings.layerField,
    coordinateSystem: wkid,
    transaction
  })

  const fieldNames = getFieldNames(entitySpatialSettings.entityField)

  await entity.update({
    [fieldNames.camelCase]: gisId,
    [fieldNames.snakeCase]: gisId
  }, {
    transaction
  })

  return gisId
}

async function bindGeometryToEntity ({ user, entityTypeCode, entity, gisId, transaction }) {
  const entitySpatialSettings = await getEntitySpatialSetting({ user, entityTypeCode })

  const fieldNames = getFieldNames(entitySpatialSettings.entityField)

  await entity.update({
    [fieldNames.camelCase]: gisId,
    [fieldNames.snakeCase]: gisId
  }, {
    transaction
  })

  return gisId
}

async function updateEntityGeometry ({ user, entityTypeCode, gisId, geometry, transaction }) {
  const entitySpatialSettings = await getEntitySpatialSetting({ user, entityTypeCode })
  const wkid = await getWKID(entitySpatialSettings.layer, user.oktmo_id)

  await updateLayerGeometry({
    layer: entitySpatialSettings.layer,
    geometry,
    layerField: entitySpatialSettings.layerField,
    gisId,
    coordinateSystem: wkid,
    transaction
  })
}

async function deleteEntityGeometry ({ user, entityTypeCode, entityModel, gisId, transaction, entityUpdatedCallback }) {
  const entitySpatialSettings = await getEntitySpatialSetting({ user, entityTypeCode })
  await deleteLayerGeometry({ layer: entitySpatialSettings.layer, layerField: entitySpatialSettings.layerField, gisId, transaction })

  // В настройках поле указано в Pascal Case ("FieldName").
  // Сейчас в моделях используется 2 формата: camelCase и snakeCase.
  const fieldNames = getFieldNames(entitySpatialSettings.entityField)

  const fieldName = entityModel.attributes[fieldNames.camelCase] ? fieldNames.camelCase : fieldNames.snakeCase
  const entities = await entityModel.findAll({
    where: {
      [fieldName]: gisId
    }
  })

  for (const entity of entities) {
    await entity.update({
      [fieldName]: null
    }, {
      transaction
    })

    if (entityUpdatedCallback) {
      await entityUpdatedCallback(entity, transaction)
    }
  }

  return entities
}

module.exports = {
  getShapeColumnDescription,
  createGeometry,
  createLayerGeometry,
  updateGeometry,
  updateLayerGeometry,
  deleteGeometry,
  deleteLayerGeometry,
  createEntityGeometry,
  updateEntityGeometry,
  deleteEntityGeometry,
  bindGeometryToEntity
}
