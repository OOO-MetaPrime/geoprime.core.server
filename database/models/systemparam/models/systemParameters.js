'use strict'

module.exports = (sequelize, DataTypes) => {
  const systemParameters = sequelize.define('systemParameters', {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true
    },
    // Url геосервера для публикации
    geoserverUrl: {
      field: 'geoserver_url',
      type: DataTypes.TEXT
    },
    // Имя пользователя для доступа к геосерверу
    geoserverUsername: {
      field: 'geoserver_username',
      type: DataTypes.TEXT
    },
    // Пароль для доступа к геосерверу
    geoserverPassword: {
      field: 'geoserver_password',
      type: DataTypes.TEXT
    },
    // Рабочая область геосервера для публикации
    geoserverWorkspace: {
      field: 'geoserver_workspace',
      type: DataTypes.TEXT
    },
    // Хранилище геосервера для публикации
    geoserverDatastore: {
      field: 'geoserver_datastore',
      type: DataTypes.TEXT
    },
    // Координата Xmin границы картографического покрытия
    extentXmin: {
      field: 'extent_xmin',
      type: DataTypes.DOUBLE
    },
    // Координата Ymin границы картографического покрытия
    extentYmin: {
      field: 'extent_ymin',
      type: DataTypes.DOUBLE
    },
    // Координата Xmax границы картографического покрытия.
    extentXmax: {
      field: 'extent_xmax',
      type: DataTypes.DOUBLE
    },
    // Координата Ymax границы картографического покрытия
    extentYmax: {
      field: 'extent_ymax',
      type: DataTypes.DOUBLE
    },
    // URL файлового хранилища
    filesStore: {
      field: 'files_store',
      type: DataTypes.TEXT
    },
    // максимальный размер файла в мегабайтах, содержимое которого можно сохранять в БД.
    maxFileSize: {
      field: 'max_file_size',
      type: DataTypes.INTEGER
    },
    enterpiseRegisterId: {
      field: 'enterprise_register_id',
      type: DataTypes.UUID
    },
    enterpiseRegisterLinkId: {
      field: 'enterprise_register_link_id',
      type: DataTypes.UUID
    },
    // Оператор РФПД (ссылка на субъект ГД)
    rfpdOperatorId: {
      field: 'rfpd_operator_id',
      type: DataTypes.UUID
    },
    // Использовать документы ГД (вместо документов ИСОГД в схеме public)
    useGdDocuments: {
      field: 'use_gd_documents',
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    // URL сервиса импорта геометрий
    geometryServiceUrl: {
      field: 'geometry_service_url',
      type: DataTypes.TEXT
    },
    // Максимальный размер файла для импорта геометрий, КБайт
    geometryServiceMaxFileSize: {
      field: 'geometry_service_max_file_size',
      type: DataTypes.INTEGER
    },
    // Максимальное количество объектов геометрий в файле для импорта геометрий
    geometryServiceMaxGeomCount: {
      field: 'geometry_service_max_geom_count',
      type: DataTypes.INTEGER
    },
    isSignatureRequired: {
      field: 'is_signature_required',
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'system_parameters',
    freezeTableName: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted',
    schema: 'public'
  })

  systemParameters.associate = function (models) {
    systemParameters.belongsTo(models.organization, { foreignKey: 'rfpd_operator_id', as: 'rfpdOperator' })
  }

  return systemParameters
}
