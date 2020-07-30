'use strict'

module.exports = (sequelize, DataTypes) => {
  const infoAccountingRecordStatus = sequelize.define('mediaStorageType', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaulValue: false,
      field: 'is_obsolete'
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
    comment: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'media_storage_type',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  return infoAccountingRecordStatus
}
