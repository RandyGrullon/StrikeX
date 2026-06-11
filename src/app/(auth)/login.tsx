import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GoogleButton } from '@/components/GoogleButton';
import { Button, Card, Input } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { colors, font, spacing } from '@/lib/theme';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (err) setError('Correo o contraseña incorrectos');
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.box}>
          <Text style={styles.logo}>🎳</Text>
          <Text style={styles.title}>StrikeX</Text>
          <Text style={styles.subtitle}>Tu liga de boliche, en un solo lugar</Text>

          <Card style={{ marginTop: spacing.xl }}>
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
              placeholder="••••••••"
              error={error ?? undefined}
            />
            <Button
              title="Iniciar sesión"
              onPress={handleLogin}
              loading={loading}
              disabled={!email || !password}
            />
            <GoogleButton />
          </Card>

          <Link href="/(auth)/register" style={styles.link}>
            ¿No tienes cuenta? <Text style={{ color: colors.primary, fontWeight: '700' }}>Regístrate</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl },
  box: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  logo: { fontSize: 56, textAlign: 'center' },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: { color: colors.textMuted, fontSize: font.body, textAlign: 'center', marginTop: spacing.xs },
  link: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, fontSize: font.body },
});
