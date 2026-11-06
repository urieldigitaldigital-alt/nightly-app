const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Permite todas las orientaciones en iPad, manteniendo el iPhone en vertical.
 *
 * `orientation: 'portrait'` en app.config.ts escribe una sola lista de
 * orientaciones que vale para los dos tipos de dispositivo, y en iPad eso se
 * traduce en una app que no rota — algo que en una tablet se lee como un bug,
 * y que además deja la app fuera de Split View y Slide Over.
 *
 * iOS lee dos claves distintas: `UISupportedInterfaceOrientations` para
 * iPhone y `UISupportedInterfaceOrientations~ipad` para iPad. Expo solo
 * escribe la primera, así que este plugin agrega la segunda con las cuatro
 * orientaciones. El layout ya es responsivo (ver `hooks/useResponsive.ts`),
 * así que rotar no rompe nada.
 */
const withTabletOrientations = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults['UISupportedInterfaceOrientations~ipad'] = [
      'UIInterfaceOrientationPortrait',
      'UIInterfaceOrientationPortraitUpsideDown',
      'UIInterfaceOrientationLandscapeLeft',
      'UIInterfaceOrientationLandscapeRight',
    ];

    // Sin esto, iOS considera que la app no soporta multitarea y la muestra
    // siempre a pantalla completa. Con las cuatro orientaciones declaradas
    // arriba, dejarlo en false es lo que habilita Split View y Slide Over.
    config.modResults.UIRequiresFullScreen = false;

    return config;
  });

module.exports = withTabletOrientations;
