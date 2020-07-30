'use strict'

module.exports = function (sequelize, DataTypes) {
  const spatialDataRdFile = sequelize.define('spatialDataRdFile', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    spatialDataRdId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'spatial_data_rd_id'
    }
  },
    {
      tableName: 'spatial_data_rd_file',
      freezeTableName: true,
      paranoid: false,
      timestamps: false,
      schema: 'public'
    })

  spatialDataRdFile.associate = function (models) {
    spatialDataRdFile.belongsTo(models.FileInfo, { foreignKey: 'id' })
    spatialDataRdFile.belongsTo(models.spatialDataRd, { foreignKey: 'spatialDataRdId' })
  }

  return spatialDataRdFile
}
