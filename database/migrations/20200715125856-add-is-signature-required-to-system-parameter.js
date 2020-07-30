'use strict'

const { commentColumn } = require('../helpers')
const table = { schema: 'public', tableName: 'system_parameters' }

const column = 'is_signature_required'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction })
      await commentColumn(queryInterface, table, column, 'Проверять ЭЦП при регистрации', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(table, column)
  }
}
