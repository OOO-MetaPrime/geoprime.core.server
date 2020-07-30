'use strict'

/**
 * Организация.
 */
module.exports = function (sequelize, DataTypes) {
  const organization = sequelize.define('organization', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },

    /**
     * Наименование.
     */
    name: DataTypes.TEXT,

    /**
     * Адрес.
     */
    address: { type: DataTypes.TEXT },

    /**
     * Телефон.
     */
    phone: { type: DataTypes.TEXT },

    /**
     * Руководитель.
     */
    chief: { type: DataTypes.TEXT },

    oktmoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'oktmo_id'
    },

    urbanPlaningTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'urban_planning_type_id'
    },
    inn: {
      type: DataTypes.TEXT
    }
  },
    {
      schema: 'public',
      tableName: 'urban_planning_object',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })
  organization.associate = (models) => {
    organization.belongsTo(models.oktmo, { foreignKey: 'oktmo_id' })
    organization.belongsTo(models.urbanPlanningType, { foreignKey: 'urban_planning_type_id' })
  }

  return organization
}
