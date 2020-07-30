'use strict'

module.exports = (sequelize, DataTypes) => {
  // Список слоев по умолчанию для профиля
  const eventsProfileLayer = sequelize.define('eventsProfileLayer', {

    // Id профиля
    settingsProfileId: {
      type: DataTypes.UUID,
      field: 'settings_profile_id',
      allowNull: false,
      primaryKey: true
    },

    // Id слоя
    layerId: {
      type: DataTypes.UUID,
      field: 'layer_id',
      allowNull: false,
      primaryKey: true
    },

    // Прозрачность слоя
    opacity: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },

    // Видимость слоя
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_visible'
    },

    // Порядок следования
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sort_order'
    }
  },
    {
      schema: 'events',
      tableName: 'events_profile_layer',
      freezeTableName: true,
      timestamps: false,
      paranoid: false
    })

  eventsProfileLayer.associate = (models) => {
    eventsProfileLayer.belongsTo(models.layer, { foreignKey: 'layerId' })
  }

  return eventsProfileLayer
}
