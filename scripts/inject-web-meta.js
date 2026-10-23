// Patches dist/index.html after `expo export -p web` with tags Expo Router's
// web output doesn't include on its own — specifically the Apple "Add to
// Home Screen" meta tags (app/+html.tsx turned out not to apply to this
// project's export mode; verified live by fetching the deployed HTML and
// finding none of it there, so patching the built output directly is the
// one approach confirmed to actually land in production).
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

const tags = `
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="NIGHTLY" />
    <link rel="apple-touch-icon" href="/icon.png" />
  `;

if (html.includes('apple-mobile-web-app-capable')) {
  console.log('[inject-web-meta] Tags already present, skipping');
} else {
  html = html.replace('</head>', `${tags}</head>`);
  // viewport-fit=cover lets the app draw under the iPhone's status bar /
  // home indicator area in standalone mode, like a real app rather than
  // leaving black bars — Expo's default viewport tag omits it.
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1" />'
  );
  fs.writeFileSync(indexPath, html);
  console.log('[inject-web-meta] Added Apple home-screen meta tags to dist/index.html');
}
