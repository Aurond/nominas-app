import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import { SUPABASE_ANON_CONFIG, SUPABASE_URL_CONFIG } from './config';

// Se rellenan en la publicación (GitHub Action) o en .env para desarrollo.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || SUPABASE_URL_CONFIG;
export const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON || SUPABASE_ANON_CONFIG;
export const configurado = !!(SUPABASE_URL && SUPABASE_ANON);

export const supabase = createClient(SUPABASE_URL || 'https://sin-configurar.supabase.co', SUPABASE_ANON || 'sin-clave', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresca la sesión solo con la app en primer plano (recomendación de Supabase para RN).
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (estado) => {
    if (estado === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
