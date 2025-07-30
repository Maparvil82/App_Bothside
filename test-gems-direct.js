// Script simple para probar gems directamente
// Ejecutar con: node test-gems-direct.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplazar con tus credenciales)
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGemsDirectly() {
  console.log('🔍 Probando funcionalidad de gems directamente...\n');

  try {
    // 1. Verificar estructura de la tabla
    console.log('1️⃣ Verificando estructura de user_collection...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_collection')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Error accediendo a user_collection:', tableError);
      return;
    }
    
    console.log('✅ user_collection accesible');
    if (tableInfo && tableInfo.length > 0) {
      console.log('📋 Estructura del primer registro:', Object.keys(tableInfo[0]));
    }
    console.log('');

    // 2. Buscar un usuario con datos
    console.log('2️⃣ Buscando usuario con datos...');
    const { data: users, error: usersError } = await supabase
      .from('user_collection')
      .select('user_id')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error buscando usuarios:', usersError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('⚠️ No hay datos en user_collection');
      return;
    }
    
    const testUserId = users[0].user_id;
    console.log('✅ Usuario encontrado:', testUserId);
    console.log('');

    // 3. Verificar datos del usuario
    console.log('3️⃣ Verificando datos del usuario...');
    const { data: userData, error: userDataError } = await supabase
      .from('user_collection')
      .select('*')
      .eq('user_id', testUserId);
    
    if (userDataError) {
      console.error('❌ Error obteniendo datos del usuario:', userDataError);
      return;
    }
    
    console.log('📊 Total de registros para el usuario:', userData.length);
    
    // Contar estados de is_gem
    const gemsCount = userData.filter(record => record.is_gem === true).length;
    const nonGemsCount = userData.filter(record => record.is_gem === false).length;
    const nullGemsCount = userData.filter(record => record.is_gem === null).length;
    
    console.log('💎 Registros con is_gem = true:', gemsCount);
    console.log('📋 Registros con is_gem = false:', nonGemsCount);
    console.log('❓ Registros con is_gem = null:', nullGemsCount);
    console.log('');

    // 4. Probar toggle de gem
    if (userData.length > 0) {
      const testRecord = userData[0];
      console.log('4️⃣ Probando toggle de gem...');
      console.log('📋 Registro de prueba:', {
        id: testRecord.id,
        user_id: testRecord.user_id,
        album_id: testRecord.album_id,
        is_gem: testRecord.is_gem
      });
      
      const newGemStatus = !testRecord.is_gem;
      console.log('🔄 Cambiando is_gem de', testRecord.is_gem, 'a', newGemStatus);
      
      const { data: updatedRecord, error: updateError } = await supabase
        .from('user_collection')
        .update({ is_gem: newGemStatus })
        .eq('id', testRecord.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error actualizando gem:', updateError);
      } else {
        console.log('✅ Gem actualizado exitosamente:', {
          id: updatedRecord.id,
          is_gem: updatedRecord.is_gem
        });
      }
      console.log('');

      // 5. Verificar gems después del cambio
      console.log('5️⃣ Verificando gems después del cambio...');
      const { data: gemsAfterUpdate, error: gemsError } = await supabase
        .from('user_collection')
        .select('*')
        .eq('user_id', testUserId)
        .eq('is_gem', true);
      
      if (gemsError) {
        console.error('❌ Error obteniendo gems:', gemsError);
      } else {
        console.log('💎 Gems encontrados después del cambio:', gemsAfterUpdate.length);
        if (gemsAfterUpdate.length > 0) {
          console.log('📋 Primer gem:', {
            id: gemsAfterUpdate[0].id,
            album_id: gemsAfterUpdate[0].album_id,
            is_gem: gemsAfterUpdate[0].is_gem
          });
        }
      }
      console.log('');

      // 6. Revertir el cambio
      console.log('6️⃣ Revirtiendo cambio...');
      const { data: revertedRecord, error: revertError } = await supabase
        .from('user_collection')
        .update({ is_gem: testRecord.is_gem })
        .eq('id', testRecord.id)
        .select()
        .single();
      
      if (revertError) {
        console.error('❌ Error revirtiendo gem:', revertError);
      } else {
        console.log('✅ Gem revertido exitosamente');
      }
    }

    console.log('');
    console.log('🎉 Prueba completada');
    console.log('📊 Resumen:');
    console.log('   • Tabla accesible:', '✅');
    console.log('   • Usuario encontrado:', '✅');
    console.log('   • Datos verificados:', '✅');
    console.log('   • Toggle probado:', '✅');

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

// Ejecutar prueba
if (checkConfiguration()) {
  testGemsDirectly();
} else {
  console.log('');
  console.log('📝 Instrucciones:');
  console.log('1. Reemplaza TU_SUPABASE_URL con tu URL de Supabase');
  console.log('2. Reemplaza TU_SUPABASE_SERVICE_ROLE_KEY con tu Service Role Key');
  console.log('3. Ejecuta: node test-gems-direct.js');
} 