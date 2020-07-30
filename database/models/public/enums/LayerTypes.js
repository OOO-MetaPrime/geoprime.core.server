'use strict'

/**
 * Типы слоя.
 */
module.exports = {
  /**
   * WMS
   */
  wms: 10,

  /**
   * WFS
   */
  wfs: 15,

  /**
   * WMTS
   */
  wmts: 20,

  /**
   * ArcGIS (динамический)
   */
  arcGisDynamic: 30,

  /**
   * ArcGIS (кэшированный)
   */
  arcGisTiled: 31,

  /**
   * ArcGIS (векторный)
   */
  arcGisVector: 32,

  /**
   * BING
   */
  bing: 40,

  /**
   * OSM
   */
  om: 50,

  shapefile: 60,

  /**
   * Яндекс (схема)
   */
  yandexSchema: 70,

  /**
   * Яндекс (спутник)
   */
  yandexSatellite: 80,

  /**
   * OpenTopoMap
   */
  otm: 100,

  toDisplayName (value) {
    switch (value) {
      case this.wms: return ' WMS'
      case this.wfs: return ' WFS'
      case this.wmts: return ' WMTS'
      case this.arcGisDynamic: return ' ArcGIS (динамический)'
      case this.arcGisTiled: return ' ArcGIS (кэшированный)'
      case this.arcGisVector: return ' ArcGIS (векторный)'
      case this.bing: return ' BING'
      case this.om: return ' OSM'
      case this.shapefile: return 'shapefile'
      case this.yandexSchema: return ' Яндекс (схема)'
      case this.yandexSatellite: return ' Яндекс (спутник)'
      case this.otm: return ' OTM'
      default:
        throw new Error('Неизвестный тип слоя')
    }
  },

  getEnumsArray () {
    const enumsKeys = ['wms', 'wfs', 'wmts', 'arcGisDynamic', 'arcGisTiled', 'arcGisVector', 'bing', 'om', 'yandexSchema', 'yandexSatellite', 'otm']
    return enumsKeys.map(key => ({
      id: this[key],
      name: this.toDisplayName(this[key])
    }))
  }
}
