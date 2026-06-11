import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Select } from '@/components/Select';
import { Avatar, Button, Card, Input, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { useLeaguePlayers, useLeagues } from '@/hooks/queries';
import { todayISO } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export default function NewTournament() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: leagues = [] } = useLeagues();

  const [name, setName] = useState('');
  const [type, setType] = useState('eliminacion');
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(todayISO());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const { data: players = [] } = useLeaguePlayers(leagueId);
  const activePlayers = players.filter((p) => p.is_active);

  function togglePlayer(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function create() {
    if (!name.trim() || selected.size < 2) return;
    setSaving(true);
    try {
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .insert({
          name: name.trim(),
          type,
          league_id: leagueId,
          start_date: startDate || null,
          status: 'active',
        })
        .select()
        .single();
      if (error) throw new Error(error.message);

      const { data: tps, error: tpError } = await supabase
        .from('tournament_players')
        .insert(
          [...selected].map((leaguePlayerId, i) => ({
            tournament_id: tournament.id,
            league_player_id: leaguePlayerId,
            seed: i + 1,
          }))
        )
        .select();
      if (tpError) throw new Error(tpError.message);

      // Eliminación directa: generar la primera ronda con cruces al azar
      if (type === 'eliminacion' && tps) {
        const order = shuffle(tps);
        const matches = [];
        for (let i = 0; i < order.length; i += 2) {
          const p1 = order[i]!;
          const p2 = order[i + 1] ?? null;
          matches.push({
            tournament_id: tournament.id,
            round: 1,
            position: i / 2 + 1,
            player1_id: p1.id,
            player2_id: p2?.id ?? null,
            // bye: si no hay rival, avanza automáticamente
            winner_id: p2 ? null : p1.id,
            status: p2 ? 'pending' : 'completed',
          });
        }
        const { error: mError } = await supabase.from('tournament_matches').insert(matches);
        if (mError) throw new Error(mError.message);
      }

      await queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      router.replace(`/tournaments/${tournament.id}`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo crear el torneo');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <Card>
        <Input label="Nombre del torneo *" value={name} onChangeText={setName} placeholder="Copa Strike de Verano" />
        <Text style={styles.label}>Tipo de torneo</Text>
        <SegmentedControl
          options={[
            { label: '⚔️ Eliminación', value: 'eliminacion' },
            { label: '🎯 Por puntos', value: 'puntos' },
          ]}
          value={type}
          onChange={setType}
        />
        <Select
          label="Liga (para tomar jugadores)"
          options={leagues.map((l) => ({ label: l.name, value: l.id }))}
          value={leagueId}
          onChange={(v) => {
            setLeagueId(v);
            setSelected(new Set());
          }}
        />
        <Input
          label="Fecha de inicio (AAAA-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          autoCapitalize="none"
        />
      </Card>

      {leagueId ? (
        <>
          <SectionHeader title={`Participantes (${selected.size})`} />
          <Card style={{ padding: spacing.sm }}>
            {activePlayers.length === 0 ? (
              <Text style={styles.muted}>Esta liga no tiene jugadores activos.</Text>
            ) : (
              activePlayers.map((p) => {
                const checked = selected.has(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => togglePlayer(p.id)}
                    style={[styles.playerRow, checked && styles.playerRowActive]}
                  >
                    <Avatar name={p.display_name} size={32} />
                    <Text style={styles.playerName}>{p.display_name}</Text>
                    <Text style={{ color: checked ? colors.primary : colors.textMuted, fontSize: 18 }}>
                      {checked ? '☑' : '☐'}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </Card>
        </>
      ) : null}

      <Button
        title={`Crear torneo (${selected.size} jugadores)`}
        onPress={create}
        loading={saving}
        disabled={!name.trim() || selected.size < 2}
      />
      {selected.size < 2 ? (
        <Text style={styles.muted}>Selecciona al menos 2 jugadores.</Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    color: colors.textMuted,
    fontSize: font.small,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  muted: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: 'center',
    padding: spacing.md,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
  },
  playerRowActive: { backgroundColor: colors.primarySoft },
  playerName: { color: colors.text, fontSize: font.body, fontWeight: '600', flex: 1 },
});
