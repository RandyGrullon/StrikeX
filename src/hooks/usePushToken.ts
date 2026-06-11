import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

/**
 * Registra el dispositivo para notificaciones push de Expo y guarda
 * el token en profiles.push_token. En web no hace nada.
 */
export function usePushToken() {
  const { session, profile } = useAuth();

  useEffect(() => {
    if (Platform.OS === 'web' || !session || !profile || !Device.isDevice) return;

    (async () => {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let status = existing;
        if (existing !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          status = req.status;
        }
        if (status !== 'granted') return;

        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'General',
            importance: Notifications.AndroidImportance.DEFAULT,
          });
        }

        const token = (await Notifications.getExpoPushTokenAsync()).data;
        if (token && token !== profile.push_token) {
          await supabase.from('profiles').update({ push_token: token }).eq('id', profile.id);
        }
      } catch {
        // push es opcional: si falla, la app sigue funcionando
      }
    })();
  }, [session, profile]);
}
