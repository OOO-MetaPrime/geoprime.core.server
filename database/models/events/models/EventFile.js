'use strict'

module.exports = (sequelize, DataTypes) => {
  const eventFile = sequelize.define('eventFile', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    eventId: {
      type: DataTypes.UUID,
      field: 'event_id',
      allowNull: false
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    fileType: {
      type: DataTypes.TEXT,
      field: 'file_type',
      allowNull: false
    },

    content: {
      type: DataTypes.BLOB,
      allowNull: true
    },

    createdAt: {
      field: 'created',
      type: DataTypes.DATE
    },
    updatedAt: {
      field: 'updated',
      type: DataTypes.DATE
    },
    deletedAt: {
      field: 'deleted',
      type: DataTypes.DATE
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
  },
    {
      schema: 'events',
      tableName: 'event_file',
      freezeTableName: true
    })

  return eventFile
}
