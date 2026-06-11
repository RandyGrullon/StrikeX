import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Select } from '@/components/Select';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  SectionHeader,
  SegmentedControl,
} from '@/components/ui';
import {
  useLeague,
  useLeaguePlayers,
  useMatchdays,
  useMatches,
  useProfiles,
  useTeams,
} from '@/hooks/queries';
import { formatDate, todayISO } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';
import type { LeaguePlayer, Match, Matchday, Team } from '@/lib/types';

function confirmDelete(title: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (window.confirm(title)) onConfirm();
  } else {
    Alert.alert(title, 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function LeagueAdmin() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const leagueId = id ?? null;
  const { data: league } = useLeague(leagueId);
  const [tab, setTab] = useState('equipos');

  return (
    <Screen title={league?.name ?? 'Liga'} subtitle="Panel de administración">
      <SegmentedControl
        options={[
          { label: 'Equipos', value: 'equipos' },
          { label: 'Jugadores', value: 'jugadores' },
          { label: 'Jornadas', value: 'jornadas' },
          { label: 'Ajustes', value: 'ajustes' },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === 'equipos' ? <TeamsTab leagueId={leagueId} /> : null}
      {tab === 'jugadores' ? <PlayersTab leagueId={leagueId} /> : null}
      {tab === 'jornadas' ? <MatchdaysTab leagueId={leagueId} /> : null}
      {tab === 'ajustes' ? <SettingsTab leagueId={leagueId} /> : null}
    </Screen>
  );
}

/* ============================== EQUIPOS ============================== */

function TeamsTab({ leagueId }: { leagueId: string | null }) {
  const queryClient = useQueryClient();
  const { data: teams = [] } = useTeams(leagueId);
  const { data: players = [] } = useLeaguePlayers(leagueId);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['teams', leagueId] });

  async function addTeam() {
    if (!name.trim() || !leagueId) return;
    setSaving(true);
    const { error } = await supabase
      .from('teams')
      .insert({ league_id: leagueId, name: name.trim() });
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    invalidate();
  }

  async function deleteTeam(team: Team) {
    confirmDelete(`¿Eliminar el equipo "${team.name}"?`, async () => {
      await supabase.from('teams').delete().eq('id', team.id);
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['league_players', leagueId] });
    });
  }

  return (
    <View>
      <Card>
        <Input
          label="Nuevo equipo"
          value={name}
          onChangeText={setName}
          placeholder="Los Chuzas"
        />
        <Button title="Agregar equipo" onPress={addTeam} loading={saving} disabled={!name.trim()} />
      </Card>

      {teams.length === 0 ? (
        <EmptyState icon="👥" title="Sin equipos" message="Agrega los equipos de la liga." />
      ) : (
        teams.map((team) => {
          const count = players.filter((p) => p.team_id === team.id).length;
          return (
            <Card key={team.id} style={styles.itemRow}>
              <Avatar name={team.name} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{team.name}</Text>
                <Text style={styles.itemSub}>{count} jugador{count === 1 ? '' : 'es'}</Text>
              </View>
              <Button small variant="danger" title="Eliminar" onPress={() => deleteTeam(team)} />
            </Card>
          );
        })
      )}
    </View>
  );
}

/* ============================== JUGADORES ============================== */

function PlayersTab({ leagueId }: { leagueId: string | null }) {
  const queryClient = useQueryClient();
  const { data: teams = [] } = useTeams(leagueId);
  const { data: players = [] } = useLeaguePlayers(leagueId);
  const { data: profiles = [] } = useProfiles();

  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState<string | null>(null);
  const [initialAvg, setInitialAvg] = useState('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['league_players', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['player_stats', leagueId] });
  };

  const teamOptions = teams.map((t) => ({ label: t.name, value: t.id }));
  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? 'Sin equipo';

  async function addPlayer() {
    if (!name.trim() || !leagueId) return;
    setSaving(true);
    const { error } = await supabase.from('league_players').insert({
      league_id: leagueId,
      team_id: teamId,
      profile_id: profileId,
      display_name: name.trim(),
      initial_average: parseInt(initialAvg, 10) || 0,
    });
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    setName('');
    setInitialAvg('');
    setProfileId(null);
    invalidate();
  }

  async function updatePlayer(player: LeaguePlayer, patch: Partial<LeaguePlayer>) {
    const { error } = await supabase
      .from('league_players')
      .update(patch)
      .eq('id', player.id);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  async function deletePlayer(player: LeaguePlayer) {
    confirmDelete(`¿Eliminar a "${player.display_name}"? Se borran sus puntajes.`, async () => {
      await supabase.from('league_players').delete().eq('id', player.id);
      invalidate();
    });
  }

  return (
    <View>
      <Card>
        <Input label="Nombre del jugador" value={name} onChangeText={setName} placeholder="María López" />
        <Select label="Equipo" options={teamOptions} value={teamId} onChange={setTeamId} />
        <Input
          label="Promedio inicial (opcional)"
          value={initialAvg}
          onChangeText={setInitialAvg}
          keyboardType="number-pad"
          placeholder="Para calcular handicap antes de que juegue"
        />
        <Select
          label="Vincular cuenta (opcional)"
          placeholder="Sin cuenta vinculada"
          options={profiles.map((p) => ({ label: p.full_name || '(sin nombre)', value: p.id }))}
          value={profileId}
          onChange={setProfileId}
        />
        <Button title="Agregar jugador" onPress={addPlayer} loading={saving} disabled={!name.trim()} />
      </Card>

      {players.map((p) => {
        const isEditing = editing === p.id;
        return (
          <Card key={p.id}>
            <Pressable
              style={styles.itemRow}
              onPress={() => setEditing(isEditing ? null : p.id)}
            >
              <Avatar name={p.display_name} size={38} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemTitle, !p.is_active && styles.inactive]}>
                  {p.display_name}
                </Text>
                <Text style={styles.itemSub}>
                  {teamName(p.team_id)}
                  {p.profile_id ? ' · 🔗 cuenta vinculada' : ''}
                </Text>
              </View>
              {!p.is_active ? <Badge text="Inactivo" color={colors.textMuted} /> : null}
            </Pressable>

            {isEditing ? (
              <View style={styles.editor}>
                <Select
                  label="Cambiar de equipo"
                  options={teamOptions}
                  value={p.team_id}
                  onChange={(v) => updatePlayer(p, { team_id: v })}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.itemTitle}>Activo</Text>
                  <Switch
                    value={p.is_active}
                    onValueChange={(v) => updatePlayer(p, { is_active: v })}
                    trackColor={{ true: colors.primary, false: colors.border }}
                  />
                </View>
                <Button small variant="danger" title="Eliminar jugador" onPress={() => deletePlayer(p)} />
              </View>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}

/* ============================== JORNADAS ============================== */

function MatchdaysTab({ leagueId }: { leagueId: string | null }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: matchdays = [] } = useMatchdays(leagueId);
  const { data: matches = [] } = useMatches(leagueId);
  const { data: teams = [] } = useTeams(leagueId);

  const [date, setDate] = useState(todayISO());
  const [adding, setAdding] = useState(false);
  const [matchForm, setMatchForm] = useState<{
    matchdayId: string;
    home: string | null;
    away: string | null;
    lanes: string;
  } | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['matchdays', leagueId] });
    queryClient.invalidateQueries({ queryKey: ['matches', leagueId] });
  };

  const teamOptions = teams.map((t) => ({ label: t.name, value: t.id }));

  async function addMatchday() {
    if (!leagueId) return;
    setAdding(true);
    const nextNumber = Math.max(0, ...matchdays.map((m) => m.number)) + 1;
    const { error } = await supabase
      .from('matchdays')
      .insert({ league_id: leagueId, number: nextNumber, date });
    setAdding(false);
    if (error) return Alert.alert('Error', error.message);
    invalidate();
  }

  async function deleteMatchday(md: Matchday) {
    confirmDelete(`¿Eliminar la jornada ${md.number} y sus partidos?`, async () => {
      await supabase.from('matchdays').delete().eq('id', md.id);
      invalidate();
    });
  }

  async function addMatch() {
    if (!matchForm || !matchForm.home || !matchForm.away || !leagueId) return;
    if (matchForm.home === matchForm.away) {
      return Alert.alert('Error', 'Un equipo no puede jugar contra sí mismo.');
    }
    const { error } = await supabase.from('matches').insert({
      league_id: leagueId,
      matchday_id: matchForm.matchdayId,
      home_team_id: matchForm.home,
      away_team_id: matchForm.away,
      lanes: matchForm.lanes.trim() || null,
    });
    if (error) return Alert.alert('Error', error.message);
    setMatchForm(null);
    invalidate();
  }

  async function deleteMatch(m: Match) {
    confirmDelete('¿Eliminar este partido y sus puntajes?', async () => {
      await supabase.from('matches').delete().eq('id', m.id);
      invalidate();
    });
  }

  return (
    <View>
      <Card>
        <Input
          label="Fecha de la nueva jornada (AAAA-MM-DD)"
          value={date}
          onChangeText={setDate}
          autoCapitalize="none"
        />
        <Button title="Agregar jornada" onPress={addMatchday} loading={adding} />
      </Card>

      {matchdays.map((md) => {
        const mdMatches = matches.filter((m) => m.matchday_id === md.id);
        const isFormOpen = matchForm?.matchdayId === md.id;
        return (
          <Card key={md.id}>
            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Jornada {md.number}</Text>
                <Text style={styles.itemSub}>{formatDate(md.date)}</Text>
              </View>
              <Button small variant="danger" title="✕" onPress={() => deleteMatchday(md)} />
            </View>

            {mdMatches.map((m) => (
              <View key={m.id} style={styles.matchRow}>
                <Pressable style={{ flex: 1 }} onPress={() => router.push(`/match/${m.id}`)}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {m.home_team?.name} vs {m.away_team?.name}
                  </Text>
                  <Text style={styles.itemSub}>
                    {m.lanes ? `Pistas ${m.lanes} · ` : ''}
                    {m.status === 'completed' ? '✅ Capturado' : 'Tocar para capturar puntajes'}
                  </Text>
                </Pressable>
                <Button small variant="secondary" title="✕" onPress={() => deleteMatch(m)} />
              </View>
            ))}

            {isFormOpen ? (
              <View style={styles.editor}>
                <Select
                  label="Equipo local"
                  options={teamOptions}
                  value={matchForm.home}
                  onChange={(v) => setMatchForm({ ...matchForm, home: v })}
                />
                <Select
                  label="Equipo visitante"
                  options={teamOptions}
                  value={matchForm.away}
                  onChange={(v) => setMatchForm({ ...matchForm, away: v })}
                />
                <Input
                  label="Pistas (opcional)"
                  value={matchForm.lanes}
                  onChangeText={(v) => setMatchForm({ ...matchForm, lanes: v })}
                  placeholder="5-6"
                />
                <View style={{ flexDirection: 'row', gap: spacing.md }}>
                  <Button small title="Guardar partido" onPress={addMatch} />
                  <Button small variant="ghost" title="Cancelar" onPress={() => setMatchForm(null)} />
                </View>
              </View>
            ) : (
              <Button
                small
                variant="secondary"
                title="➕ Agregar partido"
                style={{ marginTop: spacing.sm }}
                onPress={() =>
                  setMatchForm({ matchdayId: md.id, home: null, away: null, lanes: '' })
                }
              />
            )}
          </Card>
        );
      })}
    </View>
  );
}

/* ============================== AJUSTES ============================== */

function SettingsTab({ leagueId }: { leagueId: string | null }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: league } = useLeague(leagueId);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<Record<string, string> | null>(null);
  if (league && !form) {
    setForm({
      name: league.name,
      handicap_base: String(league.handicap_base),
      handicap_percent: String(league.handicap_percent),
      max_handicap: league.max_handicap ? String(league.max_handicap) : '',
      games_per_series: String(league.games_per_series),
      points_per_game: String(league.points_per_game),
      points_per_series: String(league.points_per_series),
    });
  }
  if (!league || !form) return null;

  const set = (k: string) => (v: string) => setForm({ ...form, [k]: v });

  async function save() {
    if (!form || !leagueId) return;
    setSaving(true);
    const { error } = await supabase
      .from('leagues')
      .update({
        name: form.name!.trim(),
        handicap_base: parseInt(form.handicap_base!, 10) || 200,
        handicap_percent: parseInt(form.handicap_percent!, 10) || 80,
        max_handicap: form.max_handicap ? parseInt(form.max_handicap, 10) : null,
        games_per_series: parseInt(form.games_per_series!, 10) || 3,
        points_per_game: parseFloat(form.points_per_game!) || 2,
        points_per_series: parseFloat(form.points_per_series!) || 2,
      })
      .eq('id', leagueId);
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    queryClient.invalidateQueries();
  }

  async function setStatus(status: string) {
    await supabase.from('leagues').update({ status }).eq('id', leagueId!);
    queryClient.invalidateQueries({ queryKey: ['leagues'] });
  }

  function deleteLeague() {
    confirmDelete(`¿Eliminar la liga "${league!.name}" y TODOS sus datos?`, async () => {
      await supabase.from('leagues').delete().eq('id', leagueId!);
      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    });
  }

  return (
    <View>
      <Card>
        <Input label="Nombre" value={form.name} onChangeText={set('name')} />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="Juegos/serie" value={form.games_per_series} onChangeText={set('games_per_series')} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Pts/juego" value={form.points_per_game} onChangeText={set('points_per_game')} keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Pts/serie" value={form.points_per_series} onChangeText={set('points_per_series')} keyboardType="numeric" />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Input label="HDCP base" value={form.handicap_base} onChangeText={set('handicap_base')} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="HDCP %" value={form.handicap_percent} onChangeText={set('handicap_percent')} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="HDCP máx" value={form.max_handicap} onChangeText={set('max_handicap')} keyboardType="number-pad" placeholder="—" />
          </View>
        </View>
        <Button title="Guardar cambios" onPress={save} loading={saving} />
      </Card>

      <SectionHeader title="Estado de la liga" />
      <Card>
        <Select
          label="Estado"
          options={[
            { label: 'Borrador', value: 'draft' },
            { label: 'Activa', value: 'active' },
            { label: 'Finalizada', value: 'finished' },
          ]}
          value={league.status}
          onChange={setStatus}
        />
      </Card>

      <SectionHeader title="Zona de peligro" />
      <Button title="Eliminar liga" variant="danger" onPress={deleteLeague} />
    </View>
  );
}

const styles = StyleSheet.create({
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  itemTitle: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  itemSub: { color: colors.textMuted, fontSize: font.tiny, marginTop: 2 },
  inactive: { textDecorationLine: 'line-through', color: colors.textMuted },
  editor: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
});
