'use strict'
module.exports = function (sequelize, DataTypes) {
  const sectionSpatialDataRegistry = sequelize.define('sectionSpatialDataRegistry', {
    id: {
      type: DataTypes.UUID,
      allowMull: false,
      primaryKey: true,
      autoIncrement: true
    },
    sectionId: {
      field: 'section_id',
      type: DataTypes.UUID,
      allowMull: false
    },
    spatialDataRegistryId: {
      field: 'spatial_data_registry_id',
      type: DataTypes.UUID,
      allowMull: false
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
    {
      schema: 'public',
      tableName: 'section_spatial_data_registry',
      freezeTableName: true,
      paranoid: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })

  sectionSpatialDataRegistry.associate = (models) => {
    sectionSpatialDataRegistry.belongsTo(models.spatialDataRegistry, { foreignKey: 'spatialDataRegistryId' })
    sectionSpatialDataRegistry.belongsTo(models.section, { foreignKey: 'sectionId' })
  }

  return sectionSpatialDataRegistry
}
