'use strict'

module.exports = (sequelize, DataTypes) => {
  // Справочник Тип события
  const eventType = sequelize.define('eventType', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },
    icon: {
      type: DataTypes.BLOB
    }
  },
    {
      schema: 'events',
      tableName: 'event_type',
      freezeTableName: true,
      timestamps: false,
      paranoid: false
    })

  return eventType
}
