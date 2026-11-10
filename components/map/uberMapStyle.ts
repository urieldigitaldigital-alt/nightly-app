/**
 * Dark, navy, tilted-3D MapLibre style built on OpenFreeMap's free vector
 * tiles (OpenMapTiles schema — https://openfreemap.org, no API key, no
 * account, explicitly unlimited free hosting). Layer/source-layer names
 * (water, landcover, landuse, park, building, transportation,
 * transportation_name, place) are the stable OpenMapTiles schema.
 */
export const UBER_MAP_STYLE = {
  version: 8,
  sources: {
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
    },
  },
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': '#0e1521' } },
    { id: 'water', type: 'fill', source: 'openmaptiles', 'source-layer': 'water', paint: { 'fill-color': '#0a0f18' } },
    {
      id: 'landcover',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landcover',
      paint: { 'fill-color': '#121a26', 'fill-opacity': 0.5 },
    },
    {
      id: 'landuse',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'landuse',
      paint: { 'fill-color': '#131c28', 'fill-opacity': 0.4 },
    },
    { id: 'park', type: 'fill', source: 'openmaptiles', 'source-layer': 'park', paint: { 'fill-color': '#141f29' } },
    {
      id: 'building-fill',
      type: 'fill',
      source: 'openmaptiles',
      'source-layer': 'building',
      maxzoom: 14,
      paint: { 'fill-color': '#25334a', 'fill-opacity': 0.85 },
    },
    {
      id: 'building-3d',
      type: 'fill-extrusion',
      source: 'openmaptiles',
      'source-layer': 'building',
      minzoom: 14,
      paint: {
        'fill-extrusion-color': '#32456a',
        'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8],
        'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
        'fill-extrusion-opacity': 1,
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'path', 'track']]],
      paint: {
        'line-color': '#1f2c3d',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.5, 18, 3],
      },
    },
    {
      id: 'road-major',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary']]],
      paint: {
        'line-color': '#2d3e55',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 18, 8],
      },
    },
    {
      id: 'road-highway',
      type: 'line',
      source: 'openmaptiles',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['motorway', 'trunk']]],
      paint: {
        'line-color': '#3d5272',
        'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.5, 18, 10],
      },
    },
    {
      id: 'road-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'transportation_name',
      layout: {
        'symbol-placement': 'line',
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: { 'text-color': '#8a96ab', 'text-halo-color': '#0e1521', 'text-halo-width': 1 },
    },
    {
      id: 'place-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'place',
      filter: ['in', ['get', 'class'], ['literal', ['city', 'town', 'village', 'suburb', 'neighbourhood']]],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 8, 10, 14, 16],
      },
      paint: { 'text-color': '#e7ebf2', 'text-halo-color': '#0e1521', 'text-halo-width': 1.2 },
    },
    {
      // Comercios y puntos de interes: kioscos, bares, restaurantes,
      // farmacias, paradas. Sin esta capa el mapa mostraba solo calles y
      // nombres de barrio, y no servia para ubicarse caminando: a nivel de
      // calle uno se orienta por los negocios de la esquina, no por el
      // nombre del barrio.
      id: 'poi-label',
      type: 'symbol',
      source: 'openmaptiles',
      'source-layer': 'poi',
      // Desde zoom 15 para abajo no se dibuja nada. Mas lejos que eso, los
      // nombres se amontonan hasta tapar el mapa y los marcadores de las
      // fiestas y los boliches, que son lo que de verdad importa aca.
      minzoom: 15,
      // `rank` lo trae OpenMapTiles ya ordenado por relevancia dentro de
      // cada celda: quedarse con los primeros evita que una galeria con
      // treinta locales sepulte la zona.
      filter: ['all', ['has', 'name'], ['<=', ['get', 'rank'], 12]],
      layout: {
        'text-field': ['get', 'name'],
        'text-font': ['Noto Sans Regular'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 15, 10, 18, 13],
        'text-anchor': 'top',
        'text-offset': [0, 0.5],
        'text-max-width': 9,
        // Si no entra sin pisar a otro, se omite. Un nombre a medias o
        // encimado se lee peor que no tenerlo.
        'text-optional': true,
      },
      paint: {
        // Mas apagado que los nombres de barrio: son contexto, no destino.
        'text-color': '#9bb0c4',
        'text-halo-color': '#0e1521',
        'text-halo-width': 1.2,
      },
    },
  ],
};
