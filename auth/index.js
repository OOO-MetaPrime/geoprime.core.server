'use strict'

const cookieParser = require('cookie-parser')
const session = require('express-session')
const wrap = require('express-async-wrap')
const pMemoize = require('p-memoize')
const _has = require('lodash/has')
const sessionSequelize = require('connect-session-sequelize')
const passport = require('passport')
const crypto = require('crypto')
const { Strategy: LocalStrategy } = require('passport-local')
const { getDb } = require('../database')
const database = getDb()
const _cloneDeep = require('lodash/cloneDeep')
const OktmoHelper = require('../utils/oktmoHelper')
const oktmoHelper = new OktmoHelper({ database })
const UserHelper = require('../utils/userHelper')
const userHelper = new UserHelper({ database })
const ProfileHelper = require('../utils/profileHelper')
const profileHelper = new ProfileHelper({ database })
const { getLogger } = require('../app/logger')
const logger = getLogger()

const passwordSalt = ''
const SequelizeStore = sessionSequelize(session.Store)
const secret = ''

function serializeUser (user, cb) {
  cb(null, user.id)
}

async function getUserOrganization (organizationId) {
  const organizaton = await database.urbanPlanningObject.findById(organizationId, { raw: true })
  return organizaton
}

async function getDbUser (id) {
  const userData = await database.user.findOne({
    where: {
      id,
      is_deleted: false
    }
  })

  if (!userData) {
    return null
  }

  return userData
}

const memGetDbUser = pMemoize(getDbUser, { maxAge: 5000 })

// параметр userId необходим для кэширования по пользователям
async function getResources (userId) {
  const resourceDict = await userHelper.getResourceDictionary()

  return resourceDict
}

const memGetResources = pMemoize(getResources, { maxAge: 60000 })

async function getUser (id) {
  const isEsiaVirtualUser = typeof id === 'object' && id.provider === 'esia'
  let user
  if (isEsiaVirtualUser) {
    // Если не клонировать все изменения в объекте в дальнейшем буду сохранены в SessionStore
    user = _cloneDeep(id)
    user.permissions = await userHelper.getUserPermissions(user)
  } else {
    user = await memGetDbUser(id)
  }
  if (!user) {
    return null
  }
  user.isEsiaVirtualUser = isEsiaVirtualUser
  return user
}

async function getProfileId (oktmoId) {
  return profileHelper.getProfile(oktmoId, ['id'])
}

const memGetProfileId = pMemoize(getProfileId, { maxAge: 15000 })

async function deserializeUser (id, cb) {
  try {
    const user = await getUser(id)

    if (!user) {
      // некорректная сессия - идем на логин
      return cb(null, false)
    }
    user.getUserOktmo = async () => {
      if (!user.cachedUserOktmo) {
        user.cachedUserOktmo = await oktmoHelper.getUserOktmo(user)
      }
      return user.cachedUserOktmo
    }
    user.getUserLibraryOktmo = async () => {
      if (!user.cachedUserLibraryOktmo) {
        user.cachedUserLibraryOktmo = await oktmoHelper.getUserOktmoLibrary(user)
      }
      return user.cachedUserLibraryOktmo
    }
    user.getOktmo = async () => {
      return oktmoHelper.getOktmo(user)
    }
    user.getUserOrganization = async () => {
      return getUserOrganization(user.urbanPlanningObjectId)
    }
    user.can = can
    user.resources = await memGetResources(id)
    user.setNoRightsStatus = setNoRightsStatus
    user.getProfileId = async () => {
      // Профиль пользователя определяется территорией пользователя (oktmoId).
      // Находим профиль для территории пользователя.
      // Если не найден, то берем базовый.
      const profile = await memGetProfileId(user.oktmo_id)

      if (!profile) {
        throw new Error('Отсутствует базовый профиль.')
      }
      return profile.id
    }
    return cb(null, user)
  } catch (error) {
    return cb(error)
  }
}

async function can (resource, action) {
  if (this.permissions) {
    return _has(this.permissions.claimsByName, [resource, action])
  }
  return userHelper.isResourceActionAllowed({ userId: this.id, resourceName: resource, actionName: action })
}

function setNoRightsStatus (res, resource, action) {
  const resourceName = this.resources[resource]
  res.status(403).send(`Отсутствуют права на ${action.toLowerCase()} ресурса "${resourceName}"`)
}

/**
 *
 * @param {Object} req Запрос
 * @param {Object} res Результат
 * @param {Function} next Функция для следующего обработчика
 */
function authorize (req, res, next) {
  const isAuthenticated = req.isAuthenticated()

  if (!isAuthenticated) {
    res.status(401).end()
    return
  }
  if (req.user.isPasswordChangeRequired) {
    res.status(401).end()
    return
  }

  next()
}

/**
 * Получить пользователя по логину.
 * @param {*} username Логин.
 */
function getUserByUsername (username) {
  return database.user.findOne({
    where: database.sequelize.where(database.sequelize.fn('lower', database.sequelize.col('login')), '=', database.sequelize.fn('lower', username)),
    raw: true
  })
}

async function verify (username, password, cb) {
  try {
    const user = await getUserByUsername(username)

    if (!user) {
      return cb(null, false)
    }

    const hash = passwordToHash(password)

    if (user.password !== hash) {
      return cb(null, false, 400)
    }

    return cb(null, user)
  } catch (error) {
    logger.error(error)
    return cb(error)
  }
}

function passwordToHash (password) {
  const cryptoHash = crypto.createHash('sha512')
  cryptoHash.update(password + passwordSalt)
  return cryptoHash.digest('base64')
}

/**
 * Инициализация приложения.
 * @param {Object} app Приложение
 */
function initialize (app) {
  passport.use(new LocalStrategy(verify))
  passport.serializeUser(serializeUser)
  passport.deserializeUser(deserializeUser)
  app.use(cookieParser())
  app.use(session({
    store: new SequelizeStore({
      db: database.sequelize,
      // Название модели
      table: 'session'
    }),
    cookie: { httpOnly: false },
    secret: secret,
    resave: false,
    saveUninitialized: false
  }))
  app.use(passport.initialize())
  app.use(passport.session())
}

function authorizeAction (resource, action) {
  return wrap(async function (req, res, next) {
    const isAllowed = await req.user.can(resource, action)
    if (!isAllowed) {
      const resourceName = req.user.resources[resource]
      res.status(403).send(`Отсутствуют права на ${action.toLowerCase()} ресурса "${resourceName}"`)
    } else {
      next()
    }
  })
}

module.exports = {
  initialize,
  authenticate: passport.authenticate('local'),
  authorize,
  passwordToHash,
  authorizeAction
}
