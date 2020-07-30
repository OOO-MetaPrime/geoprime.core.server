'use strict'

/**
 * Типы подразделов.
 */
module.exports = {
  /**
   * Базовый
   */
  baseSection: 0,
  /**
   * Группа реестров
   */
  groupRegistrySections: 1,
  /**
   * Реестр ПД
   */
  registrySection: 2,

  toDisplayName: function (value) {
    switch (value) {
      case this.baseSection: return 'Базовый'
      case this.groupRegistrySections: return 'Группа реестров'
      case this.registrySection: return 'Реестр ПД'
      default:
        throw new Error('Неизвестный тип подраздела')
    }
  },
  getEnumsArray () {
    const enumsKeys = ['baseSection', 'groupRegistrySections', 'registrySection']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
