'use strict'

module.exports = (sequelize, DataTypes) => {
  const informationalThing = sequelize.define('informationalThing', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT
    },
    code: {
      type: DataTypes.INTEGER
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      field: 'is_obsolete'
    },
    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT
    },
    updatedBy: {
      field: 'updated_by',
      type: DataTypes.TEXT
    },
    deletedBy: {
      field: 'deleted_by',
      type: DataTypes.TEXT
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
    }
  },
    {
      tableName: 'informational_thing',
      freezeTableName: true,
      schema: 'public'
    })

  return informationalThing
}