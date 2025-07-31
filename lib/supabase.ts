import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { ENV } from '../config/env';

// Validar configuración antes de crear el cliente
if (!ENV.SUPABASE_URL || ENV.SUPABASE_URL === 'https://your-project-url.supabase.co') {
  console.error('❌ SUPABASE_URL no está configurado correctamente');
  console.error('Por favor, configura las variables de entorno en config/env.ts');
}

if (!ENV.SUPABASE_ANON_KEY || ENV.SUPABASE_ANON_KEY === 'your-anon-key-here') {
  console.error('❌ SUPABASE_ANON_KEY no está configurado correctamente');
  console.error('Por favor, configura las variables de entorno en config/env.ts');
}

// Configuración de Supabase
const supabaseUrl = ENV.SUPABASE_URL;
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'X-Client-Info': 'bothside-app',
    },
  },
});

// Función para verificar conectividad
export const checkSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase.from('albums').select('count').limit(1);
    if (error) {
      console.error('❌ Error de conexión con Supabase:', error);
      return false;
    }
    console.log('✅ Conexión con Supabase exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de red:', error);
    return false;
  }
}; 