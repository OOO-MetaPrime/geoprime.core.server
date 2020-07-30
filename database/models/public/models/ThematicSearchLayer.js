'use strict'

/**
 * Слой тематического поиска.
 */
module.exports = (sequelize, DataTypes) => {
  const thematicSearchLayer = sequelize.define('thematicSearchLayer', {
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
     * Атрибут, по которому производится поиск.
    */
    attribute: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    layerId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'layer_id'
    },

    /**
     * Частичное совпадение.
     */
    isPartiallyMatch: {
      field: 'is_partially_match',
      type: DataTypes.BOOLEAN,
      allowNull: false
    },

    /**
     * Не чувствителен к регистру
     */
    isNotCaseSensetive: {
      field: 'is_not_case_sensitive',
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    tableName: 'thematic_search_layer',
    freezeTableName: true,
    timestamps: false,
    schema: 'public'
  })

  thematicSearchLayer.associate = models => {
    /**
     * Тематический поиск.
     */
    thematicSearchLayer.belongsTo(models.thematicSearch, {
      foreignKey: { name: 'thematic_search_id' }
    })
    /**
     * Слой.
     */
    thematicSearchLayer.belongsTo(models.layer, { foreignKey: 'layer_id' })
    /**
     * Карточка ПД.
     */
    thematicSearchLayer.belongsTo(models.spatialDataPd, { foreignKey: 'card_id' })
  }

  return thematicSearchLayer
}
