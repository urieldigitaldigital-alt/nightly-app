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
  // public/terms.html and public/privacy.html are served as static files
  // from the same Vercel deployment as the web app — they're plain HTML,
  // not app routes, so the .html extension is part of the real URL.
  termsUrl: 'https://nightly-app-seven.vercel.app/terms.html',
  privacyUrl: 'https://nightly-app-seven.vercel.app/privacy.html',
} as const;
