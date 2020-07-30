'use strict'

module.exports = function (sequelize, DataTypes) {
  var BaseSpatialData = sequelize.define('baseSpatialData', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    spatialDataPdId: {
      type: DataTypes.UUID,
      field: 'spatial_data_pd_id'
    },
    settingsProfileId: {
      type: DataTypes.UUID,
      field: 'settings_profile_id'
    },
    created_by: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated_by: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    isObsolete: {
      field: 'is_obsolete',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deletedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'deleted_by'
    },
    deleted: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'base_spatial_data',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  BaseSpatialData.associate = function (models) {
    BaseSpatialData.belongsTo(models.spatialDataPd, { foreignKey: 'spatial_data_pd_id' })
    BaseSpatialData.belongsTo(models.settingsProfile, { foreignKey: 'settings_profile_id' })
  }

  return BaseSpatialData
}
