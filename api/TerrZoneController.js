'use strict'

const { Router } = require('express')
const wrap = require('express-async-wrap')
const { snakeCase, camelCase } = require('lodash')
const { getDb } = require('../database')
const database = getDb()
const { authorizeAction } = require('../auth')
const resources = require('../auth/resources')
const actions = require('../auth/actions')
const { getCollectionDiff } = require('../utils/queryHelper')
const { generateSequenceNumber, partitionGroups } = require('../utils/sequenceNumberHelper')
const systemLog = require('../utils/systemLog')

const Op = database.sequelize.Op
const target = 'Тер.зона'

class TerrZoneController {
  get router () {
    const router = Router()

    router.post('/oktmo/terrzones', authorizeAction(resources.terrZone, actions.read), wrap(this.getTerrZones))

    router.get('/terrzones/:id', authorizeAction(resources.terrZone, actions.read), wrap(this.getTerrZoneById))
    router.post('/terrzones', authorizeAction(resources.terrZone, actions.create), wrap(this.createTerrZone))
    router.put('/terrzones/:id', authorizeAction(resources.terrZone, actions.update), wrap(this.updateTerrZone))
    router.delete('/terrzones/:id', authorizeAction(resources.terrZone, actions.delete), wrap(this.deleteTerrZone))

    router.get('/terrzonetypes', authorizeAction(resources.terrZone, actions.read), wrap(this.getTerrZoneTypes))
    router.post('/isogddocuments', authorizeAction(resources.isogdDocument, actions.read), wrap(this.getIsogdDocuments))

    router.post('/restrictions', authorizeAction(resources.terrZone, actions.read), wrap(this.getRestrictions))

    router.get('/typesofuse', authorizeAction(resources.terrZone, actions.read), wrap(this.getTypesOfUse))
    router.get('/urbanplanning/:id/restrictions', authorizeAction(resources.terrZone, actions.read), wrap(this.getUrbanPlanningRegulationRestrictions))
    router.post('/urbanplanning/restrictions', authorizeAction(resources.terrZone, actions.create), wrap(this.createRestriction))
    router.delete('/restrictions/:id', authorizeAction(resources.terrZone, actions.delete), wrap(this.deleteRestriction))
    router.get('/urbanplanning/:id/parameters', authorizeAction(resources.terrZone, actions.read), wrap(this.getUrbanPlanningRegulationParameters))

    router.get('/urbanplanning/parameters/:id', authorizeAction(resources.terrZone, actions.read), wrap(this.getLimitingParameter))
    router.post('/urbanplanning/parameters', authorizeAction(resources.terrZone, actions.create), wrap(this.createLimitingParameter))
    router.put('/urbanplanning/parameters', authorizeAction(resources.terrZone, actions.update), wrap(this.updateLimitingParameter))
    router.delete('/urbanplanning/parameters/:id', authorizeAction(resources.terrZone, actions.delete), wrap(this.deleteLimitingParameter))

    router.get('/parameters', authorizeAction(resources.terrZone, actions.read), wrap(this.getParameters))
    router.get('/terrzones/gisId/:id', authorizeAction(resources.terrZone, actions.read), wrap(this.getTerrZoneIdByGisId))
    router.post('/terrzones/customcolumn', authorizeAction(resources.terrZone, actions.read), wrap(this.getTerrZoneByCustumColumn))

    return router
  }

  // Получение территориальных зон по октмо
  async getTerrZones (req, res) {
    const { ids } = req.body
    const terrzones = await database.oktmo.findAll({
      attributes: ['id', 'name', 'code'],
      order: [[database.TerrZone, 'number', 'ASC']],
      include: [{
        required: true,
        model: database.TerrZone,
        include: [database.TerrZoneType, {
          model: database.UrbanPlanningRegulation,
          as: 'Regulation'
        }]
      }],
      where: {
        code: {
          [Op.in]: ids.split(',')
        }
      }
    })
    res.json(terrzones)
  }

  async getTerrZoneById (req, res) {
    const { id } = req.params
    const terrZone = await database.TerrZone.findOne({
      include: [
        {
          model: database.TerrZone,
          as: 'Parent'
        },
        {
          model: database.TerrZoneType
        },
        {
          model: database.oktmo,
          attributes: ['id', 'name', 'code']
        },
        {
          model: database.UrbanPlanningRegulation,
          as: 'Regulation',
          include: [{
            model: database.isogdDocument
          }, {
            model: database.isogdRegistrationDocument,
            as: 'GdDocument'
          }, {
            separate: true,
            model: database.uprRestriction,
            as: 'Restrictions',
            include: [{
              model: database.uprKindOfUse,
              as: 'KindOfUse'
            },
            {
              model: database.uprTypeOfUse,
              as: 'TypeOfUse'
            }]
          }, {
            separate: true,
            model: database.limitingParameter,
            as: 'Parameters',
            include: [{
              model: database.measuringUnit,
              as: 'Unit'
            }, {
              model: database.parameterForUpr,
              as: 'Parameter',
              include: [{
                model: database.measuringUnit,
                as: 'Unit'
              }, {
                model: database.measuringUnit,
                as: 'AdditionalUnits'
              }]
            }]
          }]
        }
      ],
      where: { id: id }
    })
    res.json(terrZone)
  }

  async createTerrZone (req, res) {
    const { Regulation: regulation } = req.body
    const { Restrictions: restrictions, Parameters: parameters } = regulation
    await database.sequelize.transaction(async transaction => {
      const sequenceNumber = await generateSequenceNumber({
        user: req.user,
        transaction,
        oktmoId: req.body.oktmoId,
        groupName: partitionGroups.TerrZone
      })
      req.body['number'] = req.body.oktmo.code + '-' + req.body.TerrZoneType.code + '-' + parseInt(sequenceNumber, 10)
      const { id } = await database.UrbanPlanningRegulation.create(regulation, {
        transaction
      })
      const attributes = {
        created: req.body.created,
        createdBy: req.body.createdBy,
        deleted: req.body.deleted,
        id: id,
        name: req.body.name,
        number: req.body.number,
        oktmoId: req.body.oktmoId,
        parentId: req.body.parentId,
        typeOfTerrZoneId: req.body.typeOfTerrZoneId,
        updated: req.body.updated,
        updatedBy: req.body.updatedBy,
        urban_planning_regulation_id: id,
        usage: req.body.usage,
        comment: req.body.comment,
        gisId: req.body.gisId,
        symbol: req.body.symbol
      }

      for (const restriction of restrictions) {
        const restrictionParams = {
          ...restriction,
          urbanPlanningRegulationId: id
        }
        await database.uprRestriction.create(restrictionParams, { transaction })
      }
      for (const parameter of parameters) {
        const params = {
          ...parameter,
          planningRegulationId: id
        }
        await database.limitingParameter.create(params, { transaction })
      }
      const result = await database.TerrZone.create(attributes, {
        transaction
      })

      await systemLog.logAdd(req.user, target, `${id} ${attributes.name} ${attributes.symbol} ${regulation.status}`, transaction)

      res.json(result)
    })
  }

  async updateTerrZone (req, res) {
    const { id } = req.params
    let { Regulation: regulation } = req.body
    const { Restrictions: restrictions, Parameters: parameters } = regulation

    const attributes = {
      created: req.body.created,
      createdBy: req.body.createdBy,
      deleted: req.body.deleted,
      id: req.body.id,
      name: req.body.name,
      number: req.body.number,
      oktmoId: req.body.oktmoId,
      parentId: req.body.parentId,
      typeOfTerrZoneId: req.body.typeOfTerrZoneId,
      updated: req.body.updated,
      updatedBy: req.user.fullName,
      urban_planning_regulation_id: req.body.urban_planning_regulation_id,
      usage: req.body.usage,
      comment: req.body.comment,
      gisId: req.body.gisId,
      symbol: req.body.symbol
    }
    await database.sequelize.transaction(async transaction => {
      if (!regulation.id) {
        regulation = await database.UrbanPlanningRegulation.create(regulation, { transaction })
      } else {
        await database.UrbanPlanningRegulation.update({ ...regulation }, { where: { id: regulation.id }, transaction })
      }
      attributes.urban_planning_regulation_id = regulation.id
      let sequenceNumber = 0
      if (attributes.number) {
        const number = attributes.number.split('-')
        sequenceNumber = number[number.length - 1]
      } else {
        sequenceNumber = await await generateSequenceNumber({ user: req.user, transaction, oktmoId: attributes.oktmoId, groupName: partitionGroups.TerrZone })
      }
      attributes.number = req.body.oktmo.code + '-' + req.body.TerrZoneType.code + '-' + sequenceNumber
      await database.TerrZone.update(attributes, { where: { id: id }, transaction })

      const existingRestrictions = await database.uprRestriction.findAll({
        where: {
          urbanPlanningRegulationId: regulation.id
        }
      })

      const restrictionDiffs = getCollectionDiff(existingRestrictions, restrictions, 'id')

      if (restrictionDiffs.deleteItems.length) {
        await database.uprRestriction.destroy({
          where: {
            id: {
              [Op.in]: restrictionDiffs.deleteItems.map(x => x.id)
            }
          },
          transaction
        })
      }
      for (const restriction of restrictionDiffs.updateItems) {
        await database.uprRestriction.update(restriction, {
          where: {
            id: restriction.id
          },
          transaction
        })
      }

      for (const restriction of restrictionDiffs.newItems) {
        const restrictionParams = {
          ...restriction,
          urbanPlanningRegulationId: regulation.id
        }
        await database.uprRestriction.create(restrictionParams, { transaction })
      }

      const existingParameters = await database.limitingParameter.findAll({
        where: {
          planningRegulationId: regulation.id
        }
      })

      const parameterDiffs = getCollectionDiff(existingParameters, parameters, 'id')

      if (parameterDiffs.deleteItems.length) {
        await database.limitingParameter.destroy({
          where: {
            id: {
              [Op.in]: parameterDiffs.deleteItems.map(x => x.id)
            }
          },
          transaction
        })
      }
      for (const parameter of parameterDiffs.updateItems) {
        await database.limitingParameter.update(parameter, {
          where: {
            id: parameter.id
          },
          transaction
        })
      }

      for (const parameter of parameterDiffs.newItems) {
        const params = {
          ...parameter,
          planningRegulationId: regulation.id
        }
        await database.limitingParameter.create(params, { transaction })
      }

      await systemLog.logEdit(req.user, target, `${id} ${attributes.name} ${attributes.symbol}`, transaction)
      res.status(200).end()
    })
  }

  async deleteTerrZone (req, res) {
    const { id } = req.params
    await database.sequelize.transaction(async transaction => {
      const terrZone = await database.TerrZone.findOne({
        where: {
          id: id
        }
      })
      const { urban_planning_regulation_id: uprId = null } = terrZone
      if (!uprId) {
        await database.TerrZone.destroy({ where: { id: id }, transaction })
      } else {
        await database.uprRestriction.destroy({
          where: {
            urbanPlanningRegulationId: uprId
          },
          transaction
        })
        await database.limitingParameter.destroy({
          where: {
            planningRegulationId: uprId
          },
          transaction
        })
        await database.UrbanPlanningRegulation.destroy({
          where: {
            id: uprId
          },
          transaction
        })
        await database.TerrZone.destroy({
          where: {
            id: id
          },
          transaction
        })
      }

      await systemLog.logDelete(req.user, target, `${id} ${terrZone.name}`, transaction)
      res.status(200).end()
    })
  }

  async createUrbanPlanningRegulation (attributes, transaction) {
    const { id } = await database.UrbanPlanningRegulation.create(attributes, { transaction })
    return id
  }
  async getTerrZoneTypes (req, res) {
    const terrZoneTypes = await database.TerrZoneType.findAll()
    res.json(terrZoneTypes)
  }

  async getIsogdDocuments (req, res) {
    const { oktmoId } = req.body
    const isogdDocuments = await database.isogdDocument.findAll({
      where: {
        operativeOktmoId: oktmoId
      }
    })
    res.json(isogdDocuments)
  }

  async getRestrictions (req, res) {
    const ids = req.body
    const result = await database.uprKindOfUse.findAll({
      where: {
        id: {
          [Op.notIn]: ids
        },
        [Op.and]: {
          isObsolete: false
        }
      }
    })
    res.json(result)
  }

  async getTypesOfUse (req, res) {
    const result = await database.uprTypeOfUse.findAll()
    res.json(result)
  }

  async getUrbanPlanningRegulationRestrictions (req, res) {
    const { id } = req.params
    const result = await database.uprRestriction.findAll({
      include: [{
        model: database.uprKindOfUse,
        as: 'KindOfUse'
      },
      {
        model: database.uprTypeOfUse,
        as: 'TypeOfUse'
      }],
      where: {
        urban_planning_regulation_id: id
      }
    })
    res.json(result)
  }

  async createRestriction (req, res) {
    const data = req.body
    const result = await database.uprRestriction.create(data)
    res.json(result)
  }

  async deleteRestriction (req, res) {
    const { id } = req.params
    await database.uprRestriction.destroy({
      where: {
        id: id
      }
    })
    res.end()
  }

  async getUrbanPlanningRegulationParameters (req, res) {
    const { id: regulationId } = req.params
    const result = await database.limitingParameter.findAll({
      include: [{
        model: database.measuringUnit,
        as: 'Unit'
      }, {
        model: database.parameterForUpr,
        as: 'Parameter',
        include: [{
          model: database.measuringUnit,
          as: 'Unit'
        }, {
          model: database.measuringUnit,
          as: 'AdditionalUnits'
        }]
      }],
      where: {
        planningRegulationId: regulationId
      }
    })

    res.json(result)
  }

  async getLimitingParameter (req, res) {
    const { id } = req.params
    const result = await database.limitingParameter.findOne({
      include: [{
        model: database.measuringUnit,
        as: 'Unit'
      }, {
        model: database.parameterForUpr,
        as: 'Parameter',
        include: [{
          model: database.measuringUnit,
          as: 'Unit'
        }, {
          model: database.measuringUnit,
          as: 'AdditionalUnits'
        }]
      }],
      where: {
        id: id
      }
    })

    res.json(result)
  }

  async createLimitingParameter (req, res) {
    const attributes = req.body
    await database.limitingParameter.create(attributes)
    res.status(200).end()
  }

  async updateLimitingParameter (req, res) {
    const data = req.body
    const id = req.query.id
    await database.limitingParameter.update({ ...data }, { where: { id: id } })
    res.status(200).end()
  }

  async deleteLimitingParameter (req, res) {
    const { id } = req.params
    const result = await database.limitingParameter.destroy({
      where: {
        id: id
      } })
    res.json(result)
  }

  async getParameters (req, res) {
    const result = await database.parameterForUpr.findAll({
      include: [
        {
          model: database.measuringUnit,
          as: 'Unit'
        },
        {
          model: database.measuringUnit,
          as: 'AdditionalUnits'
        }
      ]
    })
    res.json(result)
  }

  async getTerrZoneByCustumColumn (req, res) {
    const { name = null, value = null } = req.body
    const attributes = await database.TerrZone.describe()
    let validName = null
    if (Object.keys(attributes).indexOf(camelCase(name)) !== -1) {
      validName = camelCase(name)
    } else if (Object.keys(attributes).indexOf(snakeCase(name)) !== -1) {
      validName = snakeCase(name)
    }
    if (!name || !value) {
      res.status(500).end()
    }
    if (!validName) {
      res.status(500).end()
    }
    const result = await database.TerrZone.findOne({
      where: {
        [`${validName}`]: value
      }
    })
    res.json(result)
  }

  async getTerrZoneIdByGisId (req, res) {
    const { id } = req.params
    if (!id) {
      res.status(500).end()
    }

    const result = await database.TerrZone.findOne({
      where: {
        'gis_id': id
      }
    })

    res.json(result)
  }
}

module.exports = TerrZoneController
