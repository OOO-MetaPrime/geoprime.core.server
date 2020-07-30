'use strict'

/**
 * Типы сущностей.
 */
module.exports = {
  /**
   * Реестр ПД.
   */
  registry: 0,

  /**
   * ЗУ по Росреестру.
   */
  rosreestrStead: 10,

  /**
   * Проектируемые ЗУ.
   */
  projectedStead: 20,

  /**
   * Адрес.
   */
  address: 30,

  /**
   * Рекламная конструкция.
   */
  advertisingConstruction: 40,

  /**
   * Градостроительный регламент.
   */
  urbanPlanningRegulation: 50,

  /**
   * Документ ИСОГД (карточка документа, текстовая часть).
   */
  isogdDocument: 60,

  /**
   * Карточка зоны (подзоны).
   */
  zoneCard: 70,

  /**
   * Сведения об ОКС (основная часть).
   */
  oks: 80,

  /**
   * Результаты проверки.
   */
  inventoryResult: 100,

  /**
   * Выделенный ЗУ.
   */
  selectedContourStead: 120,

  /**
   * ОКС Росреестра.
   */
  rosreestrOks: 130,

  /**
   * Участок межевого плана.
   */
  delimitationPlanStead: 140,

  /**
   * Земельный участок по данным ФНС.
   */
  federalTaxService: 150,

  /**
   * ЗОУИТ
   */
  specialZone: 200,

  /**
   * Документ ГД
   */
  gdDocument: 210,

  getNames: function () {
    return {
      [this.rosreestrStead]: 'ЗУ по данным Росреестра',
      [this.rosreestrOks]: 'ОКС по данным Росреестра',
      [this.federalTaxService]: 'ЗУ по данным ФНС',
      [this.isogdDocument]: 'Документ ИСОГД',
      [this.address]: 'Адресный реестр',
      [this.zoneCard]: 'Территориальная зона',
      [this.advertisingConstruction]: 'Территориальная зона',
      [this.gdDocument]: 'Документ ГД'
    }
  }
}
