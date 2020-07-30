'use strict'

const { Router } = require('express')
const compression = require('compression')
const path = require('path')
const auth = require('../auth')

function controller (controllerUri, config) {
  const controllerPath = path.join(__dirname, '../api', controllerUri)
  const Controller = require(controllerPath)

  return new Controller(config).router
}

function initialize (options, publicApiRoutes, restrictedApiRoutes) {
  const { config, logger } = options
  const router = Router()

  router.use(compression())

  const apiRouter = Router()

  router.use('/api/auth', controller('AuthController', options))

  apiRouter.use('/settings', controller('SettingsController', options))
  apiRouter.use('/security', controller('SecurityController', options))

  publicApiRoutes(apiRouter, config)

  apiRouter
  .use(compression())
  .use(auth.authorize)

  apiRouter.use('/me', controller('MeController', options))
  apiRouter.use('/classifiers', controller('ClassifierController', options))
  apiRouter.use('/map', controller('MapController', options))
  apiRouter.use('/layer', controller('LayerController', options))
  apiRouter.use('/load-html', controller('LoadHtmlController', options))
  apiRouter.use('/modules', controller('ModulesController', options))
  apiRouter.use('/pd-cards', controller('PdCardsController', options))
  apiRouter.use('/registries', controller('RegistryController', options))
  apiRouter.use('/registries', controller('RegistriesController', options))
  apiRouter.use('/report-templates', controller('ReportTemplatesController', options))
  apiRouter.use('/settings-profiles', controller('SettingsProfilesController', options))
  apiRouter.use('/system-log', controller('SystemLogController', options))
  apiRouter.use('/system-parameters', controller('SystemParametersController', options))
  apiRouter.use('/territories', controller('TerritoriesController', options))
  apiRouter.use('/terrzone', controller('TerrZoneController', options))
  apiRouter.use('/urbanplanningobjects', controller('UrbanPlanningObjectController', options))
  apiRouter.use('/xlsx', controller('XSLXController', options))
  apiRouter.use('/customdirectory', controller('CustomDirectoryController', options))
  apiRouter.use('/files', controller('FileController', options))

  restrictedApiRoutes(apiRouter, config)

  // Обработчик ошибок.
  apiRouter.use(function (err, req, res, next) {
    logger.error(err)

    // config.env === 'development'
    //   ? res.status(500).send(`<pre>${err.stack}</pre>`)
    //   : res.status(500).end()

    res.status(500).send(`<pre>${err.stack}</pre>`)
  })

  router.use('/api', apiRouter)

  return router
}

module.exports = {
  initialize
}
