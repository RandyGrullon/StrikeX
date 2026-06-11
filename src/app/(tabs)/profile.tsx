import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, Badge, Button, Card, Screen, SectionHeader } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/queries';
import { colors, font, spacing } from '@/lib/theme';

export default function Profile() {
  const router = useRouter();
  const { profile, session, isAdmin, signOut } = useAuth();
  const { data: notifications = [] } = useNotifications(profile?.id ?? null);
  const unread = notifications.filter((n) => !n.read).length;

  const MenuItem = ({
    icon,
    label,
    onPress,
    badge,
  }: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    badge?: number;
  }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.menuLabel}>{label}</Text>
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen title="Perfil">
      <Card style={styles.profileCard}>
        <Avatar name={profile?.full_name || '?'} size={64} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{profile?.full_name || 'Sin nombre'}</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
          <View style={{ marginTop: spacing.sm }}>
            <Badge
              text={isAdmin ? 'Administrador' : 'Jugador'}
              color={isAdmin ? colors.accent : colors.primary}
            />
          </View>
        </View>
      </Card>

      <SectionHeader title="General" />
      <Card style={{ padding: spacing.sm }}>
        <MenuItem
          icon="notifications"
          label="Notificaciones"
          badge={unread}
          onPress={() => router.push('/notifications')}
        />
        <MenuItem
          icon="trophy"
          label="Torneos especiales"
          onPress={() => router.push('/tournaments')}
        />
      </Card>

      {isAdmin ? (
        <>
          <SectionHeader title="Administración" />
          <Card style={{ padding: spacing.sm }}>
            <MenuItem
              icon="add-circle"
              label="Crear nueva liga"
              onPress={() => router.push('/league/new')}
            />
            <MenuItem
              icon="megaphone"
              label="Enviar aviso a la liga"
              onPress={() => router.push('/notifications/send')}
            />
          </Card>
        </>
      ) : null}

      <View style={{ marginTop: spacing.xl }}>
        <Button title="Cerrar sesión" variant="danger" onPress={signOut} />
      </View>

      <Text style={styles.version}>StrikeX v1.0.0</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  name: { color: colors.text, fontSize: font.h1, fontWeight: '800' },
  email: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  menuLabel: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
  badge: {
    backgroundColor: colors.danger,
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { color: colors.text, fontSize: font.tiny, fontWeight: '800' },
  version: {
    color: colors.textMuted,
    fontSize: font.tiny,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});
