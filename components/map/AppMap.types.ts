import { StyleProp, ViewStyle } from 'react-native';

export type LatLng = { lat: number; lng: number };

export type MapMarkerSpec =
  | { id: string; kind: 'photo'; lat: number; lng: number; photoUrl?: string | null; badge?: number }
  | { id: string; kind: 'dot'; lat: number; lng: number; color?: string; draggable?: boolean };

export interface AppMapProps {
  style?: StyleProp<ViewStyle>;
  center: LatLng;
  zoom: number;
  pitch?: number;
  bearing?: number;
  markers?: MapMarkerSpec[];
  route?: LatLng[];
  routeColor?: string;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coord: LatLng) => void;
  onMarkerDragEnd?: (id: string, coord: LatLng) => void;
}
