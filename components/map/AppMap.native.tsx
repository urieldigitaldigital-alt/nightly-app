import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera, type CameraRef, GeoJSONSource, Layer, Map, Marker, UserLocation } from '@maplibre/maplibre-react-native';
import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';
import { colors } from '@/constants/theme';
import type { AppMapProps, MapMarkerSpec } from './AppMap.types';
import { UBER_MAP_STYLE } from './uberMapStyle';

/**
 * Mapa nativo (MapLibre Native) — el mismo que usan por dentro las apps de
 * navegación serias.
 *
 * Reemplazó a una implementación anterior que metía maplibre-gl JS dentro de
 * un WebView y lo descargaba de unpkg en cada arranque. Eso traía tres
 * problemas que un mapa nativo no tiene: dependía de un CDN externo en
 * tiempo de ejecución (sin internet o detrás de un firewall, pantalla negra),
 * cada gesto y cada marcador cruzaban el puente de JavaScript, y la ubicación
 * del usuario había que dibujarla a mano desde JS en vez de dejársela al
 * sistema.
 *
 * El punto de "estás acá" y el seguimiento de cámara ahora los maneja el
 * mapa nativo: se mueven a 60fps aunque el hilo de JavaScript esté ocupado,
 * que es exactamente la diferencia entre un mapa y un GPS.
 */

// El estilo es un objeto MapLibre válido (ver uberMapStyle.ts); el cast es
// solo para que TypeScript lo reconozca como la especificación completa.
const MAP_STYLE = UBER_MAP_STYLE as unknown as StyleSpecification;

function PhotoMarker({ marker }: { marker: Extract<MapMarkerSpec, { kind: 'photo' }> }) {
  return (
    <View style={styles.photoMarker}>
      {marker.photoUrl ? (
        <Image source={{ uri: marker.photoUrl }} style={styles.photoMarkerImage} contentFit="cover" />
      ) : (
        <View style={[styles.photoMarkerImage, styles.photoMarkerFallback]} />
      )}
      {marker.badge != null && marker.badge > 1 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{marker.badge}</Text>
        </View>
      )}
    </View>
  );
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
  showUserLocation = false,
  trackUser,
  onMarkerPress,
  onMapPress,
  onUserPanStart,
}: AppMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  // La cámara se mueve por ref y no por props para poder elegir entre
  // `jumpTo` y `easeTo` según el caso. Re-renderizar un <Camera/> con valores
  // nuevos en cada tick de GPS encolaría una animación arriba de la otra y el
  // mapa se vería temblando.
  const hasPositionedRef = useRef(false);

  useEffect(() => {
    // Mientras el mapa sigue a la persona, mandarle también un centro desde
    // JavaScript pelearía con el seguimiento nativo.
    if (trackUser) return;

    const stop = { center: [center.lng, center.lat] as [number, number], zoom, pitch, bearing };

    // El primer posicionamiento siempre es instantáneo: animar desde el
    // centro por defecto del mapa hasta la ubicación real sería un vuelo de
    // medio mundo cada vez que se abre la pantalla.
    if (!hasPositionedRef.current || !animate) {
      cameraRef.current?.jumpTo(stop);
      hasPositionedRef.current = true;
      return;
    }

    cameraRef.current?.easeTo({ ...stop, duration: 600 });
  }, [center.lat, center.lng, zoom, pitch, bearing, animate, trackUser]);

  const routeGeoJSON = useMemo(
    () => ({
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'LineString' as const,
        coordinates: (route ?? []).map((point) => [point.lng, point.lat]),
      },
    }),
    [route]
  );

  return (
    <Map
      style={[StyleSheet.absoluteFill, style]}
      mapStyle={MAP_STYLE}
      // El logo y la atribución de MapLibre son obligatorios por licencia de
      // los datos (OpenStreetMap vía OpenFreeMap). Se dejan arriba a la
      // izquierda porque abajo van los controles de la app.
      logo
      logoPosition={{ top: 8, left: 8 }}
      attribution
      attributionPosition={{ top: 8, left: 64 }}
      compass={Boolean(trackUser)}
      compassPosition={{ top: 8, right: 8 }}
      onPress={(event) => {
        const [lng, lat] = event.nativeEvent.lngLat;
        onMapPress?.({ lat, lng });
      }}
      onRegionWillChange={(event) => {
        // `userInteraction` separa el arrastre de un dedo de nuestros propios
        // movimientos de cámara. Sin ese filtro, cada recentrado automático
        // se interpretaría como "el usuario movió el mapa" y el modo
        // seguimiento se apagaría solo a cada paso.
        if (event.nativeEvent.userInteraction) onUserPanStart?.();
      }}
    >
      {/* Mientras hay seguimiento, el centro y el rumbo los pone el mapa
          nativo a partir del GPS, pero el zoom y la inclinación los sigue
          decidiendo la pantalla — la navegación, por ejemplo, se acerca al
          llegar a una maniobra. Por eso van como props declarativas acá y no
          por el ref: así conviven con el seguimiento en vez de pisarlo. */}
      <Camera
        ref={cameraRef}
        initialViewState={{ center: [center.lng, center.lat], zoom, pitch, bearing }}
        trackUserLocation={trackUser}
        {...(trackUser ? { zoom, pitch, duration: 500, easing: 'linear' as const } : {})}
      />

      {showUserLocation && <UserLocation animated accuracy heading={trackUser === 'heading'} minDisplacement={2} />}

      {route && route.length > 1 && (
        <GeoJSONSource id="route" data={routeGeoJSON}>
          {/* Dos capas: una línea ancha oscura debajo y la del color de marca
              encima. Es lo que mantiene la ruta legible sobre un mapa oscuro,
              donde una línea sola se confunde con las avenidas. */}
          <Layer id="route-casing" type="line" layout={{ 'line-cap': 'round', 'line-join': 'round' }} paint={{ 'line-color': '#000000', 'line-width': 9, 'line-opacity': 0.5 }} />
          <Layer
            id="route-line"
            type="line"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{ 'line-color': routeColor ?? colors.accent, 'line-width': 5 }}
          />
        </GeoJSONSource>
      )}

      {markers.map((marker) =>
        marker.kind === 'photo' ? (
          <Marker
            key={marker.id}
            id={marker.id}
            lngLat={[marker.lng, marker.lat]}
            anchor="bottom"
            onPress={() => onMarkerPress?.(marker.id)}
          >
            <PhotoMarker marker={marker} />
          </Marker>
        ) : (
          <Marker key={marker.id} id={marker.id} lngLat={[marker.lng, marker.lat]} onPress={() => onMarkerPress?.(marker.id)}>
            <View style={[styles.dot, { backgroundColor: marker.color ?? colors.accent }]} />
          </Marker>
        )
      )}
    </Map>
  );
}

const styles = StyleSheet.create({
  photoMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  photoMarkerImage: { width: '100%', height: '100%', borderRadius: 21 },
  photoMarkerFallback: { backgroundColor: colors.surfaceRaised },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.accentText, fontSize: 11, fontWeight: '700' },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
});
