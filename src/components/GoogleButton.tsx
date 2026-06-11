import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWithGoogle } from '@/lib/googleAuth';
import { colors, font, radius, spacing } from '@/lib/theme';

/** Divisor "o" + botón "Continuar con Google" para login y registro. */
export function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePress() {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      console.error('Error en signInWithGoogle:', e);
      setError(e?.message || 'No se pudo iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View>
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>o</Text>
        <View style={styles.dividerLine} />
      </View>
      <Pressable
        onPress={handlePress}
        disabled={loading}
        style={({ pressed }) => [styles.button, { opacity: loading ? 0.5 : pressed ? 0.85 : 1 }]}
      >
        {loading ? (
          <ActivityIndicator color={colors.text} size="small" />
        ) : (
          <>
            <Text style={styles.g}>G</Text>
            <Text style={styles.buttonText}>Continuar con Google</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.textMuted, fontSize: font.small },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
  },
  g: { color: '#4285F4', fontSize: font.body, fontWeight: '900' },
  buttonText: { color: colors.text, fontSize: font.body, fontWeight: '700' },
  error: { color: colors.danger, fontSize: font.tiny, marginTop: spacing.xs, textAlign: 'center' },
});
