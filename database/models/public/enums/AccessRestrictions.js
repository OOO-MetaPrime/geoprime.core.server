'use strict'

/**
 * Ограничения по доступу.
 */
module.exports = {
  /**
   * Ограниченный доступ.
   */
  private: 10,

  /**
   * Открытые данные.
   */
  public: 20,

  /**
   * Только владелец.
   */
  owner: 30,

  toDisplayName: function (value) {
    switch (value) {
      case this.private:
        return 'Ограниченный доступ'
      case this.public:
        return 'Открытые данные'
      case this.owner:
        return 'Только владелец'
      case null:
        return '<не задано>'
      default:
        throw new Error('Неизвестный тип ограничения доступа')
    }
  },

  getEnumsArray: function () {
    const enumsKeys = ['private', 'public', 'owner']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
