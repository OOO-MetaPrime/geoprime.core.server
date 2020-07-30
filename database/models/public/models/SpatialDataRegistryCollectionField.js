'use strict'

/**
 * Реестр ПД.
 */
module.exports = function (sequelize, DataTypes) {
  const spatialDataRegistryCollectionField = sequelize.define('spatialDataRegistryCollectionField', {

    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },

    index: { type: DataTypes.INTEGER, allowNull: false },

    alias: { type: DataTypes.TEXT },

    foreignTable: { type: DataTypes.TEXT, field: 'foreign_table' },

    foreignTableKeyColumn: { type: DataTypes.TEXT, field: 'foreign_table_key_column' },

    foreignTableSecondKeyColumn: { type: DataTypes.TEXT, field: 'foreign_table_second_key_column' },

    manyToManyTable: { type: DataTypes.TEXT, field: 'many_to_many_table' },

    manyToManyColumn: { type: DataTypes.TEXT, field: 'many_to_many_column' },

    manyToManyDisplayColumn: { type: DataTypes.TEXT, field: 'many_to_many_display_column' },

    notNull: { type: DataTypes.BOOLEAN, field: 'not_null', allowNull: false },

    spatialDataRegistryId: { type: DataTypes.UUID, field: 'spatial_data_registry_id', allowNull: false }
  }, {
    schema: 'public',
    tableName: 'spatial_data_registry_collection_field',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    paranoid: true
  })

  spatialDataRegistryCollectionField.associate = function (models) {
    spatialDataRegistryCollectionField.belongsTo(models.spatialDataRegistry, { foreignKey: 'spatial_data_registry_id' })
  }

  return spatialDataRegistryCollectionField
}
