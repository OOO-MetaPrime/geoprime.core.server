'use strict'

const { commentColumn } = require('../helpers')
const table = { schema: 'public', tableName: 'spatial_data_registry_field' }

const column = 'show_when_selected'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn(table, column, {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    })

    await commentColumn(queryInterface, table, column, 'Отображать при выборе')
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(table, column)
  }
}
