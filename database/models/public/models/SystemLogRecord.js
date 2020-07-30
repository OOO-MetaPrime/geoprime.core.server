'use strict'

/**
 * Запись системного журнала.
 */
module.exports = function (sequelize, DataTypes) {
  var systemLogRecord = sequelize.define('systemLogRecord', {
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
     * Действие в системе.
     * @type {SystemActions}
     */
    action: { type: DataTypes.INTEGER, allowNull: false },

    /**
     * Объект, с которым произведено действие.
     */
    target: { type: DataTypes.TEXT },

    /**
     * Примечание.
     */
    comment: { type: DataTypes.TEXT },

    /**
     * Кем создан.
     */
    createdBy: { type: DataTypes.TEXT, field: 'created_by' },

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
    }
  }, {
      schema: 'public',
      tableName: 'system_log_record',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted'
    })

  return systemLogRecord
}
