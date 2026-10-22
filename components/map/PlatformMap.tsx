// Fallback used by TypeScript's module resolution (which doesn't understand
// the .native.tsx/.web.tsx Metro platform-extension convention on its own).
// Metro itself always prefers PlatformMap.native.tsx / PlatformMap.web.tsx
// over this file at bundle time for the matching platform.
export { default, Marker, Polyline, PROVIDER_GOOGLE } from './PlatformMap.native';
