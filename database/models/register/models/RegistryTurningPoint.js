'use strict'

// Разрабатываемый документ: Координаты поворотных точек в сегменте "Координаты (поворотные точки)"
module.exports = function (sequelize, DataTypes) {
  const registryTurningPoint = sequelize.define('registryTurningPoint', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    // Ссылка на реестр ПД
    registryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'registry_id'
    },
    // Идентификатор записи в реестре ПД
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'item_id'
    },
    // Идентификатор контура
    contourId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'contour_id'
    },
    // Идентификатор фигуры (полигона, линии)
    spatialElementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'spatial_element_id'
    },
    // Номер точки (порядок обхода)
    ordinalNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'ordinal_number'
    },
    // Номер точки (межевой точки)
    geopointNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'geopoint_number'
    },
    // Координата X
    x: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    // Координата Y
    y: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    createdBy: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'created_by'
    },
    updatedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'updated_by'
    },
    deletedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'deleted_by'
    }
  }, {
    schema: 'register',
    tableName: 'turning_points',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    timestamps: true
  })

  registryTurningPoint.associate = models => {
    registryTurningPoint.belongsTo(models.spatialDataRegistry, { foreignKey: 'registryId', as: 'Registry' })
  }

  return registryTurningPoint
}
