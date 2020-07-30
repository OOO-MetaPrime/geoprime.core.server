'use strict'
const { commentTable, commentColumn, setDefaultUuidValue } = require('../helpers')
const table = { schema: 'register', tableName: 'turning_points' }

module.exports = {
  up: async (queryInterface, DataTypes) => {
    await queryInterface.sequelize.transaction(async transaction => {
      await queryInterface.createTable(table, {
        id: {
          type: DataTypes.UUID,
          allowNull: false,
          primaryKey: true,
          defaultValue: DataTypes.UUIDV4
        },
        // Идентификатор контура
        contour_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        // Идентификатор фигуры (полигона, линии)
        spatial_element_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        // Номер точки (порядок обхода)
        ordinal_number: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        // Номер точки (межевой точки)
        geopoint_number: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        // Координата X
        x: {
          type: DataTypes.DOUBLE,
          allowNull: false
        },
        // Координата Y
        y: {
          type: DataTypes.DOUBLE,
          allowNull: false
        },
        // ссылка на реестр ПД
        registry_id: {
          type: DataTypes.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'spatial_data_registry',
              schema: 'public'
            },
            key: 'id'
          }
        },
        // ссылка на запись в реестре ПД, к которой относится поворотная точка
        item_id: {
          type: DataTypes.UUID,
          allowNull: false
        },
        created: {
          type: DataTypes.DATE
        },
        updated: {
          type: DataTypes.DATE
        },
        deleted: {
          type: DataTypes.DATE
        },
        created_by: {
          type: DataTypes.TEXT,
          allowNull: false
        },
        updated_by: {
          type: DataTypes.TEXT,
          allowNull: true
        },
        deleted_by: {
          type: DataTypes.TEXT,
          allowNull: true
        }
      }, { transaction })
      await commentTable(queryInterface, table, 'Поворотные точки реестра ПД', transaction)
      await commentColumn(queryInterface, table, 'id', 'Идентификатор', transaction)
      await commentColumn(queryInterface, table, 'contour_id', 'Идентификатор контура', transaction)
      await commentColumn(queryInterface, table, 'spatial_element_id', 'Идентификатор фигуры (полигона, линии)', transaction)
      await commentColumn(queryInterface, table, 'ordinal_number', 'Номер точки (порядок обхода)', transaction)
      await commentColumn(queryInterface, table, 'geopoint_number', 'Номер точки (межевой точки)', transaction)
      await commentColumn(queryInterface, table, 'x', 'Координата X', transaction)
      await commentColumn(queryInterface, table, 'y', 'Координата Y', transaction)
      await commentColumn(queryInterface, table, 'registry_id', 'Ссылка на реестр ПД', transaction)
      await commentColumn(queryInterface, table, 'item_id', 'Ссылка на запись в реестре ПД', transaction)
      await commentColumn(queryInterface, table, 'created', 'Дата и время создания', transaction)
      await commentColumn(queryInterface, table, 'updated', 'Дата и время изменения', transaction)
      await commentColumn(queryInterface, table, 'deleted', 'Дата и время удаления', transaction)
      await commentColumn(queryInterface, table, 'created_by', 'Кем создана', transaction)
      await commentColumn(queryInterface, table, 'updated_by', 'Кем изменена', transaction)
      await commentColumn(queryInterface, table, 'deleted_by', 'Кем удалена', transaction)
      await setDefaultUuidValue(queryInterface, table, 'id', transaction)
    })
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable(table)
  }
}
