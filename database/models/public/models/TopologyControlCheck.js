'use strict'

/**
 * Проверка топологии в настройке проверки топологии.
 */
module.exports = (sequelize, DataTypes) => {
  const topologyControlCheck = sequelize.define('topologyControlCheck', {
    /**
     * Идентификатор.
     */
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    topologyControlSettingId: {
      field: 'topology_control_setting_id',
      type: DataTypes.UUID,
      allowNull: false
    },

    topologyControlCheckTypeId: {
      field: 'topology_control_check_type_id',
      type: DataTypes.UUID,
      allowNull: false
    },

    layer1Id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'layer1_id'
    },
    layer2Id: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'layer2_id'
    },
    visibleFields1: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'visible_fields1'
    },
    visibleFields2: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'visible_fields2'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      field: 'is_deleted',
      defaultValue: false
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
    }
  }, {
    tableName: 'topology_control_check',
    freezeTableName: true,
    timestamps: true,
    schema: 'public',
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  topologyControlCheck.associate = models => {
    /**
     * Настройка проверки топологии.
     */
    topologyControlCheck.belongsTo(models.topologyControlSetting, {
      foreignKey: 'topologyControlSettingId', as: 'TopologySetting'
    })
    /**
     * Тип проверки топологии.
     */
    topologyControlCheck.belongsTo(models.topologyControlCheckType, {
      foreignKey: 'topologyControlCheckTypeId', as: 'CheckType'
    })
    /**
     * Слой 1.
     */
    topologyControlCheck.belongsTo(models.layer, { foreignKey: 'layer1Id', as: 'Layer1' })
    /**
     * Слой 2.
     */
    topologyControlCheck.belongsTo(models.layer, { foreignKey: 'layer2Id', as: 'Layer2' })
  }

  return topologyControlCheck
}
