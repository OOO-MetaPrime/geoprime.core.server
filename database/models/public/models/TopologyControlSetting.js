'use strict'

/**
 * Настройка проверки топологии
 */
module.exports = function (sequelize, DataTypes) {
  const topologyControlSetting = sequelize.define('topologyControlSetting', {
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
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_obsolete',
      defaultValue: false
    },
    createdBy: {
      type: DataTypes.TEXT,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.TEXT,
      field: 'updated_by'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      field: 'is_deleted'
    },
    settingsProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'settings_profile_id'
    }
  }, {
    schema: 'public',
    tableName: 'topology_control_setting',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  topologyControlSetting.associate = models => {
    /**
     * Проверки топологии.
     */
    topologyControlSetting.hasMany(models.topologyControlCheck, {
      foreignKey: 'topologyControlSettingId', as: 'TopologyChecks' })
  }

  return topologyControlSetting
}
