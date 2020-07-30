'use strict'
const layerTypes = require('../enums/LayerTypes')

/**
 * Слой на карте.
 */
module.exports = function (sequelize, DataTypes) {
  const Layer = sequelize.define('layer', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    /**
     * Имя.
     */
    name: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Тип слоя.
     */
    layerType: { type: DataTypes.INTEGER, field: 'layer_type' },
    wkid: { type: DataTypes.INTEGER },
    wkt: { type: DataTypes.TEXT },
    pointStyle: { type: DataTypes.TEXT, field: 'point_style' },
    polygonStyle: { type: DataTypes.TEXT, field: 'polygon_style' },
    lineStyle: { type: DataTypes.TEXT, field: 'line_style' },
    url: { type: DataTypes.TEXT },
    serviceLayersValue: { type: DataTypes.TEXT, field: 'service_layers_value' },
    tokenUrl: { type: DataTypes.TEXT, field: 'token_url' },
    serviceLogin: { type: DataTypes.TEXT, field: 'service_login' },
    servicePassword: { type: DataTypes.TEXT, field: 'service_password' },
    geometryType: { type: DataTypes.INTEGER, allowNull: false, field: 'geometry_type' },
    featureClass: { type: DataTypes.TEXT, field: 'feature_class' },
    isClustering: { type: DataTypes.BOOLEAN, field: 'is_clustering' },
    orderIndex: { type: DataTypes.INTEGER, field: 'order_index' },
    layersGroupId: { type: DataTypes.UUID, field: 'layers_group_id' },
    originalLayerId: { type: DataTypes.UUID, field: 'original_layer_id' },
    ignoreGetMapUrl: { type: DataTypes.BOOLEAN, field: 'ignore_get_map_url' },
    schema: { type: DataTypes.TEXT, field: 'schema' },
    semantics: { type: DataTypes.TEXT, field: 'semantics' },
    isDeleted: { type: DataTypes.BOOLEAN, field: 'is_deleted' }
  },
    {
      tableName: 'layer',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'public',
      getterMethods: {
        isWms () {
          return this.layerType === layerTypes.wms || this.layerType === layerTypes.wmts
        },
        isFeatureLayer () {
          return !!this.featureClass
        }
      }
    })

  Layer.associate = function (models) {
    Layer.belongsTo(models.layersGroup, { foreignKey: 'layers_group_id' })
    Layer.hasOne(models.layerSettings, { foreignKey: 'layer_id' })
  }

  return Layer
}
