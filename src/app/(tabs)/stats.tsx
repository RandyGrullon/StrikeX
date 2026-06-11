import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LeaguePicker } from '@/components/LeaguePicker';
import { Select } from '@/components/Select';
import {
  Avatar,
  Card,
  EmptyState,
  Loading,
  Screen,
  SectionHeader,
  SegmentedControl,
} from '@/components/ui';
import { useSelectedLeague } from '@/context/LeagueContext';
import { usePlayerStats, useWeeklyAverages } from '@/hooks/queries';
import { colors, font, spacing } from '@/lib/theme';
import type { PlayerStats } from '@/lib/types';

export default function Stats() {
  const { leagueId, league } = useSelectedLeague();
  const { data: stats = [], isLoading, refetch } = usePlayerStats(leagueId);
  const { data: weekly = [] } = useWeeklyAverages(leagueId);
  const [tab, setTab] = useState('jugadores');
  const [playerId, setPlayerId] = useState<string | null>(null);

  const active = stats.filter((s) => s.is_active);
  const withGames = active.filter((s) => s.games_played > 0);

  return (
    <Screen title="Estadísticas" subtitle={league?.name} onRefresh={refetch} refreshing={false}>
      <LeaguePicker />
      <SegmentedControl
        options={[
          { label: 'Jugadores', value: 'jugadores' },
          { label: 'Récords', value: 'records' },
          { label: 'Evolución', value: 'evolucion' },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <Loading />
      ) : active.length === 0 ? (
        <EmptyState title="Sin jugadores" message="Registra jugadores en la liga para ver estadísticas." />
      ) : tab === 'jugadores' ? (
        <Card style={{ padding: 0 }}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.h, { width: 26 }]}>#</Text>
            <Text style={[styles.h, { flex: 1 }]}>Jugador</Text>
            <Text style={[styles.h, styles.num]}>J</Text>
            <Text style={[styles.h, styles.numWide]}>Prom</Text>
            <Text style={[styles.h, styles.num]}>HDCP</Text>
            <Text style={[styles.h, styles.num]}>JA</Text>
            <Text style={[styles.h, styles.num]}>SA</Text>
          </View>
          {active.map((p, i) => (
            <View
              key={p.player_id}
              style={[styles.row, i % 2 === 1 && { backgroundColor: colors.cardAlt }]}
            >
              <Text style={[styles.c, { width: 26, fontWeight: '800' }]}>{i + 1}</Text>
              <Text style={[styles.c, { flex: 1, fontWeight: '600' }]} numberOfLines={1}>
                {p.display_name}
              </Text>
              <Text style={[styles.c, styles.num, { color: colors.textMuted }]}>
                {p.games_played}
              </Text>
              <Text style={[styles.c, styles.numWide, { color: colors.primary, fontWeight: '800' }]}>
                {Number(p.average).toFixed(1)}
              </Text>
              <Text style={[styles.c, styles.num, { color: colors.accent }]}>{p.handicap}</Text>
              <Text style={[styles.c, styles.num]}>{p.high_game}</Text>
              <Text style={[styles.c, styles.num]}>{p.high_series}</Text>
            </View>
          ))}
        </Card>
      ) : tab === 'records' ? (
        <RecordsTab stats={withGames} />
      ) : (
        <EvolutionTab
          stats={active}
          weekly={weekly}
          playerId={playerId}
          setPlayerId={setPlayerId}
        />
      )}
    </Screen>
  );
}

function RecordsTab({ stats }: { stats: PlayerStats[] }) {
  if (stats.length === 0) {
    return <EmptyState icon="📊" title="Sin récords" message="Aún no se han capturado puntajes." />;
  }
  const byHighGame = [...stats].sort((a, b) => b.high_game - a.high_game).slice(0, 5);
  const byHighSeries = [...stats].sort((a, b) => b.high_series - a.high_series).slice(0, 5);
  const byAverage = [...stats].sort((a, b) => Number(b.average) - Number(a.average)).slice(0, 5);

  const list = (
    title: string,
    rows: typeof stats,
    value: (p: (typeof stats)[number]) => number,
    accent: string
  ) => (
    <>
      <SectionHeader title={title} />
      <Card>
        {rows.map((p, i) => (
          <View key={p.player_id} style={styles.recordRow}>
            <Text style={styles.recordPos}>{['🥇', '🥈', '🥉', '4.', '5.'][i]}</Text>
            <Avatar name={p.display_name} size={30} />
            <Text style={styles.recordName} numberOfLines={1}>{p.display_name}</Text>
            <Text style={[styles.recordValue, { color: accent }]}>{value(p)}</Text>
          </View>
        ))}
      </Card>
    </>
  );

  return (
    <View>
      {list('🎳 Juego alto', byHighGame, (p) => p.high_game, colors.gold)}
      {list('🔥 Serie alta', byHighSeries, (p) => p.high_series, colors.success)}
      {list('⭐ Mejor promedio', byAverage, (p) => Number(Number(p.average).toFixed(1)), colors.primary)}
    </View>
  );
}

interface EvolutionProps {
  stats: { player_id: string; display_name: string }[];
  weekly: {
    player_id: string;
    matchday_number: number;
    average: number;
    series_total: number;
  }[];
  playerId: string | null;
  setPlayerId: (id: string) => void;
}

function EvolutionTab({ stats, weekly, playerId, setPlayerId }: EvolutionProps) {
  const selected = playerId ?? stats[0]?.player_id ?? null;
  const rows = weekly
    .filter((w) => w.player_id === selected)
    .sort((a, b) => a.matchday_number - b.matchday_number);
  const max = Math.max(...rows.map((r) => Number(r.average)), 1);

  return (
    <View>
      <Select
        label="Jugador"
        options={stats.map((s) => ({ label: s.display_name, value: s.player_id }))}
        value={selected}
        onChange={setPlayerId}
      />
      {rows.length === 0 ? (
        <EmptyState icon="📈" title="Sin datos" message="Este jugador aún no tiene juegos registrados." />
      ) : (
        <Card>
          <Text style={styles.chartTitle}>Promedio por jornada</Text>
          {rows.map((r) => (
            <View key={r.matchday_number} style={styles.barRow}>
              <Text style={styles.barLabel}>J{r.matchday_number}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(8, (Number(r.average) / max) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{Number(r.average).toFixed(0)}</Text>
            </View>
          ))}
          <Text style={styles.chartHint}>
            Serie por jornada: {rows.map((r) => r.series_total).join(' · ')}
          </Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    gap: 4,
  },
  headerRow: { borderBottomWidth: 1, borderBottomColor: colors.border },
  h: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  c: { color: colors.text, fontSize: font.small },
  num: { width: 38, textAlign: 'center' },
  numWide: { width: 48, textAlign: 'center' },
  recordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  recordPos: { width: 28, fontSize: font.body },
  recordName: { flex: 1, color: colors.text, fontSize: font.body, fontWeight: '600' },
  recordValue: { fontSize: font.h2, fontWeight: '800' },
  chartTitle: { color: colors.text, fontSize: font.body, fontWeight: '700', marginBottom: spacing.md },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barLabel: { color: colors.textMuted, fontSize: font.tiny, width: 28 },
  barTrack: {
    flex: 1,
    height: 16,
    backgroundColor: colors.bg,
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 8 },
  barValue: { color: colors.text, fontSize: font.tiny, fontWeight: '700', width: 34, textAlign: 'right' },
  chartHint: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.sm },
});
