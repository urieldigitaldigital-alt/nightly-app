import { Tabs } from 'expo-router';
import { BottomNav } from '@/components/nav/BottomNav';

/**
 * La barra de pestañas se dibuja entera en `BottomNav`: es flotante, con
 * desenfoque y con el botón central elevado, y nada de eso sale de las
 * opciones de `Tabs`.
 *
 * La barra flota por encima del contenido, separada de los bordes, asi que
 * `tabBarStyle: { position: 'absolute' }` evita que el navegador le reserve
 * alto al final de cada pantalla: ese hueco quedaria como una franja vacia.
 * Cada pantalla deja su propio espacio abajo con `useBottomNavInset`.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false, tabBarStyle: { position: 'absolute' } }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="publish" options={{ title: 'Publicar' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
