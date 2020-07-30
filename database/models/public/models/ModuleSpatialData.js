'use strict'

/**
 * Настройка пространственных данных для модуля.
 */
module.exports = (sequelize, DataTypes) => {
  const moduleSpatialData = sequelize.define('moduleSpatialData', {
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
     * Прозрачность карточки и всех ее вложеных слоев.
     */
    opacity: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },

    /**
     * Признак видимости карточки.
     */
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_visible'
    },

    /**
     * Номер по порядку.
     */
    order: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    /**
     * Идентификатор модуля.
     * @type {Modules}
     */
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'module_id'
    },

    /**
     * Удален.
     */
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_deleted'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'deleted_by'
    }
  }, {
    tableName: 'module_spatial_data',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  moduleSpatialData.associate = models => {
    /**
     * Профиль настроек.
     */
    moduleSpatialData.belongsTo(models.settingsProfile, {
      foreignKey: { name: 'settingsProfileId', field: 'settings_profile_id' }
    })

    /**
     * Карточка пространственных данных.
     */
    moduleSpatialData.belongsTo(models.spatialDataPd, {
      foreignKey: { name: 'spatialDataPdId', field: 'spatial_data_id' }
    })
  }

  return moduleSpatialData
}
