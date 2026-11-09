import { Tabs } from 'expo-router';
import { BottomNav } from '@/components/nav/BottomNav';

/**
 * La barra de pestañas se dibuja entera en `BottomNav`: es flotante, con
 * desenfoque y con el botón central elevado, y nada de eso sale de las
 * opciones de `Tabs`.
 *
 * La barra ocupa su lugar en el layout, como cualquier barra de pestañas: el
 * navegador le reserva el alto al final de cada pantalla y el contenido
 * termina justo arriba. Estuvo un tiempo en `position: 'absolute'`, de
 * cuando flotaba por encima del contenido, y al volverla una barra común eso
 * la sacaba de su lugar y la dejaba invisible: quedaba una franja vacía
 * abajo y no se podía navegar a ningún lado.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomNav {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="discover" options={{ title: 'Inicio' }} />
      <Tabs.Screen name="map" options={{ title: 'Mapa' }} />
      <Tabs.Screen name="publish" options={{ title: 'Publicar' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
