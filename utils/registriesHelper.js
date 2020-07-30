'use strict'

const _sortBy = require('lodash/sortBy')
const _groupBy = require('lodash/groupBy')
const _keyBy = require('lodash/keyBy')
const Sequelize = require('sequelize')
const pMemoize = require('p-memoize')
const path = require('path')
const axios = require('axios')
const mime = require('mime')
const moment = require('moment')
const _difference = require('lodash/difference')
const { getDb } = require('../database')
const database = getDb()
const EntityTypes = require('../database/models/public/enums/EntityTypes')
const { getEntityTypeName, getEntityFields } = require('./entityHelper')
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })
const { getShapeColumnDescription } = require('../database/helpers/geometry')
const { getQueryOptions, getWhere, getCollectionDiff } = require('./queryHelper')
const { getDefaultPreview, isImage } = require('./fileHelper')
const { getWKID } = require('./wkidHelper')

const enterpriseTableName = 'ref_xmao_enterprises'
const memGetRegistryMetadata = pMemoize(getRegistryMetadata, { maxAge: 10000 })
let registryCacheCounter = 1
const memGetAllRegistryMetadata = pMemoize(getAllRegistriesMetaData, { maxAge: 600000 })
const memGetAllRegistryDisplayColumnDescriptions = pMemoize(getAllRegistryDisplayColumnDescriptions, { maxAge: 600000 })

const sequelizeTypeMappings = {
  'boolean': Sequelize.BOOLEAN,
  'date': Sequelize.DATEONLY,
  'timestamp without time zone': Sequelize.DATE,
  'timestamp with time zone': Sequelize.DATE,
  'text': Sequelize.TEXT,
  'uuid': Sequelize.UUID,
  'integer': Sequelize.INTEGER,
  'numeric': Sequelize.INTEGER,
  'double precision': Sequelize.DOUBLE,
  'bigint': Sequelize.BIGINT,
  'character varying': Sequelize.STRING,
  'bytea': Sequelize.BLOB
}

async function registriesRows (id, oktmoId) {
  const { tableName, linkedSpatialFields } = await database.spatialDataRegistry.findById(id)

  const linkedFields = JSON.parse(linkedSpatialFields) || []

  const rowsSpatialDataFields = await getAutomaticRows(tableName, oktmoId)

  return { linkedFields, rowsSpatialDataFields }
}

async function getAutomaticRows (tableName, oktmoId) {
  const { spatialDataRegistersSchema } = await profileHelper.getProfile(oktmoId, ['spatialDataRegistersSchema'])

  const foreignTable = `${spatialDataRegistersSchema}.${tableName}`

  const rowsSpatialDataFields = await database.spatial_data_registry_field.findAll({
    where: {
      foreignTable
    },
    include: [database.spatialDataRegistry]
  })

  return rowsSpatialDataFields
}

async function getLinkRows (id) {
  const rowsSpatialDataLinks = await database.spatial_data_registry_links.findAll({
    where: {
      '$field.spatial_data_registry_id$': id
    },
    include: [{
      model: database.spatial_data_registry_field,
      as: 'field'
    },
    {
      model: database.spatial_data_registry_field,
      as: 'linkedField',
      include: [database.spatialDataRegistry]
    }]
  })
  return mapSpatialDataLinks(rowsSpatialDataLinks)
}

function mapSpatialDataLinks (rows) {
  return rows.map(x => ({
    id: x.id,
    name: getEntityName(x),
    alias: x.alias,
    linkedSpatialDataField: getFieldName(x),
    linkedSpatialDataRegistryId: x.linkedField ? x.linkedField.spatialDataRegistryId : null,
    linkedSpatialDataChecked: x.use,
    automatic: false,
    spatialDataField: x.field,
    spatialDataFieldId: x.field.id,
    entityTableColumnName: x.entityTableColumnName,
    linkType: x.linkType,
    linkedField: x.linkedField,
    registry: getRegistry(x)
  }))
}

function getEntityName (field) {
  if (field.linkType === EntityTypes.registry) {
    return field.linkedField.spatialDataRegistry.name
  }
  return getEntityTypeName(field)
}

function getFieldName (field) {
  if (field.linkType === EntityTypes.registry) {
    return field.linkedField.alias
  }
  return getEntityFields(field.linkType).find(x => x.id === field.entityTableColumnName).name
}

function getRegistry (field) {
  if (field.linkType === EntityTypes.registry) {
    return {
      name: getEntityName(field),
      id: field.linkedField.spatialDataRegistry.id,
      entityType: field.linkType
    }
  }
  return {
    name: getEntityName(field),
    id: String(field.linkType),
    entityType: field.linkType
  }
}

async function getAllRegistryDisplayColumnDescriptions (counter) {
  const resultColumns = await database.sequelize.query(
    `SELECT distinct cc.table_schema, cc.table_name, cc.column_name, cc.data_type, cc.is_nullable
     FROM information_schema.columns cc
     join public.spatial_data_registry_field f 
     on (concat(cc.table_schema, '.', cc.table_name)=f.foreign_table and cc.column_name=f.foreign_table_display_column)
     WHERE f.foreign_table is not null
       and f.foreign_table_display_column is not null`,
    {
      type: Sequelize.QueryTypes.SELECT
    })
  const mappedColumns = resultColumns.map(x => ({
    tableName: `${x.table_schema}.${x.table_name}`,
    columnName: x.column_name,
    dataType: x.data_type,
    notNull: x.is_nullable === 'NO'
  }))

  const groupedColumns = _groupBy(mappedColumns, x => x.tableName)

  return groupedColumns
}

async function getCachedAllRegistryDisplayColumnDescriptions () {
  return memGetAllRegistryDisplayColumnDescriptions(registryCacheCounter)
}

async function getCachedAllRegistriesMeta () {
  return memGetAllRegistryMetadata(registryCacheCounter)
}
async function getAllRegistriesMetaData (counter) {
  const registries = await database.spatialDataRegistry.findAll({
    include: [
      {
        model: database.resource,
        required: true
      },
      {
        model: database.layer,
        attributes: {
          include: [[database.sequelize.literal('(SELECT "type" as "geometry_type" FROM public.geometry_columns WHERE f_table_schema="layer".schema and f_table_name="layer".feature_class)'), 'geometryType']]
        }
      },
      database.coordinateProjection
    ]
  })
  const plainRegistries = registries.map(x => x.get({ plain: true }))
  const registryFields = await database.spatial_data_registry_field.findAll({
    where: {
      dataType: {
        $ne: 'geometry'
      }
    }
  })
  const plainRegistryFields = registryFields.map(x => x.get({ plain: true }))

  const rowsSpatialDataLinks = await database.spatial_data_registry_links.findAll({
    // where: {
    //   '$field.spatial_data_registry_id$': id
    // },
    include: [{
      model: database.spatial_data_registry_field,
      as: 'field'
    },
    {
      model: database.spatial_data_registry_field,
      as: 'linkedField',
      include: [database.spatialDataRegistry]
    }]
  })
  const groupedRegistryFields = _groupBy(plainRegistryFields, 'spatialDataRegistryId')

  const mappedLinks = mapSpatialDataLinks(rowsSpatialDataLinks)

  const groupedLinks = _groupBy(mappedLinks, x => x.spatialDataField.spatial_data_registry_id)

  const registryCollectionFields = await database.spatialDataRegistryCollectionField.findAll({
  })
  const groupedRegistryCollectionFields = _groupBy(registryCollectionFields.map(x => x.get({ plain: true })), 'spatialDataRegistryId')

  for (const registry of plainRegistries) {
    registry.fields = groupedRegistryFields[registry.id] || []
    registry.spatialDataRegistryCollectionFields = groupedRegistryCollectionFields[registry.id] || []
    registry.links = groupedLinks[registry.id] || []
  }
  return {
    registries: _keyBy(plainRegistries, 'id'),
    fields: _keyBy(plainRegistryFields, x => x.id)
  }
}

async function getRegistryMetadata (id) {
  const allRegistriesAndFields = await getCachedAllRegistriesMeta()
  var registry = allRegistriesAndFields.registries[id]

  if (!registry) {
    return null
  }

  if (!registry.resource) {
    throw new Error('Ошибка получения метаданных реестра: удален ресурс реестра')
  }
  const spatialDataRegistryFieldId = registry.fields.find(x => x.id === registry.nameFieldId)

  const nameColumn = spatialDataRegistryFieldId.column

  const latitudeColumn = registry.fields.find(x => x.id === registry.latitudeFieldId)
  const longitudeColumn = registry.fields.find(x => x.id === registry.longitudeFieldId)

  let relatedRegistries = []

  const linkRows = registry.links

  const registryClassifierList = []

  let registriesRows = linkRows.filter(x => x.linkType === EntityTypes.registry).map(x => ({
    linkType: x.linkType,
    id: x.linkedField.spatialDataRegistryId,
    alias: x.alias,
    field: x.linkedField.column,
    registryField: x.spatialDataField.column
  }))

  const entitiesRows = linkRows.filter(x => x.linkType !== EntityTypes.registry).map(x => ({
    linkType: x.linkType,
    id: x.id,
    alias: x.alias,
    field: x.entityTableColumnName,
    registryField: x.spatialDataField.column
  }))

  const linkedSpatialFields = registry.linkedSpatialFields ? JSON.parse(registry.linkedSpatialFields) : []
  if (linkedSpatialFields.length > 0) {
    const linkedFieldIdList = linkedSpatialFields.map(a => a.SpatialDataRegistryFieldId)
    const relatedFields = linkedFieldIdList.map(x => allRegistriesAndFields.fields[x])
    linkedSpatialFields.forEach(a => {
      const field = relatedFields.find(field => field.id === a.SpatialDataRegistryFieldId)
      if (field) {
        relatedRegistries.push({
          id: field.spatialDataRegistryId,
          alias: a.Alias,
          field: field.column,
          registryField: field.foreignTableKeyColumn,
          linkType: EntityTypes.registry
        })
      }
    })
  }
  relatedRegistries = [...relatedRegistries, ...registriesRows, ...entitiesRows]

  const manyToManyColumns = registry.spatialDataRegistryCollectionFields.map(a => {
    return {
      alias: a.alias,
      index: a.index,
      foreignTable: a.foreignTable,
      foreignTableKeyColumn: a.foreignTableKeyColumn,
      foreignTableSecondKeyColumn: a.foreignTableSecondKeyColumn,
      manyToManyTable: a.manyToManyTable,
      manyToManyColumn: a.manyToManyColumn,
      manyToManyDisplayColumn: a.manyToManyDisplayColumn,
      manyToManySecondColumn: a.foreignTableSecondKeyColumn,
      notNull: a.notNull,
      id: a.id,
      isPrimaryKey: false,
      isAutoGeneratedColumn: false,
      isManyToMany: true
    }
  })

  const layer = registry.layer
  let geometryType
  if (layer) {
    geometryType = layer.geometryType
  }

  const allDisplayColumnNames = await getCachedAllRegistryDisplayColumnDescriptions()

  const allColumn = registry.fields.concat(manyToManyColumns)

  for (const id of Object.keys(allRegistriesAndFields.registries)) {
    const item = allRegistriesAndFields.registries[id]
    const targetField = registry.fields.find(x => x.foreignTable && x.foreignTable.substring(x.foreignTable.indexOf('.') + 1) === item.tableName)
    if (targetField) {
      registryClassifierList.push({
        registryFieldId: targetField.id,
        classifierRegistry: item,
        classifierFields: _sortBy(item.fields, ['index']).map(x => {
          const displayColumnDescriptions = allDisplayColumnNames[x.foreignTable]
          const foreignTableDisplayColumnDescription = displayColumnDescriptions ? displayColumnDescriptions.find(col => col.columnName === x.foreignTableDisplayColumn) : {}
          return {
            id: x.id,
            key: x.column,
            title: x.alias ? x.alias : x.column,
            index: x.index,
            showWhenSelected: x.showWhenSelected,
            foreignTableDisplayColumn: x.foreignTableDisplayColumn,
            isBoolean: x.dataType === 'boolean',
            isNameField: x.column === nameColumn,
            isVisibleInGrid: !x.isPrimaryKey && x.isAutoGeneratedColumn,
            isHtml: x.dataType === 'text' && x.editorType === 1,
            isLink: x.dataType === 'text' && x.editorType === 2,
            isEmail: x.dataType === 'text' && x.editorType === 3,
            isDate: x.dataType === 'date',
            isDateTime: x.dataType === 'timestamp without time zone' || x.dataType === 'timestamp with time zone',
            isText: x.dataType === 'text' || x.dataType === 'character varying',
            isNumeric: x.dataType === 'double precision' || x.dataType === 'integer' || x.dataType === 'numeric' || x.dataType === 'bigint',
            isInteger: x.dataType === 'integer' || x.dataType === 'bigint',
            minValue: x.minValue,
            maxValue: x.maxValue,
            isNotNull: x.notNull,
            foreignTableKeyColumn: x.foreignTableKeyColumn,
            foreignTable: x.foreignTable,
            isClassifier: !!x.foreignTableKeyColumn,
            foreignTableDisplayColumnParams: x.foreignTableDisplayColumn ? {
              isDate: foreignTableDisplayColumnDescription.dataType === 'date',
              isDateTime: foreignTableDisplayColumnDescription.dataType === 'timestamp without time zone' || foreignTableDisplayColumnDescription.dataType === 'timestamp with time zone',
              isText: foreignTableDisplayColumnDescription.dataType === 'text' || foreignTableDisplayColumnDescription.dataType === 'character varying',
              isNumeric: foreignTableDisplayColumnDescription.dataType === 'double precision' || foreignTableDisplayColumnDescription.dataType === 'integer' || foreignTableDisplayColumnDescription.dataType === 'numeric' || foreignTableDisplayColumnDescription.dataType === 'bigint',
              isBoolean: foreignTableDisplayColumnDescription.dataType === 'boolean',
              dataType: foreignTableDisplayColumnDescription.dataType
            } : null
          }
        })
      })
    }
  }
  var result = {
    id: registry.id,
    name: registry.name,
    tableName: registry.tableName,
    resourceId: registry.resourceId,
    resourceName: registry.resource.code,
    spatialDataPdId: registry.spatialDataPdId,
    geometryType: geometryType || '',
    layerId: registry.layerId,
    layer: registry.layer,
    mapIdField: registry.mapIdField,
    spatialDataField: registry.spatialDataField,
    urbanPlanningObjectId: registry.urbanPlanningObjectId,
    coordinateProjectionWkid: registry.coordinateProjection ? registry.coordinateProjection.wkid : null,
    coordinateInputMask: registry.coordinateProjection != null ? registry.coordinateProjection.inputMask : null,
    relatedRegistries,
    storeHistory: registry.storeHistory,
    allowImportedGeometryEdit: registry.allowImportedGeometryEdit,
    useTurningPoints: registry.useTurningPoints,
    columns: _sortBy(allColumn, ['index']).map(a => {
      const schema = a.foreignTable ? a.foreignTable.substring(0, a.foreignTable.indexOf('.')) : null
      const tableName = a.foreignTable ? a.foreignTable.substring(a.foreignTable.indexOf('.') + 1) : null
      const displayColumnDescriptions = allDisplayColumnNames[a.foreignTable]
      const foreignTableDisplayColumnDescription = displayColumnDescriptions ? displayColumnDescriptions.find(col => col.columnName === a.foreignTableDisplayColumn) : {}
      const systemAttributes = ['author_id', 'datecreated', 'editor_id', 'dateedited', 'approved']
      return {
        title: a.alias ? a.alias : a.column,
        key: a.column,
        isNameField: a.column === nameColumn,
        isVisibleInGrid: !a.isPrimaryKey && a.isAutoGeneratedColumn,
        isClassifier: !!a.foreignTableKeyColumn && !a.isManyToMany,
        isFkko: !!a.foreignTableKeyColumn && !a.isManyToMany && a.foreignTable === 'register.xmao_catalog_fkko',
        isOktmo: !!a.foreignTableKeyColumn && !a.isManyToMany && a.foreignTable === 'public.oktmo',
        isNotEditable: !!a.foreignTableKeyColumn && !a.isManyToMany && a.foreignTable === 'public.oktmo' && a.column === 'oktmo_id',
        isManyToMany: !!a.manyToManyTable,
        isHtml: a.dataType === 'text' && a.editorType === 1,
        isLink: a.dataType === 'text' && a.editorType === 2,
        isEmail: a.dataType === 'text' && a.editorType === 3,
        isDate: a.dataType === 'date',
        isDateTime: a.dataType === 'timestamp without time zone' || a.dataType === 'timestamp with time zone',
        isText: a.dataType === 'text' || a.dataType === 'character varying',
        isNumeric: a.dataType === 'double precision' || a.dataType === 'integer' || a.dataType === 'numeric' || a.dataType === 'bigint',
        isInteger: a.dataType === 'integer' || a.dataType === 'bigint',
        minValue: a.minValue,
        maxValue: a.maxValue,
        isBoolean: a.dataType === 'boolean',
        isNotNull: a.notNull,
        isLatitude: latitudeColumn ? a.column === latitudeColumn.column : false,
        isLongitude: longitudeColumn ? a.column === longitudeColumn.column : false,
        coordinateInputMask: registry.coordinateProjection != null ? registry.coordinateProjection.inputMask : null,
        dataType: a.dataType,
        validationRegexp: a.validationRegexp,
        validationTooltip: a.validationTooltip,
        id: a.id,
        isPrimaryKey: a.isPrimaryKey,
        foreignTable: a.foreignTable,
        foreignSchema: schema,
        foreignTableName: tableName,
        foreignTableKeyColumn: a.foreignTableKeyColumn,
        showWhenSelected: a.showWhenSelected,
        isRegistryClassifierField: !!(registryClassifierList.find(x => x.registryFieldId === a.id)),
        registryClassifierColumns: registryClassifierList.find(x => x.registryFieldId === a.id) ? registryClassifierList.find(x => x.registryFieldId === a.id).classifierFields : null,
        classifierRegistry: registryClassifierList.find(x => x.registryFieldId === a.id) ? registryClassifierList.find(x => x.registryFieldId === a.id).classifierRegistry : null,
        foreignTableDisplayColumn: a.foreignTableDisplayColumn,
        foreignTableDisplayColumnParams: a.foreignTableDisplayColumn ? {
          isDate: foreignTableDisplayColumnDescription.dataType === 'date',
          isDateTime: foreignTableDisplayColumnDescription.dataType === 'timestamp without time zone' || foreignTableDisplayColumnDescription.dataType === 'timestamp with time zone',
          isText: foreignTableDisplayColumnDescription.dataType === 'text' || foreignTableDisplayColumnDescription.dataType === 'character varying',
          isNumeric: foreignTableDisplayColumnDescription.dataType === 'double precision' || foreignTableDisplayColumnDescription.dataType === 'integer' || foreignTableDisplayColumnDescription.dataType === 'numeric' || foreignTableDisplayColumnDescription.dataType === 'bigint',
          isBoolean: foreignTableDisplayColumnDescription.dataType === 'boolean',
          dataType: foreignTableDisplayColumnDescription.dataType
        } : null,
        manyToManyTable: a.manyToManyTable,
        manyToManyTableName: a.manyToManyTable ? a.manyToManyTable.substring(a.manyToManyTable.indexOf('.') + 1) : null,
        manyToManySchema: a.manyToManyTable ? a.manyToManyTable.substring(0, a.manyToManyTable.indexOf('.')) : null,
        manyToManyColumn: a.manyToManyColumn,
        manyToManyDisplayColumn: a.manyToManyDisplayColumn,
        manyToManySecondColumn: a.manyToManySecondColumn,
        isSystemAttribute: systemAttributes.includes(a.column)
      }
    })
  }

  return result
}

async function getTableColumns (tableName, schema, isManyToMany) {
  var primaryKeyQuery = `select
  x.column_name as column
from
  information_schema.table_constraints c
    join information_schema.key_column_usage x on x.constraint_name = c.constraint_name and x.constraint_schema = c.constraint_schema
where
  x.table_schema=? and x.table_name=? and c.constraint_type='PRIMARY KEY' `
  const primaryKeyColumn = await database.sequelize.query(primaryKeyQuery, {
    type: Sequelize.QueryTypes.SELECT,
    replacements: [schema, tableName]
  })

  const primaryKey = primaryKeyColumn && primaryKeyColumn.length > 0 ? primaryKeyColumn[0].column : null

  const resultColumns = await database.sequelize.query(
    `SELECT column_name, data_type, is_nullable FROM information_schema.columns
     WHERE table_schema = ?
       AND table_name   = ?`,
    {
      type: Sequelize.QueryTypes.SELECT,
      replacements: [schema, tableName]
    })
  return resultColumns.map(a => {
    const result = {
      key: a.column_name,
      dataType: a.data_type,
      notNull: a.is_nullable === 'NO',
      isPrimaryKey: a.column_name === primaryKey || (isManyToMany && a.column_name.indexOf('link_') === 0) || (!primaryKey && a.column_name === 'id')
    }
    if (result.isPrimaryKey) {
      result.autoIncrement = true
    }
    return result
  })
}

function getSequelizeType (dataType) {
  const sequelizeType = sequelizeTypeMappings[dataType]
  if (!sequelizeType) {
    throw new Error(`Not supported type ${dataType}`)
  }

  return sequelizeType
}

async function getTableMetadata (tableName, schema, isManyToMany) {
  var register = await database.spatialDataRegistry.findOne({
    where: {
      tableName: tableName
    },
    attributes: ['id']
  })
  if (register) {
    return memGetRegistryMetadata(register.id)
  }

  const columns = await getTableColumns(tableName, schema, isManyToMany)
  return {
    tableName: tableName,
    schema: schema,
    columns
  }
}

/**
   * Создать модель данных.
   * @param {Object} registry Реестр.
   * @param {Boolean} nested Создавать модели для внешних таблиц.
   */
async function createModel (registry, nested) {
  const belongRelations = []
  const manyToManyRelations = []
  const columns = {}
  for (let column of registry.columns) {
    if (!column.isManyToMany) {
      columns[column.key] = {
        type: getSequelizeType(column.dataType),
        allowNull: !column.notNull,
        primaryKey: column.isPrimaryKey,
        autoIncrement: column.isPrimaryKey
      }
    }
    if (nested && column.isClassifier) {
      const tableName = column.foreignTableName
      let classifierModel
      let isSelfLink = false
      if (tableName in database) {
        classifierModel = database[tableName]
      } else {
        if (registry.tableName === tableName) {
          classifierModel = null
          isSelfLink = true
        } else {
          const classifierModelData = await getTableMetadata(tableName, column.foreignSchema)
          classifierModelData.columns = classifierModelData.columns.filter(x => x.dataType !== 'USER-DEFINED')
          classifierModel = await createModel(classifierModelData, !!classifierModelData.name)
        }
      }
      belongRelations.push({
        model: classifierModel,
        isSelfLink: isSelfLink,
        options: {
          foreignKey: column.key,
          targetKey: column.foreignTableKeyColumn,
          as: column.id
        }
      })
    }
    if (nested && column.isManyToMany) {
      let manyModel = column.manyToManyTableName in database
      let bindModel = column.foreignTableName in database
      let isSelfLink = false
      if (manyModel && bindModel) {
        manyModel = database[column.manyToManyTableName]
        bindModel = database[column.foreignTableName]
      } else {
        if (!manyModel) {
          if (registry.tableName === column.manyToManyTableName) {
            manyModel = null
            isSelfLink = true
          } else {
            const manyModelData = await getTableMetadata(column.manyToManyTableName, column.manyToManySchema)
            manyModel = await createModel(manyModelData, !!manyModelData.name)
          }
        } else {
          manyModel = database[column.manyToManyTableName]
        }
        if (!bindModel) {
          bindModel = await createModel(await getTableMetadata(column.foreignTableName, column.foreignSchema, true), false)
        } else {
          bindModel = database[column.foreignTableName]
        }
      }
      const lastSection = column.id.split('-')[4]
      manyToManyRelations.push({
        isSelfLink: isSelfLink,
        model: manyModel,
        options: {
          through: bindModel,
          foreignKey: Object.keys(bindModel.rawAttributes).find(a => a.indexOf('link_') === 0),
          otherKey: column.foreignTableKeyColumn,
          as: lastSection
        }
      })
    }
  }

  var model = database.sequelize.define(
    registry.tableName,
    columns,
    {
      schema: registry.schema ? registry.schema : 'register',
      tableName: registry.tableName,
      freezeTableName: true,
      timestamps: false
      // hooks: {
      //   afterUpdate: (item, options) => {
      //     console.log('afterUpdate', item.id, registry.name)
      //   }
      // }
    }
  )

  // обновить отношения многие к одному
  belongRelations.forEach(belongModel => {
    if (belongModel.isSelfLink) {
      model.belongsTo(model, belongModel.options)
    } else {
      model.belongsTo(belongModel.model, belongModel.options)
    }
  })
  // TODO: сделать чтобы это заработало
  // //обновить отношения многие ко многим
  // manyToManyRelations.forEach(manyModel => {
  //   const rightModel = manyModel.model
  //   rightModel.belongsToMany(model, {
  //     through: manyModel.options.through,
  //     foreignKey: Object.keys(manyModel.options.through.rawAttributes).find(a => a.indexOf('link_') === -1),
  //     otherKey: model.primaryKeyAttribute
  //   })
  //   if (manyModel.isSelfLink) {
  //     model.belongsToMany(model, manyModel.options)
  //   } else {
  //     model.belongsToMany(manyModel.model, manyModel.options)
  //   }
  // })

  database[registry.tableName] = model
  return model
}

async function getRegistryModel (tableName) {
  const registiry = await database.spatialDataRegistry.findOne({
    where: { tableName }
  })

  if (!registiry) {
    return null
  }

  const registryMeta = await memGetRegistryMetadata(registiry.id)

  const registryModel = await createModel(registryMeta, true)
  return {
    registryModel,
    registryMeta
  }
}

async function getUserEnterprise (user) {
  const systemParam = await database.systemParameters.findOne()

  const registry = await memGetRegistryMetadata(systemParam.enterpiseRegisterLinkId)
  const model = await createModel(registry, true)

  const record = await model.findOne({
    where: {
      user_id: user.id
    }
  })

  if (!record) {
    return []
  }

  const spatialDataRegistryRecord = await database.spatialDataRegistry.findOne({
    where: {
      tableName: enterpriseTableName
    }
  })

  const spatialDataRegistryMeta = await memGetRegistryMetadata(spatialDataRegistryRecord.id)
  const spatialDataRegistryModel = await createModel(spatialDataRegistryMeta, true)

  return spatialDataRegistryModel.findOne({
    where: {
      id: record.enterprise_id
    }
  })
}

function setNoAccessToRegistryStatus (res, registry, action) {
  res.status(403).send(`Отсутствуют права на ${action.toLowerCase()} записи реестра "${registry.name}"`)
}

function setOktmoNoAccessToRegistryStatus (res, registry, action) {
  res.status(403).send(`Отсутствуют права на ${action.toLowerCase()} записи реестра "${registry.name}" по территориальному признаку`)
}

async function getRegistryQueryOptions ({
  page,
  size,
  filters,
  sorting,
  registry,
  user,
  model
}) {
  if (sorting.length === 0) {
    const primaryKey = registry.columns.find(a => a.isPrimaryKey).key
    sorting.push({ field: primaryKey, direction: 'asc' })
  }

  const classifiers = registry
    .columns
    .filter(x => x.isClassifier)

  const simpleFilters = filters
    .filter(x => !classifiers.find(c => c.key === x.field) || x.operator === '=')
  const classifierFilters = filters
    .filter(x => classifiers.find(c => c.key === x.field) && x.operator !== '=')

  const simpleSorting = sorting
    .filter(x => !classifiers.find(c => c.key === x.field))
  const classifierSorting = sorting
    .filter(x => classifiers.find(c => c.key === x.field))
    .map(x => ({
      ...x,
      column: classifiers.find(c => c.key === x.field)
    }))

  const options = getQueryOptions({ page, size, filters: simpleFilters, sorting: simpleSorting, mainModel: model })

  const optionsClassifierSorting = classifierSorting.map(x => ([{
    model: database[x.column.foreignTable.substring(x.column.foreignTable.indexOf('.') + 1)],
    as: x.column.id
  },
    x.column.foreignTableDisplayColumn,
    x.direction
  ]))

  options.order = options.order.concat(optionsClassifierSorting)
  options.include = classifiers
    .map(x => ({
      model: database[x.foreignTable.substring(x.foreignTable.indexOf('.') + 1)],
      attributes: [x.foreignTableDisplayColumn],
      as: x.id,
      where: getIncludeWhere(classifierFilters, x)
    }))

  // Записи по территориям, доступным пользователю.
  if (user && registry.urbanPlanningObjectId !== user.urbanPlanningObjectId) {
    const userOktmo = await user.getUserOktmo()
    options.where.oktmo_id = {
      $in: userOktmo.map(a => a.id)
    }
  }

  return options
}

function getIncludeWhere (filters, column) {
  const filter = filters.find(x => x.field === column.key)

  if (!filter || filter.value == null) {
    return
  }

  const foreignTableFilter = {
    field: column.foreignTableDisplayColumn,
    operator: filter.operator,
    value: filter.value
  }

  return getWhere(foreignTableFilter)
}

async function canRegistry (req, registryResource, action) {
  return req.user.can(registryResource, action)
}

/**
  * Сохранение записей многие ко многим.
  * @param {*} item Запись.
  * @param {*} registry Реестр.
*/
async function saveManyToMany (item, registry, recordId, transaction) {
  const manyColumns = registry.columns.filter(a => a.isManyToMany)
  for (let column of manyColumns) {
    if (!item[column.id]) {
      continue
    }

    const allObjects = await database.sequelize.query(`SELECT * FROM ${column.foreignTable} WHERE ${column.foreignTableKeyColumn} = ?`, {
      replacements: [recordId],
      type: Sequelize.QueryTypes.SELECT,
      transaction
    })

    const linkFieldName = column.manyToManySecondColumn
    const existings = allObjects.map(a => a[linkFieldName])
    const values = item[column.id]
    const newValues = []
    const removeValues = []
    for (let value of values) {
      if (!existings.includes(value)) {
        newValues.push(value)
      }
    }
    for (let existingValue of existings) {
      if (!values.includes(existingValue)) {
        removeValues.push(existingValue)
      }
    }

    for (let removeValue of removeValues) {
      await database.sequelize.query(`DELETE FROM ${column.foreignTable} WHERE ${column.foreignTableKeyColumn} = ? AND ${linkFieldName} = ?`, {
        replacements: [recordId, removeValue],
        transaction
      })
    }
    for (let addValue of newValues) {
      await database.sequelize.query(`INSERT INTO ${column.foreignTable}(${column.foreignTableKeyColumn},${linkFieldName}) VALUES (?,?)`, {
        replacements: [recordId, addValue],
        transaction
      })
    }
  }
}

function getFileInfo (fileName) {
  const fileExtension = path.extname(fileName)
  const fileNameWithoutExt = path.basename(fileName, fileExtension)
  return {
    name: fileNameWithoutExt,
    fileType: fileExtension
  }
}

async function addBigFiles (registryId, recordId, reqFiles, transaction) {
  for (const i of reqFiles) {
    const fileName = i.originalname
    const registerFile = await database.registerfile.create({
      content: null
    },
      {
        transaction
      }
    )
    const fileInfo = getFileInfo(fileName)
    await database.registerfileinfo.create({
      name: fileInfo.name,
      fileType: fileInfo.fileType,
      fileId: registerFile.id,
      recordId: recordId,
      registryId: registryId,
      isDefaultPreview: i.isDefaultPreview,
      externalStorageId: i.fileId
    },
      {
        transaction
      }
    )
  }
}

async function addFiles (registryId, recordId, reqFiles, transaction) {
  for (const i of reqFiles) {
    const fileName = i.originalname
    const registerFile = await database.registerfile.create({
      content: i.buffer
    },
      {
        transaction
      }
    )
    const fileInfo = getFileInfo(fileName)
    await database.registerfileinfo.create({
      name: fileInfo.name,
      fileType: fileInfo.fileType,
      fileId: registerFile.id,
      recordId: recordId,
      registryId: registryId,
      isDefaultPreview: i.isDefaultPreview,
      externalStorageId: null
    },
      {
        transaction
      }
    )
  }
}
async function addTurningPoints (registryId, recordId, turningPoints, transaction) {
  for (const turningPoint of turningPoints) {
    await database.registryTurningPoint.create({
      ...turningPoint,
      itemId: recordId,
      registryId: registryId
    },
      {
        transaction
      }
    )
  }
}
/**
 * Запись геометрию в историю изменений.
 * @param {*} registry Реестр.
 * @param {*} layer Слой.
 * @param {*} gisid Гис идентификатор.
 * @param {*} geometry Геометрия.
 */
async function writeGeometryHistory ({ registry, layer, gisid, geometry, projection, oktmoId, transaction }) {
  const { geometryColumn } = await getShapeColumnDescription(layer.schema, layer.featureClass)

  const wkid = await getWKID(layer, oktmoId)

  const updateQuery = `
  UPDATE  ${layer.schema}.${layer.featureClass}
  SET "end_date" = ?
  WHERE "${registry.spatialDataField}" = ? AND "end_date" IS NULL`
  await database.sequelize.query(updateQuery, {
    replacements: [new Date(), gisid],
    type: database.Sequelize.QueryTypes.INSERT,
    transaction
  })

  const insertQuery = `
  insert into ${layer.schema}.${layer.featureClass} (objectid,${geometryColumn}, "start_date","${registry.spatialDataField}")
  values (
    (SELECT COALESCE(MAX(objectid), 0) + 1 FROM ${layer.schema}.${layer.featureClass}),
    ST_Transform(ST_GeomFromText('${geometry}',${projection}),${wkid}),
    ?,
    ?
  )
  returning objectid`
  await database.sequelize.query(insertQuery, {
    replacements: [new Date(), gisid],
    type: database.Sequelize.QueryTypes.INSERT,
    transaction
  })
}
function parseGeometry (content) {
  // одна пустая строка разделяет полигоны
  // кольца разделяются как замкнутые фигуры (т.е. первая и последняя точка равны)
  const breakLine = '\n'
  // контент файла может содержать переводы строк в формате \r\n так и \n и даже смешанные
  /* eslint no-control-regex: "off" */
  content = content.replace(new RegExp('\r', 'g'), '')
  const polygons = content.split(breakLine + breakLine)
  const buildedPolygons = []
  for (const polygon of polygons) {
    if (polygon === '') {
      continue
    }
    const rings = [[]]
    const coordinates = polygon.split(breakLine)
    for (const coordinate of coordinates) {
      if (!coordinate) {
        continue
      }
      const data = coordinate.split(';')
      const point = `${data[1]} ${data[0]}`
      const lastRing = rings[rings.length - 1]
      // контур замыкается когда в кольце первая и последняя координата одинаковая
      if (lastRing.length > 0 && lastRing[0] === point) {
        lastRing.push(point)
        rings.push([])
        continue
      }
      const currentLastRing = rings[rings.length - 1]
      currentLastRing.push(point)
    }
    const savedRings = rings.filter(a => a.length > 0)
    const resultString = savedRings.map(a => {
      return `(${a.filter(i => i && i !== '').join(',')})`
    }).join(',')
    buildedPolygons.push(`(${resultString})`)
  }
  return `MULTIPOLYGON (${buildedPolygons.join(',')})`
}
async function writeGeometryWithoutHistory ({ registry, layer, objectId, geometry, projection, oktmoId, transaction }) {
  const wkid = await getWKID(layer, oktmoId)
  const { geometryColumn } = await getShapeColumnDescription(layer.schema, layer.featureClass)

  const query = `
    update  "${layer.schema}"."${layer.featureClass}" SET "${geometryColumn}" = ST_Transform(ST_GeomFromText('${geometry}',${projection}),${wkid}) WHERE "${registry.spatialDataField}" = ?`
  await database.sequelize.query(query, {
    replacements: [objectId],
    type: database.Sequelize.QueryTypes.INSERT,
    transaction
  })
}
async function getCountGeometries (registry, layer, gisid, transaction) {
  const query = `select COUNT(*) AS countGeometries FROM "${layer.schema}"."${layer.featureClass}" WHERE "${registry.spatialDataField}" = ?`
  const counts = await database.sequelize.query(query, {
    replacements: [gisid],
    type: database.Sequelize.QueryTypes.SELECT,
    transaction
  })
  return parseInt(counts[0].countgeometries)
}
/**
 * Изменить ГИС Идентификатор у записи реестра ПД.
 * @param {*} registry Реестр ПД.
 * @param {*} recordId Идентификатор записи.
 * @param {*} gisId ГИС Идентификатор.
 */
async function changeRecordGisId (registry, recordId, gisId, transaction) {
  const where = {}
  const primaryKey = registry.columns.find(a => a.isPrimaryKey).key
  const model = await createModel(registry, true)

  where[primaryKey] = recordId
  const record = await model.findOne({
    where: where,
    transaction
  })
  record[registry.mapIdField] = gisId
  await record.save({ transaction })
}
async function createRecordGeometry ({ registry, layer, projection, geometry, recordId, oktmoId, transaction }) {
  if (registry.storeHistory) {
    const primaryColumn = registry.columns.find(a => a.isPrimaryKey)
    const queryItems = `SELECT * FROM register."${registry.tableName}" WHERE "${primaryColumn.key}" = ?`
    const records = await database.sequelize.query(queryItems, {
      replacements: [recordId],
      type: database.Sequelize.QueryTypes.SELECT,
      transaction
    })

    const record = records[0]
    const gisid = record[registry.mapIdField]

    if (gisid) {
      await writeGeometryHistory({ registry, layer, gisid, geometry, projection, oktmoId, transaction })
      return gisid
    }
  }

  const wkid = await getWKID(layer, oktmoId)
  const { geometryColumn } = await getShapeColumnDescription(layer.schema, layer.featureClass)

  const query = `
    insert into "${layer.schema}"."${layer.featureClass}" (objectid,"${geometryColumn}")
    values ((SELECT COALESCE(MAX(objectid), 0) + 1 FROM "${layer.schema}"."${layer.featureClass}"), ST_Transform(ST_GeomFromText('${geometry}',${projection}),${wkid}))
    returning ${registry.spatialDataField || 'objectid'} AS objectid`
  const insertResult = await database.sequelize.query(query, { type: database.Sequelize.QueryTypes.INSERT })
  const newGisId = insertResult[0][0].objectid

  await changeRecordGisId(registry, recordId, newGisId, transaction)

  return newGisId
}

async function saveGeometryFromCsv ({ content, registryId, recordId, projection, oktmoId, transaction }) {
  const geometry = parseGeometry(content)
  const registry = await memGetRegistryMetadata(registryId)
  const layer = await database.layer.findOne({ where: { id: registry.layerId } })
  const primaryColumn = registry.columns.find(a => a.isPrimaryKey)

  const queryItems = `SELECT * FROM register."${registry.tableName}" WHERE "${primaryColumn.key}" = ?`
  const records = await database.sequelize.query(queryItems, {
    replacements: [recordId],
    type: database.Sequelize.QueryTypes.SELECT,
    transaction
  })

  const record = records[0]
  const gisid = record[registry.mapIdField]
  let countGeometries = 0
  if (gisid) {
    countGeometries = await getCountGeometries(registry, layer, gisid, transaction)
  }
  if (countGeometries === 0) {
    await createRecordGeometry({ registry, layer, projection, geometry, recordId, oktmoId, transaction })
  } else {
    if (registry.storeHistory) {
      await writeGeometryHistory({ registry, layer, gisid, geometry, projection, oktmoId, transaction })
    } else {
      await writeGeometryWithoutHistory({ layer, gisid, geometry, projection, oktmoId, transaction })
    }
  }
}
/**
 * Создать новую запись реестра.
 */
async function createItem (req, registry, cardData, files = [], transaction) {
  const model = await createModel(registry, true)
  const entity = await model.create(cardData, { transaction })
  const systemParam = await database.systemParameters.findOne({
    attributes: ['maxFileSize', 'filesStore']
  })
  const maxFileSize = systemParam.maxFileSize * (1024 * 1024)
  const filesStore = systemParam.filesStore
  const bigFiles = files.filter(x => {
    return x.size > maxFileSize
  })
  const smallFiles = files.filter(x => {
    return x.size <= maxFileSize
  })
  for (const bigFile of bigFiles) {
    const { data: result } = await axios.post(`${filesStore}/file/${encodeURIComponent(registry.resourceName)}`, bigFile.buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        Cookie: `connect.sid=${req.cookies['connect.sid']}`
      }
    })
    if (!result.fileId) {
      throw new Error(result.error)
      // res.status(400).end(result.error)
    }
    bigFile.fileId = result.fileId
  }
  const defaultPreview = getDefaultPreview(cardData.files, files)

  if (defaultPreview) {
    defaultPreview.isDefaultPreview = true
  }

  const primaryKey = registry.columns.find(a => a.isPrimaryKey).key

  for (const iterator of files) {
    if (path.extname(iterator.originalname).toLowerCase() === '.csv' && req.body.projection) {
      await saveGeometryFromCsv({
        content: iterator.buffer.toString(),
        registryId: registry.id,
        recordId: entity[primaryKey],
        projection: parseInt(req.body.projection),
        oktmoId: req.user.oktmo_id,
        transaction
      })
    }
  }

  await saveManyToMany(cardData, registry, entity[primaryKey], transaction)
  await addBigFiles(registry.id, entity[primaryKey], bigFiles, transaction)
  await addFiles(registry.id, entity[primaryKey], smallFiles, transaction)
  await addTurningPoints(registry.id, entity[primaryKey], cardData.turningPoints || [], transaction)

  return {
    registry,
    entity,
    primaryKey,
    [`${primaryKey}`]: entity[primaryKey]
  }
}
async function editItem (req, registryId, cardData, files, projection, transaction) {
  const registry = await memGetRegistryMetadata(registryId)

  const model = await createModel(registry, true)

  const systemParam = await database.systemParameters.findOne({
    attributes: ['maxFileSize', 'filesStore']
  })
  const maxFileSize = systemParam.maxFileSize * (1024 * 1024)
  const filesStore = systemParam.filesStore
  const bigFiles = files.filter(x => {
    return x.size > maxFileSize
  })
  const smallFiles = files.filter(x => {
    return x.size <= maxFileSize
  })
  for (const bigFile of bigFiles) {
    const { data: result } = await axios.post(`${filesStore}/file/${encodeURIComponent(registry.resourceName)}`, bigFile.buffer, {
      headers: {
        'Content-Type': 'application/octet-stream',
        Cookie: `connect.sid=${req.cookies['connect.sid']}`
      }
    })
    if (!result.fileId) {
      // res.status(400).end(result.error)
      throw new Error(result.error)
    }
    bigFile.fileId = result.fileId
  }
  const defaultPreview = getDefaultPreview(cardData.files, files)

  if (defaultPreview) {
    defaultPreview.isDefaultPreview = true
  }

  const primaryKeyColumn = registry.columns.find(a => a.isPrimaryKey).key
  const where = {}
  const primaryKeyValue = cardData[primaryKeyColumn]
  where[primaryKeyColumn] = primaryKeyValue

  registry.columns.filter(a => a.isNumeric && a.isNotNull).forEach(a => {
    const key = a.key
    if (key in cardData && cardData[key] == null) {
      cardData[key] = 0
    }
  })
  const item = await model.findOne({
    where: where,
    transaction
  })

  delete cardData[primaryKeyColumn]

  await item.update(cardData)

  await saveManyToMany(cardData, registry, where[primaryKeyColumn], transaction)

  for (const iterator of files) {
    if (path.extname(iterator.originalname).toLowerCase() === '.csv' && projection) {
      await saveGeometryFromCsv({
        content: iterator.buffer.toString(),
        registryId: registry.id,
        recordId: primaryKeyValue,
        projection: parseInt(req.body.projection),
        oktmoId: req.user.oktmo_id,
        transaction
      })
    }
  }
  const oldFilesIdFromClient = cardData.files.map(file => file.id)

  const oldFilesFromBaseFileinfo = await database.registerfileinfo.findAll({
    where: {
      recordId: primaryKeyValue
    },
    transaction
  })

  const oldFileInfosIdFromClient = oldFilesFromBaseFileinfo.filter(x => oldFilesIdFromClient.includes(x.fileId)).map(fileInfo => fileInfo.id)
  const oldFilesIdFromBaseFileinfo = oldFilesFromBaseFileinfo.map(el => el.fileId)
  const oldFilesInfoIdFromBaseFileinfo = oldFilesFromBaseFileinfo.map(el => el.id)

  const deletedFilesFromBaseFileinfo = _difference(oldFilesInfoIdFromBaseFileinfo, oldFileInfosIdFromClient)
  const deletedFilesBaseRegisterfile = _difference(oldFilesIdFromBaseFileinfo, oldFilesIdFromClient)

  for (const iterator of cardData.files) {
    const fileInfo = getFileInfo(iterator.filename)
    await database.registerfileinfo.update(
      {
        name: fileInfo.name,
        fileType: fileInfo.fileType,
        isDefaultPreview: iterator.isDefaultPreview
      },
      {
        where: {
          file_id: iterator.id
        }
      },
      transaction
    )
  }

  await database.registerfileinfo.destroy({
    where: {
      id: {
        $in: deletedFilesFromBaseFileinfo
      }
    },
    transaction
  })

  await database.registerfile.destroy({
    where: {
      id: {
        $in: deletedFilesBaseRegisterfile
      }
    },
    transaction
  })

  await addFiles(registry.id, primaryKeyValue, bigFiles, transaction)
  await addFiles(registry.id, primaryKeyValue, smallFiles, transaction)

  const oldTurningPoints = await database.registryTurningPoint.findAll({
    where: {
      registryId: registry.id,
      itemId: primaryKeyValue
    },
    transaction
  })
  const turningPointsDiff = getCollectionDiff(oldTurningPoints, cardData.turningPoints || [], 'id')

  if (turningPointsDiff.deleteItems.length) {
    await database.registryTurningPoint.destroy({
      where: {
        id: {
          $in: turningPointsDiff.deleteItems.map(x => x.id)
        }
      },
      transaction
    })
  }

  await addTurningPoints(registry.id, primaryKeyValue, turningPointsDiff.newItems, transaction)

  return {
    registry,
    primaryKeyValue,
    transaction,
    item
  }
}
async function deleteItem (registryModel, recordId, transaction, isDeleteLinks = false) {
  const model = await createModel(registryModel, true)
  const primaryKey = registryModel.columns.find(a => a.isPrimaryKey).key
  const where = {}
  where[primaryKey] = recordId
  const item = await model.findOne({
    where: where
  })
  await item.destroy({ transaction })

  if (isDeleteLinks) {
    // удалить все связи с разрабатываемыми документами
    const documentLinks = await getAllDocumentLinks(registryModel.id, recordId)
    for (let documentLink of documentLinks) {
      await database.registrySectionItem.destroy({
        where: {
          id: documentLink.id
        }
      }, { transaction })
    }
  }
  // удалить все файлы
  const fileInfos = await getAllFiles(registryModel.id, recordId)
  for (let fileInfo of fileInfos) {
    const file = await database.registerfile.findOne({
      where: {
        id: fileInfo.fileId
      }
    })
    await fileInfo.destroy({ transaction })
    await file.destroy({ transaction })
  }
}

async function getAllDocumentLinks (registryId, recordId) {
  return database.registrySectionItem.findAll({
    where: {
      registryItemId: recordId
    },
    include: [{
      model: database.registrySection,
      required: true,
      attributes: ['id', 'documentId'],
      where: {
        registryId: registryId
      }
    }]
  })
}

/**
 * Получить все файлы для записи реестра.
  */
async function getAllFiles (registryId, recordId) {
  return database.registerfileinfo.findAll({
    include: [
      {
        model: database.spatialDataRegistry,
        where: {
          id: registryId
        }
      },
      {
        model: database.registerfile,
        as: 'file',
        attributes: [[database.sequelize.fn('length', database.sequelize.col('content')), 'fileSize']]
      }
    ],
    where: {
      recordId: recordId
    },
    order: [['created', 'desc']]
  })
}

function mapFiles (file) {
  return file.map(file => {
    const filename = `${file.name}${file.fileType}`
    return {
      id: file.fileId,
      fileextension: file.fileType,
      filename,
      isImage: isImage(filename),
      shortname: file.name,
      created: moment(file.created).format('L'),
      mimeType: mime.lookup(filename),
      fileSize: file.file.fileSize,
      isDefaultPreview: file.isDefaultPreview
    }
  })
}

async function getFileSizeFromExternalStorage (req, file, filesStore) {
  if (file.externalStorageId) {
    const { data: res } = await axios.get(`${filesStore}/file/${file.externalStorageId}/info`, {
      headers: {
        Cookie: `connect.sid=${req.cookies['connect.sid']}`
      }
    })
    file.file.fileSize = res.size
  }
}

function invalidateRegistriesCache () {
  registryCacheCounter++
}

function getAssociateName (column) {
  return column.id
}

async function getItemSystemAttributes (item) {
  const systemAttributes = []
  if (item.author_id) {
    const author = await database.user.findOne({
      where: {
        id: item.author_id
      }
    })
    const authorFullname = author.name + ' ' + author.surname
    systemAttributes.push({ title: 'Кем создан', value: authorFullname })
  }
  if (item.editor_id) {
    const editor = await database.user.findOne({
      where: {
        id: item.editor_id
      }
    })
    const editorFullname = editor.name + ' ' + editor.surname
    systemAttributes.push({ title: 'Кем обновлен', value: editorFullname })
  }
  if (item.datecreated) {
    const dateCreated = moment().format(item.datecreated)
    systemAttributes.push({ title: 'Дата создания', value: dateCreated })
  }
  if (item.dateedited) {
    const dateEdited = moment().format(item.dateedited)
    systemAttributes.push({ title: 'Дата обновления', value: dateEdited })
  }
  if (item.approved !== null) {
    systemAttributes.push({ title: 'Утверждено', value: item.approved })
  }

  return systemAttributes
}

module.exports = {
  registriesRows,
  getLinkRows,
  getAutomaticRows,
  getRegistryMetadata,
  getTableColumns,
  createModel,
  getRegistryModel,
  getUserEnterprise,
  getTableMetadata,
  setNoAccessToRegistryStatus,
  setOktmoNoAccessToRegistryStatus,
  getRegistryQueryOptions,
  getIncludeWhere,
  canRegistry,
  saveManyToMany,
  getFileInfo,
  addFiles,
  createItem,
  editItem,
  getAllFiles,
  deleteItem,
  getFileSizeFromExternalStorage,
  mapFiles,
  createRecordGeometry,
  writeGeometryWithoutHistory,
  changeRecordGisId,
  getAllRegistriesMetaData,
  invalidateRegistriesCache,
  getAssociateName,
  getItemSystemAttributes
}
