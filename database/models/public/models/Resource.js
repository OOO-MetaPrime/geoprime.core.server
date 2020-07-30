'use strict'

/**
 * Роль
 */
module.exports = (sequelize, DataTypes) => {
  const resource = sequelize.define('resource', {
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
      allowNull: false,
      field: 'name'
    },

    /**
     * Имя на русском языке
     */
    name: {
      type: DataTypes.TEXT,
      field: 'alias'
    },

    /**
     * Категория
     */
    category: {
      type: DataTypes.TEXT
    },

    isArm: {
      type: DataTypes.BOOLEAN,
      field: 'is_arm'
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
      tableName: 'resource',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })

  resource.associate = (models) => {
    // В sourceKey написано имя колонки, как в базе поэтому указываем name, хотя по сути это code
    // (имя в таблице ресусров это колонка alias, а колонка name работает как код, по которому джойнятся actions)
    resource.hasMany(models.action, { foreignKey: 'resourceCode', sourceKey: 'name' })
  }

  return resource
}
