'use strict'

/**
 * Наименование системы координат/проекции
 */
module.exports = (sequelize, DataTypes) => {
  const coordinateProjection = sequelize.define('coordinateProjection', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    code: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Код EPSG
    wkid: {
      field: 'wkid',
      type: DataTypes.INTEGER,
      allowNull: false
    },
    // WKT
    wkt: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Проекция
    projection: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // Маска ввода координат в градусах
    inputMask: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'input_mask'
    },
    // Наименование маски ввода координат в градусах
    inputMaskName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'input_mask_name'
    },
    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  },
    {
      tableName: 'coordinate_projection',
      freezeTableName: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',
      schema: 'public',
      getterMethods: {
        title () {
          const inputMaskName = this.inputMaskName ? ` ${this.inputMaskName}` : ''
          return this.projection
            ? `${this.name}-${this.projection} [EPSG:${this.wkid}]${inputMaskName}`
            : `${this.name} [EPSG:${this.wkid}]${inputMaskName}`
        }
      }
    })

  return coordinateProjection
}
