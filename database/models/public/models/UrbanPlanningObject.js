'use strict'

module.exports = (sequelize, DataTypes) => {
  const urbanPlanningObject = sequelize.define('urbanPlanningObject', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deletedBy: {
      type: DataTypes.TEXT,
      field: 'deleted_by'
    },
    updatedBy: {
      type: DataTypes.TEXT,
      field: 'updated_by'
    },
    createdBy: {
      type: DataTypes.TEXT,
      field: 'created_by'
    },
    isObsolete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: 'is_obsolete',
      defaultValue: false
    },
    chief: {
      type: DataTypes.TEXT
    },
    address: {
      type: DataTypes.TEXT
    },
    phone: {
      type: DataTypes.TEXT
    },
    site: {
      type: DataTypes.TEXT
    },
    urbanPlanningTypeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'urban_planning_type_id'
    },
    oktmoId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'oktmo_id'
    },
    spatialDataKeyValue: {
      type: DataTypes.TEXT,
      field: 'spatial_data_key_value'
    },
    inn: {
      type: DataTypes.TEXT
    },
    email: {
      type: DataTypes.TEXT,
      field: 'e_mail'
    },
    parentId: {
      type: DataTypes.UUID,
      field: 'parent_id'
    },
    esiaId: {
      type: DataTypes.TEXT,
      field: 'esia_id'
    },
    ogrn: {
      type: DataTypes.TEXT
    },
    kpp: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'urban_planning_object',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public',
    paranoid: true
  })

  urbanPlanningObject.associate = function (models) {
    urbanPlanningObject.belongsTo(models.urbanPlanningObject, { foreignKey: 'parent_id', as: 'Parent' })
    urbanPlanningObject.belongsTo(models.urbanPlanningType, { foreignKey: 'urban_planning_type_id', as: 'Type' })
    urbanPlanningObject.hasMany(models.documentTypeUrbanPlanningObject)
    urbanPlanningObject.belongsTo(models.oktmo, { foreignKey: 'oktmo_id', as: 'Oktmo' })
    urbanPlanningObject.hasMany(models.isogdService)
  }

  return urbanPlanningObject
}
