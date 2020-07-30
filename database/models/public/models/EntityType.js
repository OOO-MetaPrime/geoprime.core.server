'use strict'

/**
 * Тип сущности.
 */
module.exports = (sequelize, DataTypes) => {
  const entityType = sequelize.define('entityType', {
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
     * Код.
     * @type {EntityTypes}
     */
    code: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    /**
     * Название.
     */
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'informational_thing',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  return entityType
}
