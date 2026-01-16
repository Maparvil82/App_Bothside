// Archivo de configuración de entorno
// Configuración real de la aplicación

export const ENV = {
  // Supabase - Obtén estos valores de tu proyecto en Supabase > Settings > API
  SUPABASE_URL: 'https://jbzafvoavdbcwfgoyrzl.supabase.co', // Reemplaza con tu Project URL
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiemFmdm9hdmRiY3dmZ295cnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MjAwNDcsImV4cCI6MjA1ODA5NjA0N30.NJbOMzab6whafcIRiMru6O7zyABwKkD6UL9_8ENOfqY', // Reemplaza con tu anon key

  // Google Gemini API Key
  GEMINI_API_KEY: 'AIzaSyDk91h3hzkEZNu7ESfV6rpKlwVFJcP_FbI',

  // YouTube Data API v3 - Obtén tu API key en https://console.cloud.google.com/apis/credentials
  YOUTUBE_API_KEY: 'AIzaSyBYRCnHzRbje2AX0c14d9TunkOTWidZfn0',

  // Discogs API - Configurado con las credenciales proporcionadas
  DISCOGS_TOKEN: 'EgtwXHcqDecFYsPbrDSxiCtRXVdrrlnNDABZdAfw',

  // Google Cloud Vision API Key
  GOOGLE_VISION_API_KEY: 'AIzaSyAMP6C2Ec9cYlYJp6ZK5I2evgnxNTlCGZs',


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



