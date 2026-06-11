import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LeaguePicker } from '@/components/LeaguePicker';
import { Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSelectedLeague } from '@/context/LeagueContext';
import { useMatchdays, useMatches, useMatchResults } from '@/hooks/queries';
import { formatDate, formatPoints } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

export default function Calendar() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { leagueId, league } = useSelectedLeague();
  const { data: matchdays = [], isLoading, refetch } = useMatchdays(leagueId);
  const { data: matches = [] } = useMatches(leagueId);
  const { data: results = [] } = useMatchResults(leagueId);

  const resultFor = (matchId: string) => results.find((r) => r.match_id === matchId);

  return (
    <Screen
      title="Calendario"
      subtitle={league?.name}
      onRefresh={refetch}
      refreshing={false}
      headerRight={
        isAdmin && leagueId ? (
          <Button
            small
            title="Gestionar"
            variant="secondary"
            onPress={() => router.push(`/league/${leagueId}`)}
          />
        ) : undefined
      }
    >
      <LeaguePicker />

      {isLoading ? (
        <Loading />
      ) : matchdays.length === 0 ? (
        <EmptyState
          icon="📅"
          title="Sin jornadas"
          message={
            isAdmin
              ? 'Crea jornadas y partidos desde la administración de la liga.'
              : 'El calendario aparecerá cuando el administrador programe jornadas.'
          }
          action={
            isAdmin && leagueId ? (
              <Button title="Ir a administración" onPress={() => router.push(`/league/${leagueId}`)} />
            ) : undefined
          }
        />
      ) : (
        matchdays.map((md) => {
          const mdMatches = matches.filter((m) => m.matchday_id === md.id);
          return (
            <Card key={md.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.mdTitle}>Jornada {md.number}</Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <Badge text={formatDate(md.date)} color={colors.accent} />
                  <Badge
                    text={md.status === 'completed' ? 'Jugada' : 'Programada'}
                    color={md.status === 'completed' ? colors.success : colors.primary}
                  />
                </View>
              </View>

              {mdMatches.length === 0 ? (
                <Text style={styles.muted}>Sin partidos asignados.</Text>
              ) : (
                mdMatches.map((m) => {
                  const r = resultFor(m.id);
                  return (
                    <Pressable
                      key={m.id}
                      onPress={isAdmin ? () => router.push(`/match/${m.id}`) : undefined}
                      style={({ pressed }) => [
                        styles.matchRow,
                        pressed && isAdmin && { opacity: 0.7 },
                      ]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.teams} numberOfLines={1}>
                          {m.home_team?.name} <Text style={styles.vs}>vs</Text>{' '}
                          {m.away_team?.name}
                        </Text>
                        {m.lanes ? (
                          <Text style={styles.lanes}>Pistas {m.lanes}</Text>
                        ) : null}
                      </View>
                      {r ? (
                        <Text style={styles.result}>
                          {formatPoints(Number(r.home_points))} - {formatPoints(Number(r.away_points))}
                        </Text>
                      ) : isAdmin ? (
                        <Text style={styles.capture}>Capturar ›</Text>
                      ) : (
                        <Text style={styles.pending}>Pendiente</Text>
                      )}
                    </Pressable>
                  );
                })
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mdTitle: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.small, paddingVertical: spacing.xs },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  teams: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  vs: { color: colors.textMuted, fontWeight: '400' },
  lanes: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  result: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  capture: { color: colors.primary, fontSize: font.small, fontWeight: '700' },
  pending: { color: colors.textMuted, fontSize: font.tiny },
});
