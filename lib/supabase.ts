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
const supabaseUrl = ENV.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = ENV.SUPABASE_ANON_KEY || 'placeholder-key';

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

// Función para verificar conectividad con logs más detallados
export const checkSupabaseConnection = async () => {
  console.log('🔍 Iniciando verificación de conexión con Supabase...');
  try {
    const { data, error, status } = await supabase.from('albums').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ Error de respuesta de Supabase: [${error.code}] ${error.message} (Status: ${status})`);
      return { success: false, error: `${error.message} (${error.code})` };
    }
    
    console.log(`✅ Conexión con Supabase exitosa. Status: ${status}`);
    return { success: true };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown network error';
    console.log(`❌ Error crítico de red al conectar con Supabase: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
};