'use strict'
require('pg').defaults.parseInt8 = true
const fs = require('fs')
const path = require('path')
const _wrap = require('lodash/wrap')
const Sequelize = require('sequelize')
const requireFromString = require('require-from-string')
const { getLogger } = require('../app/logger')
const logger = getLogger()
const enumHelper = require('../utils/enumHelper')

let dbInstance = null

function softDestroy (destroy, options, attributes) {
  if (attributes.isDeleted) {
    return this.update({
      isDeleted: true
    }, options)
    .then(() => destroy.call(this, options))
  }
  return destroy.call(this, options)
}

Sequelize.Model.destroy = _wrap(Sequelize.Model.destroy, function (destroy, options) {
  return softDestroy.call(this, destroy, options, this.attributes)
})

Sequelize.Model.prototype.destroy = _wrap(Sequelize.Model.prototype.destroy, function (destroy, options) {
  return softDestroy.call(this, destroy, options, this.rawAttributes)
})

const db = {
  enums: {},
  define: function (modelDefinition, timestamps) {
    const model = this.sequelize.define(modelDefinition.name, modelDefinition.model, {
      tableName: modelDefinition.tableName,
      schema: modelDefinition.schema,
      freezeTableName: true,
      timestamps: timestamps
    })
    if (modelDefinition.model.associate) {
      model.associate = modelDefinition.model.associate
      model.associate(this)
    }

    return model
  }
}

function createSequelize (sequelizeConfig) {
  if (sequelizeConfig.use_env_variable) {
    return new Sequelize(process.env[sequelizeConfig.use_env_variable])
  } else {
    return new Sequelize(sequelizeConfig.database, sequelizeConfig.username, sequelizeConfig.password, sequelizeConfig)
  }
}

function getFolderModels (folderName) {
  const modelsPath = path.join(folderName, 'models')
  if (fs.existsSync(modelsPath) && fs.statSync(modelsPath).isDirectory()) {
    return fs.readdirSync(modelsPath)
      .filter(file => path.extname(file) === '.js')
      .map(file => path.join(modelsPath, file))
  }

  return []
}

function getFolderEnums (folderName) {
  const modelsPath = path.join(folderName, 'enums')
  if (fs.existsSync(modelsPath) && fs.statSync(modelsPath).isDirectory()) {
    return fs.readdirSync(modelsPath)
      .filter(file => path.extname(file) === '.js')
      .map(file => ({ fileName: path.join(modelsPath, file), name: path.basename(file, path.extname(file)) }))
  }

  return []
}

function getModelFolders (rootModelFolder) {
  return fs.readdirSync(rootModelFolder)
    .filter(file => fs.statSync(path.join(rootModelFolder, file)).isDirectory())
    .map(file => ({ path: path.join(rootModelFolder, file), name: file }))
}

function registerModel (modelFile, sequelize) {
  const model = sequelize['import'](modelFile)
  db[model.name] = model
}

function registerEnum (folderName, enumFile, appConfig) {
  const enumFileContent = fs.readFileSync(enumFile.fileName, { encoding: 'utf-8' })
  const enumObj = requireFromString(enumFileContent, {
    prependPaths: [
      // По умолчанию добавлены только пути от корня проекта.
      path.join(__dirname, appConfig.dev ? '../../../node_modules' : '../../node_modules')
    ]
  })
  db.enums[folderName][enumFile.name] = enumHelper.getEnumDescription(enumObj)
}

function registerModelsAndEnums (modelsPath, sequelize, appConfig) {
  const modelFolders = getModelFolders(modelsPath)
  modelFolders.forEach(modelFolder => {
    // if (modelFolder.indexOf('models\\kha') !== -1) {
    //   return
    // }
    const modelFiles = getFolderModels(modelFolder.path)
    modelFiles.forEach(modelFile => {
      registerModel(modelFile, sequelize)
    })

    if (!db.enums[modelFolder.name]) {
      db.enums[modelFolder.name] = {}
    }
    const enumFiles = getFolderEnums(modelFolder.path)
    enumFiles.forEach(enumFile => {
      registerEnum(modelFolder.name, enumFile, appConfig)
    })
  })
}

function initializeDb (appConfig, modelPaths) {
  const connectionSettings = appConfig

  connectionSettings.define = {
    underscored: true,
    underscoredAll: true,
    freezeTableName: true,
    timestamps: true,
    paranoid: true,
    createdAt: 'created',
    updatedAt: 'updated',
    deletedAt: 'deleted'
  }
  connectionSettings.logging = logger.debug
  connectionSettings.pool = {
    min: 0,
    max: 10
  }
  connectionSettings.dialectOptions = {
    useUTC: false
  }

  const sequelizeInstance = createSequelize(connectionSettings)

  for (const modelsPath of modelPaths) {
    registerModelsAndEnums(modelsPath, sequelizeInstance, appConfig)
  }

  Object.keys(db).forEach(function (modelName) {
    if (db[modelName].associate) {
      db[modelName].associate(db)
    }
  })

  db.Sequelize = Sequelize
  db.sequelize = sequelizeInstance
  db.Op = Sequelize.Op

  dbInstance = db
}

function getDb () {
  return dbInstance
}

module.exports = {
  initializeDb,
  getDb
}
