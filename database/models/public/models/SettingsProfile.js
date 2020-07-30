'use strict'

/**
 * Карточка простраственных данных.
 */
module.exports = (sequelize, DataTypes) => {
  const settingsProfile = sequelize.define('settingsProfile', {
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
     * Имя.
    */
    name: DataTypes.TEXT,

    /**
     * Схема реестров.
     */
    spatialDataRegistersSchema: { type: DataTypes.TEXT, field: 'spatial_data_registers_schema' },

    /**
     * Формат даты.
     */
    displayDateFormat: { type: DataTypes.TEXT, field: 'display_date_format' },

    maxRecordsInVolume: { type: DataTypes.INTEGER, field: 'max_records_in_volume' },

    itemsPerPage: { type: DataTypes.INTEGER, field: 'items_per_page' },

    maxFileSize: { type: DataTypes.INTEGER, field: 'max_file_size' },

    defaultMapId: { type: DataTypes.UUID, field: 'default_map_id' },

    oktmoId: { type: DataTypes.UUID, field: 'oktmo_id' },

    planningSteadsLayerUrl: { type: DataTypes.TEXT, field: 'planning_steads_layer_url' },

    oktmoGeneralField: { type: DataTypes.TEXT, field: 'oktmo_general_field' },

    oktmoLayerId: { type: DataTypes.UUID, field: 'oktmo_layer_id' },

    oktmoMapId: { type: DataTypes.UUID, field: 'oktmo_map_id' },

    coordinateSystem: { type: DataTypes.INTEGER, field: 'coordinate_system' },

    minimumMapAutoScale: { type: DataTypes.INTEGER, field: 'minimum_map_auto_scale' },

    extentXMin: { type: DataTypes.DOUBLE, field: 'default_extent_xmin' },

    extentYMin: { type: DataTypes.DOUBLE, field: 'default_extent_ymin' },

    extentXMax: { type: DataTypes.DOUBLE, field: 'default_extent_xmax' },

    extentYMax: { type: DataTypes.DOUBLE, field: 'default_extent_ymax' },

    createdBy: { type: DataTypes.TEXT, field: 'created_by' },

    updatedBy: { type: DataTypes.TEXT, field: 'updated_by' },

    deletedBy: { type: DataTypes.TEXT, field: 'deleted_by' }

    // TODO Добавить вычисляемое свойство "defaultExtent".
  }, {
    tableName: 'settings_profile',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  settingsProfile.associate = models => {
    /**
     * Тематические поиски.
     */
    settingsProfile.hasMany(models.thematicSearch, { foreignKey: 'profile_id', as: 'thematicSearches' })
    settingsProfile.hasMany(models.baseSpatialData, { foreignKey: 'settingsProfileId', as: 'baseSpatials' })
    settingsProfile.belongsTo(models.layer, { foreignKey: 'oktmo_layer_id', as: 'oktmoLayer' })
    settingsProfile.belongsTo(models.oktmo, { foreignKey: 'oktmoId' })
    settingsProfile.belongsTo(models.spatialDataPd, { foreignKey: 'defaultMapId', as: 'DefaultMap' })
    settingsProfile.belongsTo(models.spatialDataPd, { foreignKey: 'oktmoMapId', as: 'OktmoMap' })
    settingsProfile.belongsTo(models.layer, { foreignKey: 'oktmoLayerId', as: 'OktmoLayer' })
    settingsProfile.hasOne(models.eventsProfileSetting, { foreignKey: 'settingsProfileId' })
    settingsProfile.hasMany(models.requestTypeSettings, { foreignKey: 'settings_profile_id' })
    settingsProfile.hasMany(models.topologyControlSetting, { foreignKey: 'settingsProfileId', as: 'TopologySettings' })
  }

  return settingsProfile
}
