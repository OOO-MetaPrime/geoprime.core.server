'use strict'

const { commentColumn } = require('../helpers')
const table = { schema: 'public', tableName: 'system_parameters' }

const urlColumn = 'geometry_service_url'
const maxSizeColumn = 'geometry_service_max_file_size'
const maxCountColumn = 'geometry_service_max_geom_count'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.addColumn(table, urlColumn, {
        type: Sequelize.TEXT,
        allowNull: true
      }, { transaction })
      await commentColumn(queryInterface, table, urlColumn, 'Адрес сервиса импорта геометрий', transaction)

      await queryInterface.addColumn(table, maxSizeColumn, {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction })

      await commentColumn(queryInterface, table, maxSizeColumn, 'Максимальный размер файла для импорта геометрий, КБайт', transaction)

      await queryInterface.addColumn(table, maxCountColumn, {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction })

      await commentColumn(queryInterface, table, maxCountColumn, 'Максимальное количество объектов геометрий в файле для импорта геометрий', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.removeColumn(table, maxCountColumn, { transaction })
      await queryInterface.removeColumn(table, maxSizeColumn, { transaction })
      await queryInterface.removeColumn(table, urlColumn, { transaction })
    })
  }
}
