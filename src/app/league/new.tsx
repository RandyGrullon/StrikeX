import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Input, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { todayISO } from '@/lib/format';
import { colors, font, spacing } from '@/lib/theme';

export default function NewLeague() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(todayISO());
  const [gamesPerSeries, setGamesPerSeries] = useState('3');
  const [handicapBase, setHandicapBase] = useState('200');
  const [handicapPercent, setHandicapPercent] = useState('80');
  const [maxHandicap, setMaxHandicap] = useState('');
  const [pointsPerGame, setPointsPerGame] = useState('2');
  const [pointsPerSeries, setPointsPerSeries] = useState('2');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from('leagues')
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        start_date: startDate || null,
        games_per_series: parseInt(gamesPerSeries, 10) || 3,
        handicap_base: parseInt(handicapBase, 10) || 200,
        handicap_percent: parseInt(handicapPercent, 10) || 80,
        max_handicap: maxHandicap ? parseInt(maxHandicap, 10) : null,
        points_per_game: parseFloat(pointsPerGame) || 2,
        points_per_series: parseFloat(pointsPerSeries) || 2,
        created_by: profile?.id,
      })
      .select()
      .single();
    setSaving(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['leagues'] });
    router.replace(`/league/${data.id}`);
  }

  return (
    <Screen>
      <Card>
        <Input label="Nombre de la liga *" value={name} onChangeText={setName} placeholder="Liga Dominical 2026" />
        <Input
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          placeholder="Opcional"
          multiline
        />
        <Input
          label="Fecha de inicio (AAAA-MM-DD)"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-06-14"
          autoCapitalize="none"
        />
      </Card>

      <Card>
        <Text style={styles.section}>Formato de juego</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input
              label="Juegos por serie"
              value={gamesPerSeries}
              onChangeText={setGamesPerSeries}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Pts por juego"
              value={pointsPerGame}
              onChangeText={setPointsPerGame}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Pts por serie"
              value={pointsPerSeries}
              onChangeText={setPointsPerSeries}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.section}>Handicap</Text>
        <Text style={styles.hint}>
          Fórmula: (Base − Promedio) × Porcentaje. Ej: base 200 al 80%.
        </Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Input label="Base" value={handicapBase} onChangeText={setHandicapBase} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="%" value={handicapPercent} onChangeText={setHandicapPercent} keyboardType="number-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Input
              label="Máximo"
              value={maxHandicap}
              onChangeText={setMaxHandicap}
              keyboardType="number-pad"
              placeholder="Sin límite"
            />
          </View>
        </View>
      </Card>

      <Button title="Crear liga" onPress={handleSave} loading={saving} disabled={!name.trim()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { color: colors.text, fontSize: font.h2, fontWeight: '700', marginBottom: spacing.md },
  hint: { color: colors.textMuted, fontSize: font.tiny, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
});
