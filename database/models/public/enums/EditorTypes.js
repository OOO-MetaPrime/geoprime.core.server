'use strict'

/**
 * Типы редактора.
 */

module.exports = {
  /**
   * Простой
   */
  plain: 0,
  /**
   * WYSIWYG
   */
  WYSIWYG: 1,
  /**
   * link
   */
  link: 2,
  /**
   * email
   */
  email: 3,

  toDisplayName: function (value) {
    switch (value) {
      case this.plain: return 'Простой'
      case this.WYSIWYG: return 'WYSIWYG'
      case this.link: return 'Ссылка на сайт'
      case this.email: return 'Адрес электронной почты'
      default:
        throw new Error('Неизвестный тип редактора')
    }
  },
  getEnumsArray () {
    const enumsKeys = ['plain', 'WYSIWYG', 'link', 'email']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
