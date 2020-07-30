'use strict'

module.exports = function (sequelize, DataTypes) {
  const spatialDataRegistryLinks = sequelize.define('spatial_data_registry_links', {
    /**
     * Идентификатор
     */
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      autoIncrement: true
    },
    /**
     * Ссылка на spatial_data_registry_field
     */
    fieldId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'field_id'
    },
    /**
     * Тип ссылки
     */
    linkType: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'link_type'
    },
    /**
     * Ссылка на spatial_data_registry_field
     */
    linkedFieldId: {
      type: DataTypes.UUID,
      field: 'linked_field_id'
    },
    /**
     * Имя поля  таблицы системной сущности
     */
    entityTableColumnName: {
      type: DataTypes.TEXT,
      field: 'entity_table_column_name'
    },
    /**
     * Псевдоним
     */
    alias: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    /**
     * Флаг
     */
    use: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    }
  }, {
    schema: 'public',
    tableName: 'spatial_data_registry_links',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    paranoid: true
  })

  spatialDataRegistryLinks.associate = function (models) {
    spatialDataRegistryLinks.belongsTo(models.spatial_data_registry_field, { foreignKey: 'field_id', as: 'field' })
    spatialDataRegistryLinks.belongsTo(models.spatial_data_registry_field, { foreignKey: 'linked_field_id', as: 'linkedField' })
  }

  return spatialDataRegistryLinks
}
