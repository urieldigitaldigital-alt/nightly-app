import { useEffect, useRef } from 'react';
import { View } from 'react-native';
import type { AppMapProps, MapMarkerSpec } from './AppMap.types';
import { UBER_MAP_STYLE } from './uberMapStyle';

let maplibrePromise: Promise<any> | null = null;

// Loads MapLibre GL JS from a CDN directly into the page (no npm dependency,
// no API key) the first time a map mounts, and reuses it after that.
function loadMaplibre(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'));
  if ((window as any).maplibregl) return Promise.resolve((window as any).maplibregl);
  if (maplibrePromise) return maplibrePromise;

  maplibrePromise = new Promise((resolve, reject) => {
    const cssId = 'maplibre-css';
    if (!document.getElementById(cssId)) {
      const link = document.createElement('link');
      link.id = cssId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/maplibre-gl@4/dist/maplibre-gl.js';
    script.async = true;
    script.onload = () => resolve((window as any).maplibregl);
    script.onerror = () => reject(new Error('Failed to load MapLibre GL'));
    document.head.appendChild(script);
  });

  return maplibrePromise;
}

function makeEl(m: MapMarkerSpec): HTMLDivElement {
  const el = document.createElement('div');
  if (m.kind === 'photo') {
    el.innerHTML = `<div style="width:48px;height:48px;border-radius:24px;background:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;">${
      m.photoUrl
        ? `<img src="${m.photoUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:21px;" />`
        : `<div style="width:100%;height:100%;background:#2a2a2a;border-radius:21px;"></div>`
    }${
      m.badge && m.badge > 1
        ? `<div style="position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#ACFF2F;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;padding:0 4px;color:#111;">${m.badge}</div>`
        : ''
    }</div>`;
  } else {
    el.innerHTML = `<div style="width:16px;height:16px;border-radius:8px;background:${m.color || '#ACFF2F'};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>`;
  }
  el.style.cursor = 'pointer';
  return el;
}

export default function AppMapWeb({
  style,
  center,
  zoom,
  pitch = 60,
  bearing = -17,
  markers = [],
  route,
  routeColor,
  onMarkerPress,
  onMapPress,
  onMarkerDragEnd,
}: AppMapProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const callbacksRef = useRef({ onMarkerPress, onMapPress, onMarkerDragEnd });
  callbacksRef.current = { onMarkerPress, onMapPress, onMarkerDragEnd };

  useEffect(() => {
    let cancelled = false;
    loadMaplibre().then((maplibregl) => {
      if (cancelled || !containerRef.current) return;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: UBER_MAP_STYLE,
        center: [center.lng, center.lat],
        zoom,
        pitch,
        bearing,
        attributionControl: true,
      });
      map.on('click', (e: any) => callbacksRef.current.onMapPress?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      mapRef.current = map;
    });
    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mapRef.current?.jumpTo({ center: [center.lng, center.lat], zoom, pitch, bearing });
  }, [center.lat, center.lng, zoom, pitch, bearing]);

  useEffect(() => {
    loadMaplibre().then((maplibregl) => {
      const map = mapRef.current;
      if (!map) return;
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};
      markers.forEach((m) => {
        const el = makeEl(m);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacksRef.current.onMarkerPress?.(m.id);
        });
        const marker = new maplibregl.Marker({ element: el, draggable: m.kind === 'dot' && !!m.draggable, anchor: m.kind === 'photo' ? 'bottom' : 'center' })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        if (m.kind === 'dot' && m.draggable) {
          marker.on('dragend', () => {
            const pos = marker.getLngLat();
            callbacksRef.current.onMarkerDragEnd?.(m.id, { lat: pos.lat, lng: pos.lng });
          });
        }
        markersRef.current[m.id] = marker;
      });
    });
  }, [markers]);

  useEffect(() => {
    const applyRoute = () => {
      const map = mapRef.current;
      if (!map) return;
      const coords = (route ?? []).map((p) => [p.lng, p.lat]);
      const geojson = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } } as const;
      const src = map.getSource('route');
      if (src) {
        src.setData(geojson);
      } else if (coords.length > 1) {
        map.addSource('route', { type: 'geojson', data: geojson });
        map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': routeColor || '#ACFF2F', 'line-width': 4 },
        });
      }
    };
    loadMaplibre().then(() => {
      const map = mapRef.current;
      if (!map) return;
      if (map.isStyleLoaded()) applyRoute();
      else map.once('load', applyRoute);
    });
  }, [route, routeColor]);

  return <View ref={containerRef} style={[{ flex: 1 }, style]} />;
}
