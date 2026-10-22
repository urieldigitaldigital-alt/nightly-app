import { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type MapMarkerSpec =
  | { id: string; kind: 'photo'; lat: number; lng: number; photoUrl?: string | null; badge?: number }
  // `heading` (degrees, 0 = north) renders the dot as a directional arrow
  // instead of a plain circle — used for the live "you are here" marker in
  // GPS-follow mode. Omit it for a regular dot (destination, static pin).
  | { id: string; kind: 'dot'; lat: number; lng: number; color?: string; draggable?: boolean; heading?: number | null };

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
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coord: LatLng) => void;
  onMarkerDragEnd?: (id: string, coord: LatLng) => void;
  /** Fires when the user drags/pinches the map themselves (as opposed to
   * our own programmatic center/zoom changes) — the signal a GPS-style
   * screen needs to drop out of follow mode and show a "recenter" button. */
  onUserPanStart?: () => void;
}
