'use strict'

module.exports = function (sequelize, DataTypes) {
  const section = sequelize.define('section', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    sectionId: {
      field: 'section_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    resourceId: {
      field: 'resource_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: false
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
    },
    type: {
      field: 'type',
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    alias: {
      field: 'alias',
      type: DataTypes.TEXT,
      allowNull: true
    },
    customizable: {
      field: 'customizable',
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT,
      defaultValue: 'Система',
      allowNull: false
    },
    updatedBy: {
      field: 'updated_by',
      type: DataTypes.TEXT,
      defaultValue: 'Система',
      allowNull: false
    },
    spatialDataRegistryId: {
      field: 'spatial_data_registry_id',
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    schema: 'public',
    tableName: 'section',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  section.associate = function (models) {
    section.belongsTo(models.resource, { foreignKey: 'resourceId' })
    section.belongsTo(models.spatialDataRegistry, { foreignKey: 'spatialDataRegistryId' })
    section.hasMany(models.sectionSpatialDataRegistry, { foreignKey: 'sectionId' })
    section.hasMany(models.moduleSection, { foreignKey: 'sectionId' })
  }
  return section
}
