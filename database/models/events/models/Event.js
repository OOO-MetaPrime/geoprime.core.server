'use strict'

module.exports = (sequelize, DataTypes) => {
  /*
   * Событие.
   */
  const event = sequelize.define('event', {

    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },

    // Наименование события
    name: {
      type: DataTypes.TEXT,
      allowNull: false
    },

    // Тип события (справочник типов событий, 1xN)
    typeId: {
      field: 'type_id',
      type: DataTypes.UUID,
      allowNull: false
    },

    // Период проведения события
    // дата и время начала
    startDate: {
      field: 'start_date',
      type: DataTypes.DATE,
      allowNull: false
    },

    // дата и время окончания
    endDate: {
      field: 'end_date',
      type: DataTypes.DATE,
      allowNull: false
    },

    // Адрес места проведения события
    address: {
      type: DataTypes.TEXT
    },

    // Описание события
    description: {
      type: DataTypes.TEXT
    },

    // Контактная информация организаторов события
    organizersContacts: {
      field: 'organizers_contacts',
      type: DataTypes.TEXT
    },

    // Уровень доступа (перечислимое, 1xN)
    accessLevelId: {
      field: 'access_level_id',
      type: DataTypes.UUID,
      allowNull: false
    },

    // ID юзера создавшего событие
    ownerId: {
      field: 'owner_id',
      type: DataTypes.UUID,
      allowNull: false
    },

    // Геометрия
    shape: {
      type: DataTypes.GEOMETRY
    },

    createdBy: {
      field: 'created_by',
      type: DataTypes.TEXT
    },
    updatedBy: {
      field: 'updated_by',
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
    }
  },
    {
      tableName: 'event',
      freezeTableName: true,
      schema: 'events'
    })

  event.associate = (models) => {
    event.belongsTo(models.user, { foreignKey: 'ownerId' })
    event.belongsTo(models.eventAccessLevel, { foreignKey: 'accessLevelId' })
    event.belongsTo(models.eventType, { foreignKey: 'typeId' })
    event.hasMany(models.eventFile, { foreignKey: 'eventId' })
  }

  return event
}
