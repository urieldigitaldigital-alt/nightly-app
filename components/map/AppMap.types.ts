import { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type MapMarkerSpec =
  | { id: string; kind: 'photo'; lat: number; lng: number; photoUrl?: string | null; badge?: number }
  | { id: string; kind: 'dot'; lat: number; lng: number; color?: string };

/**
 * Modo de seguimiento de la ubicación del usuario, igual que en una app de
 * navegación:
 *
 * - `undefined`: la cámara no sigue a nadie.
 * - `'default'`: la cámara se centra en la persona, el mapa no rota.
 * - `'heading'`: se centra y rota según hacia dónde apunta el teléfono
 *   (brújula). Es el modo de "caminando".
 * - `'course'`: se centra y rota según la dirección real de movimiento. Es el
 *   modo de "yendo en auto", y el que usa la navegación paso a paso.
 */
export type TrackUserMode = 'default' | 'heading' | 'course';

export interface AppMapProps {
  style?: StyleProp<ViewStyle>;
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
  /** Animate center/zoom/pitch/bearing transitions instead of snapping —
   * on by default, since it reads as jarring for anything but the very
   * first paint. Pass false for an instant jump (e.g. initial mount). */
  animate?: boolean;
  markers?: MapMarkerSpec[];
  route?: LatLng[];
  routeColor?: string;
  /**
   * Dibuja el punto azul de "estás acá", con su círculo de precisión y, si
   * `trackUser` lo pide, la flecha de orientación. Lo renderiza el mapa
   * nativo, así que se actualiza a 60fps sin pasar por JavaScript.
   */
  showUserLocation?: boolean;
  /** Ver {@link TrackUserMode}. Requiere `showUserLocation`. */
  trackUser?: TrackUserMode;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coord: LatLng) => void;
  /** Fires when the user drags/pinches the map themselves (as opposed to
   * our own programmatic center/zoom changes) — the signal a GPS-style
   * screen needs to drop out of follow mode and show a "recenter" button. */
  onUserPanStart?: () => void;
}
