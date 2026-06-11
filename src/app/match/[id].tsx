import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { Avatar, Badge, Button, Card, EmptyState, Loading, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  useLeague,
  useLeaguePlayers,
  useMatch,
  usePlayerStats,
  useScores,
} from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { colors, font, radius, spacing } from '@/lib/theme';

/** clave "playerId-gameNumber" → pinfall en texto */
type ScoreMap = Record<string, string>;

export default function MatchCapture() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = id ?? null;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAdmin } = useAuth();

  const { data: match, isLoading } = useMatch(matchId);
  const leagueId = match?.league_id ?? null;
  const { data: league } = useLeague(leagueId);
  const { data: players = [] } = useLeaguePlayers(leagueId);
  const { data: stats = [] } = usePlayerStats(leagueId);
  const { data: scores = [] } = useScores(matchId);

  const [values, setValues] = useState<ScoreMap>({});
  const [saving, setSaving] = useState(false);

  // Precargar puntajes ya guardados
  useEffect(() => {
    if (scores.length === 0) return;
    setValues((prev) => {
      const next = { ...prev };
      for (const s of scores) {
        const key = `${s.player_id}-${s.game_number}`;
        if (next[key] === undefined) next[key] = String(s.pinfall);
      }
      return next;
    });
  }, [scores]);

  if (isLoading || !match || !league) return <Screen title="Partido"><Loading /></Screen>;

  if (!isAdmin) {
    return (
      <Screen title="Partido">
        <EmptyState icon="🔒" title="Solo administradores" message="No tienes permisos para capturar puntajes." />
      </Screen>
    );
  }

  const games = Array.from({ length: league.games_per_series }, (_, i) => i + 1);
  const handicapOf = (playerId: string) =>
    stats.find((s) => s.player_id === playerId)?.handicap ?? 0;

  const teamPlayers = (teamId: string) =>
    players.filter((p) => p.team_id === teamId && p.is_active);

  async function save() {
    if (!match || !league) return;
    const rows: {
      league_id: string;
      match_id: string;
      team_id: string;
      player_id: string;
      game_number: number;
      pinfall: number;
      handicap: number;
    }[] = [];

    for (const teamId of [match.home_team_id, match.away_team_id]) {
      for (const p of teamPlayers(teamId)) {
        for (const g of games) {
          const raw = values[`${p.id}-${g}`];
          if (raw === undefined || raw === '') continue;
          const pinfall = parseInt(raw, 10);
          if (Number.isNaN(pinfall) || pinfall < 0 || pinfall > 300) {
            Alert.alert('Error', `Puntaje inválido para ${p.display_name} (juego ${g}). Debe ser 0–300.`);
            return;
          }
          rows.push({
            league_id: league.id,
            match_id: match.id,
            team_id: teamId,
            player_id: p.id,
            game_number: g,
            pinfall,
            handicap: handicapOf(p.id),
          });
        }
      }
    }

    if (rows.length === 0) {
      Alert.alert('Sin datos', 'Captura al menos un puntaje.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('game_scores')
      .upsert(rows, { onConflict: 'match_id,player_id,game_number' });
    if (!error) {
      await supabase.from('matches').update({ status: 'completed' }).eq('id', match.id);
    }
    setSaving(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await queryClient.invalidateQueries();
    Alert.alert('✅ Guardado', 'Puntajes registrados correctamente.');
    router.back();
  }

  const TeamSection = ({ teamId, name }: { teamId: string; name: string }) => {
    const list = teamPlayers(teamId);
    return (
      <Card>
        <View style={styles.teamHeader}>
          <Text style={styles.teamName}>{name}</Text>
          <Badge text={`${list.length} jugadores`} />
        </View>

        <View style={styles.gridHeader}>
          <Text style={[styles.gridLabel, { flex: 1 }]}>Jugador</Text>
          {games.map((g) => (
            <Text key={g} style={[styles.gridLabel, styles.gameCol]}>J{g}</Text>
          ))}
          <Text style={[styles.gridLabel, styles.hdcpCol]}>HDCP</Text>
        </View>

        {list.length === 0 ? (
          <Text style={styles.muted}>Este equipo no tiene jugadores activos.</Text>
        ) : (
          list.map((p) => (
            <View key={p.id} style={styles.playerRow}>
              <View style={[styles.playerCell, { flex: 1 }]}>
                <Avatar name={p.display_name} size={26} />
                <Text style={styles.playerName} numberOfLines={1}>
                  {p.display_name}
                </Text>
              </View>
              {games.map((g) => {
                const key = `${p.id}-${g}`;
                return (
                  <TextInput
                    key={key}
                    style={styles.scoreInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="—"
                    placeholderTextColor={colors.textMuted}
                    value={values[key] ?? ''}
                    onChangeText={(v) =>
                      setValues((prev) => ({ ...prev, [key]: v.replace(/[^0-9]/g, '') }))
                    }
                  />
                );
              })}
              <Text style={[styles.hdcp, styles.hdcpCol]}>{handicapOf(p.id)}</Text>
            </View>
          ))
        )}
      </Card>
    );
  };

  return (
    <Screen
      title={`${match.home_team?.name} vs ${match.away_team?.name}`}
      subtitle={`${league.name}${match.lanes ? ` · Pistas ${match.lanes}` : ''}`}
    >
      <TeamSection teamId={match.home_team_id} name={match.home_team?.name ?? 'Local'} />
      <TeamSection teamId={match.away_team_id} name={match.away_team?.name ?? 'Visitante'} />

      <Text style={styles.hint}>
        El handicap se guarda automáticamente con el promedio actual de cada jugador. Los
        puntos del partido se calculan solos al guardar.
      </Text>
      <Button title="Guardar puntajes" onPress={save} loading={saving} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  teamName: { color: colors.text, fontSize: font.h2, fontWeight: '800' },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gridLabel: {
    color: colors.textMuted,
    fontSize: font.tiny,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  gameCol: { width: 52, textAlign: 'center' },
  hdcpCol: { width: 40, textAlign: 'center' },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
  },
  playerCell: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  playerName: { color: colors.text, fontSize: font.small, fontWeight: '600', flex: 1 },
  scoreInput: {
    width: 52,
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
  hdcp: { color: colors.accent, fontSize: font.small, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: font.small, paddingVertical: spacing.sm },
  hint: {
    color: colors.textMuted,
    fontSize: font.tiny,
    marginVertical: spacing.md,
    textAlign: 'center',
  },
});
