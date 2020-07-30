'use strict'

/**
 * Территории, доступные пользователю в библиотеке документов.
 */
module.exports = function (sequelize, DataTypes) {
  const userLibraryOktmo = sequelize.define('userLibraryOktmo', {
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
    tableName: 'user_library_oktmo',
    paranoid: true,
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  userLibraryOktmo.associate = function (models) {
    userLibraryOktmo.belongsTo(models.user, { foreignKey: 'user_id' })
    userLibraryOktmo.belongsTo(models.oktmo, { foreignKey: 'oktmo_id' })
  }

  return userLibraryOktmo
}
