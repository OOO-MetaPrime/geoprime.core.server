'use strict'

module.exports = (sequelize, DataTypes) => {
  // Справочник Тип события
  const eventsPublicationOptions = sequelize.define('eventsPublicationOptions', {

    // Наименование события
    name: {
      type: DataTypes.BOOLEAN
    },

    // Тип события (справочник типов событий, 1xN)
    type: {
      type: DataTypes.BOOLEAN
    },

    // Период проведения события
    // дата и время начала
    startDate: {
      field: 'start_date',
      type: DataTypes.BOOLEAN
    },

    // дата и время окончания
    endDate: {
      field: 'end_date',
      type: DataTypes.BOOLEAN
    },

    // Адрес места проведения события
    address: {
      type: DataTypes.BOOLEAN
    },

    // Описание события
    description: {
      type: DataTypes.BOOLEAN
    },

    // Контактная информация организаторов события
    organizersContacts: {
      field: 'organizers_contacts',
      type: DataTypes.BOOLEAN
    },

    // Уровень доступа (перечислимое, 1xN)
    accessLevel: {
      field: 'access_level',
      type: DataTypes.BOOLEAN
    },

    // Юзер создавшего событие
    owner: {
      type: DataTypes.BOOLEAN
    },

    // Геометрия
    shape: {
      type: DataTypes.BOOLEAN
    }
  },
    {
      schema: 'events',
      tableName: 'events_publication_options',
      freezeTableName: true,
      timestamps: false,
      paranoid: false
    })

  // Sequelize автоматически добавляет колонку id к модели, если не указывать primary key, а она здесь не нужна
  eventsPublicationOptions.removeAttribute('id')

  return eventsPublicationOptions
}
