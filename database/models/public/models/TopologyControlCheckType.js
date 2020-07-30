'use strict'

/**
 * Тип проверки топологии
 */
module.exports = (sequelize, DataTypes) => {
  const TopologyControlCheckType = sequelize.define('topologyControlCheckType', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    parameters: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      field: 'is_deleted'
    }
  }, {
    tableName: 'topology_control_check_type',
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  return TopologyControlCheckType
}
