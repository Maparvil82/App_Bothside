// Script para verificar gems en la base de datos
// Ejecutar con: node check-gems-in-database.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplazar con tus credenciales)
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkGemsInDatabase() {
  console.log('🔍 Verificando gems en la base de datos...\n');

  try {
    // 1. Verificar estructura de user_collection
    console.log('1️⃣ Verificando estructura de user_collection...');
    const { data: collectionData, error: collectionError } = await supabase
      .from('user_collection')
      .select('*')
      .limit(1);
    
    if (collectionError) {
      console.error('❌ Error accediendo a user_collection:', collectionError);
      return;
    }
    
    console.log('✅ user_collection accesible');
    console.log('📋 Columnas disponibles:', Object.keys(collectionData[0] || {}));
    console.log('');

    // 2. Verificar si hay registros con is_gem = true
    console.log('2️⃣ Buscando registros con is_gem = true...');
    const { data: gemsData, error: gemsError } = await supabase
      .from('user_collection')
      .select('*')
      .eq('is_gem', true);
    
    if (gemsError) {
      console.error('❌ Error buscando gems:', gemsError);
      return;
    }
    
    console.log('✅ Encontrados', gemsData.length, 'registros con is_gem = true');
    
    if (gemsData.length === 0) {
      console.log('⚠️ No hay gems en la base de datos');
      console.log('');
      
      // Verificar si hay registros sin gems
      console.log('3️⃣ Verificando registros sin gems...');
      const { data: nonGemsData, error: nonGemsError } = await supabase
        .from('user_collection')
        .select('*')
        .eq('is_gem', false)
        .limit(5);
      
      if (nonGemsError) {
        console.error('❌ Error buscando registros sin gems:', nonGemsError);
        return;
      }
      
      console.log('📋 Registros sin gems:', nonGemsData.length);
      if (nonGemsData.length > 0) {
        console.log('📋 Primer registro sin gem:', {
          id: nonGemsData[0].id,
          user_id: nonGemsData[0].user_id,
          album_id: nonGemsData[0].album_id,
          is_gem: nonGemsData[0].is_gem
        });
      }
    } else {
      console.log('📋 Primeros gems encontrados:');
      gemsData.slice(0, 3).forEach((gem, index) => {
        console.log(`  ${index + 1}. ID: ${gem.id}, User: ${gem.user_id}, Album: ${gem.album_id}, is_gem: ${gem.is_gem}`);
      });
    }
    console.log('');

    // 3. Verificar usuarios únicos con gems
    if (gemsData.length > 0) {
      console.log('4️⃣ Verificando usuarios únicos con gems...');
      const uniqueUsers = [...new Set(gemsData.map(gem => gem.user_id))];
      console.log('👥 Usuarios únicos con gems:', uniqueUsers.length);
      console.log('📋 IDs de usuarios:', uniqueUsers);
      console.log('');
      
      // Para cada usuario, mostrar sus gems
      for (const userId of uniqueUsers.slice(0, 3)) { // Solo los primeros 3 usuarios
        console.log(`5️⃣ Gems del usuario ${userId}:`);
        const userGems = gemsData.filter(gem => gem.user_id === userId);
        console.log(`   💎 ${userGems.length} gems encontrados`);
        
        userGems.slice(0, 3).forEach((gem, index) => {
          console.log(`   ${index + 1}. Album ID: ${gem.album_id}, is_gem: ${gem.is_gem}`);
        });
        console.log('');
      }
    }

    // 4. Verificar si hay registros con is_gem = null
    console.log('6️⃣ Verificando registros con is_gem = null...');
    const { data: nullGemsData, error: nullGemsError } = await supabase
      .from('user_collection')
      .select('*')
      .is('is_gem', null);
    
    if (nullGemsError) {
      console.error('❌ Error buscando registros con is_gem = null:', nullGemsError);
    } else {
      console.log('📋 Registros con is_gem = null:', nullGemsData.length);
      if (nullGemsData.length > 0) {
        console.log('⚠️ Hay registros con is_gem = null, esto puede causar problemas');
        console.log('📋 Primer registro con is_gem = null:', {
          id: nullGemsData[0].id,
          user_id: nullGemsData[0].user_id,
          album_id: nullGemsData[0].album_id,
          is_gem: nullGemsData[0].is_gem
        });
      }
    }
    console.log('');

    // 5. Resumen
    console.log('📊 Resumen:');
    console.log(`   • Total de registros con is_gem = true: ${gemsData.length}`);
    console.log(`   • Total de registros con is_gem = false: ${(await supabase.from('user_collection').select('*').eq('is_gem', false)).data?.length || 0}`);
    console.log(`   • Total de registros con is_gem = null: ${nullGemsData?.length || 0}`);
    
    if (gemsData.length === 0) {
      console.log('');
      console.log('💡 Posibles soluciones:');
      console.log('   1. Verificar que se han marcado álbumes como gems desde la app');
      console.log('   2. Verificar que la función toggleGemStatus está funcionando');
      console.log('   3. Verificar que no hay errores de RLS policies');
      console.log('   4. Verificar que el usuario está autenticado correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Función para verificar configuración
function checkConfiguration() {
  console.log('🔧 Verificando configuración...');
  
  if (!supabaseUrl || supabaseUrl === 'TU_SUPABASE_URL') {
    console.error('❌ Error: Debes configurar TU_SUPABASE_URL');
    console.log('💡 Edita el archivo y reemplaza TU_SUPABASE_URL con tu URL real');
    return false;
  }
  
  if (!supabaseKey || supabaseKey === 'TU_SUPABASE_SERVICE_ROLE_KEY') {
    console.error('❌ Error: Debes configurar TU_SUPABASE_SERVICE_ROLE_KEY');
    console.log('💡 Edita el archivo y reemplaza TU_SUPABASE_SERVICE_ROLE_KEY con tu key real');
    return false;
  }
  
  console.log('✅ Configuración correcta');
  return true;
}

// Ejecutar verificación
if (checkConfiguration()) {
  checkGemsInDatabase();
} else {
  console.log('');
  console.log('📝 Instrucciones:');
  console.log('1. Reemplaza TU_SUPABASE_URL con tu URL de Supabase');
  console.log('2. Reemplaza TU_SUPABASE_SERVICE_ROLE_KEY con tu Service Role Key');
  console.log('3. Ejecuta: node check-gems-in-database.js');
} 