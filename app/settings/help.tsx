import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';

const FAQ = [
  {
    q: '¿Cómo funciona el radio de búsqueda?',
    a: 'Elegís hasta 50 km desde tu ubicación (o la zona que elijas manualmente) y te mostramos previas y fiestas dentro de ese radio en línea recta, no por ruta.',
  },
  {
    q: '¿Por qué no veo la dirección exacta de una fiesta?',
    a: 'Las direcciones de propiedades privadas solo se muestran a quienes el organizador acepta. Una vez aceptado, aparece en el detalle del evento y en "Cómo llegar".',
  },
  {
    q: '¿Qué pasa si el organizador me rechaza?',
    a: 'Te avisamos de forma privada. Nadie más ve que fuiste rechazado.',
  },
  {
    q: '¿Puedo cancelar mi asistencia?',
    a: 'Sí, desde el detalle del evento o desde "Mis planes". La plaza se libera automáticamente para otra persona.',
  },
  {
    q: '¿Cómo denuncio una fiesta o un perfil?',
    a: 'Desde el detalle del evento o del chat, tocá el ícono de bandera o el menú de opciones y elegí "Denunciar".',
  },
];

const RULES = [
  'No se permite publicar domicilios de terceros sin autorización.',
  'No se permite organizar ni promover actividades ilegales, violentas o peligrosas.',
  'No se permite acosar, amenazar ni exponer datos privados de otros usuarios.',
  'Los organizadores son responsables de cumplir las normas aplicables a su evento.',
];

export default function HelpScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Centro de ayuda</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Preguntas frecuentes</Text>
        {FAQ.map((item) => (
          <View key={item.q} style={styles.faqItem}>
            <Text style={styles.faqQ}>{item.q}</Text>
            <Text style={styles.faqA}>{item.a}</Text>
          </View>
        ))}

        <Text style={styles.sectionTitle}>Reglas de convivencia</Text>
        <View style={styles.rulesCard}>
          {RULES.map((rule) => (
            <View key={rule} style={styles.ruleRow}>
              <Ionicons name="ellipse" size={6} color={colors.accent} style={{ marginTop: 7 }} />
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.contactButton} onPress={() => Linking.openURL(`mailto:${brand.supportEmail}`)}>
          <Ionicons name="mail-outline" size={18} color={colors.textPrimary} />
          <Text style={styles.contactText}>Escribir a soporte ({brand.supportEmail})</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  sectionTitle: { color: colors.textSecondary, fontSize: typography.size.sm, fontWeight: typography.weight.semibold, marginTop: spacing.lg, marginBottom: spacing.sm },
  faqItem: { marginBottom: spacing.md },
  faqQ: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold, marginBottom: 2 },
  faqA: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  rulesCard: { backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: spacing.sm },
  ruleRow: { flexDirection: 'row', gap: spacing.xs },
  ruleText: { flex: 1, color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  contactButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xl, marginBottom: spacing.xl, padding: spacing.md, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.border },
  contactText: { color: colors.textPrimary, fontSize: typography.size.sm, fontWeight: typography.weight.medium },
});
