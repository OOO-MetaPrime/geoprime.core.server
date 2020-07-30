'use strict'

module.exports = function (sequelize, DataTypes) {
  var RegisterFileInfo = sequelize.define('registerfileinfo', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT
    },
    fileId: {
      type: DataTypes.UUID,
      field: 'file_id',
      allowNull: false
    },
    registryId: {
      type: DataTypes.UUID,
      field: 'registry_id',
      allowNull: false
    },
    recordId: {
      type: DataTypes.UUID,
      field: 'record_id',
      allowNull: false
    },
    fileType: {
      type: DataTypes.TEXT,
      field: 'file_type',
      allowNull: false
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN
    },
    isDefaultPreview: {
      field: 'is_default_preview',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    externalStorageId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'external_storage_id'
    }
  }, {
    tableName: 'file_infos',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'register'
  })

  RegisterFileInfo.associate = function (models) {
    RegisterFileInfo.belongsTo(models.registerfile, { foreignKey: 'file_id', as: 'file' })
    RegisterFileInfo.belongsTo(models.spatialDataRegistry, { foreignKey: 'registry_id' })
  }

  return RegisterFileInfo
}
