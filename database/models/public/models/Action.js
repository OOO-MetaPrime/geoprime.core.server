'use strict'

/**
 * Действия
 */
module.exports = (sequelize, DataTypes) => {
  const action = sequelize.define('action', {
    /**
     * Идентификатор.
     */
    id: {
      defaultValue: DataTypes.UUIDV4,
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },

    /**
     * Ресурс
     */
    resourceCode: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'resource'
    },

    /**
     * Действие
     */
    name: {
      type: DataTypes.TEXT,
      field: 'action'
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
      schema: 'public',
      tableName: 'resource_action',
      paranoid: true,
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })

  action.associate = (models) => {
    action.belongsTo(models.resource, { foreignKey: 'resourceCode', targetKey: 'code' })
  }

  return action
}
