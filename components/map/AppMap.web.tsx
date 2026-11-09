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

/**
 * Escapes para armar el HTML de los marcadores.
 *
 * Acá se construye `innerHTML` con texto que viene de la base —el nombre de
 * un boliche, la URL de una foto—, así que una comilla suelta en un nombre
 * rompe el atributo y cierra la etiqueta antes de tiempo. Esto solo corre en
 * web; en nativo los marcadores son componentes y el problema no existe.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Igual que `escapeHtml`, pero además descarta las URL que no son http(s):
 *  un `javascript:` en un `src` se ejecuta al cargarse. */
function escapeAttr(value: string): string {
  if (!/^https?:\/\//i.test(value)) return '';
  return escapeHtml(value);
}

function makeEl(m: MapMarkerSpec): HTMLDivElement {
  const el = document.createElement('div');
  if (m.kind === 'photo') {
    el.innerHTML = `<div style="width:48px;height:48px;border-radius:24px;background:#fff;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.5);overflow:hidden;display:flex;align-items:center;justify-content:center;position:relative;">${
      m.photoUrl
        ? `<img src="${escapeAttr(m.photoUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:21px;" />`
        : `<div style="width:100%;height:100%;background:#2a2a2a;border-radius:21px;"></div>`
    }${
      m.badge && m.badge > 1
        ? `<div style="position:absolute;top:-4px;right:-4px;min-width:20px;height:20px;border-radius:10px;background:#22D3EE;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;border:2px solid white;padding:0 4px;color:#111;">${m.badge}</div>`
        : ''
    }</div>`;
  } else if (m.kind === 'venue') {
    // Mismo dibujo que `VenueMarker` en la versión nativa: círculo con aro
    // cian, logo adentro y punta abajo apuntando al lugar exacto.
    const size = m.selected ? 56 : 44;
    const glow = m.selected
      ? '0 0 0 6px rgba(34,211,238,0.22), 0 0 22px rgba(34,211,238,0.75)'
      : '0 4px 10px rgba(0,0,0,0.6)';
    const inner = m.logoUrl
      ? `<img src="${escapeAttr(m.logoUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" />`
      : `<span style="color:#22D3EE;font:700 17px system-ui,sans-serif;">${escapeHtml(
          m.name.trim().charAt(0).toUpperCase()
        )}</span>`;
    el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:${size}px;height:${size}px;border-radius:50%;background:#0B1015;border:${
          m.selected ? 3 : 2.5
        }px solid #22D3EE;box-shadow:${glow};overflow:hidden;display:flex;align-items:center;justify-content:center;">${inner}</div>
        <div style="width:9px;height:9px;margin-top:-5px;transform:rotate(45deg);background:#22D3EE;border-radius:2px;"></div>
      </div>`;
  } else {
    el.innerHTML = `<div style="width:16px;height:16px;border-radius:8px;background:${m.color || '#22D3EE'};border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.6);"></div>`;
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
  animate = true,
  markers = [],
  route,
  routeColor,
  showUserLocation = false,
  trackUser,
  onMarkerPress,
  onMapPress,
  onUserPanStart,
}: AppMapProps) {
  const containerRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const markersRef = useRef<Record<string, any>>({});
  const geolocateRef = useRef<any>(null);
  const callbacksRef = useRef({ onMarkerPress, onMapPress, onUserPanStart });
  callbacksRef.current = { onMarkerPress, onMapPress, onUserPanStart };

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
        // The {compact:true} constructor shorthand doesn't actually collapse
        // the control on this MapLibre build (verified live — it rendered
        // the full text bar) — disable the built-in one and add the control
        // instance directly instead, which does respect `compact`.
        attributionControl: false,
      });
      map.addControl(new maplibregl.AttributionControl({ compact: true }));
      // Compact mode renders a <details open> element, which starts
      // expanded — also verified live. MapLibre re-asserts `open`
      // asynchronously more than once during startup (a one-shot removal
      // right after addControl, or even on the map's `load` event, didn't
      // reliably stick) — a MutationObserver that strips it back off every
      // time it reappears is the only thing that held up on a fresh load.
      const attribEl = containerRef.current.querySelector('.maplibregl-ctrl-attrib');
      let attribObserver: MutationObserver | undefined;
      if (attribEl) {
        attribEl.removeAttribute('open');
        attribObserver = new MutationObserver(() => {
          if (attribEl.hasAttribute('open')) attribEl.removeAttribute('open');
        });
        attribObserver.observe(attribEl, { attributes: true, attributeFilter: ['open'] });
        // Only fighting MapLibre's own startup re-opens here, not blocking
        // the user from ever tapping the "i" to expand it themselves — stop
        // policing the attribute once initial load has settled.
        map.once('idle', () => attribObserver?.disconnect());
      }
      map.on('click', (e: any) => callbacksRef.current.onMapPress?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }));
      map.on('dragstart', (e: any) => { if (e.originalEvent) callbacksRef.current.onUserPanStart?.(); });
      mapRef.current = map;

      // Equivalente web del <UserLocation/> nativo. GeolocateControl ya
      // dibuja el punto, el círculo de precisión y el cono de orientación, y
      // mantiene la cámara siguiendo a la persona — replicarlo a mano con
      // navigator.geolocation daría un resultado peor.
      if (showUserLocation) {
        const geolocate = new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: Boolean(trackUser),
          showUserHeading: trackUser === 'heading' || trackUser === 'course',
          showAccuracyCircle: true,
        });
        map.addControl(geolocate);
        geolocateRef.current = geolocate;
        // El control solo empieza a ubicar cuando se lo toca; si la pantalla
        // ya pidió seguimiento, se dispara solo apenas el mapa está listo.
        if (trackUser) map.once('idle', () => geolocate.trigger());
      }

      // MapLibre sizes its canvas once at construction time and never
      // re-measures on its own — without this, the canvas stays pinned to
      // whatever size the flex container happened to be at that instant,
      // which on some viewports is smaller than the fully laid-out size.
      if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
        resizeObserverRef.current = new ResizeObserver(() => map.resize());
        resizeObserverRef.current.observe(containerRef.current);
      }
    });
    return () => {
      cancelled = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      Object.values(markersRef.current).forEach((m: any) => m.remove());
      markersRef.current = {};
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Igual que en nativo: mientras el control de geolocalización está
    // siguiendo a la persona, mover la cámara desde acá le pelearía el
    // control y el mapa se vería temblando.
    if (trackUser) return;
    const opts = { center: [center.lng, center.lat], zoom, pitch, bearing };
    if (animate) map.easeTo({ ...opts, duration: 900 });
    else map.jumpTo(opts);
  }, [center.lat, center.lng, zoom, pitch, bearing, animate, trackUser]);

  useEffect(() => {
    loadMaplibre().then((maplibregl) => {
      const map = mapRef.current;
      if (!map) return;
      const seen = new Set<string>();
      markers.forEach((m) => {
        seen.add(m.id);
        const existing = markersRef.current[m.id];
        if (existing) {
          existing.setLngLat([m.lng, m.lat]);
          return;
        }
        const el = makeEl(m);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          callbacksRef.current.onMarkerPress?.(m.id);
        });
        const marker = new maplibregl.Marker({
          element: el,
          // Los que tienen punta se anclan abajo, para que el vértice caiga
          // sobre la coordenada; el punto simple se centra en ella.
          anchor: m.kind === 'photo' || m.kind === 'venue' ? 'bottom' : 'center',
        })
          .setLngLat([m.lng, m.lat])
          .addTo(map);
        markersRef.current[m.id] = marker;
      });
      Object.keys(markersRef.current).forEach((id) => {
        if (!seen.has(id)) {
          markersRef.current[id].remove();
          delete markersRef.current[id];
        }
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
          paint: { 'line-color': routeColor || '#22D3EE', 'line-width': 4 },
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
