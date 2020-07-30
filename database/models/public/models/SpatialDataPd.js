'use strict'

/**
 * Карточка простраственных данных.
 */
module.exports = function (sequelize, DataTypes) {
  const SpatialDataPd = sequelize.define('spatialDataPd', {
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
     * Классификатор документов ТП.
    */
    documentTpClassifyId: {
      type: DataTypes.UUID,
      field: 'document_tp_classify_id'
    },
    /**
     * Классификатор документов.
     */
    documentViewTypeId: {
      type: DataTypes.UUID,
      field: 'document_view_type_id'
    },
     /**
     * Масштаб.
     */
    scaleId: {
      type: DataTypes.UUID,
      field: 'scale_id'
    },
    /**
     * Описание.
     */
    description: {
      type: DataTypes.TEXT
    },
    /**
     * Владелец.
     */
    ownerId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'owner_id'
    },
    /**
     * Тематический раздел.
     */
    thematicSectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'thematic_section_id'
    },
    /**
     * Причина.
     */
    reason: {
      type: DataTypes.TEXT
    },
    /**
     * Проекция.
     */
    coordinateProjectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'coordinate_projection_id'
    },
    /**
     * Ограничение.
     */
    accessRestriction: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'access_restriction'
    },
    /**
     * Тип.
     */
    pdType: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'pd_type'
    },
    /**
     * Точность.
     */
    accuracy: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    /**
     * Организация-изготовитель.
     */
    manufacturer: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    /**
     * Год соответствия.
     */
    yearCorrespondence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'year_correspondence'
    },
    /**
     * Ограничение по доступу.
     */
    accessPurchaseAndUseTerms: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'access_purchase_and_use_terms'
    },
    /**
     * Дополнительные характеристики.
     */
    characteristics: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    /**
     * Статус. см. public/enums/SpatialDataPdStatusTypes
     */
    status: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    isogdDocumentItemId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'isogd_document_item_id'
    }
  }, {
    tableName: 'spatial_data_pd',
    paranoid: false,
    freezeTableName: true,
    timestamps: false,
    schema: 'public'
  })

  SpatialDataPd.associate = function (models) {
    SpatialDataPd.hasOne(models.spatialDataGd, { foreignKey: 'id' })
    SpatialDataPd.hasMany(models.layersGroup, { foreignKey: 'spatial_data_id' })
    SpatialDataPd.belongsTo(models.organization, { foreignKey: 'owner_id', as: 'owner' })
    SpatialDataPd.belongsTo(models.thematicSection, { foreignKey: 'thematicSectionId' })
    SpatialDataPd.belongsTo(models.scale, { foreignKey: 'scaleId' })
    SpatialDataPd.belongsTo(models.coordinateProjection, { foreignKey: 'coordinateProjectionId' })
    SpatialDataPd.belongsTo(models.isogdDocumentItem, { foreignKey: 'isogdDocumentItemId', as: 'IsogdDocumentItem' })
    SpatialDataPd.belongsToMany(models.FileInfo, { through: models.spatialDataPdFile, foreignKey: 'spatial_data_pd_id', otherKey: 'id' })
  }

  return SpatialDataPd
}
