'use strict'

/**
 * Добавляет комментарий к схеме.
 */
exports.commentSchema = function ({ sequelize }, schema, comment) {
  return sequelize.query(`COMMENT ON SCHEMA ${schema} IS '${comment}'`)
}

/**
 * Добавляет комментарий к таблице.
 */
exports.commentTable = function ({ sequelize }, table, comment, transaction) {
  return sequelize.query(`COMMENT ON TABLE ${table.schema}."${table.tableName}" IS '${comment}'`, transaction ? { transaction: transaction } : undefined)
}

/**
 * Добавляет комментарий к колонке таблицы.
 */
exports.commentColumn = function ({ sequelize }, table, column, comment, transaction) {
  return sequelize.query(`COMMENT ON COLUMN ${table.schema}."${table.tableName}"."${column}" IS '${comment}'`, transaction ? { transaction: transaction } : undefined)
}

/**
 * Добавляет комментарий к колонке таблицы.
 */
exports.setDefaultUuidValue = function ({ sequelize }, table, column, transaction) {
  return sequelize.query(`ALTER TABLE ${table.schema}."${table.tableName}" ALTER "${column}" SET DEFAULT uuid_generate_v4()`, transaction ? { transaction: transaction } : undefined)
}

/**
 * Добавляет комментарий к колонке таблицы.
 */
exports.setDefaultUuidValue = function ({ sequelize }, table, column, transaction) {
  return sequelize.query(`ALTER TABLE ${table.schema}."${table.tableName}" ALTER "${column}" SET DEFAULT uuid_generate_v4()`, transaction ? { transaction: transaction } : undefined)
}

// TODO возможно стоит вынести в прототип sequelize
/**
 * Наследование модели. Добавляет в наследника атрибуты из предка, как геттер методы и добавляет в defaultScope инклуд с ним.
 *
 * Вызывать метод необходимо после объявления ассоциаций, чтобы в инклуд была добавлена корректная информация, включая as, если он есть.
 * @param родитель
 * @param наследник
 */
exports.inheritModel = function (parentModel, childModel) {
  const parentAttributes = Object.keys(parentModel.attributes)
  const parentModelName = parentModel.name
  if (!childModel.options.getterMethods) {
    childModel.options.getterMethods = {}
  }

  parentAttributes.forEach(attribute => {
    if (!childModel.attributes[attribute]) {
      childModel.options.getterMethods[attribute] = function () {
        if (!this[parentModelName]) {
          return null
        }
        return this[parentModelName][attribute]
      }
    }
  })
  childModel.addScope('defaultScope', {
    include: [{
      model: parentModel,
      as: childModel.associations[parentModelName].as
    }]
  }, { override: true })

  childModel.refreshAttributes()
}
