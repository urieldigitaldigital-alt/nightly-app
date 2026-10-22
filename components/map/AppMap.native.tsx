import { ComponentType, useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import RNWebView from 'react-native-webview';
import type { AppMapProps } from './AppMap.types';
import { UBER_MAP_STYLE } from './uberMapStyle';

// react-native-webview's class-generic typing resolves to a `never` props
// type when used un-parameterized in JSX (a known quirk of its .d.ts) — cast
// once here instead of sprinkling `as any` through the component below.
const WebView = RNWebView as unknown as ComponentType<any>;

// Dark, tilted 3D map (Uber-style): MapLibre GL JS (free, open-source WebGL
// renderer) pulling vector tiles from OpenFreeMap (free, unlimited, no API
// key — see uberMapStyle.ts), rendered inside a WebView since MapLibre needs
// WebGL and there's no React Native binding for it.
function buildHtml(center: { lat: number; lng: number }, zoom: number, pitch: number, bearing: number): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css" />
<style>
  html, body, #map { height: 100%; margin: 0; padding: 0; background: #0e1521; }
  .maplibregl-ctrl-attrib { font-size: 9px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js"></script>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: ${JSON.stringify(UBER_MAP_STYLE)},
    center: [${center.lng}, ${center.lat}],
    zoom: ${zoom},
    pitch: ${pitch},
    bearing: ${bearing},
    attributionControl: true,
  });

  var markersById = {};

  function post(msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); }

  function makeEl(m) {
    var el = document.createElement('div');
    if (m.kind === 'photo') {
      el.innerHTML =
        '<div style="width:48px;height:48px;border-radius:24px;background:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;">' +
        (m.photoUrl
          ? '<img src="' + m.photoUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:21px;" />'
          : '<div style="width:100%;height:100%;background:#2a2a2a;border-radius:21px;"></div>') +
        (m.badge && m.badge > 1
          ? '<div style="position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#ACFF2F;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;padding:0 4px;color:#111;">' +
            m.badge +
            '</div>'
          : '') +
        '</div>';
    } else if (m.heading != null) {
      // Directional "you are here" arrow — points true north at rotation 0;
      // rotationAlignment:'map' on the Marker keeps it correctly oriented as
      // the map itself rotates to track the device's heading.
      el.innerHTML =
        '<div style="width:0;height:0;border-left:9px solid transparent;border-right:9px solid transparent;border-bottom:22px solid ' +
        (m.color || '#ACFF2F') +
        ';filter:drop-shadow(0 1px 3px rgba(0,0,0,0.6));"></div>';
    } else {
      el.innerHTML =
        '<div style="width:16px;height:16px;border-radius:8px;background:' +
        (m.color || '#ACFF2F') +
        ';border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>';
    }
    el.style.cursor = 'pointer';
    return el;
  }

  function renderMarkers(markers) {
    var seen = {};
    markers.forEach(function (m) {
      seen[m.id] = true;
      var existing = markersById[m.id];
      if (existing) {
        existing.setLngLat([m.lng, m.lat]);
        if (m.kind === 'dot' && m.heading != null) existing.setRotation(m.heading);
        return;
      }
      var el = makeEl(m);
      el.addEventListener('click', function (e) { e.stopPropagation(); post({ type: 'markerPress', id: m.id }); });
      var marker = new maplibregl.Marker({
        element: el,
        draggable: !!m.draggable,
        anchor: m.kind === 'photo' ? 'bottom' : 'center',
        rotationAlignment: m.kind === 'dot' && m.heading != null ? 'map' : 'viewport',
      })
        .setLngLat([m.lng, m.lat])
        .addTo(map);
      if (m.kind === 'dot' && m.heading != null) marker.setRotation(m.heading);
      if (m.draggable) {
        marker.on('dragend', function () {
          var pos = marker.getLngLat();
          post({ type: 'markerDragEnd', id: m.id, lat: pos.lat, lng: pos.lng });
        });
      }
      markersById[m.id] = marker;
    });
    Object.keys(markersById).forEach(function (id) {
      if (!seen[id]) { markersById[id].remove(); delete markersById[id]; }
    });
  }

  function renderRoute(route, color) {
    var coords = (route || []).map(function (p) { return [p.lng, p.lat]; });
    var geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } };
    var src = map.getSource('route');
    if (src) {
      src.setData(geojson);
    } else if (coords.length > 1) {
      map.addSource('route', { type: 'geojson', data: geojson });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': color || '#ACFF2F', 'line-width': 4 },
      });
    }
  }

  map.on('click', function (e) { post({ type: 'mapPress', lat: e.lngLat.lat, lng: e.lngLat.lng }); });
  map.on('load', function () { post({ type: 'ready' }); });
  map.on('dragstart', function (e) { if (e.originalEvent) post({ type: 'userPanStart' }); });

  window.updateMarkers = renderMarkers;
  window.updateRoute = renderRoute;
  window.setMapView = function (lat, lng, z, p, b, animate) {
    var opts = { center: [lng, lat], zoom: z, pitch: p, bearing: b };
    if (animate) map.easeTo(Object.assign({ duration: 900 }, opts));
    else map.jumpTo(opts);
  };
</script>
</body>
</html>`;
}

export default function AppMapNative({
  style,
  center,
  zoom,
  pitch = 60,
  bearing = -17,
  animate = true,
  markers = [],
  route,
  routeColor,
  onMarkerPress,
  onMapPress,
  onMarkerDragEnd,
  onUserPanStart,
}: AppMapProps) {
  const webviewRef = useRef<any>(null);
  const readyRef = useRef(false);
  // Built once from the initial center/zoom/pitch — later changes go through
  // setMapView via injectJavaScript instead of reloading the whole page.
  const html = useMemo(() => buildHtml(center, zoom, pitch, bearing), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!readyRef.current) return;
    webviewRef.current?.injectJavaScript(`window.setMapView(${center.lat}, ${center.lng}, ${zoom}, ${pitch}, ${bearing}, ${animate}); true;`);
  }, [center.lat, center.lng, zoom, pitch, bearing, animate]);

  useEffect(() => {
    if (!readyRef.current) return;
    webviewRef.current?.injectJavaScript(`window.updateMarkers(${JSON.stringify(markers)}); true;`);
  }, [markers]);

  useEffect(() => {
    if (!readyRef.current) return;
    webviewRef.current?.injectJavaScript(`window.updateRoute(${JSON.stringify(route ?? [])}, ${JSON.stringify(routeColor ?? null)}); true;`);
  }, [route, routeColor]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        readyRef.current = true;
        webviewRef.current?.injectJavaScript(
          `window.updateMarkers(${JSON.stringify(markers)}); window.updateRoute(${JSON.stringify(route ?? [])}, ${JSON.stringify(
            routeColor ?? null
          )}); true;`
        );
      } else if (msg.type === 'markerPress') {
        onMarkerPress?.(msg.id);
      } else if (msg.type === 'mapPress') {
        onMapPress?.({ lat: msg.lat, lng: msg.lng });
      } else if (msg.type === 'markerDragEnd') {
        onMarkerDragEnd?.(msg.id, { lat: msg.lat, lng: msg.lng });
      } else if (msg.type === 'userPanStart') {
        onUserPanStart?.();
      }
    } catch {
      // ignore malformed messages
    }
  };

  return (
    <WebView
      ref={webviewRef}
      source={{ html }}
      style={[StyleSheet.absoluteFill, style]}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={['*']}
    />
  );
}
