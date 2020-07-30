'use strict'

function padStart (sourceString, targetLength, padString) {
  targetLength = targetLength >> 0
  padString = String(padString || ' ')
  if (sourceString.length > targetLength) {
    return String(sourceString)
  } else {
    targetLength = targetLength - sourceString.length
    if (targetLength > padString.length) {
      padString += padString.repeat(targetLength / padString.length)
    }
    return padString.slice(0, targetLength) + String(sourceString)
  }
}

module.exports = {
  padStart
}
