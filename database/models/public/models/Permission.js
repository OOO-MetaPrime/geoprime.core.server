'use strict'

/**
 * Разрешения
 */
module.exports = (sequelize, DataTypes) => {
  const permission = sequelize.define('permission', {
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
     * Роль
     */
    roleCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'claim_value'
    },

    /**
     * Действие
     */
    actionId: {
      type: DataTypes.UUID,
      field: 'resource_action_id'
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
    tableName: 'resource_claim',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  permission.associate = (models) => {
    permission.belongsTo(models.action, { foreignKey: 'actionId', targetKey: 'id' })
    permission.belongsTo(models.role, { foreignKey: 'roleCode', targetKey: 'code' })
  }

  return permission
}
