import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing, typography } from '@/constants/theme';
import { brand } from '@/constants/brand';

/**
 * Normas de la comunidad, dentro de la app y no detrás de un link al navegador.
 *
 * Es el texto que Apple busca para la Guideline 1.2: el compromiso explícito
 * de tolerancia cero con el contenido objetable y los usuarios abusivos.
 * Vive acá adentro a propósito — el revisor lo encuentra sin salir de la app
 * y sin depender de que el sitio esté levantado, y cualquier usuario lo puede
 * leer sin conexión.
 */

type Rule = { icon: keyof typeof Ionicons.glyphMap; title: string; body: string };

const PROHIBITED: Rule[] = [
  {
    icon: 'hand-left',
    title: 'Discriminación y odio',
    body: 'Nada de lenguaje discriminatorio por origen, etnia, religión, género, identidad de género, orientación sexual o discapacidad.',
  },
  {
    icon: 'shield',
    title: 'Protección de menores',
    body: 'Afterdune es solo para mayores de 18. Cualquier contenido sexual que involucre menores se elimina al instante, la cuenta se suspende para siempre y el caso se denuncia a las autoridades.',
  },
  {
    icon: 'eye-off',
    title: 'Contenido sexual explícito',
    body: 'No se permite contenido sexual explícito ni la oferta de servicios sexuales.',
  },
  {
    icon: 'warning',
    title: 'Amenazas y acoso',
    body: 'Nada de amenazas, incitación a la violencia, acoso dirigido ni exposición de datos privados de otra persona.',
  },
  {
    icon: 'medkit',
    title: 'Drogas y armas',
    body: 'No se permite promocionar, vender ni ofrecer drogas ilegales o armas.',
  },
  {
    icon: 'person-remove',
    title: 'Suplantación y estafas',
    body: 'Nada de hacerse pasar por otra persona, estafar ni llenar la app de spam.',
  },
  {
    icon: 'home',
    title: 'Domicilios ajenos',
    body: 'No publiques la dirección de otra persona sin su permiso. La dirección exacta de una fiesta solo la ven los invitados aceptados.',
  },
];

const TOOLS: Rule[] = [
  {
    icon: 'flag',
    title: 'Denunciar',
    body: 'Cada fiesta, perfil y mensaje tiene un botón "Denunciar". Es anónimo: la persona denunciada nunca sabe quién fue.',
  },
  {
    icon: 'ban',
    title: 'Bloquear',
    body: 'Podés bloquear a cualquiera en cualquier momento. Deja de poder escribirte y de ver tu perfil y tus fiestas, y vos dejás de ver los suyos.',
  },
  {
    icon: 'filter',
    title: 'Filtro automático',
    body: 'Todo lo que se escribe en la app pasa por un filtro antes de publicarse. El contenido prohibido se rechaza en el momento.',
  },
];

export default function CommunityGuidelinesScreen() {
  const router = useRouter();

  return (
    <Screen edges={['top', 'bottom']} padded>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Normas de la comunidad</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.pledge}>
          <Ionicons name="shield-checkmark" size={26} color={colors.accent} />
          <Text style={styles.pledgeTitle}>Tolerancia cero</Text>
          <Text style={styles.pledgeBody}>
            En {brand.name} no se tolera el contenido objetable ni el comportamiento abusivo. Publicarlo significa que el contenido se elimina y
            la cuenta se suspende.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Lo que no se permite</Text>
        {PROHIBITED.map((rule) => (
          <RuleRow key={rule.title} rule={rule} />
        ))}

        <Text style={styles.sectionTitle}>Lo que podés hacer si ves algo</Text>
        {TOOLS.map((rule) => (
          <RuleRow key={rule.title} rule={rule} />
        ))}

        <View style={styles.commitment}>
          <Text style={styles.commitmentTitle}>Nuestro compromiso</Text>
          <Text style={styles.commitmentBody}>
            Revisamos todas las denuncias dentro de las 24 horas y actuamos según la gravedad: quitamos el contenido, advertimos a la persona o
            suspendemos la cuenta. Mientras una denuncia está en revisión podemos ocultar el contenido de manera preventiva.
          </Text>
        </View>

        <Text style={styles.contact}>
          ¿Algo urgente? Escribinos a <Text style={styles.contactEmail}>{brand.supportEmail}</Text>
        </Text>
      </ScrollView>
    </Screen>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  return (
    <View style={styles.rule}>
      <View style={styles.ruleIcon}>
        <Ionicons name={rule.icon} size={16} color={colors.accent} />
      </View>
      <View style={styles.ruleText}>
        <Text style={styles.ruleTitle}>{rule.title}</Text>
        <Text style={styles.ruleBody}>{rule.body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  headerTitle: { color: colors.textPrimary, fontSize: typography.size.lg, fontWeight: typography.weight.bold },
  content: { paddingBottom: spacing.xxl },
  pledge: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pledgeTitle: { color: colors.textPrimary, fontSize: typography.size.xl, fontWeight: typography.weight.bold },
  pledgeBody: { color: colors.textSecondary, fontSize: typography.size.md, lineHeight: 21 },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  rule: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  ruleIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: { flex: 1, gap: 2 },
  ruleTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  ruleBody: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  commitment: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xxs,
  },
  commitmentTitle: { color: colors.textPrimary, fontSize: typography.size.md, fontWeight: typography.weight.semibold },
  commitmentBody: { color: colors.textSecondary, fontSize: typography.size.sm, lineHeight: 19 },
  contact: { color: colors.textMuted, fontSize: typography.size.sm, textAlign: 'center', marginTop: spacing.xl },
  contactEmail: { color: colors.accent },
});
