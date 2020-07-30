'use strict'

/**
 * Типы тематического поиска.
 */
module.exports = {

  /**
   * Поиск по объектам.
   */
  objectSearch: 0,

  /**
   * Поиск по параметрам.
   */
  byParameters: 1,

  /**
   * Поиск по ПКК Росреестра.
   */
  rosreestr: 2,

  /**
   * Адресный поиск.
   */
  address: 3,

  /**
   * Поиск по координатам.
   */
  coordinates: 4,

  getEnumsArray () {
    const enumsKeys = ['byParameters', 'rosreestr', 'address']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  },
  toDisplayName (value) {
    switch (value) {
      case this.objectSearch:
        return 'Поиск по объектам'
      case this.byParameters:
        return 'Поиск по параметрам'
      case this.rosreestr:
        return 'Поиск по ПКК Росреестра'
      case this.address :
        return 'Адресный поиск'
      case this.coordinates :
        return 'Поиск по координатам'
      default:
        throw new Error('Неизвестный тип поиска')
    }
  }
}
