'use strict'

/**
 * Поле реестра ПД.
 */
module.exports = function (sequelize, DataTypes) {
  const spatialDataRegistryField = sequelize.define('spatial_data_registry_field', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    /**
     * Колонка.
     */
    column: { type: DataTypes.TEXT, allowNull: true },

    /**
     * Тип данных.
     */
    dataType: { type: DataTypes.TEXT, allowNull: true, field: 'data_type' },

    /**
     * Псевдоним.
     */
    alias: { type: DataTypes.TEXT, allowNull: true },

    /**
     * Формат отображения.
     */
    displayFormat: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'display_format'
    },

    /**
     * Формат отображения.
     */
    index: { type: DataTypes.INTEGER, allowNull: true },

    /**
     * Внешняя таблица
     */
    foreignTable: { type: DataTypes.TEXT, allowNull: true, field: 'foreign_table' },

    /**
     * Ключевое поле внешней таблицы.
     */
    foreignTableKeyColumn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'foreign_table_key_column'
    },

    /**
     * Отображаемое поле внешней таблицы.
     */
    foreignTableDisplayColumn: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'foreign_table_display_column'
    },

    /**
     * Не null.
     */
    notNull: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'not_null'
    },

    /**
     * Первичный ключ.
     */
    isPrimaryKey: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_primary_key'
    },

    /**
     * Реестр.
     */
    spatialDataRegistryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'spatial_data_registry_id'
    },

    /**
     * Наличие в гриде.
     */
    isAutoGeneratedColumn: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'is_auto_generated_column'
    },

    /**
     * Тип редактора.
     */
    editorType: { type: DataTypes.INTEGER, allowNull: true, field: 'editor_type' },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_deleted',
      defaultValue: false
    },
    minValue: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'min_value'
    },
    maxValue: {
      type: DataTypes.DOUBLE,
      allowNull: true,
      field: 'max_value'
    },
    validationRegexp: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'validation_regexp'
    },
    validationTooltip: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'validation_tooltip'
    },
    showWhenSelected: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'show_when_selected'
    }
  },
    {
      schema: 'public',
      tableName: 'spatial_data_registry_field',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      paranoid: true
    })

  spatialDataRegistryField.associate = function (models) {
    spatialDataRegistryField.belongsTo(models.spatialDataRegistry, { foreignKey: 'spatial_data_registry_id' })
  }

  return spatialDataRegistryField
}
