'use strict'

/**
 * Группа слоев.
 */
module.exports = function (sequelize, DataTypes) {
  const layersGroup = sequelize.define('layersGroup', {
    /**
     * Идентификатор.
     */
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    /**
     * Название.
     */
    name: DataTypes.TEXT,

    /**
     * Порядковый номер.
     */
    orderIndex: {
      type: DataTypes.INTEGER,
      field: 'order_index'
    }
  }, {
    tableName: 'layers_group',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  layersGroup.associate = models => {
    /**
     * Карточка пространственных данных.
     */
    layersGroup.belongsTo(models.spatialDataGd, {
      foreignKey: { name: 'spatialDataId', field: 'spatial_data_id' }
    })

    layersGroup.belongsTo(models.spatialDataRd, {
      foreignKey: { name: 'spatialDataId', field: 'spatial_data_id' }
    })

    /**
     * Слои группы.
     */
    layersGroup.hasMany(models.layer, { foreignKey: 'layers_group_id' })
  }

  return layersGroup
}
