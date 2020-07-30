'use strict'

/**
 * Масштаб
 */
module.exports = (sequelize, DataTypes) => {
  const scale = sequelize.define('scale', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  },
    {
      tableName: 'scale',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'public'
    })

  return scale
}
