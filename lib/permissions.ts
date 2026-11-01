import { Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** Ensures photo-library access before opening the picker, with an
 * explanation shown right before the OS prompt (the first time) and a
 * direct path to Settings if it was already denied — instead of silently
 * failing or throwing the user straight into a system dialog with no
 * context, which is what every one of this app's photo pickers used to do. */
export async function ensurePhotoLibraryAccess(): Promise<boolean> {
  const current = await ImagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) return true;

  if (!current.canAskAgain) {
    return new Promise((resolve) => {
      Alert.alert(
        'Necesitamos acceso a tus fotos',
        'Desactivaste el permiso de fotos para NIGHTLY. Activalo en Ajustes para poder elegir una imagen.',
        [
          { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Abrir Ajustes', onPress: () => { Linking.openSettings(); resolve(false); } },
        ]
      );
    });
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Acceso a tus fotos',
      'NIGHTLY necesita acceso a tus fotos para que puedas elegir una imagen de perfil o portada de evento.',
      [
        { text: 'Ahora no', style: 'cancel', onPress: () => resolve(false) },
        {
          text: 'Continuar',
          onPress: async () => {
            const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
            resolve(result.granted);
          },
        },
      ]
    );
  });
}
