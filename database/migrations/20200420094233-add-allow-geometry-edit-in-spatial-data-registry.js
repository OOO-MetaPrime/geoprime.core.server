'use strict'

const { commentColumn } = require('../helpers')

const table = {
  schema: 'public',
  tableName: 'spatial_data_registry'
}
const column = 'allow_imported_geometry_edit'
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(table, column, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }, { transaction })
      await commentColumn(queryInterface, table, column, 'Возможность редактирования загружаемой геометрии', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(table, column)
  }
}
