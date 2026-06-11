import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

let supabaseUrl = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}
if (supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En web hace falta para recoger la sesión al volver del OAuth de Google
    detectSessionInUrl: Platform.OS === 'web',
  },
});

