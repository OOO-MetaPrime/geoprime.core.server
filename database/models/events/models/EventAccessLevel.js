'use strict'

module.exports = (sequelize, DataTypes) => {
  // Справочник Уровень доступа
  const eventAccessLevel = sequelize.define('eventAccessLevel', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    },

    code: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true
    }

  },
    {
      schema: 'events',
      tableName: 'event_access_level',
      freezeTableName: true,
      timestamps: false,
      paranoid: false
    })

  return eventAccessLevel
}
