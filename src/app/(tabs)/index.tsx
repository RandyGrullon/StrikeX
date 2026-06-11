import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { LeaguePicker } from '@/components/LeaguePicker';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Screen,
  SectionHeader,
  StatCard,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useSelectedLeague } from '@/context/LeagueContext';
import {
  useMatchdays,
  useMatches,
  useMatchResults,
  usePlayerStats,
  useStandings,
} from '@/hooks/queries';
import { formatDate, formatPoints, todayISO } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

export default function Dashboard() {
  const router = useRouter();
  const { profile, isAdmin } = useAuth();
  const { leagueId, league, leagues } = useSelectedLeague();

  const { data: standings = [], isLoading: loadingStandings, refetch } = useStandings(leagueId);
  const { data: stats = [] } = usePlayerStats(leagueId);
  const { data: matchdays = [] } = useMatchdays(leagueId);
  const { data: matches = [] } = useMatches(leagueId);
  const { data: results = [] } = useMatchResults(leagueId);

  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  if (leagues.length === 0) {
    return (
      <Screen title={`Hola, ${firstName} 👋`}>
        <EmptyState
          title="Aún no hay ligas"
          message={
            isAdmin
              ? 'Crea tu primera liga para empezar a llevar el control de todo.'
              : 'El administrador todavía no ha creado ninguna liga.'
          }
          action={
            isAdmin ? (
              <Button title="Crear liga" onPress={() => router.push('/league/new')} />
            ) : undefined
          }
        />
      </Screen>
    );
  }

  const today = todayISO();
  const nextMatchday =
    matchdays.find((md) => md.status === 'scheduled' && md.date >= today) ??
    matchdays.find((md) => md.status === 'scheduled');
  const nextMatches = nextMatchday
    ? matches.filter((m) => m.matchday_id === nextMatchday.id)
    : [];

  const myStats = stats.find((s) => s.profile_id === profile?.id);
  const top3 = standings.slice(0, 3);
  const highGame = [...stats].sort((a, b) => b.high_game - a.high_game)[0];
  const highSeries = [...stats].sort((a, b) => b.high_series - a.high_series)[0];
  const lastResults = results.slice(-3).reverse();
  const teamName = (id: string) =>
    standings.find((s) => s.team_id === id)?.name ?? '—';

  return (
    <Screen
      title={`Hola, ${firstName} 👋`}
      subtitle={league?.name}
      onRefresh={refetch}
      refreshing={false}
    >
      <LeaguePicker />

      {isAdmin ? (
        <View style={styles.actionsRow}>
          <Button
            small
            title="⚙️ Administrar liga"
            variant="secondary"
            onPress={() => leagueId && router.push(`/league/${leagueId}`)}
          />
          <Button
            small
            title="➕ Nueva liga"
            variant="secondary"
            onPress={() => router.push('/league/new')}
          />
          <Button
            small
            title="🏆 Torneos"
            variant="secondary"
            onPress={() => router.push('/tournaments')}
          />
        </View>
      ) : null}

      {myStats ? (
        <>
          <SectionHeader title="Mi temporada" />
          <View style={styles.statsRow}>
            <StatCard label="Promedio" value={Number(myStats.average).toFixed(1)} />
            <StatCard label="Handicap" value={myStats.handicap} accent={colors.accent} />
            <StatCard label="Juego alto" value={myStats.high_game} accent={colors.gold} />
            <StatCard label="Serie alta" value={myStats.high_series} accent={colors.success} />
          </View>
        </>
      ) : null}

      <SectionHeader title="Próxima jornada" />
      {nextMatchday ? (
        <Card>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Jornada {nextMatchday.number}</Text>
            <Badge text={formatDate(nextMatchday.date)} color={colors.accent} />
          </View>
          {nextMatches.length === 0 ? (
            <Text style={styles.muted}>Sin partidos programados todavía.</Text>
          ) : (
            nextMatches.map((m) => (
              <View key={m.id} style={styles.matchRow}>
                <Text style={styles.matchTeams} numberOfLines={1}>
                  {m.home_team?.name} <Text style={styles.vs}>vs</Text> {m.away_team?.name}
                </Text>
                {m.lanes ? <Text style={styles.muted}>Pistas {m.lanes}</Text> : null}
              </View>
            ))
          )}
        </Card>
      ) : (
        <Card>
          <Text style={styles.muted}>No hay jornadas próximas programadas.</Text>
        </Card>
      )}

      <SectionHeader title="Top 3 equipos" />
      {loadingStandings ? (
        <Loading />
      ) : (
        <Card>
          {top3.length === 0 ? (
            <Text style={styles.muted}>Todavía no hay resultados.</Text>
          ) : (
            top3.map((row, i) => (
              <View key={row.team_id} style={styles.standingRow}>
                <Text style={styles.medal}>{['🥇', '🥈', '🥉'][i]}</Text>
                <Text style={styles.teamName} numberOfLines={1}>{row.name}</Text>
                <Text style={styles.points}>{formatPoints(Number(row.points))} pts</Text>
              </View>
            ))
          )}
        </Card>
      )}

      {(highGame?.high_game ?? 0) > 0 ? (
        <>
          <SectionHeader title="Líderes" />
          <View style={styles.statsRow}>
            <StatCard
              label="Juego alto"
              value={highGame!.high_game}
              hint={highGame!.display_name}
              accent={colors.gold}
            />
            {highSeries ? (
              <StatCard
                label="Serie alta"
                value={highSeries.high_series}
                hint={highSeries.display_name}
                accent={colors.success}
              />
            ) : null}
          </View>
        </>
      ) : null}

      {lastResults.length > 0 ? (
        <>
          <SectionHeader title="Últimos resultados" />
          <Card>
            {lastResults.map((r) => (
              <View key={r.match_id} style={styles.matchRow}>
                <Text style={styles.matchTeams} numberOfLines={1}>
                  {teamName(r.home_team_id)}{' '}
                  <Text style={styles.score}>
                    {formatPoints(Number(r.home_points))} - {formatPoints(Number(r.away_points))}
                  </Text>{' '}
                  {teamName(r.away_team_id)}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: font.h2, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.small, paddingVertical: spacing.xs },
  matchRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  matchTeams: { color: colors.text, fontSize: font.body, fontWeight: '600' },
  vs: { color: colors.textMuted, fontWeight: '400' },
  score: { color: colors.accent, fontWeight: '800' },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  medal: { fontSize: 20 },
  teamName: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
  points: { color: colors.primary, fontSize: font.body, fontWeight: '800' },
});
