'use strict'

const { getDb } = require('../database')
const database = getDb()

async function destroyResource (id, transaction) {
  const resource = await database.resource.findById(id, {
    include: [database.action],
    transaction
  })

  const actionsIds = resource.actions.map(x => x.id)

  await database.permission.destroy({
    where: {
      actionId: {
        $in: actionsIds
      }
    },
    transaction
  })

  await database.action.destroy({
    where: {
      resourceCode: resource.code
    },
    transaction
  })

  await database.resource.destroy({
    where: {
      id
    },
    transaction
  })
}
module.exports = { destroyResource }
