'use strict'

module.exports = function (sequelize, DataTypes) {
  const moduleSection = sequelize.define('moduleSection', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    moduleId: {
      field: 'module_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    sectionId: {
      field: 'section_id',
      type: DataTypes.UUID,
      allowNull: false
    },
    created: {
      type: DataTypes.DATE,
      allowNull: false
    },
    updated: {
      type: DataTypes.DATE,
      allowNull: true
    },
    deleted: {
      type: DataTypes.DATE,
      allowNull: true
    },
    orderNumber: {
      field: 'order_number',
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    }
  }, {
    schema: 'public',
    tableName: 'module_section',
    freezeTableName: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  })

  moduleSection.associate = function (models) {
    moduleSection.belongsTo(models.module, { foreignKey: 'moduleId' })
    moduleSection.belongsTo(models.section, { foreignKey: 'sectionId' })
    moduleSection.hasMany(models.sectionRequestType, { foreignKey: 'moduleSectionId' })
    moduleSection.hasMany(models.sectionDocumentType, { foreignKey: 'moduleSectionId' })
  }

  return moduleSection
}
