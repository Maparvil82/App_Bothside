// Script para verificar el estado del tiempo real para gems
// Ejecutar con: node check-realtime-status-gems.js

const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase (reemplazar con tus credenciales)
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_SERVICE_ROLE_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtimeStatusForGems() {
  console.log('🔍 Verificando estado del tiempo real para gems...\n');

  try {
    // 1. Verificar que podemos acceder a la tabla
    console.log('1️⃣ Verificando acceso a user_collection...');
    const { data: testData, error: testError } = await supabase
      .from('user_collection')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error accediendo a user_collection:', testError);
      return;
    }
    
    console.log('✅ user_collection accesible');
    console.log('');

    // 2. Verificar si hay datos de gems
    console.log('2️⃣ Verificando datos de gems...');
    const { data: gemsData, error: gemsError } = await supabase
      .from('user_collection')
      .select('*')
      .eq('is_gem', true)
      .limit(5);
    
    if (gemsError) {
      console.error('❌ Error buscando gems:', gemsError);
      return;
    }
    
    console.log('📊 Gems encontrados:', gemsData.length);
    if (gemsData.length > 0) {
      console.log('📋 Primer gem:', {
        id: gemsData[0].id,
        user_id: gemsData[0].user_id,
        album_id: gemsData[0].album_id,
        is_gem: gemsData[0].is_gem
      });
    }
    console.log('');

    // 3. Probar suscripción en tiempo real
    console.log('3️⃣ Probando suscripción en tiempo real...');
    
    const channel = supabase
      .channel('test_gems_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_collection'
        },
        (payload) => {
          console.log('🔔 Evento de tiempo real recibido:', {
            eventType: payload.eventType,
            table: payload.table,
            old: payload.old,
            new: payload.new
          });
        }
      )
      .subscribe((status) => {
        console.log('📡 Estado de suscripción:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción exitosa');
          
          // Simular un cambio para probar
          setTimeout(async () => {
            console.log('🧪 Simulando cambio en tiempo real...');
            
            // Buscar un registro existente para actualizar
            const { data: existingRecord } = await supabase
              .from('user_collection')
              .select('*')
              .limit(1)
              .single();
            
            if (existingRecord) {
              console.log('📝 Actualizando registro existente:', existingRecord.id);
              
              const { data: updateData, error: updateError } = await supabase
                .from('user_collection')
                .update({ is_gem: !existingRecord.is_gem })
                .eq('id', existingRecord.id)
                .select()
                .single();
              
              if (updateError) {
                console.error('❌ Error actualizando registro:', updateError);
              } else {
                console.log('✅ Registro actualizado:', updateData);
              }
            }
          }, 3000);
          
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en el canal de tiempo real');
        } else {
          console.log('⚠️ Estado desconocido:', status);
        }
      });

    // Esperar un poco para ver los eventos
    setTimeout(() => {
      console.log('');
      console.log('⏰ Tiempo de espera completado');
      console.log('📊 Resumen de la prueba:');
      console.log('   • Tabla accesible:', '✅');
      console.log('   • Datos de gems:', gemsData.length > 0 ? '✅' : '⚠️');
      console.log('   • Tiempo real:', '🔄 Probando...');
      
      // Limpiar suscripción
      channel.unsubscribe();
      console.log('🔌 Suscripción limpiada');
      
    }, 10000);

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
  checkRealtimeStatusForGems();
} else {
  console.log('');
  console.log('📝 Instrucciones:');
  console.log('1. Reemplaza TU_SUPABASE_URL con tu URL de Supabase');
  console.log('2. Reemplaza TU_SUPABASE_SERVICE_ROLE_KEY con tu Service Role Key');
  console.log('3. Ejecuta: node check-realtime-status-gems.js');
} 