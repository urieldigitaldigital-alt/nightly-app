import * as Speech from 'expo-speech';

// expo-speech wraps the Web Speech API on web and the native TTS engines on
// iOS/Android with the same call shape, so no platform split is needed here.
export function speak(text: string) {
  Speech.stop();
  Speech.speak(text, { language: 'es-AR', pitch: 1, rate: 1 });
}

export function stopSpeaking() {
  Speech.stop();
}
