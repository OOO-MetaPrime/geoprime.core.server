'use strict'

function getEnumDescription (enumObj) {
  const enumKeys = Object.keys(enumObj).filter(x => typeof (enumObj[x]) !== 'function')

  const enumDescription = {
    displayNames: {}
  }

  for (const enumKey of enumKeys) {
    const enumValue = enumObj[enumKey]
    enumDescription[enumKey] = enumValue
    enumDescription.displayNames[enumKey] = enumObj.toDisplayName ? enumObj.toDisplayName(enumValue) : enumKey
  }

  return enumDescription
}

module.exports = { getEnumDescription }
