'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const _difference = require('lodash/difference')
const _uniq = require('lodash/uniq')
const uuidv4 = require('uuid/v4')
const { getDb } = require('../database')
const database = getDb()
const actions = require('../auth/actions')
const resources = require('../auth/resources')
const { authorizeAction } = require('../auth')
const { getQueryOptions } = require('../utils/queryHelper')
const { getAllRegistriesMetaData } = require('../utils/registriesHelper')
const UserHelper = require('../utils/userHelper')
const userHelper = new UserHelper({ database })
const { getXlsxFile } = require('../utils/xlsxHelper')
const { getEntities, getEntityFields } = require('../utils/entityHelper')
const { registriesRows, getLinkRows, getAutomaticRows, invalidateRegistriesCache } = require('../utils/registriesHelper')
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })
const Op = database.Sequelize.Op
const AccessRestrictions = require('../database/models/public/enums/AccessRestrictions')
const EditorTypes = require('../database/models/public/enums/EditorTypes')
const EntityTypes = require('../database/models/public/enums/EntityTypes')
const sectionTypes = require('../database/models/public/enums/SectionTypes')

function getPage (array, page, pageSize) {
  const offset = (page - 1) * pageSize
  const end = offset + pageSize
  return array.slice(offset, end < array.length ? end : undefined)
}

class RegistriesController {
  get router () {
    const router = Router()

    router.get('/tables', authorizeAction(resources.registryAdministration, actions.read), wrap(this.getTables))
    router.get('/directory-urban-planning-types', authorizeAction(resources.registryAdministration, actions.read), wrap(this.getDirectoryUrbanPlanningTypes))
    router.get('/pd-card', authorizeAction(resources.registryAdministration, actions.read), wrap(this.getPdCards))
    router.post('/search', authorizeAction(resources.registry, actions.read), wrap(this.search))
    router.post('/registries', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getRegistries))
    router.get('/entities', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getEntities))
    router.post('/', authorizeAction(resources.spatialDataRegistry, actions.create), wrap(this.createRegistry))
    router.post('/export', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.exportXLSX))
    router.get('/subject-gd/:id', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getSubjectGd))
    router.get('/directory-layers/:id', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getDirectoryLayers))
    router.put('/:id', authorizeAction(resources.spatialDataRegistry, actions.update), wrap(this.updateRegistry))
    router.delete('/:id', authorizeAction(resources.spatialDataRegistry, actions.delete), wrap(this.deleteRegistry))
    router.post('/links/:id', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getLinks))
    router.get('/:id/fields', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getRegistrySpatialDataFields))
    router.get('/entities/:id/fields', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getEntitySpatialDataFields))
    router.get('/table/:name/fields', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getTableRows))
    router.get('/table/:tableName/autolinks', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getTableAutoLinks))
    router.get('/check-registry/:connectedId', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.checkRegistry))
    router.get('/:id', authorizeAction(resources.spatialDataRegistry, actions.read), wrap(this.getRegistryById))
    return router
  }

  async checkRegistry (req, res) {
    const connectedId = req.params.connectedId
    const layerSettings = await database.layerSettings.findAll({
      include: [database.layer]
    })
    const settingsFiltered = layerSettings.filter(x => x.settings && x.settings.connectedLayers && x.settings.connectedLayers.length)
    let linkIds = []
    for (const settings of settingsFiltered) {
      for (const item of settings.settings.connectedLayers) {
        linkIds.push(item.linkId)
      }
    }
    const result = linkIds.includes(connectedId)
    let layerName
    if (result) {
      const settings = settingsFiltered.find(x => x.settings.connectedLayers.find(xx => xx.linkId === connectedId))
      layerName = settings.layer.name
    }
    res.json({
      isUse: result,
      layerName: layerName || ''
    })
  }

  async getTableAutoLinks (req, res) {
    const { tableName } = req.params
    const automaticRows = await getAutomaticRows(tableName, req.user.oktmo_id)
    const result = mapSpatialDataFields(automaticRows, [])
    res.json(result)
  }

  async getTableRows (req, res) {
    const { name } = req.params

    const profile = await profileHelper.getProfile(req.user.oktmo_id, ['spatialDataRegistersSchema'])

    const fullTableName = `${profile.spatialDataRegistersSchema}.${name}`

    const fields = (await getTableFields(fullTableName))
      .map(x => ({
        dataType: x.datatype,
        alias: x.description || x.name,
        column: x.name,
        index: String(x.index),
        minValue: null,
        maxValue: null,
        validationRegexp: null,
        validationTooltip: null,
        displayFormat: null,
        notNull: x.notnull,
        isPrimaryKey: x.isprimarykey,
        foreignTable: x.foreigntableschema && x.foreigntablename
          ? `${x.foreigntableschema}.${x.foreigntablename}`
          : null,
        foreignTableKeyColumn: x.foreigntablekeycolumn,
        foreignTableDisplayColumn: null,
        editorType: EditorTypes.plain,
        isAutoGeneratedColumn: true,
        showWhenSelected: false
      }))

    const foreignTableFields = fields.filter(x => x.foreignTable)
    const foreignTables = _uniq(foreignTableFields.map(x => x.foreignTable))
    const foreignTableFieldsDict = {}
    for (const table of foreignTables) {
      const fields = await getTableFields(table)
      foreignTableFieldsDict[table] = fields.map(x => ({
        id: x.name,
        name: x.description || x.name
      }))
    }
    for (const foreignTableField of foreignTableFields) {
      foreignTableField.foreignTableFields = foreignTableFieldsDict[foreignTableField.foreignTable]
    }

    res.json(fields)
  }

  async getEntitySpatialDataFields (req, res) {
    const { id } = req.params
    const data = getEntityFields(id)
    res.json(data)
  }

  async getEntities (req, res) {
    const { id } = req.query
    const entitiesRows = getEntities()
    let queryOptions = {}

    if (id) {
      queryOptions = {
        where: {
          id: {
            [Op.ne]: id
          }
        }
      }
    }

    const spatialDataRegistryRows = (await database.spatialDataRegistry.findAll(queryOptions)).map(x => ({
      id: x.id,
      name: x.name,
      entityType: EntityTypes.registry
    }))

    const rows = [...entitiesRows, ...spatialDataRegistryRows]

    res.json(rows)
  }

  async getRegistrySpatialDataFields (req, res) {
    const { id } = req.params

    const data = (await database.spatial_data_registry_field.findAll({
      where: {
        spatialDataRegistryId: id
      }
    })).map(x => ({
      ...x.get({ plain: true }),
      name: x.alias
    }))

    res.json(data)
  }

  async getLinks (req, res) {
    const { id } = req.params
    const rows = await getFieldRows(id, req.user.oktmo_id)
    res.json(rows)
  }

  async exportXLSX (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body

    const queryOptions = getQueryOptions({ page, size, filters, sorting })
    queryOptions.include = [database.organization]

    const rows = await database.spatialDataRegistry.findAll(queryOptions)
      .map(x => ({
        'Название реестра': x.name,
        'Название таблицы': x.tableName,
        'Субъект ГД': x.organization.name
      }))

    const result = getXlsxFile(rows)
    const fileName = 'Реестры ПД'
    const encodedFileName = encodeURIComponent(fileName)
    res.writeHead(200, {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment;filename="${encodedFileName}"`
    })

    res.end(result)
  }

  async deleteRegistry (req, res) {
    const { id } = req.params

    const spatialDataRegistry = await database.spatialDataRegistry.findById(id, {
      include: [database.resource]
    })

    await database.sequelize.transaction(async transaction => {
      await database.resource.destroy({
        where: {
          id: spatialDataRegistry.resource.id
        },
        transaction
      })

      await database.action.destroy({
        where: {
          resourceCode: spatialDataRegistry.resource.code
        },
        transaction
      })

      await database.spatialDataRegistry.destroy({ where: { id }, transaction })

      const { registries: allRegistries = [] } = await getAllRegistriesMetaData()
      const registryFields = await database.spatial_data_registry_field.findAll({
        attributes: ['id'],
        where: {
          spatialDataRegistryId: id
        },
      }, transaction).map(el => el.id)

      for (const key in allRegistries) {
        let item = allRegistries[key]
        if (!item.linkedSpatialFields) {
          continue
        }
        const {
          value = item.linkedSpatialFields,
          update = false
        } = deleteExistingFields(item.linkedSpatialFields, registryFields)
        if (update) {
          await database.spatialDataRegistry.update({
            linkedSpatialFields: value
          },{
            where: {
              id: item.id
            },
            transaction
          })
        }
      }
      
      await database.spatial_data_registry_field.destroy({
        where: {
          spatialDataRegistryId: id
        },
        transaction
      })

      const links = (await getLinkRows(id)).map(x => x.id)

      await database.spatial_data_registry_links.destroy({
        where: {
          id: {
            $in: links
          }
        },
        transaction
      })

      const item = await database.section.findOne({
        where: {
          spatialDataRegistryId: id,
          type: sectionTypes.registrySection
        },
        transaction
      })
      if (item) {
        await database.section.destroy({
          where: {
            id: item.id
          },
          transaction
        })
        await database.moduleSection.destroy({
          where: {
            sectionId: item.id
          },
          transaction
        })
      } else {
        const group = await database.sectionSpatialDataRegistry.findAll({
          where: {
            spatialDataRegistryId: id
          },
          include: [
            {
              model: database.section,
              include: [
                {
                  paranoid: true,
                  model: database.sectionSpatialDataRegistry
                }
              ]
            }
          ],
          transaction
        })
        for (const { section = null } of group) {
          if (section && section.sectionSpatialDataRegistries && section.sectionSpatialDataRegistries.length === 1) {
            await database.section.destroy({
              where: {
                id: section.id
              },
              transaction
            })
            await database.moduleSection.destroy({
              where: {
                sectionId: section.id
              }
            })
          }
        }
      }
      await database.sectionSpatialDataRegistry.destroy({
        where: {
          spatialDataRegistryId: id
        },
        transaction
      })
    })

    invalidateRegistriesCache()

    res.end()
  }

  async updateRegistry (req, res) {
    const { id } = req.params
    const { atributes, links, territory } = req.body

    const automaticLinks = links.filter(x => x.automatic && x.linkedSpatialDataChecked)
      .map(x => ({
        'SpatialDataRegistryFieldId': x.id,
        'Alias': x.alias
      }))

    // поле nameField должно быть id типа uuid
    const { nameField, spatialDataFields, longitudeField, latitudeField } = atributes
    const nameFieldId = spatialDataFields.find(x => x.column === nameField).id

    const spatialDataFieldsLongitudeField = spatialDataFields.find(x => x.column === longitudeField)
    const longitudeFieldId = spatialDataFieldsLongitudeField ? spatialDataFieldsLongitudeField.id : null

    const spatialDataFieldsLatitudeField = spatialDataFields.find(x => x.column === latitudeField)
    const latitudeFieldId = spatialDataFieldsLatitudeField ? spatialDataFieldsLatitudeField.id : null

    const notAutomaticLinks = links.filter(x => !x.automatic)
    const updatedLinks = notAutomaticLinks.filter(x => x.id)
    const oldLinksIds = (await getLinkRows(id)).map(x => x.id)
    const updatedLinksIds = notAutomaticLinks.filter(x => x.id).map(x => x.id)
    const deletedLinksIds = _difference(oldLinksIds, updatedLinksIds)
    const newLinks = notAutomaticLinks.filter(x => !x.id)

    const linkedSpatialFields = JSON.stringify(automaticLinks)

    const spatialDataRegistry = await database.spatialDataRegistry.findOne({
      where: {
        id: id
      }
    })

    const resourceId = spatialDataRegistry.resourceId
    await database.sequelize.transaction(async transaction => {
      await database.resource.update(
        { name: atributes.name },
        {
          where: {
            id: resourceId
          },
          transaction
        })

      await database.spatialDataRegistry.update({
        name: atributes.name,
        nameFieldId: nameFieldId,
        latitudeFieldId: latitudeFieldId,
        longitudeFieldId: longitudeFieldId,
        urbanPlanningTypeId: atributes.urbanPlanningTypeId,
        coordinateProjectionId: atributes.coordinateProjectionId,
        urbanPlanningObjectId: atributes.organization && atributes.organization.id,
        oktmoId: territory.id,
        spatialDataPdId: atributes.spatialDataPd && atributes.spatialDataPd.id,
        layerId: atributes.layerId,
        spatialDataField: atributes.spatialDataField,
        mapIdField: atributes.mapIdField,
        oktmoField: atributes.oktmoField,
        storeHistory: atributes.storeHistory,
        allowImportedGeometryEdit: atributes.allowImportedGeometryEdit,
        useTurningPoints: atributes.useTurningPoints,
        linkedSpatialFields
      }, { where: { id }, transaction })

      for (const field of atributes.spatialDataFields) {
        const { id, ...fieldParams } = field
        await database.spatial_data_registry_field.update(fieldParams,
          { where: { id: field.id }, transaction })
      }

      await database.spatial_data_registry_links.destroy({
        where: {
          id: {
            $in: deletedLinksIds
          }
        },
        transaction
      })

      await updateNotAutomaticLinks({ updatedLinks, newLinks, transaction })
    })

    invalidateRegistriesCache()

    res.end()
  }

  async createRegistry (req, res) {
    const { atributes, links, territory } = req.body

    const automaticLinks = links.filter(x => x.automatic && x.linkedSpatialDataChecked)
      .map(x => ({
        'SpatialDataRegistryFieldId': x.id,
        'Alias': x.alias
      }))

    const notAutomaticLinks = links.filter(x => !x.automatic)
    const linkedSpatialFields = JSON.stringify(automaticLinks)

    const newResource = {
      id: uuidv4(),
      code: uuidv4(),
      name: atributes.name,
      category: 'Реестры ПД'
    }

    const result = await database.sequelize.transaction(async transaction => {
      await database.action.create({ resourceCode: newResource.code, name: 'Чтение' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Удаление' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Создание' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Изменение' }, { transaction })
      await database.resource.create(newResource, { transaction })

      const createdObject = await database.spatialDataRegistry.create({
        name: atributes.name,
        tableName: atributes.tableName,
        urbanPlanningTypeId: atributes.urbanPlanningTypeId,
        coordinateProjectionId: atributes.coordinateProjectionId,
        urbanPlanningObjectId: atributes.organization.id,
        oktmoId: territory.id,
        spatialDataPdId: atributes.spatialDataPd.id,
        layerId: atributes.layerId,
        spatialDataField: atributes.spatialDataField,
        mapIdField: atributes.mapIdField,
        oktmoField: atributes.oktmoField,
        storeHistory: atributes.storeHistory,
        allowImportedGeometryEdit: atributes.allowImportedGeometryEdit,
        useTurningPoints: atributes.useTurningPoints,
        linkedSpatialFields,
        isOks: false,
        resourceId: newResource.id
      }, { transaction })

      // в nameField ниже записывается id созданного филда
      let nameFieldId
      let longitudeFieldId
      let latitudeFieldId

      for (const field of atributes.spatialDataFields) {
        const newField = { ...field, spatialDataRegistryId: createdObject.id }
        const linkFields = notAutomaticLinks.filter(x => x.spatialDataFieldId === field.column)
        const createdField = await database.spatial_data_registry_field.create(newField, { transaction })
        for (const linkField of linkFields) {
          linkField.fieldId = createdField.id
        }
        if (createdField.column === atributes.nameField) {
          nameFieldId = createdField.id
        }
        if (createdField.column === atributes.longitudeField) {
          longitudeFieldId = createdField.id
        }
        if (createdField.column === atributes.latitudeField) {
          latitudeFieldId = createdField.id
        }
      }

      await createdObject.update({
        nameFieldId,
        latitudeFieldId,
        longitudeFieldId
      }, { transaction })

      for (const link of notAutomaticLinks) {
        await database.spatial_data_registry_links.create({
          fieldId: link.fieldId,
          linkType: link.registry.entityType,
          linkedFieldId: link.linkedSpatialDataFieldId,
          entityTableColumnName: link.entityTableColumnName,
          alias: link.alias,
          use: link.linkedSpatialDataChecked
        }, { transaction })
      }

      return createdObject
    })

    invalidateRegistriesCache()

    res.json({ id: result.id, name: result.name })
  }

  async getPdCards (req, res) {
    const { registryId } = req.query
    let spatialDataRegistry
    if (registryId && registryId !== 'undefined') {
      spatialDataRegistry = await database.spatialDataRegistry.findAll({
        where: {
          id: {
            [Op.ne]: registryId
          }
        }
      })
    } else {
      spatialDataRegistry = await database.spatialDataRegistry.findAll()
    }
    const layersIds = spatialDataRegistry.map(x => x.layerId).filter(x => x)

    let rows = await database.spatialDataPd.findAll({
      include: [
        database.thematicSection,
        {
          model: database.spatialDataGd,
          required: true
        },
        {
          model: database.organization,
          as: 'owner'
        },
        {
          model: database.layersGroup,
          include: [database.layer]
        }
      ]
    })

    rows = rows.map(x => ({
      ...spatialDataPdMap(x),
      layersGroup: x.layersGroups,
      name: x.spatialDataGd.name,
      accessRestriction: x.accessRestriction || AccessRestrictions.public,
      owner: x.owner,
      ownerName: x.owner ? x.owner.name : '',
      status: x.status,
      thematicSectionName: x.thematicSection ? x.thematicSection.name : '',
      accessRestrictionName: AccessRestrictions.toDisplayName(x.accessRestriction || AccessRestrictions.public)
    }))

    for (const row of rows) {
      row.layers = []
      for (const group of row.layersGroup) {
        for (const layer of group.layers) {
          row.layers.push(layer)
        }
      }
    }

    let resultRows = []

    for (const row of rows) {
      if (row.layers.some(x => !layersIds.includes(x))) {
        resultRows.push(row)
      }
    }

    res.json(resultRows)
  }

  async getDirectoryLayers (req, res) {
    const { registryId } = req.query
    let spatialDataRegistry
    if (registryId && registryId !== 'undefined') {
      spatialDataRegistry = await database.spatialDataRegistry.findAll({
        where: {
          id: {
            [Op.ne]: registryId
          }
        }
      })
    } else {
      spatialDataRegistry = await database.spatialDataRegistry.findAll()
    }
    const layersIds = spatialDataRegistry.map(x => x.layerId).filter(x => x)
    const { id } = req.params
    const layers = (await database.layer.findAll(
      {
        include: database.layersGroup,
        where: {
          '$layersGroup.spatial_data_id$': id
        },
        order: ['name']
      }))

    const resultLayers = layers.filter(x => !layersIds.includes(x))
    res.json(resultLayers)
  }

  async getDirectoryUrbanPlanningTypes (req, res) {
    const urbanPlanningTypes = (await database.urbanPlanningType.findAll())
      .map(x => ({ id: x.id, name: x.name }))
    res.json(urbanPlanningTypes)
  }

  async getSubjectGd (req, res) {
    const urbanPlanningTypeId = req.params.id

    const rows = (await database.organization.findAll({
      include: [
        database.oktmo,
        {
          model: database.urbanPlanningType,
          where: {
            id: urbanPlanningTypeId
          }
        }
      ]
    })).map(x => ({
      id: x.id,
      name: x.name,
      urbanPlanningTypeName: x.urbanPlanningType.name,
      oktmoName: x.oktmo.name
    }))

    res.json(rows)
  }

  async getTables (req, res) {
    const profile = await profileHelper.getProfile(req.user.oktmo_id, ['spatialDataRegistersSchema'])

    const sql = 'SELECT table_name as tableName, ' +
      '(select description from pg_description join pg_class on pg_description.objoid = pg_class.oid join pg_namespace on pg_class.relnamespace = pg_namespace.oid' +
      ' where relname = table_name and nspname=table_schema and pg_description.objsubid=0) as description ' +
      'FROM information_schema.tables ' +
      `WHERE table_schema = ? AND table_name LIKE 'ref_%' ` +
      'AND ' +
      '(table_name NOT IN (SELECT "table_name" FROM "public"."spatial_data_registry" WHERE "table_name" IS NOT NULL AND NOT is_deleted)) ' + ' ORDER BY table_name'

    const rows = await database.sequelize.query(sql,
      {
        replacements: [profile.spatialDataRegistersSchema],
        type: database.Sequelize.QueryTypes.SELECT
      })

    res.json(rows)
  }

  async getRegistryById (req, res) {
    const id = req.params.id

    const registry = await database.spatialDataRegistry.findById(id, {
      include: [
        database.organization,
        database.oktmo,
        database.layer,
        {
          model: database.spatial_data_registry_field,
          as: 'fields'
        },
        {
          model: database.spatial_data_registry_field,
          as: 'nameField'
        },
        {
          model: database.spatial_data_registry_field,
          as: 'longitudeField'
        },
        {
          model: database.spatial_data_registry_field,
          as: 'latitudeField'
        },
        {
          model: database.spatialDataPd,
          include: database.spatialDataGd
        }
      ]
    })

    const spatialDataFields = registry.fields.map(x => ({
      ...x.get({ plain: true }),
      index: x.index,
      editorTypeName: EditorTypes.toDisplayName(x.editorType)
    }))

    const foreignTableFields = spatialDataFields.filter(x => x.foreignTable)

    for (const foreignTableField of foreignTableFields) {
      const fields = await getTableFields(foreignTableField.foreignTable)
      foreignTableField.foreignTableFields = fields.map(x => ({ id: x.name, name: x.description || x.name }))
    }

    res.json({
      id: registry.id,
      name: registry.name,
      tableName: registry.tableName,
      urbanPlanningTypeId: registry.urbanPlanningTypeId,
      organization: registry.organization,
      oktmo: registry.oktmo,
      isOks: registry.isOks,
      spatialDataPd: spatialDataPdMap(registry.spatialDataPd),
      spatialDataPdId: registry.spatial_data_pd_id,
      layer: registry.layer,
      layerId: registry.layerId,
      spatialDataFields,
      spatialDataField: registry.spatialDataField,
      mapIdField: registry.mapIdField,
      oktmoField: registry.oktmoField,
      storeHistory: registry.storeHistory,
      nameField: registry.nameField ? registry.nameField.column : null,
      latitudeField: registry.latitudeField ? registry.latitudeField.column : null,
      longitudeField: registry.longitudeField ? registry.longitudeField.column : null,
      coordinateProjectionId: registry.coordinateProjectionId,
      allowImportedGeometryEdit: registry.allowImportedGeometryEdit,
      useTurningPoints: registry.useTurningPoints
    })
  }

  async getRegistries (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body

    const queryOptions = getQueryOptions({ page, size, filters, sorting })
    queryOptions.include = [database.organization]

    const rows = await database.spatialDataRegistry.findAll(queryOptions)

    const count = await database.spatialDataRegistry.count({
      where: queryOptions.where,
      include: queryOptions.include
    })

    const plainRows = rows
      .map(x => x.get({ plain: true }))
      .map(x => ({
        id: x.id,
        name: x.name,
        tableName: x.tableName,
        organization: x.organization ? x.organization.name : null
      }))

    res.json({ rows: plainRows, count })
  }

  async search (req, res) {
    const groupId = req.body.groupId

    // TODO несколько фильтров для одной колонки
    const filters = req.body.params.filters
    const where = filters
      .map(x => {
        const filter = {
          [x.field]: {}
        }
        if (x.value != null && x.value !== '') {
          filter[x.field][database.Sequelize.Op.iLike] = `%${x.value}%`
        }
        if (x.hideEmpty !== null) {
          filter[x.field][database.Sequelize.Op.ne] = null
        }
        return filter
      })
    where.push({ is_deleted: false })
    if (groupId) {
      const registriesIds = (await database.sectionSpatialDataRegistry.findAll({
        where: {
          sectionId: groupId
        }
      })).map(x => x.spatialDataRegistryId)
      where.push({
        id: {
          [Op.in]: registriesIds
        }
      })
    }
    const order = req.body.params.sorting
      .map(x => [x.field, x.direction])

    const permissions = await userHelper.getUserPermissions(req.user)

    const items = await database
      .spatialDataRegistry
      .findAll({
        attributes: ['id', 'name', 'resourceId'],
        where,
        order
      })
      // TODO можно использовать JOIN для фильтрация реестров по правам доступа,
      // тогда можно будет перенести разбиение на страницы в базу данных.
      .filter(x => userHelper.isResourceIdActionAllowed({ permissions, resourceId: x.resourceId, actionName: actions.read }))
      .map(x => ({
        id: x.id,
        name: x.name,
        claims: {
          read: userHelper.isResourceIdActionAllowed({ permissions, resourceId: x.resourceId, actionName: actions.read }),
          update: userHelper.isResourceIdActionAllowed({ permissions, resourceId: x.resourceId, actionName: actions.update }),
          delete: userHelper.isResourceIdActionAllowed({ permissions, resourceId: x.resourceId, actionName: actions.delete }),
          create: userHelper.isResourceIdActionAllowed({ permissions, resourceId: x.resourceId, actionName: actions.create })
        }
      }))

    res.json({
      // TODO заменить на _.drop, _.take
      items: getPage(items, req.body.params.page, req.body.params.size),
      count: items.length
    })
  }
}

function spatialDataPdMap (params) {
  return params ? { id: params.id, name: params.spatialDataGd.name } : null
}

async function getTableFields (tableName) {
  const [schema, name] = tableName.split('.')

  const sql = `
    SELECT columns.table_schema, columns.table_name, column_name as Name,
   (SELECT description
    FROM pg_attribute join pg_description on (attnum=pg_description.objsubid and attrelid=pg_description.objoid) join pg_class on pg_description.objoid = pg_class.oid join pg_namespace on pg_class.relnamespace = pg_namespace.oid
    WHERE pg_class.relname =$name and pg_namespace.nspname=$schema and attname=column_name
   ) as description,
   CASE WHEN is_nullable='YES' THEN false ELSE true END as NotNull,
   CASE WHEN data_type<>'USER-DEFINED' THEN data_type ELSE udt_name END as DataType,
   CASE WHEN constraint_type = 'PRIMARY KEY' THEN true ELSE false END as IsPrimaryKey,
   CASE WHEN constraint_type = 'PRIMARY KEY' THEN null ELSE fk_table_schema END as ForeignTableSchema,
   CASE WHEN constraint_type = 'PRIMARY KEY' THEN null ELSE fk_table_name END as ForeignTableName,
   CASE WHEN constraint_type = 'PRIMARY KEY' THEN null ELSE fk_table_key_column END as ForeignTableKeyColumn,
   ordinal_position as Index
   FROM information_schema.columns
   LEFT JOIN
   (
   select x.table_name,
         x.table_schema,
       'FOREIGN KEY' as constraint_type,
       x.column_name as fk_column_name,
       y.table_schema as fk_table_schema,
       y.table_name as fk_table_name,
       y.column_name as fk_table_key_column
   from information_schema.referential_constraints c
   join information_schema.key_column_usage x
       on x.constraint_name = c.constraint_name
       and x.constraint_schema = c.constraint_schema
   join information_schema.key_column_usage y
       on y.ordinal_position = x.position_in_unique_constraint
       and y.constraint_schema = c.unique_constraint_schema
       and y.constraint_name = c.unique_constraint_name
   where x.table_schema=$schema and x.table_name=$name
   union all
   select x.table_name,
         x.table_schema,
         c.constraint_type,
         x.column_name as fk_column_name,
         x.table_schema as fk_table_schema,
         x.table_name as fk_table_name,
         x.column_name as fk_table_key_column
   from information_schema.table_constraints c
   join information_schema.key_column_usage x
       on x.constraint_name = c.constraint_name
       and x.constraint_schema = c.constraint_schema
   where x.table_schema=$schema and x.table_name=$name and c.constraint_type='PRIMARY KEY'
   ) AS fk
   ON columns.column_name = fk.fk_column_name AND fk.table_name = columns.table_name
   AND fk.table_schema=columns.table_schema
   WHERE columns.table_schema = $schema AND columns.table_name = $name
   ORDER BY ordinal_position`

  const rows = await database.sequelize.query(sql,
    {
      bind: { schema, name },
      type: database.Sequelize.QueryTypes.SELECT
    })
  return rows
}

function linkedField (linkedFields, spatialDataRegistryField) {
  const field = linkedFields.find(x => x.SpatialDataRegistryFieldId === spatialDataRegistryField.id)
  if (field) {
    return {
      checked: true,
      name: field.Alias
    }
  }
  return {
    checked: false,
    name: spatialDataRegistryField.alias
  }
}

function mapSpatialDataFields (rows, linkedFields) {
  return rows.map(x => ({
    id: x.id,
    name: x.spatialDataRegistry.name,
    linkedSpatialDataField: x.alias,
    alias: linkedField(linkedFields, x).name,
    linkedSpatialDataChecked: linkedField(linkedFields, x).checked,
    automatic: true
  }))
}

async function getFieldRows (id, oktmoId) {
  const spatialDataFields = await getSpatialDataFieldRows(id, oktmoId)
  const spatialDataLinks = await getLinkRows(id)

  return [...spatialDataFields, ...spatialDataLinks]
}

async function getSpatialDataFieldRows (id, oktmoId) {
  const { linkedFields, rowsSpatialDataFields } = await registriesRows(id, oktmoId)
  return mapSpatialDataFields(rowsSpatialDataFields, linkedFields)
}

async function updateNotAutomaticLinks ({ updatedLinks, newLinks, transaction }) {
  for (const link of updatedLinks) {
    await database.spatial_data_registry_links.update({
      alias: link.alias,
      use: link.linkedSpatialDataChecked,
      fieldId: link.spatialDataFieldId,
      linkedFieldId: link.linkedSpatialDataFieldId,
      linkType: link.linkType,
      entityTableColumnName: link.entityTableColumnName
    }, { where: { id: link.id }, transaction })
  }

  for (const newLink of newLinks) {
    await database.spatial_data_registry_links.create({
      alias: newLink.alias,
      use: newLink.linkedSpatialDataChecked,
      fieldId: newLink.spatialDataFieldId,
      linkedFieldId: newLink.linkedSpatialDataFieldId,
      linkType: newLink.registry.entityType,
      entityTableColumnName: newLink.entityTableColumnName
    }, { transaction })
  }
}

function deleteExistingFields (linkedSpatialFieldsItem, fields) {
  const existingFields = fields.filter(f => new RegExp(f).test(linkedSpatialFieldsItem))
  if (!existingFields.length) {
    return {
      value: linkedSpatialFieldsItem,
      update: false
    }
  }
  let fieldsItem = JSON.parse(linkedSpatialFieldsItem)
  if (!Array.isArray(fieldsItem)) {
    return {
      value: linkedSpatialFieldsItem,
      update: false
    }
  }
  fieldsItem = fieldsItem.filter(item => {
    return !existingFields.includes(item.SpatialDataRegistryFieldId)
  })
  return {
    value: JSON.stringify(fieldsItem),
    update: true
  }
}
module.exports = RegistriesController
