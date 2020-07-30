'use strict'

function mapLayersGroupsToLayers (layersgroup) {
  return layersgroup.reduce((acc, layerGroup) => {
    const layers = layerGroup.layers
    .map(layer => ({
      ...layer,
      groupName: layerGroup.name
    }))
    return acc.concat(layers)
  }, [])
}
module.exports = { mapLayersGroupsToLayers }
