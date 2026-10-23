import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Expo Router's web root document. Adding this file overrides the
// framework's default bare-bones shell — needed specifically for the Apple
// "Add to Home Screen" meta tags below, which have no equivalent in
// app.config.ts (iOS Safari ignores the web manifest's `display` field
// entirely; it only ever looks at apple-mobile-web-app-capable).
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1" />
        <meta name="theme-color" content="#080808" />

        {/* Makes "Agregar a pantalla de inicio" on iOS Safari launch without
            the browser chrome (address bar, tabs) — standalone, like a real app. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NIGHTLY" />
        <link rel="apple-touch-icon" href="/icon.png" />

        <ScrollViewStyleReset />
      </head>
      <body>{children}</body>
    </html>
  );
}
