/**
 * Launch cities for the Costa Atlántica rollout. Used as quick picks in the
 * manual location selector; the app is not restricted to these — any lat/lng
 * works, this list only seeds the "pick a city" UI.
 */
export const LAUNCH_CITIES = [
  { name: 'Pinamar', lat: -37.0968, lng: -56.8611 },
  { name: 'Cariló', lat: -37.1667, lng: -56.9167 },
  { name: 'Ostende', lat: -37.1167, lng: -56.8833 },
  { name: 'Valeria del Mar', lat: -37.1333, lng: -56.8833 },
  { name: 'Villa Gesell', lat: -37.2633, lng: -56.9733 },
  { name: 'Mar de las Pampas', lat: -37.3333, lng: -57.0167 },
] as const;
