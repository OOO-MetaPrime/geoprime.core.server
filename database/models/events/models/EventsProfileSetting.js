'use strict'

module.exports = (sequelize, DataTypes) => {
  // Настройки отображения событий для профиля
  const eventsProfileSetting = sequelize.define('eventsProfileSetting', {

    // Id профиля
    settingsProfileId: {
      type: DataTypes.UUID,
      field: 'settings_profile_id',
      allowNull: false,
      primaryKey: true,
      unique: true
    },

    // Рабочие часы - начало дня
    startTime: {
      type: DataTypes.DATE,
      field: 'start_time'
    },

    // Рабочие часы - конец дня
    endTime: {
      type: DataTypes.DATE,
      field: 'end_time'
    }
  },
    {
      schema: 'events',
      tableName: 'events_profile_setting',
      freezeTableName: true,
      timestamps: false,
      paranoid: false
    })

  eventsProfileSetting.associate = (models) => {
    eventsProfileSetting.belongsTo(models.settingsProfile, { foreignKey: 'settingsProfileId' })
    eventsProfileSetting.hasMany(models.eventsProfileLayer, { foreignKey: 'settingsProfileId' })
  }

  return eventsProfileSetting
}
