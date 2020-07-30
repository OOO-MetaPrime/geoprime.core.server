'use strict'

module.exports = function (sequelize, DataTypes) {
  const spatialDataPdFile = sequelize.define('spatialDataPdFile', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    spatialDataPdId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'spatial_data_pd_id'
    }
  },
    {
      tableName: 'spatial_data_pd_file',
      freezeTableName: true,
      paranoid: false,
      timestamps: false,
      schema: 'public'
    })

  spatialDataPdFile.associate = function (models) {
    spatialDataPdFile.belongsTo(models.FileInfo, { foreignKey: 'id' })
    spatialDataPdFile.belongsTo(models.spatialDataPd, { foreignKey: 'spatialDataPdId' })
  }

  return spatialDataPdFile
}
