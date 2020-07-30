'use strict'

/**
 * Настройка пространственных данных для сущности.
 */
module.exports = (sequelize, DataTypes) => {
  const entitySpatialSetting = sequelize.define('entitySpatialSetting', {
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
     * Ключевое поле сущности.
     */
    entityField: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'thing_key_field'
    },

    /**
     * Ключевое поле слоя.
     */
    layerField: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'general_field'
    },
    createdBy: {
      type: DataTypes.TEXT,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.TEXT,
      field: 'updated_by'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_obsolete'
    }
  }, {
    tableName: 'informational_thing_spatial_data_setting',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  entitySpatialSetting.associate = models => {
    /**
     * Профиль настроек.
     */
    entitySpatialSetting.belongsTo(models.settingsProfile, {
      foreignKey: { name: 'settingsProfileId', field: 'settings_profile_id' }
    })
    entitySpatialSetting.belongsTo(models.informationalThing, {
      foreignKey: { name: 'thingId', field: 'thing_id' }
    })
    /**
     * Тип сущности.
     */
    entitySpatialSetting.belongsTo(models.entityType, {
      foreignKey: { name: 'entityTypeId', field: 'thing_id' }
    })

    /**
     * Карточка пространственных данных.
     */
    entitySpatialSetting.belongsTo(models.spatialDataPd, {
      foreignKey: { name: 'spatialDataPdId', field: 'spatial_data_id' }
    })

    entitySpatialSetting.belongsTo(models.spatialDataPd, {
      foreignKey: { name: 'spatialDataPdId', field: 'spatial_data_id' }
    })

    /**
     * Слой.
     */
    entitySpatialSetting.belongsTo(models.layer, {
      foreignKey: { name: 'layerId', field: 'layer_id' }
    })
  }

  return entitySpatialSetting
}
