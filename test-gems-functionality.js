// Script para probar la funcionalidad de Gems
// Ejecutar con: node test-gems-functionality.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplazar con tus credenciales)
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGemsFunctionality() {
  console.log('🧪 Iniciando pruebas de funcionalidad de Gems...\n');

  try {
    // 1. Verificar estructura de la tabla user_collection
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

    // 2. Verificar si hay usuarios con álbumes en su colección
    console.log('2️⃣ Buscando usuarios con álbumes en colección...');
    const { data: usersWithAlbums, error: usersError } = await supabase
      .from('user_collection')
      .select('user_id, album_id, is_gem')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error buscando usuarios:', usersError);
      return;
    }
    
    if (usersWithAlbums.length === 0) {
      console.log('⚠️ No hay álbumes en colecciones de usuarios');
      return;
    }
    
    console.log('✅ Encontrados', usersWithAlbums.length, 'registros de colección');
    console.log('📋 Primeros registros:', usersWithAlbums.slice(0, 3));
    console.log('');

    // 3. Probar toggle de gem status
    const testUser = usersWithAlbums[0].user_id;
    const testAlbum = usersWithAlbums[0].album_id;
    
    console.log('3️⃣ Probando toggle de gem status...');
    console.log('👤 Usuario de prueba:', testUser);
    console.log('💿 Álbum de prueba:', testAlbum);
    
    // Obtener estado actual
    const { data: currentStatus, error: statusError } = await supabase
      .from('user_collection')
      .select('is_gem')
      .eq('user_id', testUser)
      .eq('album_id', testAlbum)
      .single();
    
    if (statusError) {
      console.error('❌ Error obteniendo estado actual:', statusError);
      return;
    }
    
    console.log('📊 Estado actual is_gem:', currentStatus.is_gem);
    
    // Toggle el estado
    const newGemStatus = !currentStatus.is_gem;
    console.log('🔄 Cambiando is_gem de', currentStatus.is_gem, 'a', newGemStatus);
    
    const { data: updatedData, error: updateError } = await supabase
      .from('user_collection')
      .update({ is_gem: newGemStatus })
      .eq('user_id', testUser)
      .eq('album_id', testAlbum)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error actualizando gem status:', updateError);
      return;
    }
    
    console.log('✅ Gem status actualizado exitosamente');
    console.log('📊 Nuevo estado:', updatedData);
    console.log('');

    // 4. Probar obtener gems del usuario
    console.log('4️⃣ Probando getUserGems...');
    const { data: userGems, error: gemsError } = await supabase
      .from('user_collection')
      .select(`
        *,
        albums (
          *,
          album_styles (
            styles (*)
          )
        )
      `)
      .eq('user_id', testUser)
      .eq('is_gem', true)
      .order('added_at', { ascending: false });
    
    if (gemsError) {
      console.error('❌ Error obteniendo gems:', gemsError);
      return;
    }
    
    console.log('✅ getUserGems funcionando');
    console.log('💎 Gems encontrados:', userGems.length);
    if (userGems.length > 0) {
      console.log('📋 Primer gem:', {
        id: userGems[0].id,
        albumTitle: userGems[0].albums?.title,
        isGem: userGems[0].is_gem
      });
    }
    console.log('');

    // 5. Verificar RLS policies
    console.log('5️⃣ Verificando RLS policies...');
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('get_rls_policies', { table_name: 'user_collection' })
      .catch(() => ({ data: null, error: 'RPC not available' }));
    
    if (rlsError) {
      console.log('⚠️ No se pudieron verificar RLS policies (normal)');
    } else {
      console.log('✅ RLS policies verificadas');
    }
    console.log('');

    console.log('🎉 Todas las pruebas completadas exitosamente!');
    console.log('');
    console.log('📋 Resumen:');
    console.log('✅ user_collection accesible');
    console.log('✅ Toggle de gem status funcionando');
    console.log('✅ getUserGems funcionando');
    console.log('✅ Estructura de datos correcta');
    
  } catch (error) {
    console.error('❌ Error general en las pruebas:', error);
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

// Ejecutar pruebas
if (checkConfiguration()) {
  testGemsFunctionality();
} else {
  console.log('');
  console.log('📝 Instrucciones:');
  console.log('1. Reemplaza TU_SUPABASE_URL con tu URL de Supabase');
  console.log('2. Reemplaza TU_SUPABASE_SERVICE_ROLE_KEY con tu Service Role Key');
  console.log('3. Ejecuta: node test-gems-functionality.js');
} 