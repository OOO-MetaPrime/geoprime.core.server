'use strict'

/**
 * Тематический поиск.
 */
module.exports = (sequelize, DataTypes) => {
  const thematicSearch = sequelize.define('thematicSearch', {
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
     * Название.
    */
    name: DataTypes.UUID,

    /**
     * Иконка в формате base64.
     */
    icon: DataTypes.TEXT,

    /**
     * Типа поиска
     */
    typeSearch: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'type_search'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    }
  }, {
    tableName: 'thematic_search',
    freezeTableName: true,
    schema: 'public'
  })

  thematicSearch.associate = models => {
    /**
     * Профиль настроек.
     */
    thematicSearch.belongsTo(models.settingsProfile, {
      foreignKey: { name: 'profileId', field: 'profile_id' }
    })
    /**
     * Настройки слоев.
     */
    thematicSearch.hasMany(models.thematicSearchLayer, { foreignKey: 'thematic_search_id', as: 'layers' })
  }

  return thematicSearch
}
