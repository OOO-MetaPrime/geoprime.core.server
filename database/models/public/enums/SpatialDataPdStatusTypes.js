'use strict'

/**
 * Статус каталога ПД
 */
module.exports = {
  /**
   *  Проект
   */
  project: 10,
  /**
   *  Принято в РФПД
   */
  rfpd: 20,
  /**
   *  Архив
   */
  archive: 30,

  toDisplayName: function (value) {
    switch (value) {
      case this.project: return 'Проект'
      case this.rfpd: return 'Принято в РФПД'
      case this.archive: return 'Архив'
    }
  },

  getEnumsArray: function () {
    const enumsKeys = ['project', 'rfpd', 'archive']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
