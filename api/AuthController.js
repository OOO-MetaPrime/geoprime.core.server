'use strict'

const { Router } = require('express')
const ejs = require('ejs')
const wrap = require('express-async-wrap')
const path = require('path')
const auth = require('../auth')
const UserHelper = require('../utils/userHelper')

function renderDevLogin (req, res) {
  // Тестовая страница аутентификации.
  ejs.renderFile(path.join(__dirname, `../views/login.html`), (err, str) => res.send(str))
}

class AuthController {
  constructor ({ config, database }) {
    this.config = config
    this.database = database
    this.userHelper = new UserHelper({ database })
  }
  get router () {
    const router = Router()

    if (this.config.env === 'development') {
      router.use('/login', this.devLogin)
      router.use('/logout', auth.authorize, this.devLogout)
    } else {
      router.get('/login', this.login.bind(this))
      router.get('/logout', auth.authorize, this.logout.bind(this))
    }

    router.get('/me', auth.authorize, wrap(this.me))

    return router
  }

  login (req, res) {
    // Переадресация на страницу авторизации на портале
    const baseUrl = req.get('referrer') || `${req.protocol}://${req.get('host')}${this.config.base}`
    const returnUrl = Object.keys(req.query)[0] || baseUrl
    const loginUrl = `${this.config.loginUrl}?${returnUrl}`
    res.redirect(loginUrl)
  }

  logout (req, res) {
    const referrer = req.get('referrer') || `${req.protocol}://${req.get('host')}${this.config.base}`
    const logoutUrl = this.config.logoutUrl || this.config.loginUrl.replace('login', 'api/logout')
    res.redirect(`${logoutUrl}?${referrer}`)
  }

  async me (req, res) {
    const permissions = await this.userHelper.getUserPermissions(req.user)
    res.json({
      name: req.user.fullName,
      permissions
    })
  }

  devLogin (req, res) {
    if (req.method === 'GET') {
      renderDevLogin(req, res)
    } else {
      const [ referrer, originalUrl ] = (req.get('referrer') || '').split('?')
      auth.authenticate(req, res, () => {
        if (originalUrl) {
          res.redirect(decodeURIComponent(originalUrl))
        } else {
          res.redirect('/')
        }
      })
    }
  }

  devLogout (req, res) {
    req.logout()
    renderDevLogin(req, res)
  }
}

module.exports = AuthController
