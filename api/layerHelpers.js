'use strict'

const btoa = require('btoa')

/**
 * Преобразовать стили в объекты из данных слоя полученных из базы данных.
 * @param {*} layer Слой.
 */
module.exports.parseStyles = function parseStyles (layer) {
  const style = {}

  if (layer.pointStyle) {
    style.point = parseSympleSymbol(layer.pointStyle)
  }
  if (layer.lineStyle) {
    style.line = parseSympleSymbol(layer.lineStyle)
  }
  if (layer.polygonStyle) {
    style.polygon = parsePolygonSymbol(layer.polygonStyle)
  }

  return style
}

function parseColor (argb) {
  if (!argb) {
    return
  }

  const a = parseInt(argb.substr(2, 2), 16) / 255
  const r = parseInt(argb.substr(4, 2), 16)
  const g = parseInt(argb.substr(6, 2), 16)
  const b = parseInt(argb.substr(8, 2), 16)

  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function parseSympleSymbol (json) {
  var style = JSON.parse(json)

  if (style.type !== 'SimpleSymbol') {
    return
  }

  return {
    size: style.Size,
    color: parseColor(style.Color)
  }
}

function parsePolygonSymbol (json) {
  var style = JSON.parse(json)

  if (style.type !== 'Polygon') {
    return
  }

  const border = parseSympleSymbol(style.BorderSymbol)
  const fill = parseSympleSymbol(style.FillSymbol)

  return {
    size: border.size,
    color: border.color,
    fill: fill.color
  }
}

module.exports.getBasicAuthorization = function getBasicAuthorization (login, password) {
  return btoa(`${login}:${(password || '')}`)
}

exports.getLayerModel = function (layer) {
  if (!layer) {
    return {}
  }
  return {
    id: layer.id,
    name: layer.name,
    type: layer.layerType,
    layers: layer.serviceLayersValue,
    url: layer.url,
    authorizationString: layer.serviceLogin ? exports.getBasicAuthorization(layer.serviceLogin, layer.servicePassword) : '',
    style: exports.parseStyles(layer),
    opacity: 100
  }
}
