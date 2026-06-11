import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LeagueProvider } from '@/context/LeagueContext';
import { colors } from '@/lib/theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function AuthGate() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: colors.bg },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="league/new" options={{ title: 'Nueva liga' }} />
      <Stack.Screen name="league/[id]/index" options={{ title: 'Administrar liga' }} />
      <Stack.Screen name="match/[id]" options={{ title: 'Capturar puntajes' }} />
      <Stack.Screen name="tournaments/index" options={{ title: 'Torneos' }} />
      <Stack.Screen name="tournaments/new" options={{ title: 'Nuevo torneo' }} />
      <Stack.Screen name="tournaments/[id]" options={{ title: 'Torneo' }} />
      <Stack.Screen name="notifications/index" options={{ title: 'Notificaciones' }} />
      <Stack.Screen name="notifications/send" options={{ title: 'Enviar aviso' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LeagueProvider>
          <StatusBar style="light" />
          <AuthGate />
        </LeagueProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
