'use strict'

/**
 * Роль
 */
module.exports = (sequelize, DataTypes) => {
  const urbanPlanningType = sequelize.define('urbanPlanningType', {
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

    comment: {
      type: DataTypes.TEXT
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
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_obsolete'
    }
  }, {
    schema: 'public',
    tableName: 'urban_planning_type',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  return urbanPlanningType
}
