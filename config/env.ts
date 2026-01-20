// Archivo de configuración de entorno
// Configuración real de la aplicación

export const ENV = {
  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Google Gemini API Key
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',

  // YouTube Data API v3
  YOUTUBE_API_KEY: process.env.EXPO_PUBLIC_YOUTUBE_API_KEY || '',

  // Discogs API
  DISCOGS_TOKEN: process.env.EXPO_PUBLIC_DISCOGS_TOKEN || '',

  // Google Cloud Vision API Key
  GOOGLE_VISION_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_VISION_API_KEY || '',


  // App
  APP_NAME: 'Bothside',
  APP_VERSION: '1.0.0',
  // Modo de test para notificaciones: si true, las notificaciones se programan rápidamente (ej. 30s/60s)
  NOTIFICATIONS_TEST_MODE: false,
};

// Función para validar que las variables de entorno estén configuradas
export const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DISCOGS_TOKEN',
    'GOOGLE_VISION_API_KEY',
    // NOTIFICATIONS_TEST_MODE no es crítico, no lo exigimos aquí
  ];

  const missingVars = requiredVars.filter(
    (varName) => !ENV[varName as keyof typeof ENV] || ENV[varName as keyof typeof ENV] === `TU_${varName}` || ENV[varName as keyof typeof ENV] === 'RELLENAR_AQUI'
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Variables de entorno faltantes: ${missingVars.join(', ')}\n` +
      'Por favor, configura estas variables en config/env.ts:\n' +
      '1. Ve a https://supabase.com y crea un proyecto\n' +
      '2. Ve a Settings > API y copia Project URL y anon key\n' +
      '3. Ve a https://www.discogs.com/settings/developers y crea una app\n' +
      '4. Activa Vision API y crea una API Key en Google Cloud\n' +
      '5. Reemplaza los valores en este archivo'
    );
    return false;
  }

  return true;
};



