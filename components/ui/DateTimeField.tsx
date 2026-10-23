// Fallback used by TypeScript's module resolution (which doesn't understand
// the .native.tsx/.web.tsx Metro platform-extension convention on its own).
// Metro itself always prefers DateTimeField.native.tsx / DateTimeField.web.tsx
// over this file at bundle time for the matching platform.
export { DateTimeField } from './DateTimeField.native';
