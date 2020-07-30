'use strict'

const entytyTypes = require('../database/models/public/enums/EntityTypes')
const EntityTypeNames = entytyTypes.getNames()

const entytyTypeFields = {

// ЗУ по данным Росреестра

  [entytyTypes.rosreestrStead]: [
    {
      id: 'cadastral_number',
      name: 'Кадастровый номер',
      dataType: 'character varying'
    },
    {
      id: 'cadastral_block',
      name: 'Номер кадастрового квартала',
      dataType: 'character varying'
    }
  ],

//  ОКС по данным Росреестра

  [entytyTypes.rosreestrOks]: [
    {
      id: 'cadastral_number',
      name: 'Кадастровый номер ОКС',
      dataType: 'character varying'
    },
    {
      id: 'okn_assignment_reg_num',
      name: 'Рег.№ в ЕГРОКН',
      dataType: 'character varying'
    }
  ],

//  ЗУ по данным ФНС

  [entytyTypes.federalTaxService]: [
    {
      id: 'cadastral_number',
      name: 'Кадастровый номер',
      dataType: 'text'
    }
  ],

// документ ИСОГД

  [entytyTypes.isogdDocument]: [
    {
      id: 'operative_oktmo_id',
      name: 'Территория',
      dataType: 'uuid'
    }

    // будет добавлено поле с кадастровым номером

  ],

// документ ГД

  [entytyTypes.gdDocument]: [
    {
      id: 'name',
      name: 'Наименование документа',
      dataType: 'text'
    },
    {
      id: 'isogd_service_id',
      name: 'Служба ИСОГД',
      dataType: 'uuid'
    },
    {
      id: 'territory_id',
      name: 'Территория',
      dataType: 'uuid'
    },
    {
      id: 'dataPlacementOrganId',
      name: 'Уполномоченный орган, разместивший данные',
      dataType: 'uuid'
    },
    {
      id: 'oktmo_id',
      name: 'ОКТМО пользователя, создавшего запись',
      dataType: 'uuid'
    },
    {
      id: 'cadastral_number',
      name: 'Кадастровый номер',
      dataType: 'text'
    },
    {
      id: 'registration_number',
      name: 'Регистрационный номер',
      dataType: 'text'
    },
    {
      id: 'outgoing_number',
      name: 'Исх.номер',
      dataType: 'text'
    }
  ],

// Документ
// будет добавлено, после создания соответствующего подраздела

  // [entytyTypes.isogdDocument]: [
  //   {
  //     id: 'operative_oktmo_id',
  //     name: 'Территория'
  //   }
  // ]

// Адресный реестр

  [entytyTypes.address]: [
    {
      id: 'name',
      name: 'Адрес',
      dataType: 'text'
    }
  ],

// Территориальная зона

  [entytyTypes.zoneCard]: [
    {
      id: 'oktmo_id',
      name: 'ОКТМО ',
      dataType: 'uuid'
    }
  ],

// Рекламные конструкции

  [entytyTypes.advertisingConstruction]: [
    {
      id: 'stead_file_cadastral_number',
      name: 'Кадастровый номер ЗУ',
      dataType: 'text'
    }

    // Будет добавлен адрес

  ]
}

const entities = Object.keys(EntityTypeNames).map(x => ({
  id: String(x),
  name: EntityTypeNames[x],
  entityType: x
}))

const getEntityFields = entityType => entytyTypeFields[entityType]

const getEntities = () => entities

const getEntityTypeName = entityType => entities.find(x => {
  return Number(x.entityType) === entityType.linkType
}).name

module.exports = { getEntityFields, getEntities, getEntityTypeName }
