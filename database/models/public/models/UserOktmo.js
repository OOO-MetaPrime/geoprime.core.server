'use strict'

/**
 * Территории с которыми работает пользователь.
 */
module.exports = function (sequelize, DataTypes) {
  const userOktmo = sequelize.define('userOktmo', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    /**
     * Ссылка на ОКТМО.
     */
    oktmoId: { type: DataTypes.UUID, allowNull: false, field: 'oktmo_id' },

    /**
     * Ссылка на территорию.
     */
    userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },

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
    }
  }, {
    schema: 'public',
    tableName: 'user_oktmo',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  userOktmo.associate = function (models) {
    userOktmo.belongsTo(models.user, { foreignKey: 'user_id' })
    userOktmo.belongsTo(models.oktmo, { foreignKey: 'oktmo_id' })
  }

  return userOktmo
}
