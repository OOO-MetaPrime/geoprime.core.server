'use strict'

module.exports = function (sequelize, DataTypes) {
  var RegisterFile = sequelize.define('registerfile', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    content: {
      type: DataTypes.BLOB
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN
    }
  }, {
    tableName: 'files',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'register'
  })

  RegisterFile.associate = models => {
    RegisterFile.hasMany(models.registerfileinfo, { foreignKey: 'file_id' })
  }

  return RegisterFile
}
