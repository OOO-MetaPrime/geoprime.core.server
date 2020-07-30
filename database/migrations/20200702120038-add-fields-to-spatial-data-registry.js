'use strict'

const { commentColumn } = require('../helpers')

const table = {
  schema: 'public',
  tableName: 'spatial_data_registry'
}
const useTurningPointsColumn = 'use_turning_points'
const sridColumn = 'turning_points_srid'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(table, useTurningPointsColumn, {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      }, { transaction })
      await commentColumn(queryInterface, table, useTurningPointsColumn, 'Признак: использовать поворотные точки', transaction)
      await queryInterface.addColumn(table, sridColumn, {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction })
      await commentColumn(queryInterface, table, sridColumn, 'СК поворотных точек', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn(table, sridColumn, { transaction })
      await queryInterface.removeColumn(table, useTurningPointsColumn, { transaction })
    })
  }
}
