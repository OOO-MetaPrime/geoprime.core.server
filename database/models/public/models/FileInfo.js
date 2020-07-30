'use strict'

module.exports = (sequelize, DataTypes) => {
  const fileInfo = sequelize.define('FileInfo', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    upload_date: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    file_type: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    file_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    // идентификатор файла в файловом хранилище
    externalStorageId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'external_storage_id'
    },
    // ссылка на внешний файл
    url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'created_by'
    }
  }, {
    tableName: 'file_info',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public',
    getterMethods: {
      fullName () {
        return `${this.name}${this.file_type}`
      }
    }
  })

  fileInfo.associate = function (models) {
    fileInfo.belongsTo(models.File, { foreignKey: 'file_id' })
  }

  return fileInfo
}
