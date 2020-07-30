'use strict'

module.exports = (sequelize, DataTypes) => {
  const file = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.BLOB,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'created_by'
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'file',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  file.associate = function (models) {
  }

  return file
}
