import { Platform, StyleSheet } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { colors, radii } from '@/constants/theme';

type Props = {
  onPress: () => void;
  loading?: boolean;
};

/** Apple's Human Interface Guidelines require using their own button when
 * Sign In with Apple is offered on iOS — everywhere else (web, Android)
 * there's no such requirement (and no native button to render), so it
 * falls back to the same generic Button used for Google. */
export function AppleSignInButton({ onPress, loading = false }: Props) {
  if (Platform.OS === 'ios') {
    return (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={radii.pill}
        style={[styles.native, loading && styles.nativeLoading]}
        onPress={onPress}
      />
    );
  }

  return (
    <Button
      label="Continuar con Apple"
      variant="light"
      onPress={onPress}
      loading={loading}
      icon={<Ionicons name="logo-apple" size={18} color="#1F2328" />}
    />
  );
}

const styles = StyleSheet.create({
  native: { height: 48, width: '100%' },
  nativeLoading: { opacity: 0.6 },
});
