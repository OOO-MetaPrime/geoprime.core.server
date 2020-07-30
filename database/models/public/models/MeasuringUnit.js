'use strict'

module.exports = (sequelize, DataTypes) => {
  const measuringUnit = sequelize.define('measuringUnit', {
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
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_obsolete',
      defaultValue: false
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
    isDeleted: {
      type: DataTypes.BOOLEAN,
      field: 'is_deleted',
      allowNull: false,
      defaultValue: false
    }

  }, {
    tableName: 'measuring_unit',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  return measuringUnit
}
