import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Select } from '@/components/Select';
import { Button, Card, Input, Screen } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useLeagues } from '@/hooks/queries';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';

export default function SendNotification() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { data: leagues = [] } = useLeagues();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [type, setType] = useState('general');
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function send() {
    setSending(true);
    const { error } = await supabase.from('notifications').insert({
      title: title.trim(),
      body: body.trim(),
      type,
      league_id: leagueId,
      recipient_id: null, // broadcast a todos
      created_by: profile?.id,
    });

    // Si la edge function de push está desplegada, también manda push.
    // Si no existe, el aviso in-app ya quedó guardado y no pasa nada.
    if (!error) {
      try {
        await supabase.functions.invoke('send-push', {
          body: { title: title.trim(), body: body.trim() },
        });
      } catch {
        // push opcional
      }
    }

    setSending(false);
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    Alert.alert('✅ Enviado', 'El aviso ya está visible para todos.');
    router.back();
  }

  return (
    <Screen>
      <Card>
        <Input label="Título *" value={title} onChangeText={setTitle} placeholder="¡Jornada 5 este domingo!" />
        <Input
          label="Mensaje *"
          value={body}
          onChangeText={setBody}
          placeholder="Nos vemos a las 10am en el boliche…"
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
        <Select
          label="Tipo"
          options={[
            { label: '📣 General', value: 'general' },
            { label: '🎳 Resultado', value: 'resultado' },
            { label: '⏰ Recordatorio', value: 'recordatorio' },
            { label: '🏆 Torneo', value: 'torneo' },
          ]}
          value={type}
          onChange={setType}
        />
        <Select
          label="Liga (opcional)"
          placeholder="Todas"
          options={leagues.map((l) => ({ label: l.name, value: l.id }))}
          value={leagueId}
          onChange={setLeagueId}
        />
        <Button
          title="Enviar aviso"
          onPress={send}
          loading={sending}
          disabled={!title.trim() || !body.trim()}
        />
      </Card>
      <Text style={styles.hint}>
        El aviso aparece en la app para todos los usuarios. Si despliegas la función
        «send-push» (ver README) también llega como notificación push.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.textMuted, fontSize: font.tiny, textAlign: 'center', marginTop: spacing.sm },
});
