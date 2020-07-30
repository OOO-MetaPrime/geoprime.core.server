'use strict'

/**
 * Пользователь.
 */
module.exports = function (sequelize, DataTypes) {
  const user = sequelize.define('user', {
    /**
     * Идентификатор.
     */
    id: { type: DataTypes.UUID, allowNull: false, primaryKey: true, autoIncrement: true },

    /**
     * Фамилия.
     */
    surname: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Имя.
     */
    name: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Отчество.
     */
    middleName: { type: DataTypes.TEXT, field: 'middle_name' },

    /**
     * Логин.
     */
    login: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Пароль.
     */
    password: { type: DataTypes.TEXT, allowNull: false },

    /**
     * Заблокирован.
     */
    isBlocked: { type: DataTypes.BOOLEAN, allowNull: false, field: 'is_blocked' },

    /**
     * ОКТМО.
     */
    oktmo_id: { type: DataTypes.UUID, allowNull: false },

    /**
     * Субъект градостроительной деятельности.
     */
    urbanPlanningObjectId: { type: DataTypes.UUID, allowNull: false, field: 'urban_planning_object_id' },

    /**
     * Email.
     */
    email: { type: DataTypes.TEXT },

    /**
     * Телефон.
     */
    phone: { type: DataTypes.TEXT },

    /**
     * Требовать смены пароля при следующем входе.
     */
    isPasswordChangeRequired: { type: DataTypes.BOOLEAN, allowNull: false, field: 'is_password_change_required' },

    /**
     * Должность.
     */
    post: { type: DataTypes.TEXT },

    /**
     * № служебного удостоверения.
     */
    serviceCertNumber: {
      field: 'service_cert_number',
      type: DataTypes.TEXT
    },

    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT
    },

    updatedBy: {
      field: 'updated_by',
      type: DataTypes.TEXT
    },

    deletedBy: {
      field: 'deleted_by',
      type: DataTypes.TEXT
    },

    createdAt: {
      field: 'created',
      type: DataTypes.DATE
    },

    updatedAt: {
      field: 'updated',
      type: DataTypes.DATE
    },

    deletedAt: {
      field: 'deleted',
      type: DataTypes.DATE
    },

    isDeleted: {
      field: 'is_deleted',
      type: DataTypes.BOOLEAN
    }
  },
    {
      schema: 'public',
      tableName: 'user',
      freezeTableName: true,
      paranoid: true,
      timestamps: true,
      createdAt: 'created',
      updatedAt: 'updated',
      deletedAt: 'deleted',

      getterMethods: {
        fullName () {
          return [this.surname, this.name, this.middleName]
            .filter(x => x)
            .join(' ')
        }
      }
    })

  user.associate = function (models) {
    /**
     * Субъект ГД.
     */
    user.belongsTo(models.organization, { foreignKey: 'urbanPlanningObjectId' })
    /**
     * ОКТМО
     */
    user.belongsTo(models.oktmo, { foreignKey: 'oktmo_id' })
    /**
     * Роли
     */
    user.hasMany(models.userRole, { foreignKey: 'userId', sourceKey: 'id' })

    /**
     * Территории с которыми работает пользователь
     */
    user.hasMany(models.userOktmo, { foreignKey: 'userId', sourceKey: 'id' })
    /**
     * Территории доступные пользователю в библиотеке документов
     */
    user.hasMany(models.userLibraryOktmo, { foreignKey: 'userId', sourceKey: 'id' })
  }

  return user
}
