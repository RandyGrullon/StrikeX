import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Card, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';

export default function Register() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    // Si la confirmación por correo está activada no hay sesión todavía
    if (!data.session) setDone(true);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.box}>
          <Text style={styles.title}>Crear cuenta</Text>
          <Text style={styles.subtitle}>Únete a tu liga en StrikeX</Text>

          {done ? (
            <Card style={{ marginTop: spacing.xl }}>
              <Text style={styles.confirmText}>
                📬 Revisa tu correo para confirmar tu cuenta y luego inicia sesión.
              </Text>
              <Button title="Ir a iniciar sesión" onPress={() => router.replace('/(auth)/login')} />
            </Card>
          ) : (
            <Card style={{ marginTop: spacing.xl }}>
              <Input
                label="Nombre completo"
                value={fullName}
                onChangeText={setFullName}
                placeholder="Juan Pérez"
              />
              <Input
                label="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="tu@correo.com"
              />
              <Input
                label="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Mínimo 6 caracteres"
                error={error ?? undefined}
              />
              <Button
                title="Registrarme"
                onPress={handleRegister}
                loading={loading}
                disabled={!fullName || !email || !password}
              />
              <GoogleButton />
            </Card>
          )}

          <Link href="/(auth)/login" style={styles.link}>
            ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '700' }}>Inicia sesión</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  box: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center' },
  subtitle: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', marginTop: spacing.xs },
  confirmText: { color: colors.text, fontSize: font.body, marginBottom: spacing.lg, lineHeight: 22 },
  link: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontSize: font.body },
});
