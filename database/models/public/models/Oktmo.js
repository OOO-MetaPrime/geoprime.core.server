'use strict'

module.exports = function (sequelize, DataTypes) {
  var oktmo = sequelize.define('oktmo', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    cadastral_number: {
      type: DataTypes.TEXT
    },
    parent_id: {
      type: DataTypes.UUID
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Государственный регистрационный номер
    grn: {
      type: DataTypes.TEXT
    },
    is_obsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false
    },
    created_by: {
      type: DataTypes.TEXT
    },
    created: {
      type: DataTypes.DATE
    },
    updated_by: {
      type: DataTypes.TEXT
    },
    updated: {
      type: DataTypes.DATE
    },
    is_deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    deleted_by: {
      type: DataTypes.TEXT
    },
    deleted: {
      type: DataTypes.DATE
    },
    comment: {
      type: DataTypes.TEXT
    },
    created_utc: {
      type: DataTypes.DATE
    },
    modified_utc: {
      type: DataTypes.DATE
    },
    deleted_utc: {
      type: DataTypes.DATE
    }
  }, {
    paranoid: true,
    tableName: 'oktmo',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  oktmo.associate = function (models) {
    /**
     * Территории с которыми работает пользователь
     */
    oktmo.hasMany(models.userOktmo, { foreignKey: 'oktmoId' })
    /**
     * Территории доступные пользователю в библиотеке документов
     */
    oktmo.hasMany(models.userLibraryOktmo, { foreignKey: 'oktmoId' })
    oktmo.hasMany(models.TerrZone, { foreignKey: 'oktmoId' })
    oktmo.hasMany(models.specialZone, { foreignKey: 'oktmoId', as: 'SpecialZones' })
    oktmo.belongsTo(models.oktmo, { foreignKey: 'parent_id', as: 'Parent' })
  }

  return oktmo
}
