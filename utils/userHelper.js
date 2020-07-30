'use strict'

const _set = require('lodash/set')
const _has = require('lodash/has')
const _fromPairs = require('lodash/fromPairs')
const Sequelize = require('sequelize')

class UserHelper {
  constructor ({ database }) {
    this.database = database
  }

  /**
  * Получить разрешения для пользователя.
  * @param {Number} id Идентификатор пользователя
  */
  async getPermissions (id) {
    const resourceActionsQuery =
      `
    SELECT
      DISTINCT resource_action.resource AS resource, resource_action.action AS action, resource.id AS id
    FROM
      resource_action
      INNER JOIN resource ON resource_action.resource = resource.name
      INNER JOIN resource_claim ON resource_claim.resource_action_id = resource_action.id
      LEFT OUTER JOIN subject_claim ON subject_claim.value = resource_claim.claim_value
      LEFT OUTER JOIN public.user AS systemuser ON subject_claim.user_id = systemuser.id
    WHERE
          systemuser.id = ?
      AND  resource_action.deleted is NULL
      AND  resource.deleted is NULL
      AND  resource_claim.deleted is NULL
      AND  subject_claim.deleted is NULL
      AND  systemuser.deleted is NULL
    ORDER BY resource_action.resource ASC
    `
    const claims = await this.database.sequelize.query(resourceActionsQuery, {
      replacements: [id],
      type: Sequelize.QueryTypes.SELECT
    })

    const claimsById = {}
    const claimsByName = {}

    for (const value of claims) {
      _set(claimsById, [value.id, value.action], true)
      _set(claimsByName, [value.resource, value.action], true)
    }

    return {
      claimsById,
      claimsByName
    }
  }

  async getPermissionsFromRolesIds (roles) {
    var resourcesQuery =
      `
      SELECT
      DISTINCT resource_action.resource AS resource, resource_action.action AS action, resource.id AS id
      FROM
      resource_action
      INNER JOIN resource ON resource_action.resource = resource.name
      INNER JOIN resource_claim ON resource_claim.resource_action_id = resource_action.id
      INNER JOIN role ON resource_claim.claim_value = role.code
      WHERE
        role.id IN (:roles)
        AND
        role.deleted is NULL
        AND
        resource_action.deleted is NULL
        AND
        resource.deleted is NULL
        AND
        resource_claim.deleted is NULL
      ORDER BY resource_action.resource ASC
    `
    const claims = await this.database.sequelize.query(resourcesQuery, {
      replacements: { roles },
      type: Sequelize.QueryTypes.SELECT
    })

    const claimsById = {}
    const claimsByName = {}

    for (const value of claims) {
      _set(claimsById, [value.id, value.action], true)
      _set(claimsByName, [value.resource, value.action], true)
    }
    return {
      claimsById,
      claimsByName
    }
  }

  async getUserPermissions (user) {
    return user.isEsiaVirtualUser
    ? this.getPermissionsFromRolesIds(user.roles.map(x => x.id))
    : this.getPermissions(user.id)
  }

  async getResourceDictionary () {
    const resources = await this.database.resource.findAll({
      attributes: ['code', 'name'],
      raw: true
    })

    return _fromPairs(resources.map(x => [x.code, x.name]))
  }

  async isResourceActionAllowed ({ userId, resourceName, actionName }) {
    const resourceActionsQuery =
      `
      select is_resource_action_allowed(?, ?, ?)
    `
    const allowedResult = await this.database.sequelize.query(resourceActionsQuery, {
      replacements: [userId, resourceName, actionName],
      type: Sequelize.QueryTypes.SELECT
    })

    return allowedResult[0].is_resource_action_allowed
  }

  isResourceIdActionAllowed ({ permissions, resourceId, actionName }) {
    return _has(permissions.claimsById, [resourceId, actionName])
  }

  async getUserRoles (userId) {
    const roles = await this.database.userRole.findAll({
      where: { userId },
      attributes: ['roleCode']
    })
    return roles
  }
}

module.exports = UserHelper
