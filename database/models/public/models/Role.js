'use strict'

/**
 * Роль
 */
module.exports = (sequelize, DataTypes) => {
  const role = sequelize.define('role', {
    /**
     * Идентификатор.
     */
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    /**
     * Код
     */
    code: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    /**
     * Имя
     */
    name: {
      type: DataTypes.TEXT,
      allowNull: false
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
    },

    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN
    }
  }, {
    schema: 'public',
    tableName: 'role',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  role.associate = (models) => {
    /**
     * Разрешения
     */
    role.hasMany(models.permission, { foreignKey: 'roleCode', sourceKey: 'code' })
    /**
     * Роли юзеров
     */
    role.hasMany(models.userRole, { foreignKey: 'roleCode', sourceKey: 'code' })
  }

  return role
}
