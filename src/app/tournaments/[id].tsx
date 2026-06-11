import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Loading,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  useTournament,
  useTournamentMatches,
  useTournamentPlayers,
} from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { colors, font, radius, spacing } from '@/lib/theme';
import type { TournamentMatch } from '@/lib/types';

export default function TournamentDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = id ?? null;
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: tournament, isLoading } = useTournament(tournamentId);
  const { data: tPlayers = [] } = useTournamentPlayers(tournamentId);
  const { data: matches = [], refetch } = useTournamentMatches(tournamentId);

  const [scores, setScores] = useState<Record<string, { s1: string; s2: string }>>({});
  const [busy, setBusy] = useState(false);

  if (isLoading || !tournament) {
    return (
      <Screen title="Torneo">
        <Loading />
      </Screen>
    );
  }

  const nameOf = (tpId: string | null) =>
    tPlayers.find((p) => p.id === tpId)?.league_player?.display_name ?? 'Por definir';

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tournament_matches', tournamentId] });
    queryClient.invalidateQueries({ queryKey: ['tournaments'] });
  };

  async function saveMatch(m: TournamentMatch) {
    const entry = scores[m.id];
    const s1 = parseInt(entry?.s1 ?? '', 10);
    const s2 = parseInt(entry?.s2 ?? '', 10);
    if (Number.isNaN(s1) || Number.isNaN(s2)) {
      Alert.alert('Error', 'Captura ambos puntajes.');
      return;
    }
    if (s1 === s2) {
      Alert.alert('Empate', 'En eliminación directa debe haber un ganador.');
      return;
    }
    const { error } = await supabase
      .from('tournament_matches')
      .update({
        score1: s1,
        score2: s2,
        winner_id: s1 > s2 ? m.player1_id : m.player2_id,
        status: 'completed',
      })
      .eq('id', m.id);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  async function generateNextRound() {
    if (!tournament) return;
    const maxRound = Math.max(...matches.map((m) => m.round));
    const current = matches.filter((m) => m.round === maxRound);
    const winners = current
      .sort((a, b) => a.position - b.position)
      .map((m) => m.winner_id)
      .filter((w): w is string => !!w);

    if (current.some((m) => m.status !== 'completed')) {
      Alert.alert('Ronda incompleta', 'Termina todos los partidos de la ronda actual.');
      return;
    }

    setBusy(true);
    if (winners.length === 1) {
      // Tenemos campeón
      await supabase.from('tournaments').update({ status: 'finished' }).eq('id', tournament.id);
      setBusy(false);
      invalidate();
      return;
    }

    const next = [];
    for (let i = 0; i < winners.length; i += 2) {
      const p1 = winners[i]!;
      const p2 = winners[i + 1] ?? null;
      next.push({
        tournament_id: tournament.id,
        round: maxRound + 1,
        position: i / 2 + 1,
        player1_id: p1,
        player2_id: p2,
        winner_id: p2 ? null : p1,
        status: p2 ? 'pending' : 'completed',
      });
    }
    const { error } = await supabase.from('tournament_matches').insert(next);
    setBusy(false);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  /* ---------- Torneo por puntos ---------- */

  async function addPointsRound() {
    if (!tournament) return;
    const maxRound = matches.length > 0 ? Math.max(...matches.map((m) => m.round)) : 0;
    const rows = tPlayers.map((p, i) => ({
      tournament_id: tournament.id,
      round: maxRound + 1,
      position: i + 1,
      player1_id: p.id,
    }));
    const { error } = await supabase.from('tournament_matches').insert(rows);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  async function savePointsScore(m: TournamentMatch) {
    const raw = scores[m.id]?.s1 ?? '';
    const s1 = parseInt(raw, 10);
    if (Number.isNaN(s1) || s1 < 0 || s1 > 300) {
      Alert.alert('Error', 'Puntaje inválido (0–300).');
      return;
    }
    const { error } = await supabase
      .from('tournament_matches')
      .update({ score1: s1, status: 'completed' })
      .eq('id', m.id);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  const isElimination = tournament.type === 'eliminacion';
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const maxRound = rounds.length > 0 ? rounds[rounds.length - 1]! : 0;
  const finalMatches = matches.filter((m) => m.round === maxRound);
  const champion =
    tournament.status === 'finished' && isElimination && finalMatches.length === 1
      ? nameOf(finalMatches[0]!.winner_id)
      : null;

  // Ranking para torneos por puntos
  const totals = tPlayers
    .map((p) => ({
      id: p.id,
      name: p.league_player?.display_name ?? '—',
      total: matches
        .filter((m) => m.player1_id === p.id && m.score1 != null)
        .reduce((acc, m) => acc + (m.score1 ?? 0), 0),
      games: matches.filter((m) => m.player1_id === p.id && m.score1 != null).length,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <Screen
      title={tournament.name}
      subtitle={isElimination ? 'Eliminación directa' : 'Torneo por puntos'}
      onRefresh={refetch}
      refreshing={false}
    >
      {champion ? (
        <Card style={styles.championCard}>
          <Text style={{ fontSize: 40 }}>🏆</Text>
          <Text style={styles.championLabel}>CAMPEÓN</Text>
          <Text style={styles.championName}>{champion}</Text>
        </Card>
      ) : null}

      {isElimination ? (
        <>
          {rounds.length === 0 ? (
            <EmptyState icon="⚔️" title="Sin partidos" message="El bracket aún no se ha generado." />
          ) : (
            rounds.map((round) => (
              <View key={round}>
                <SectionHeader
                  title={
                    round === maxRound && tournament.status === 'finished'
                      ? '🏁 Final'
                      : `Ronda ${round}`
                  }
                />
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => {
                    const done = m.status === 'completed';
                    const isBye = !m.player2_id;
                    return (
                      <Card key={m.id}>
                        <View style={styles.duelRow}>
                          <Text
                            style={[styles.duelName, m.winner_id === m.player1_id && styles.winner]}
                            numberOfLines={1}
                          >
                            {nameOf(m.player1_id)}
                          </Text>
                          {done ? (
                            <Text style={styles.duelScore}>
                              {isBye ? 'BYE' : `${m.score1} - ${m.score2}`}
                            </Text>
                          ) : (
                            <Badge text="Pendiente" color={colors.warning} />
                          )}
                          <Text
                            style={[
                              styles.duelName,
                              { textAlign: 'right' },
                              m.winner_id === m.player2_id && styles.winner,
                            ]}
                            numberOfLines={1}
                          >
                            {isBye ? '—' : nameOf(m.player2_id)}
                          </Text>
                        </View>

                        {isAdmin && !done && !isBye ? (
                          <View style={styles.captureRow}>
                            <TextInput
                              style={styles.scoreInput}
                              keyboardType="number-pad"
                              maxLength={3}
                              placeholder="0"
                              placeholderTextColor={colors.textMuted}
                              value={scores[m.id]?.s1 ?? ''}
                              onChangeText={(v) =>
                                setScores((p) => ({
                                  ...p,
                                  [m.id]: { s1: v, s2: p[m.id]?.s2 ?? '' },
                                }))
                              }
                            />
                            <Text style={{ color: colors.textMuted }}>vs</Text>
                            <TextInput
                              style={styles.scoreInput}
                              keyboardType="number-pad"
                              maxLength={3}
                              placeholder="0"
                              placeholderTextColor={colors.textMuted}
                              value={scores[m.id]?.s2 ?? ''}
                              onChangeText={(v) =>
                                setScores((p) => ({
                                  ...p,
                                  [m.id]: { s1: p[m.id]?.s1 ?? '', s2: v },
                                }))
                              }
                            />
                            <Button small title="Guardar" onPress={() => saveMatch(m)} />
                          </View>
                        ) : null}
                      </Card>
                    );
                  })}
              </View>
            ))
          )}

          {isAdmin && tournament.status !== 'finished' && rounds.length > 0 ? (
            <Button
              title="Generar siguiente ronda / cerrar torneo"
              variant="secondary"
              onPress={generateNextRound}
              loading={busy}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </>
      ) : (
        <>
          <SectionHeader title="Tabla de posiciones" />
          <Card style={{ padding: 0 }}>
            {totals.map((t, i) => (
              <View
                key={t.id}
                style={[styles.rankRow, i % 2 === 1 && { backgroundColor: colors.cardAlt }]}
              >
                <Text style={[styles.rankPos, i < 3 && { color: colors.gold }]}>{i + 1}</Text>
                <Avatar name={t.name} size={30} />
                <Text style={styles.rankName} numberOfLines={1}>{t.name}</Text>
                <Text style={styles.rankGames}>{t.games} jgs</Text>
                <Text style={styles.rankTotal}>{t.total}</Text>
              </View>
            ))}
          </Card>

          {rounds.map((round) => (
            <View key={round}>
              <SectionHeader title={`Juego ${round}`} />
              <Card>
                {matches
                  .filter((m) => m.round === round)
                  .map((m) => (
                    <View key={m.id} style={styles.pointsRow}>
                      <Text style={styles.rankName} numberOfLines={1}>
                        {nameOf(m.player1_id)}
                      </Text>
                      {m.status === 'completed' ? (
                        <Text style={styles.duelScore}>{m.score1}</Text>
                      ) : isAdmin ? (
                        <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }}>
                          <TextInput
                            style={styles.scoreInput}
                            keyboardType="number-pad"
                            maxLength={3}
                            placeholder="0"
                            placeholderTextColor={colors.textMuted}
                            value={scores[m.id]?.s1 ?? ''}
                            onChangeText={(v) =>
                              setScores((p) => ({ ...p, [m.id]: { s1: v, s2: '' } }))
                            }
                          />
                          <Button small title="OK" onPress={() => savePointsScore(m)} />
                        </View>
                      ) : (
                        <Badge text="Pendiente" color={colors.warning} />
                      )}
                    </View>
                  ))}
              </Card>
            </View>
          ))}

          {isAdmin && tournament.status !== 'finished' ? (
            <Button
              title="➕ Agregar juego para todos"
              variant="secondary"
              onPress={addPointsRound}
              style={{ marginTop: spacing.md }}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  championCard: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    borderColor: colors.gold,
  },
  championLabel: {
    color: colors.gold,
    fontSize: font.tiny,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: spacing.sm,
  },
  championName: { color: colors.text, fontSize: font.h1, fontWeight: '900', marginTop: spacing.xs },
  duelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  duelName: { color: colors.textMuted, fontSize: font.body, fontWeight: '600', flex: 1 },
  winner: { color: colors.success, fontWeight: '800' },
  duelScore: { color: colors.accent, fontSize: font.body, fontWeight: '800' },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  scoreInput: {
    width: 64,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    textAlign: 'center',
    paddingVertical: 8,
    fontSize: font.body,
    fontWeight: '700',
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  rankPos: { color: colors.text, fontWeight: '800', width: 24 },
  rankName: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
  rankGames: { color: colors.textMuted, fontSize: font.tiny },
  rankTotal: { color: colors.primary, fontSize: font.body, fontWeight: '800', width: 50, textAlign: 'right' },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
});
