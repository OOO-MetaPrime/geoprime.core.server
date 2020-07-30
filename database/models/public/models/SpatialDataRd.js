'use strict'

/**
 * Пространственные данные книги регистрации/хранения.
 */
module.exports = (sequelize, DataTypes) => {
  const spatialDataRd = sequelize.define('spatialDataRd', {
    // Описание пространственных данных
    description: {
      type: DataTypes.STRING,
      field: 'description'
    },
    // Владелец
    ownerId: {
      type: DataTypes.UUID,
      field: 'owner_id'
    },
    // Идентификатор масштаба
    scaleId: {
      type: DataTypes.UUID,
      field: 'scale_id'
    },
    // Идентификатор системы координат
    coordinateProjectionId: {
      type: DataTypes.UUID,
      field: 'coordinate_projection_id'
    },
    // Идентификатор тематического раздела
    thematicSectionId: {
      type: DataTypes.UUID,
      field: 'thematic_section_id'
    },
    reason: {
      type: DataTypes.TEXT,
      field: 'reason'
    },
    // Ограничения по доступу
    accessRestriction: {
      type: DataTypes.INTEGER,
      field: 'access_restriction'
    },
    // Форма представления документов
    documentViewTypeId: {
      type: DataTypes.UUID,
      field: 'document_view_type_id'
    },
    // Планировочный номер
    planningNumber: {
      type: DataTypes.TEXT,
      field: 'planning_number'
    },
    documentTypeId: {
      type: DataTypes.UUID,
      field: 'document_type_id'
    },
    // Кадастровый номер
    cadastralNumber: {
      type: DataTypes.TEXT,
      field: 'cadastral_number'
    },
    isogdDocumentId: {
      type: DataTypes.UUID,
      field: 'isogd_document_id'
    },
    // Номер спец части
    // В соотв. с ПП363 номер должен быть в формате МО_НР_НННН_ММ,
    // где МО_НР_ММММ - рег.номер документа.
    // ММ - номер карты в пределах документа.
    number: {
      type: DataTypes.INTEGER,
      field: 'number'
    },
    // Во изменение.
    // приходится отслеживать изменения статусов частей, когда-либо указывавшихс в поле changin part в текущей сессии
    changingPartId: {
      type: DataTypes.STRING,
      field: 'changing_part_id'
    },
    // Код карты СТП
    mapCodeId: {
      type: DataTypes.UUID,
      field: 'map_code_id'
    },
    status: {
      type: DataTypes.INTEGER,
      field: 'status'
    },
    // Ссылка на карточку ПД
    spatialDataPdId: {
      type: DataTypes.UUID,
      field: 'spatial_data_pd_id'
    }
  },
    {
      tableName: 'spatial_data_rd',
      freezeTableName: true,
      timestamps: false,
      paranoid: false,
      schema: 'public'
    })

  spatialDataRd.associate = models => {
    spatialDataRd.hasOne(models.spatialDataGd, { foreignKey: 'id' })
    spatialDataRd.belongsTo(models.isogdDocument, { foreignKey: 'isogdDocumentId' })
    spatialDataRd.belongsTo(models.documentType, { foreignKey: 'documentTypeId' })
    spatialDataRd.belongsTo(models.documentViewType, { foreignKey: 'documentViewTypeId' })
    spatialDataRd.belongsTo(models.spatialDataRd, { foreignKey: 'changing_part_id', as: 'changingPart' })
    spatialDataRd.belongsTo(models.territoryPlanningDocument, { foreignKey: 'mapCodeId' })
    spatialDataRd.belongsTo(models.thematicSection, { foreignKey: 'thematicSectionId' })
    spatialDataRd.belongsTo(models.organization, { foreignKey: 'ownerId', as: 'owner' })
    spatialDataRd.belongsTo(models.scale, { foreignKey: 'scaleId' })
    spatialDataRd.belongsTo(models.coordinateProjection, { foreignKey: 'coordinateProjectionId' })
    spatialDataRd.belongsTo(models.spatialDataPd, { foreignKey: 'spatialDataPdId' })
    spatialDataRd.hasMany(models.spatialDataRdFile, { foreignKey: 'spatial_data_rd_id', as: 'files' })
    spatialDataRd.hasMany(models.layersGroup, { foreignKey: 'spatial_data_id' })
    // inheritModel(models.spatialDataGd, spatialDataRd)
  }

  return spatialDataRd
}
