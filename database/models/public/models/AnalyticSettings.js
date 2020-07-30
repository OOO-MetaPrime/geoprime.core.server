'use strict'

module.exports = function (sequelize, DataTypes) {
  const analyticSettings = sequelize.define('analyticSettings', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
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
    map: {
      type: DataTypes.JSON,
      allowNull: false
    }
  },
    {
      tableName: 'settings',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'analytic_module'
    })

  analyticSettings.associate = function (models) {
  }
  return analyticSettings
}
