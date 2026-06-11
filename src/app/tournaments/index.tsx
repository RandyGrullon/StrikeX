import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useTournaments } from '@/hooks/queries';
import { formatDate } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

const STATUS = {
  open: { label: 'Inscripción', color: colors.warning },
  active: { label: 'En juego', color: colors.success },
  finished: { label: 'Finalizado', color: colors.textMuted },
} as const;

export default function Tournaments() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: tournaments = [], isLoading, refetch } = useTournaments();

  return (
    <Screen
      title="Torneos"
      subtitle="Torneos especiales de la liga"
      onRefresh={refetch}
      refreshing={false}
      headerRight={
        isAdmin ? (
          <Button small title="➕ Nuevo" onPress={() => router.push('/tournaments/new')} />
        ) : undefined
      }
    >
      {isLoading ? (
        <Loading />
      ) : tournaments.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Sin torneos"
          message={
            isAdmin
              ? 'Crea un torneo de eliminación directa o por puntos.'
              : 'Cuando haya torneos especiales aparecerán aquí.'
          }
          action={
            isAdmin ? (
              <Button title="Crear torneo" onPress={() => router.push('/tournaments/new')} />
            ) : undefined
          }
        />
      ) : (
        tournaments.map((t) => {
          const st = STATUS[t.status];
          return (
            <Card key={t.id} onPress={() => router.push(`/tournaments/${t.id}`)}>
              <View style={styles.row}>
                <Text style={{ fontSize: 28 }}>{t.type === 'eliminacion' ? '⚔️' : '🎯'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.sub}>
                    {t.type === 'eliminacion' ? 'Eliminación directa' : 'Por puntos'} ·{' '}
                    {formatDate(t.start_date)}
                  </Text>
                </View>
                <Badge text={st.label} color={st.color} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  sub: { color: colors.textMuted, fontSize: font.small, marginTop: 2 },
});
