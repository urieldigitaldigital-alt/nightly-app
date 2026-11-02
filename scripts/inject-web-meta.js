// Patches dist/index.html after `expo export -p web` with everything needed
// for the site to install and behave like a real native app on iOS/Android
// home screens — app/+html.tsx turned out not to apply to this project's
// export mode (verified live by fetching the deployed HTML and finding none
// of it there), so patching the built output directly is the one approach
// confirmed to actually land in production.
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

// CSS point dimensions + device pixel ratio for every splash PNG generated
// by scripts/generate-brand-icons.py — used to build the
// apple-touch-startup-image media queries iOS matches against at launch.
const IOS_SPLASH_SCREENS = [
  { file: '1290x2796.png', w: 430, h: 932, dpr: 3 }, // 15/14 Pro Max, 16 Pro Max
  { file: '1179x2556.png', w: 393, h: 852, dpr: 3 }, // 15/14 Pro, 16/16 Pro
  { file: '1284x2778.png', w: 428, h: 926, dpr: 3 }, // 12/13/14 Pro Max
  { file: '1170x2532.png', w: 390, h: 844, dpr: 3 }, // 12/13/14
  { file: '1125x2436.png', w: 375, h: 812, dpr: 3 }, // X/XS/11 Pro, 12/13 mini
  { file: '1242x2688.png', w: 414, h: 896, dpr: 3 }, // XS Max/11 Pro Max
  { file: '828x1792.png', w: 414, h: 896, dpr: 2 }, // XR/11
  { file: '1242x2208.png', w: 414, h: 736, dpr: 3 }, // 6/7/8 Plus
  { file: '750x1334.png', w: 375, h: 667, dpr: 2 }, // SE 2/3, 6/7/8
  { file: '640x1136.png', w: 320, h: 568, dpr: 2 }, // SE 1st gen
];

const splashLinks = IOS_SPLASH_SCREENS.map(
  ({ file, w, h, dpr }) =>
    `    <link rel="apple-touch-startup-image" href="/splash/${file}" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" />`
).join('\n');

const tags = `
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#080808" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Afterdune" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
${splashLinks}
    <style>
      /* Without this, iOS treats the whole thing as a scrollable web page:
         swiping past the content's edge rubber-bands and reveals the
         browser's default white background underneath — reads as "a photo
         of an app", not an app. Expo's own #expo-reset block already sets
         height:100% and body{overflow:hidden}, but standalone mode still
         needs the body pinned in place (position:fixed) and a matching
         background color, or that bounce still shows through as white.
         100dvh (not 100vh) so Safari's collapsing address bar doesn't make
         the page jump/resize as it shows and hides. Content still scrolls
         normally — this only stops the outer page itself from moving;
         every actual scroll view inside #root manages its own internal
         scrolling independently, with native momentum via the global
         -webkit-overflow-scrolling: touch below. */
      html, body {
        background-color: #080808;
        overscroll-behavior: none;
        height: 100dvh;
      }
      body {
        position: fixed;
        width: 100%;
        height: 100dvh;
        overflow: hidden;
        /* iOS's web default is a gray flash on every tap plus a
           press-and-hold text-selection callout — neither reads as "app". */
        -webkit-tap-highlight-color: transparent;
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        user-select: none;
      }
      #root, #root > div {
        height: 100%;
      }
      * {
        /* Kills the ~300ms tap delay + the double-tap-to-zoom gesture
           conflict that makes buttons feel laggy on mobile Safari/Chrome,
           and gives every internal scroll container real momentum
           scrolling instead of the stiffer default. No-op on elements
           that don't scroll, so safe to apply everywhere. */
        touch-action: manipulation;
        -webkit-overflow-scrolling: touch;
      }
      input, textarea, select, [contenteditable="true"] {
        /* Exempted from the no-select/no-callout rule above — people need
           to select/copy what they typed and long-press to paste. Below
           16px, iOS Safari auto-zooms the whole page on focus; every text
           input in this app is already styled at >=16px on web for that
           exact reason (components/ui/Input.tsx, DateTimeField.web.tsx) —
           this is just the platform-wide backstop. */
        -webkit-user-select: text;
        user-select: text;
        -webkit-touch-callout: default;
        /* !important: RN Web renders TextInput's fontSize as an inline
           style attribute, which otherwise beats this stylesheet rule
           regardless of selector specificity. */
        font-size: 16px !important;
      }
    </style>
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {});
        });
      }
    </script>
  `;

if (html.includes('apple-mobile-web-app-capable')) {
  console.log('[inject-web-meta] Tags already present, skipping');
} else {
  html = html.replace('</head>', `${tags}</head>`);
  // viewport-fit=cover lets the app draw under the iPhone's status bar /
  // home indicator area in standalone mode, like a real app rather than
  // leaving black bars — Expo's default viewport tag omits it.
  // user-scalable=no + maximum-scale=1 stop the pinch/double-tap browser
  // zoom that has no place in a native-feeling app.
  html = html.replace(
    /<meta name="viewport" content="[^"]*"\s*\/?>/,
    '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover, maximum-scale=1, user-scalable=no" />'
  );
  fs.writeFileSync(indexPath, html);
  console.log('[inject-web-meta] Added PWA meta tags, splash screens and native-feel CSS to dist/index.html');
}
