'use strict'

module.exports = function (sequelize, DataTypes) {
  const module = sequelize.define('module', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    moduleId: {
      field: 'module_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    resourceId: {
      field: 'resource_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    link: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isUserModule: {
      field: 'is_user_module',
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    orderNumber: {
      field: 'order_number',
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT,
      defaultValue: 'Система',
      allowNull: false
    },
    updatedBy: {
      field: 'updated_by',
      type: DataTypes.TEXT,
      defaultValue: 'Система',
      allowNull: false
    }
  }, {
    schema: 'public',
    tableName: 'module',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  module.associate = function (models) {
    module.belongsTo(models.resource, { foreignKey: 'resourceId' })
    module.hasMany(models.moduleSection, { foreignKey: 'moduleId' })
  }
  return module
}
