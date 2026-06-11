import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/queries';
import { formatDate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';

const TYPE_META = {
  general: { icon: '📣', color: colors.primary },
  resultado: { icon: '🎳', color: colors.success },
  recordatorio: { icon: '⏰', color: colors.warning },
  torneo: { icon: '🏆', color: colors.accent },
} as const;

export default function Notifications() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile, isAdmin } = useAuth();
  const { data: notifications = [], isLoading, refetch } = useNotifications(profile?.id ?? null);

  async function markRead(notificationId: string) {
    if (!profile) return;
    await supabase
      .from('notification_reads')
      .upsert({ notification_id: notificationId, profile_id: profile.id });
    queryClient.invalidateQueries({ queryKey: ['notifications', profile.id] });
  }

  return (
    <Screen
      title="Notificaciones"
      onRefresh={refetch}
      refreshing={false}
      headerRight={
        isAdmin ? (
          <Button small title="➕ Enviar" onPress={() => router.push('/notifications/send')} />
        ) : undefined
      }
    >
      {isLoading ? (
        <Loading />
      ) : notifications.length === 0 ? (
        <EmptyState icon="🔔" title="Sin notificaciones" message="Aquí verás los avisos de tu liga." />
      ) : (
        notifications.map((n) => {
          const meta = TYPE_META[n.type] ?? TYPE_META.general;
          return (
            <Pressable key={n.id} onPress={() => !n.read && markRead(n.id)}>
              <Card style={[!n.read && styles.unread]}>
                <View style={styles.row}>
                  <Text style={{ fontSize: 24 }}>{meta.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, !n.read && { color: colors.text }]}>
                      {n.title}
                    </Text>
                    <Text style={styles.body}>{n.body}</Text>
                    <Text style={styles.date}>{formatDate(n.created_at)}</Text>
                  </View>
                  {!n.read ? <Badge text="Nuevo" color={meta.color} /> : null}
                </View>
              </Card>
            </Pressable>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  unread: { borderColor: colors.primary },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  title: { color: colors.textMuted, fontSize: font.body, fontWeight: '800' },
  body: { color: colors.textMuted, fontSize: font.small, marginTop: 2, lineHeight: 19 },
  date: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm },
});
