'use strict'

const { getDb } = require('../database')
const database = getDb()

const partitionGroups = {
  Request: 'request',
  SpecialZone: 'specialzone',
  TerrZone: 'terrzone',
  IsogdDocument: 'isogddocument',
  IsogdDocumentExtNumber: 'isogddocument_extnumber'
}
function leftPad (value, length) {
  return ('0'.repeat(length) + value).slice(-length)
}

async function generateSequenceNumber ({ user, transaction, oktmoId, groupName }) {
  const partitionId = oktmoId || user.oktmo_id
  const fullName = user.fullName
  const sequence = await database.partitionSequence.findOne({
    where: {
      partitionId,
      groupName
    },
    transaction
  })

  if (!sequence) {
    await database.partitionSequence.create({
      number: 1,
      partitionId,
      groupName,
      isObsolete: false,
      createdBy: fullName
    }, {
      transaction
    })

    const result = leftPad(1, 6)

    return result
  }

  const newNumber = sequence.number + 1

  const incrementNumber = newNumber

  await database.partitionSequence.update({
    number: incrementNumber,
    updatedBy: fullName
  }, {
    where: {
      partitionId,
      groupName
    },
    transaction
  })

  const result = leftPad(incrementNumber, 6)

  return result
}

module.exports = {
  generateSequenceNumber,
  partitionGroups
}
