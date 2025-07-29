const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase - REEMPLAZAR CON TUS CREDENCIALES
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtimeStatus() {
  console.log('🔍 Verificando estado de tiempo real...\n');

  try {
    // 1. Verificar si las replicaciones están habilitadas
    console.log('1. Verificando replicaciones...');
    
    const { data: publications, error: pubError } = await supabase
      .from('pg_publication_tables')
      .select('*')
      .eq('pubname', 'supabase_realtime');

    if (pubError) {
      console.error('❌ Error al verificar publicaciones:', pubError);
    } else {
      console.log('✅ Publicaciones encontradas:', publications.length);
      
      const userListsEnabled = publications.some(pub => pub.tablename === 'user_lists');
      const listAlbumsEnabled = publications.some(pub => pub.tablename === 'list_albums');
      
      console.log('📋 user_lists replicación:', userListsEnabled ? '✅ Habilitada' : '❌ Deshabilitada');
      console.log('📋 list_albums replicación:', listAlbumsEnabled ? '✅ Habilitada' : '❌ Deshabilitada');

      if (!userListsEnabled || !listAlbumsEnabled) {
        console.log('\n⚠️  Para habilitar las replicaciones, ejecuta este SQL en Supabase:');
        console.log(`
-- Habilitar replicaciones para tiempo real
ALTER PUBLICATION supabase_realtime ADD TABLE user_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_albums;
        `);
      }
    }

    // 2. Probar suscripción en tiempo real
    console.log('\n2. Probando suscripción en tiempo real...');
    
    const channel = supabase.channel('test_realtime_status');
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_lists'
      }, (payload) => {
        console.log('🔄 Cambio en tiempo real detectado:', payload);
      })
      .subscribe((status) => {
        console.log('🔌 Estado de suscripción:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción exitosa - El tiempo real está funcionando');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error en suscripción - El tiempo real no está funcionando');
        } else {
          console.log('⚠️ Estado de suscripción:', status);
        }
        
        // Desuscribir después de la prueba
        setTimeout(() => {
          channel.unsubscribe();
          console.log('🔌 Desuscripción completada');
        }, 3000);
      });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkRealtimeStatus(); 