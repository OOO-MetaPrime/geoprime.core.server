'use strict'

/**
 * Генерация номеров в рамках заданного партишена и группы
 */
module.exports = (sequelize, DataTypes) => {
  const partitionSequence = sequelize.define('partitionSequence', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    partitionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'partition_id'
    },
    number: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    groupName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'group_name'
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      field: 'is_obsolete'
    },
    createdBy: {
      type: DataTypes.TEXT,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.TEXT,
      field: 'updated_by'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    }
  },
    {
      tableName: 'partition_sequence',
      freezeTableName: true,
      timestamps: true,
      paranoid: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'public'
    })

  return partitionSequence
}
