import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LeaguePicker } from '@/components/LeaguePicker';
import { Avatar, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { useSelectedLeague } from '@/context/LeagueContext';
import { usePlayerStats, useStandings } from '@/hooks/queries';
import { formatPoints } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

export default function Standings() {
  const { leagueId, league } = useSelectedLeague();
  const { data: standings = [], isLoading, refetch } = useStandings(leagueId);
  const { data: stats = [] } = usePlayerStats(leagueId);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Screen title="Posiciones" subtitle={league?.name} onRefresh={refetch} refreshing={false}>
      <LeaguePicker />

      {isLoading ? (
        <Loading />
      ) : standings.length === 0 ? (
        <EmptyState
          title="Sin equipos todavía"
          message="Cuando el administrador registre equipos y resultados, aquí verás la tabla."
        />
      ) : (
        <Card style={{ padding: 0 }}>
          <View style={[styles.row, styles.headerRow]}>
            <Text style={[styles.cell, styles.posCell, styles.headerText]}>#</Text>
            <Text style={[styles.cell, styles.nameCell, styles.headerText]}>Equipo</Text>
            <Text style={[styles.cell, styles.numCell, styles.headerText]}>JJ</Text>
            <Text style={[styles.cell, styles.numCell, styles.headerText]}>Pts</Text>
            <Text style={[styles.cell, styles.pinCell, styles.headerText]}>Pinfall</Text>
          </View>

          {standings.map((row, i) => {
            const isOpen = expanded === row.team_id;
            const players = stats
              .filter((s) => s.team_id === row.team_id)
              .sort((a, b) => Number(b.average) - Number(a.average));
            return (
              <View key={row.team_id}>
                <Pressable
                  onPress={() => setExpanded(isOpen ? null : row.team_id)}
                  style={({ pressed }) => [
                    styles.row,
                    i % 2 === 1 && { backgroundColor: colors.cardAlt },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[styles.cell, styles.posCell, i < 3 && { color: colors.gold }]}>
                    {i + 1}
                  </Text>
                  <Text style={[styles.cell, styles.nameCell]} numberOfLines={1}>
                    {row.name}
                  </Text>
                  <Text style={[styles.cell, styles.numCell, { color: colors.textMuted }]}>
                    {row.matches_played}
                  </Text>
                  <Text style={[styles.cell, styles.numCell, styles.pts]}>
                    {formatPoints(Number(row.points))}
                  </Text>
                  <Text style={[styles.cell, styles.pinCell, { color: colors.textMuted }]}>
                    {Number(row.total_pinfall).toLocaleString()}
                  </Text>
                </Pressable>

                {isOpen ? (
                  <View style={styles.playersBox}>
                    {players.length === 0 ? (
                      <Text style={styles.muted}>Sin jugadores asignados.</Text>
                    ) : (
                      players.map((p) => (
                        <View key={p.player_id} style={styles.playerRow}>
                          <Avatar name={p.display_name} size={30} />
                          <Text style={styles.playerName} numberOfLines={1}>
                            {p.display_name}
                          </Text>
                          <Text style={styles.playerStat}>
                            Prom {Number(p.average).toFixed(1)} · HDCP {p.handicap}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                ) : null}
              </View>
            );
          })}
        </Card>
      )}

      <Text style={styles.hint}>
        Toca un equipo para ver sus jugadores. Pts incluye puntos por juego y por serie
        (con handicap).
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
  },
  headerRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerText: { color: colors.textMuted, fontSize: font.tiny, fontWeight: '700', textTransform: 'uppercase' },
  cell: { color: colors.text, fontSize: font.body },
  posCell: { width: 28, fontWeight: '800' },
  nameCell: { flex: 1, fontWeight: '600', paddingRight: spacing.sm },
  numCell: { width: 44, textAlign: 'center' },
  pinCell: { width: 70, textAlign: 'right' },
  pts: { color: colors.primary, fontWeight: '800' },
  playersBox: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  playerName: { color: colors.text, flex: 1, fontSize: font.small, fontWeight: '600' },
  playerStat: { color: colors.textMuted, fontSize: font.tiny },
  muted: { color: colors.textMuted, fontSize: font.small, paddingVertical: spacing.sm },
  hint: { color: colors.textMuted, fontSize: font.tiny, marginTop: spacing.md, textAlign: 'center' },
});
