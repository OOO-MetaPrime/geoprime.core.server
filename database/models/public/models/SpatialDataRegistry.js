'use strict'

/**
 * Реестр ПД.
 */
module.exports = function (sequelize, DataTypes) {
  const spatialDataRegistry = sequelize.define('spatialDataRegistry', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    /**
     * Название.
     */
    name: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Название таблицы.
     */
    tableName: { type: DataTypes.TEXT, field: 'table_name' },

    /**
     * Субъект градостроительной деятельности.
     */
    urbanPlanningObjectId: { type: DataTypes.UUID, allowNull: true, field: 'urban_planning_object_id' },

    /**
     * Тип субъекта градостроительной деятельности.
     */
    urbanPlanningTypeId: { type: DataTypes.UUID, allowNull: false, field: 'urban_planning_type_id' },

    /**
     * Являеться ли реестр реестром ОКС.
     */
    isOks: { type: DataTypes.BOOLEAN, allowNull: false, field: 'is_oks' },

    /**
     * Карточка пространственных данных.
     */
    spatialDataPdId: { type: DataTypes.UUID, field: 'spatial_data_pd_id' },

    /**
     *  Слой карточки пространственных данных.
     */
    layerId: { type: DataTypes.UUID, field: 'layer_id' },

    /**
     * Поле объекта слоя, используемое для связи записи реестра и объекта на карте.
     */
    spatialDataField: { type: DataTypes.TEXT, field: 'spatial_data_field' },

    /**
     * Поле реестра ПД, используемое для связи записи реестра и объекта на карте.
     */
    mapIdField: { type: DataTypes.TEXT, field: 'map_id_field' },

    /**
     * Поле, содержащее ОКТМО.
     */
    oktmoField: { type: DataTypes.TEXT, field: 'oktmo_field' },

    /**
     * Ресурс, соответствующий реестру.
     */
    resourceId: { type: DataTypes.UUID, allowNull: false, field: 'resource_id' },

    /**
     * Поля реестров ПД, связанные с данным рееестром ПД в формате JSON.
     */
    linkedSpatialFields: { type: DataTypes.TEXT, allowNull: false, field: 'linked_spatial_fields' },

    /**
     * ОКТМО.
     */
    oktmoId: { type: DataTypes.UUID, field: 'oktmo_id' },

    /**
     * Хранить историю.
     */
    storeHistory: { type: DataTypes.BOOLEAN, allowNull: false, field: 'store_history' },

    isDeleted: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false, field: 'is_deleted' },

    /**
     * Поля названия объекта
     */
    nameFieldId: { type: DataTypes.UUID, allowNull: true, field: 'name_field_id' },

    /**
     * СК для сохранения широты и долготы в объектах реестра ПД.
     */
    coordinateProjectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'coordinate_projection_id'
    },
    /**
     * Поле долготы в объектах реестра ПД
     */
    longitudeFieldId: { type: DataTypes.UUID, allowNull: true, field: 'longitude_field_id' },

    /**
     * Поле широты в объектах реестра ПД
     */
    latitudeFieldId: { type: DataTypes.UUID, allowNull: true, field: 'latitude_field_id' },

    /**
     * Возможность редактирования загружаемой геометрии
     */
    allowImportedGeometryEdit: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'allow_imported_geometry_edit'
    },

    /**
     * Использовать поворотные точки
     */
    useTurningPoints: { type: DataTypes.BOOLEAN, allowNull: false, field: 'use_turning_points' }
  }, {
    schema: 'public',
    tableName: 'spatial_data_registry',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    paranoid: true
  })

  spatialDataRegistry.associate = function (models) {
    spatialDataRegistry.belongsTo(models.oktmo, { foreignKey: 'oktmo_id' })
    spatialDataRegistry.belongsTo(models.resource, { foreignKey: 'resource_id' })
    spatialDataRegistry.belongsTo(models.organization, { foreignKey: 'urban_planning_object_id' })
    spatialDataRegistry.belongsTo(models.urbanPlanningType, { foreignKey: 'urban_planning_type_id' })
    spatialDataRegistry.belongsTo(models.spatialDataPd, { foreignKey: 'spatial_data_pd_id' })
    spatialDataRegistry.belongsTo(models.layer, { foreignKey: 'layer_id' })
    spatialDataRegistry.belongsTo(models.resource, { foreignKey: 'resource_id' })
    spatialDataRegistry.belongsTo(models.spatial_data_registry_field, { foreignKey: 'name_field_id', as: 'nameField' })
    spatialDataRegistry.belongsTo(models.coordinateProjection, { foreignKey: 'coordinateProjectionId' })
    spatialDataRegistry.belongsTo(models.spatial_data_registry_field, { foreignKey: 'longitude_field_id', as: 'longitudeField' })
    spatialDataRegistry.belongsTo(models.spatial_data_registry_field, { foreignKey: 'latitude_field_id', as: 'latitudeField' })
    spatialDataRegistry.hasMany(models.spatial_data_registry_field, { foreignKey: 'spatial_data_registry_id', as: 'fields' })
    spatialDataRegistry.hasMany(models.sectionSpatialDataRegistry, { foreignKey: 'spatialDataRegistryId' })
    spatialDataRegistry.hasMany(models.spatialDataRegistryCollectionField)
  }

  return spatialDataRegistry
}
