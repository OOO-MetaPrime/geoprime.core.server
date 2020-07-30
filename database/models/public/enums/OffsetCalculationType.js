'use strict'

/**
 * Типы использования для рассчетов отступа.
 */
module.exports = {
  /**
   * от границ ЗУ
   */
  fromZuBorder: 10,

  /**
   * окс
   */
  fromOks: 20,

  toDisplayName (value) {
    switch (value) {
      case this.fromZuBorder: return 'От границ ЗУ'
      case this.fromOks: return 'От Окс'
      default:
        throw new Error('Неизвестный тип слоя')
    }
  },

  getEnumsArray () {
    const enumsKeys = ['gromZuBorder', 'fromOks']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
