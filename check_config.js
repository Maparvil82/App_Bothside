const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Verificando configuración de Supabase...');

// Configuración manual - Reemplaza estos valores con los de tu proyecto
const ENV = {
  SUPABASE_URL: 'https://your-project-url.supabase.co', // Reemplaza con tu Project URL
  SUPABASE_ANON_KEY: 'your-anon-key-here', // Reemplaza con tu anon key
  DISCOGS_TOKEN: 'your-discogs-token-here', // Reemplaza con tu token
};

console.log('📋 Variables de entorno:');
console.log('  SUPABASE_URL:', ENV.SUPABASE_URL);
console.log('  SUPABASE_ANON_KEY:', ENV.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ No configurado');
console.log('  DISCOGS_TOKEN:', ENV.DISCOGS_TOKEN ? '✅ Configurado' : '❌ No configurado');

// Verificar si las variables están configuradas correctamente
const isConfigured = ENV.SUPABASE_URL && 
                    ENV.SUPABASE_URL !== 'https://your-project-url.supabase.co' &&
                    ENV.SUPABASE_ANON_KEY && 
                    ENV.SUPABASE_ANON_KEY !== 'your-anon-key-here';

if (!isConfigured) {
  console.error('\n❌ CONFIGURACIÓN INCOMPLETA');
  console.error('Por favor, configura las variables de entorno en config/env.ts:');
  console.error('1. Ve a tu proyecto en Supabase > Settings > API');
  console.error('2. Copia Project URL y anon key');
  console.error('3. Reemplaza los valores en config/env.ts');
  console.error('\n📝 Pasos para configurar:');
  console.error('1. Ve a https://supabase.com');
  console.error('2. Crea un proyecto o usa uno existente');
  console.error('3. Ve a Settings > API');
  console.error('4. Copia Project URL y anon key');
  console.error('5. Edita config/env.ts y reemplaza los valores');
  process.exit(1);
}

// Intentar conectar con Supabase
async function testConnection() {
  try {
    console.log('\n🔌 Probando conexión con Supabase...');
    
    const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);
    
    // Probar una consulta simple
    const { data, error } = await supabase
      .from('albums')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Error de conexión:', error);
      return false;
    }
    
    console.log('✅ Conexión exitosa con Supabase');
    return true;
  } catch (error) {
    console.error('❌ Error de red:', error);
    return false;
  }
}

testConnection().then(success => {
  if (success) {
    console.log('\n🎉 Configuración correcta! Puedes iniciar la app.');
  } else {
    console.log('\n❌ Problemas de conexión. Verifica:');
    console.log('1. Tu conexión a internet');
    console.log('2. Las credenciales de Supabase');
    console.log('3. Que el proyecto esté activo');
  }
}); 