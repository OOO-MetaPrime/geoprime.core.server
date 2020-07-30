'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const _omit = require('lodash/omit')
const uuidv4 = require('uuid/v4')
const _sortBy = require('lodash/sortBy')
const { getDb } = require('../database')
const database = getDb()
const resources = require('../auth/resources')
const actions = require('../auth/actions')
const { authorizeAction } = require('../auth')
const { getQueryOptions } = require('../utils/queryHelper')
const SectionTypes = require('../database/models/public/enums/SectionTypes')
const { destroyResource } = require('../utils/resourceHelper')
const UserHelper = require('../utils/userHelper')
const userHelper = new UserHelper({ database })

function canAccessResource (permissions, resourceId) {
  return userHelper.isResourceIdActionAllowed({ permissions, resourceId, actionName: actions.read })
}

class ModulesController {
  get router () {
    const router = Router()

    router.get('/', wrap(this.index))
    router.get('/:id', authorizeAction(resources.module, actions.read), wrap(this.getModule))
    router.post('/filter', authorizeAction(resources.module, actions.read), wrap(this.filterModules))
    router.post('/:id/sections', authorizeAction(resources.module, actions.read), wrap(this.getModulesSections))
    router.post('/', authorizeAction(resources.module, actions.create), wrap(this.createModule))
    router.delete('/:id', authorizeAction(resources.module, actions.delete), wrap(this.deleteModule))
    router.put('/:id', authorizeAction(resources.module, actions.update), wrap(this.updateModule))
    router.post('/:moduleId/module-section/search', wrap(this.filterSections))
    router.get('/module-section/request-types', wrap(this.searchRequestTypes))
    router.get('/module-section/document-types', wrap(this.searchDocumentTypes))
    router.get('/module-section/check-section/:id', wrap(this.checkSection))
    router.get('/module-section/:id', authorizeAction(resources.section, actions.read), wrap(this.getModuleSectionById))
    router.post('/:moduleId/module-section', authorizeAction(resources.section, actions.create), wrap(this.createModuleSection))
    router.delete('/module-section/:id', authorizeAction(resources.section, actions.delete), wrap(this.destroyModuleSection))

    return router
  }

  async searchRequestTypes (req, res) {
    const result = await database.requestType.findAll()

    res.json(result)
  }

  async searchDocumentTypes (req, res) {
    const result = await database.developedDocumentType.findAll()

    res.json(result)
  }

  async checkSection (req, res) {
    const sectionId = req.params.id
    const section = await database.section.findOne({
      include: [{
        model: database.resource,
        attributes: ['code']
      }],
      where: {
        id: sectionId
      }
    })

    res.json({
      isDeleted: !section,
      canAccess: section ? await req.user.can(section.resource.code, actions.read) : false
    })
  }

  async destroyModuleSection (req, res) {
    const moduleSectionId = req.params.id

    await database.sequelize.transaction(async transaction => {
      const { id, sectionId } = await database.moduleSection.findById(moduleSectionId)

      if (!id && !sectionId) {
        res.status(400).end()
      }

      await database.moduleSection.destroy({
        where: { id },
        transaction
      })
      await destroySection(sectionId, transaction)
    })
    res.end()
  }

  async createModuleSection (req, res) {
    const moduleId = req.params.moduleId
    const section = req.body
    let result
    switch (section.type) {
      case SectionTypes.baseSection:
        result = await createBaseSection(section, moduleId)
        break
      case SectionTypes.registrySection:
        result = await createRegistrySection(section, moduleId)
        break
      case SectionTypes.groupRegistrySections:
        result = await createRegistryGroupSection(section, moduleId)
        break
      default:
        res.status(400).end()
        return
    }
    res.json(result)
  }

  async getModuleSectionById (req, res) {
    const id = req.params.id
    const moduleSection = await database.moduleSection.findOne({
      include: [
        {
          model: database.sectionRequestType,
          include: [
            {
              model: database.requestType,
              paranoid: true
            }
          ]
        },
        {
          model: database.sectionDocumentType,
          include: [
            {
              model: database.developedDocumentType,
              paranoid: true
            }
          ]
        }
      ],
      where: {
        id
      }
    })
    const section = await database.section.findById(moduleSection.sectionId, {
      include: [
        database.spatialDataRegistry,
        database.resource,
        {
          model: database.sectionSpatialDataRegistry,
          required: false,
          include: [{
            required: false,
            model: database.spatialDataRegistry
          }]
        }
      ]
    })
    res.json({
      id,
      sectionId: section.id,
      resource: section.resource,
      registry: section.spatialDataRegistry,
      groupName: section.resource.name,
      requestTypes: moduleSection.sectionRequestTypes.filter(el => el.requestType).map(x => ({
        id: x.requestType.id,
        name: x.requestType.name
      })),
      documentTypes: moduleSection.sectionDocumentTypes.filter(el => el.developedDocumentType).map(x => ({
        id: x.developedDocumentType.id,
        name: x.developedDocumentType.name
      })),
      registryGroup: section.sectionSpatialDataRegistries.filter(x => x.spatialDataRegistry).map(x => ({
        id: x.spatialDataRegistryId,
        name: x.spatialDataRegistry.name
      })),
      orderNumber: moduleSection.orderNumber,
      type: section.type
    })
  }

  async filterSections (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body

    const moduleId = req.params.moduleId
    const moduleSections = await database.moduleSection.findAll({
      where: { moduleId },
      attributes: ['sectionId']
    })
    const sectionIdList = moduleSections.map(x => x.sectionId)
    filters.push({ field: 'id', operator: '$notIn', value: sectionIdList })
    filters.push({ field: 'type', operator: '=', value: SectionTypes.baseSection })

    const queryOptions = getQueryOptions({ page, size, filters, sorting })
    queryOptions.include = [database.resource]
    const sections = await database.section.findAll(queryOptions)
    const count = await database.section.count(_omit(queryOptions, ['limit', 'offset']))

    res.json({
      rows: sections.map(x => ({
        ...x.get({ plain: true }),
        resourceName: x.resource.name
      })),
      count
    })
  }

  async index (req, res) {
    const modules = await database.module.findAll({
      attributes: ['id', 'moduleId', 'resourceId', 'link', 'isUserModule', 'orderNumber'],
      order: ['orderNumber', [{ model: database.resource }, 'name', 'ASC']],
      include: [
        {
          separate: true,
          model: database.moduleSection,
          order: ['orderNumber', [{ model: database.section }, { model: database.resource }, 'name', 'ASC']],
          include: [{
            required: true,
            model: database.section,
            attributes: ['id', 'sectionId', 'resourceId', 'link'],
            include: [{
              required: true,
              model: database.resource,
              attributes: ['id', 'code', 'name']
            }]
          }]
        },
        {
          required: true,
          model: database.resource,
          attributes: ['id', 'code', 'name']
        }
      ]
    })

    const permissions = await userHelper.getUserPermissions(req.user)

    const result = modules.map(x => x.get({ plain: true }))

    const allowedModules = result.filter(x => canAccessResource(permissions, x.resourceId))

    res.json(allowedModules
      .map(x => ({
        id: x.id,
        moduleId: x.moduleId,
        isUserModule: x.isUserModule,
        resourceId: x.resourceId,
        link: x.link,
        sections: _sortBy(x.moduleSections, ['orderNumber', 'section.resource.name'])
          .map(x => x.section)
          .filter(s => s !== null && s.resource && canAccessResource(permissions, s.resourceId)),
        resource: x.resource
      }))
      .filter(x => x.sections.length)
    )
  }

  async getModule (req, res) {
    const { id } = req.params
    const module = await database.module.findById(id, {
      include: [
        database.resource,
        {
          model: database.moduleSection,
          include: [{
            model: database.section,
            include: [database.resource]
          }]
        }
      ]
    })

    res.json({
      link: module.link,
      number: module.orderNumber,
      sections: module.moduleSections.map(x => x.section),
      name: module.resource.name
    })
  }

  async filterModules (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body

    // const simpleFilters = filters.filter(x => x.field !== `$resource.name$`)
    // const lookupFilter = filters.find(x => x.field === `$resource.name$`)

    const queryOptions = getQueryOptions({ page, size, filters, sorting })

    queryOptions.include = [
      {
        model: database.resource,
        required: true,
        attributes: ['id', 'code', 'name']
      }
    ]

    const rows = (await database.module
      .findAll(queryOptions))
      .map(x => ({
        id: x.id,
        created: x.created,
        resourceName: x.resource.name,
        createdBy: x.createdBy,
        updated: x.updated,
        orderNumber: x.orderNumber,
        link: x.link,
        isUserModule: x.isUserModule
      }))

    const count = await database.module.count({
      where: queryOptions.where,
      include: queryOptions.include
    })

    res.json({ rows, count })
  }

  async getModulesSections (req, res) {
    const {
      page,
      size,
      filters = [],
      sorting = [{ field: 'id', direction: 'asc' }]
    } = req.body
    const id = req.params.id
    filters.push({ field: 'moduleId', operator: '=', value: id })
    const queryOptions = getQueryOptions({ page, size, filters, sorting })

    queryOptions.include = [{
      model: database.section,
      include: [database.resource]
    }]

    const rows = await database.moduleSection.findAll(queryOptions)

    const module = await database.module.findOne({
      where: { id },
      include: [
        database.resource
      ]
    })

    const result = rows.map(x => ({
      number: x.orderNumber,
      type: SectionTypes.toDisplayName(x.section.type),
      name: x.section.resource ? x.section.resource.name : null,
      sectionId: x.sectionId,
      id: x.id
    }))

    const count = await database.moduleSection.count({
      where: queryOptions.where,
      include: queryOptions.include
    })

    res.json({ result, module, count })
  }

  async createModule (req, res) {
    const { name, number, link } = req.body
    const modules = await database.module.findAll({
      include: [database.resource]
    })

    const modulesProps = modules.map(x => ({
      name: x.resource.name,
      link: x.link
    }))

    const isUniqueModuleProps = modulesProps.every(x => (
      x.name.toLowerCase() !== name.toLowerCase() &&
      x.link.toLowerCase() !== link.toLowerCase()
    ))
    if (!isUniqueModuleProps) {
      res.status(400).end()
      return
    }

    const newResource = {
      id: uuidv4(),
      code: uuidv4() + '_web',
      name,
      category: 'Отраслевой интерфейс'
    }

    const newModuleId = uuidv4()
    const newModule = {
      id: newModuleId,
      moduleId: newModuleId,
      resourceId: newResource.id,
      link,
      isUserModule: true,
      orderNumber: number
    }

    await database.sequelize.transaction(async transaction => {
      await database.action.create({ resourceCode: newResource.code, name: 'Чтение' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Удаление' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Создание' }, { transaction })
      await database.action.create({ resourceCode: newResource.code, name: 'Изменение' }, { transaction })

      await database.resource.create(newResource, { transaction })
      await database.module.create(newModule, { transaction })
    })

    res.status(200).json(newModule.id)
  }

  async deleteModule (req, res) {
    const { id: moduleId } = req.params

    const module = await database.module.findById(moduleId, {
      include: [database.moduleSection]
    })

    if (!module.isUserModule) {
      res.status(403).send(`Запрещено удалять системный ОИ`)
      return
    }

    await database.sequelize.transaction(async transaction => {
      const moduleResourceId = module.resourceId

      const sectionsIds = module.moduleSections.map(x => x.sectionId)

      await database.moduleSection.destroy({
        where: {
          moduleId
        },
        transaction
      })

      for (const sectionId of sectionsIds) {
        await destroySection(sectionId, transaction)
      }

      await database.module.destroy({
        where: {
          id: moduleId
        },
        transaction
      })

      await destroyResource(moduleResourceId, transaction)
    })

    res.status(200).end()
  }

  async updateModule (req, res) {
    const { id: moduleId } = req.params
    const { name, link, number } = req.body

    const module = await database.module.findById(moduleId, {
      include: [database.resource]
    })

    if (!module.isUserModule) {
      res.status(403).send(`Запрещено менять системный ОИ`)
      return
    }

    const resourceId = module.resource.id

    await database.module.update(
      {
        link,
        orderNumber: number
      },
      {
        where: {
          id: moduleId
        }
      }
    )

    await database.resource.update(
      {
        name
      },
      {
        where: {
          id: resourceId
        }
      }
    )

    res.end()
  }
}

async function createBaseSection (section, moduleId) {
  const result = await database.sequelize.transaction(async transaction => {
    const moduleSection = await database.moduleSection.create({
      moduleId,
      sectionId: section.baseSection.id,
      orderNumber: section.orderNumber
    }, { transaction })

    for (const item of section.requestTypes) {
      await database.sectionRequestType.create({
        moduleSectionId: moduleSection.id,
        requestTypeId: item.id
      }, { transaction })
    }

    return moduleSection
  })
  return result
}

async function createRegistrySection (section, moduleId) {
  const result = await database.sequelize.transaction(async transaction => {
    const registry = await database.spatialDataRegistry.findById(section.registry.id, {
      include: [database.resource]
    })
    const resource = registry.resource
    const sectionId = uuidv4()
    const sectionTable = await database.section.create({
      id: sectionId,
      sectionId: sectionId,
      resourceId: resource.id,
      link: `registries/${section.registry.id}`,
      type: SectionTypes.registrySection,
      spatialDataRegistryId: section.registry.id,
      alias: section.registry.name
    }, { transaction })
    const moduleSection = await database.moduleSection.create({
      moduleId,
      sectionId: sectionTable.sectionId,
      orderNumber: section.orderNumber
    }, { transaction })
    return moduleSection
  })
  return result
}

async function createRegistryGroupSection (section, moduleId) {
  const result = await database.sequelize.transaction(async transaction => {
    const resourceId = uuidv4()
    const resource = await database.resource.create({
      id: resourceId,
      code: resourceId + '_web',
      name: section.groupName,
      category: 'Отраслевой интерфейс'
    }, { transaction })

    await database.action.create({
      resourceCode: resource.code,
      name: 'Чтение'
    }, { transaction })
    await database.action.create({
      resourceCode: resource.code,
      name: 'Удаление'
    }, { transaction })
    await database.action.create({
      resourceCode: resource.code,
      name: 'Создание'
    }, { transaction })
    await database.action.create({
      resourceCode: resource.code,
      name: 'Изменение'
    }, { transaction })

    const sectionId = uuidv4()
    await database.section.create({
      id: sectionId,
      sectionId: sectionId,
      resourceId: resource.id,
      link: `registries?groupId=${sectionId}`,
      type: SectionTypes.groupRegistrySections,
      alias: section.groupName
    }, { transaction })
    const moduleSection = await database.moduleSection.create({
      moduleId,
      sectionId,
      orderNumber: section.orderNumber
    }, { transaction })

    for (const registry of section.registryGroup) {
      await database.sectionSpatialDataRegistry.create({
        sectionId,
        spatialDataRegistryId: registry.id
      }, { transaction })
    }
    return moduleSection
  })
  return result
}

async function destroySection (id, transaction) {
  const section = await database.section.findById(id, { transaction })
  const sectionResourceId = section.resourceId

  await database.sectionSpatialDataRegistry.destroy({
    where: {
      sectionId: id
    },
    transaction
  })

  if (section.type !== SectionTypes.baseSection) {
    await database.section.destroy({
      where: {
        id
      },
      transaction
    })
  }
  if (section.type === SectionTypes.groupRegistrySections) {
    await destroyResource(sectionResourceId, transaction)
  }
}

module.exports = ModulesController
