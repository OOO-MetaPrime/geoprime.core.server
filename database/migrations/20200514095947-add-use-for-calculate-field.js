'use strict';

const { commentColumn } = require('../helpers')
const table = {
  schema: 'public',
  tableName: 'parameter_for_upr'
}
const columnName = 'use_for_offset_calculation'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction( async transaction => {
      await queryInterface.addColumn(table, columnName, {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction })
      await commentColumn (queryInterface, table, columnName, 'Параметры строительства', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn(table, columnName)
  }
};
