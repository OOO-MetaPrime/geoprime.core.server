'use strict'

module.exports = {
  /**
   * Реестры ПД.
   */
  spatialRegistry: 270,
  /**
   * Базовый подраздел.
   */
  baseSection: 410,
  /**
   * ИСОГД.
   */
  isogd: 420,

  /**
   * ГИСОГД.
   */
  gisogd: 430,

  toDisplayName (value) {
    switch (value) {
      case this.spatialRegistry:
        return 'Реестр ПД'
      case this.baseSection:
        return 'Базовый подраздел'
      case this.isogd:
        return 'ИСОГД'
      case this.gisogd:
        return 'ГИСОГД'
      default:
        throw new Error('Неизвестный тип ресурса')
    }
  },
  getEnumsArray () {
    const enumsKeys = ['spatialRegistry', 'baseSection', 'isogd', 'gisogd']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
