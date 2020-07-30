'use strict'

/**
 * Роли пользователя.
 */
module.exports = function (sequelize, DataTypes) {
  const userRole = sequelize.define('userRole', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    // Поле должно всегда заполняться строкой из defaultValue
    claimType: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'claim_type',
      defaultValue: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role'
    },

    /**
     * Роль.
     */
    roleCode: { type: DataTypes.TEXT, allowNull: false, field: 'value' },

    /**
     * Имя.
     */
    userId: { type: DataTypes.TEXT, allowNull: false, field: 'user_id' },

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
  },
    {
      schema: 'public',
      tableName: 'subject_claim',
      freezeTableName: true,
      paranoid: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })

  userRole.associate = (models) => {
    userRole.belongsTo(models.role, { foreignKey: 'roleCode', targetKey: 'code' })
  }

  return userRole
}
