'use strict'

/**
 * Карточка простраственных данных.
 */
module.exports = function (sequelize, DataTypes) {
  const SpatialDataGd = sequelize.define('spatialDataGd', {
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
     * Имя.
     */
    name: { type: DataTypes.TEXT },

    /**
     * Документа ГД.
    */
    documentGdId: {
      type: DataTypes.UUID,
      field: 'document_gd_id'
    },

    /**
     * Регистратор
     */
    registrarOrganizationId: {
      field: 'registrar_organization_id',
      type: DataTypes.UUID
    },

    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT
    },

    updatedBy: {
      field: 'updated_by',
      type: DataTypes.TEXT
    },

    deletedBy: {
      field: 'deleted_by',
      type: DataTypes.TEXT
    },

    createdAt: {
      field: 'created',
      type: DataTypes.DATE
    },

    updatedAt: {
      field: 'updated',
      type: DataTypes.DATE
    },

    deletedAt: {
      field: 'deleted',
      type: DataTypes.DATE
    },

    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN
    },

    isObsolete: {
      field: 'is_obsolete',
      type: DataTypes.BOOLEAN
    }
  },
    {
      tableName: 'spatial_data_gd',
      paranoid: true,
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'public'
    })

  SpatialDataGd.associate = function (models) {
    SpatialDataGd.hasOne(models.spatialDataPd, { foreignKey: 'id' })
    SpatialDataGd.belongsTo(models.organization, { foreignKey: 'registrarOrganizationId', as: 'registrar' })
  }

  return SpatialDataGd
}
