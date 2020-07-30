'use strict'

module.exports = function (sequelize, DataTypes) {
  const settingsProfileModuleLayer = sequelize.define('settingsProfileModuleLayer', {
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
     * Ссылка на профиль.
     */
    settingsProfileId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'settings_profile_id'
    },
    /**
     * Ссылка на ОИ.
     */
    moduleId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'module_id'
    },
    /**
     * Ссылка на слой.
     */
    layerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'layer_id'
    },
    /**
     * Прозрачность слоя.
     */
    opacity: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    /**
     * Видимость слоя.
     */
    isVisible: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_visible'
    },
    /**
     * Порядок следования.
     */
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'sort_order'
    },
    /**
     * Кто создал.
     */
    createdBy: {
      type: DataTypes.TEXT,
      field: 'created_by'
    },
    /**
     * Кто обновил.
     */
    updatedBy: {
      type: DataTypes.TEXT,
      field: 'updated_by'
    },
    /**
     * Кто удалил.
     */
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    }
  }, {
    schema: 'public',
    tableName: 'settings_profile_module_layer',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  settingsProfileModuleLayer.associate = function (models) {
    settingsProfileModuleLayer.belongsTo(models.settingsProfile, { foreignKey: 'settingsProfileId' })
    settingsProfileModuleLayer.belongsTo(models.module, { foreignKey: 'moduleId' })
    settingsProfileModuleLayer.belongsTo(models.layer, { foreignKey: 'layerId' })
  }
  return settingsProfileModuleLayer
}
