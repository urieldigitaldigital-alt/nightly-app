/**
 * Swap this file to re-brand the whole app (name, tagline, logo asset).
 * Nothing outside `constants/` should hardcode the product name.
 */
export const brand = {
  name: 'NIGHTLY',
  tagline: 'Donde arranca la noche',
  legalName: 'Nightly',
  supportEmail: 'soporte@nightly.app',
  // Used to build real shareable links (event detail, etc.) — update if the
  // production domain ever changes.
  webUrl: 'https://nightly-app-seven.vercel.app',
} as const;
