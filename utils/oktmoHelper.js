'use strict'

const pMemoize = require('p-memoize')
const _sortBy = require('lodash/sortBy')
const _groupBy = require('lodash/groupBy')
const _keyBy = require('lodash/keyBy')
const Sequelize = require('sequelize')
const { Op } = Sequelize

async function getDbUserOktmo (userId) {
  const userOktmoList = (await this.getUserOktmoList(userId)).map(this.mapOktmo)

  return userOktmoList
}

class OktmoHelper {
  constructor ({ database }) {
    this.database = database
    this.memGetDbUserOktmo = pMemoize(getDbUserOktmo.bind(this), { maxAge: 30000 })
  }

  mapOktmo (oktmo) {
    return {
      id: oktmo.id,
      parent_id: oktmo.parent_id,
      code: oktmo.code,
      name: oktmo.name,
      cadastral_number: oktmo.cadastral_number,
      is_obsolete: oktmo.is_obsolete
    }
  }

  async getAllOktmo () {
    return this.database.oktmo.findAll(
      {
        where: { is_deleted: false },
        attributes: ['id', 'parent_id', 'code', 'name', 'cadastral_number', 'is_obsolete'],
        order: [['code']],
        raw: true
      })
  }

  async getUserOktmoList (userId) {
    return this.database.userOktmo.findAll({
      where: { user_id: userId },
      include: [{
        model: this.database.oktmo,
        required: true,
        attributes: ['id', 'parent_id', 'code', 'name', 'cadastral_number', 'is_obsolete']
      }]
    }).map(userOktmo => userOktmo.oktmo)
  }

  async getLibraryUserOktmoList (userId) {
    return this.database.userLibraryOktmo.findAll({
      where: { user_id: userId },
      include: [{
        required: true,
        model: this.database.oktmo,
        attributes: ['id', 'parent_id', 'code', 'name', 'cadastral_number', 'is_obsolete']
      }]
    }).map(userOktmo => userOktmo.oktmo)
  }

  addOktmoChildren (oktmo, groupedAllOktmo) {
    oktmo.children = _sortBy(groupedAllOktmo[oktmo.id] || [], oktmo => oktmo.name)
    for (const child of oktmo.children) {
      this.addOktmoChildren(child, groupedAllOktmo)
    }
  }

  // TODO если октмо лист будут удовлетворять условиям, заменить на метод из файла ListToTreeHelper
  convertOktmoListToTree (list) {
    const groupedAllOktmo = _groupBy(list, item => item.parent_id)
    const parentOktmoList = _sortBy(list.filter(item => !item.parent_id || !list.some(x => x.id === item.parent_id)), oktmo => oktmo.name)
    for (const parentOktmo of parentOktmoList) {
      this.addOktmoChildren(parentOktmo, groupedAllOktmo)
    }

    return parentOktmoList
  }

  async getOktmoTree (oktmoList, allOktmo) {
    if (!allOktmo) {
      allOktmo = (await this.getAllOktmo()).map(this.mapOktmo)
    }
    const userOktmoTreeList = _keyBy(oktmoList, oktmo => oktmo.id)

    return this.convertOktmoListToTree(Object.values(userOktmoTreeList))
  }

  async getOktmoByIds (ids) {
    return this.database.oktmo.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    })
  }

  async getLibraryOktmoByIds (ids) {
    return this.database.userLibraryOktmo.findAll({
      where: {
        id: {
          [Op.in]: ids
        }
      },
      include: [{
        model: this.database.oktmo,
        required: true,
        attributes: ['id', 'parent_id', 'code', 'name', 'cadastral_number', 'is_obsolete']
      }]
    })
  }

  async getDbLibraryUserOktmo (userId) {
    const userLibraryOktmoList = (await this.getLibraryUserOktmoList(userId)).map(this.mapOktmo)
    return userLibraryOktmoList
  }

  async getUserOktmo (user) {
    if (user.isEsiaVirtualUser) {
      return (await this.getOktmoByIds(user.userOktmo)).map(this.mapOktmo)
    } else {
      const userOktmoList = await this.memGetDbUserOktmo(user.id)
      return userOktmoList
    }
  }

  async getUserOktmoLibrary (user) {
    if (user.isEsiaVirtualUser) {
      return (await this.getLibraryOktmoByIds(user.userLibraryOktmo)).map(this.mapOktmo)
    } else {
      const userLibraryOktmoList = await this.getDbLibraryUserOktmo(user.id)
      return userLibraryOktmoList
    }
  }

  async getOktmo (user) {
    return this.database.oktmo.findOne({
      where: {
        id: user.oktmo_id
      },
      attributes: ['id', 'code', 'parent_id', 'name', 'is_obsolete'],
      raw: true
    })
  }
}

module.exports = OktmoHelper
