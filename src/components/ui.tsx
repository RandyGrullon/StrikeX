import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, font, MAX_CONTENT_WIDTH, radius, spacing } from '@/lib/theme';
import { initials } from '@/lib/format';

/* ---------- Screen: contenedor base con scroll y ancho máximo ---------- */

interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
  headerRight?: ReactNode;
  scroll?: boolean;
}

export function Screen({
  title,
  subtitle,
  children,
  refreshing,
  onRefresh,
  headerRight,
  scroll = true,
}: ScreenProps) {
  const header = title ? (
    <View style={styles.screenHeader}>
      <View style={{ flex: 1 }}>
        <Text style={styles.screenTitle}>{title}</Text>
        {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      </View>
      {headerRight}
    </View>
  ) : null;

  const content = (
    <View style={styles.maxWidth}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primary}
              />
            ) : undefined
          }
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.scrollContent, { flex: 1 }]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

/* ---------- Card ---------- */

export function Card({
  children,
  style,
  onPress,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle>; onPress?: () => void }>) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ---------- Button ---------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  small,
  style,
}: ButtonProps) {
  const bg =
    variant === 'primary' ? colors.primary
    : variant === 'danger' ? colors.danger
    : variant === 'secondary' ? colors.cardAlt
    : 'transparent';
  const fg = variant === 'ghost' ? colors.primary : colors.text;
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: isOff ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <Text style={[styles.buttonText, small && { fontSize: font.small }, { color: fg }]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

/* ---------- Input ---------- */

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? <Text style={styles.inputLabel}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={[styles.input, error ? { borderColor: colors.danger } : null, style]}
        {...rest}
      />
      {error ? <Text style={styles.inputError}>{error}</Text> : null}
    </View>
  );
}

/* ---------- Badge ---------- */

export function Badge({
  text,
  color = colors.primary,
}: {
  text: string;
  color?: string;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}26`, borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>{text}</Text>
    </View>
  );
}

/* ---------- Avatar (iniciales) ---------- */

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

/* ---------- EmptyState ---------- */

export function EmptyState({
  icon = '🎳',
  title,
  message,
  action,
}: {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={{ fontSize: 42 }}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMessage}>{message}</Text> : null}
      {action ? <View style={{ marginTop: spacing.lg }}>{action}</View> : null}
    </View>
  );
}

/* ---------- StatCard ---------- */

export function StatCard({
  label,
  value,
  hint,
  accent = colors.primary,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card style={{ flex: 1, minWidth: 130 }}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      {hint ? <Text style={styles.statHint}>{hint}</Text> : null}
    </Card>
  );
}

/* ---------- SectionHeader ---------- */

export function SectionHeader({
  title,
  right,
}: {
  title: string;
  right?: ReactNode;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {right}
    </View>
  );
}

/* ---------- SegmentedControl ---------- */

export function SegmentedControl({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <Text style={[styles.segmentText, active && { color: colors.text }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Loading / centro ---------- */

export function Loading() {
  return (
    <View style={{ padding: spacing.xxl, alignItems: 'center' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  maxWidth: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  screenTitle: { color: colors.text, fontSize: font.title, fontWeight: '800' },
  screenSubtitle: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  button: {
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { paddingVertical: 8, paddingHorizontal: spacing.lg },
  buttonText: { fontSize: font.body, fontWeight: '700' },
  inputLabel: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    color: colors.text,
    fontSize: font.body,
  },
  inputError: { color: colors.danger, fontSize: font.tiny, marginTop: spacing.xs },
  badge: {
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  badgeText: { fontSize: font.tiny, fontWeight: '700' },
  avatar: {
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.text, fontWeight: '700' },
  empty: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  emptyMessage: { color: colors.textMuted, fontSize: font.small, textAlign: 'center' },
  statLabel: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  statValue: { fontSize: 26, fontWeight: '800', marginTop: spacing.xs },
  statHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: radius.sm,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: font.small, fontWeight: '700' },
});
