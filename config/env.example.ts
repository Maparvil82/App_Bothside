// Archivo de ejemplo para config/env.ts
// Copia este archivo como config/env.ts y reemplaza los valores

export const ENV = {
  // Supabase - Obtén estos valores de tu proyecto en Supabase > Settings > API
  SUPABASE_URL: 'https://tu-proyecto.supabase.co', // Reemplaza con tu Project URL
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // Reemplaza con tu anon key
  
  // Discogs API - Obtén tu token en https://www.discogs.com/settings/developers
  DISCOGS_TOKEN: 'tu-token-de-discogs-aqui', // Reemplaza con tu token
  
  // App
  APP_NAME: 'Bothside',
  APP_VERSION: '1.0.0',
};

// Función para validar que las variables de entorno estén configuradas
export const validateEnv = () => {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'DISCOGS_TOKEN',
  ];

  const missingVars = requiredVars.filter(
    (varName) => !ENV[varName as keyof typeof ENV] || ENV[varName as keyof typeof ENV] === `TU_${varName}`
  );

  if (missingVars.length > 0) {
    console.warn(
      `⚠️  Variables de entorno faltantes: ${missingVars.join(', ')}\n` +
      'Por favor, configura estas variables en config/env.ts:\n' +
      '1. Ve a https://supabase.com y crea un proyecto\n' +
      '2. Ve a Settings > API y copia Project URL y anon key\n' +
      '3. Ve a https://www.discogs.com/settings/developers y crea una app\n' +
      '4. Reemplaza los valores en este archivo'
    );
    return false;
  }

  return true;
}; 