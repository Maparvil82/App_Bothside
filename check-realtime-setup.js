const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRealtimeSetup() {
  console.log('🔍 Verificando configuración de tiempo real...\n');

  try {
    // Verificar si las replicaciones están habilitadas
    console.log('1. Verificando replicaciones...');
    
    const { data: publications, error: pubError } = await supabase
      .from('pg_publication_tables')
      .select('*')
      .eq('pubname', 'supabase_realtime');

    if (pubError) {
      console.error('❌ Error al verificar publicaciones:', pubError);
      return;
    }

    console.log('✅ Publicaciones encontradas:', publications.length);
    
    const userListsEnabled = publications.some(pub => pub.tablename === 'user_lists');
    const listAlbumsEnabled = publications.some(pub => pub.tablename === 'list_albums');

    console.log('📋 user_lists replicación:', userListsEnabled ? '✅ Habilitada' : '❌ Deshabilitada');
    console.log('📋 list_albums replicación:', listAlbumsEnabled ? '✅ Habilitada' : '❌ Deshabilitada');

    if (!userListsEnabled || !listAlbumsEnabled) {
      console.log('\n⚠️  Para habilitar las replicaciones, ejecuta este SQL en Supabase:');
      console.log(`
ALTER PUBLICATION supabase_realtime ADD TABLE user_lists;
ALTER PUBLICATION supabase_realtime ADD TABLE list_albums;
      `);
    }

    // Verificar RLS policies
    console.log('\n2. Verificando RLS policies...');
    
    const { data: policies, error: polError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['user_lists', 'list_albums']);

    if (polError) {
      console.error('❌ Error al verificar policies:', polError);
      return;
    }

    console.log('✅ Policies encontradas:', policies.length);
    policies.forEach(policy => {
      console.log(`   - ${policy.tablename}: ${policy.policyname}`);
    });

    // Verificar suscripción de prueba
    console.log('\n3. Probando suscripción...');
    
    const channel = supabase.channel('test_realtime');
    
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_lists'
      }, (payload) => {
        console.log('✅ Suscripción funcionando:', payload);
      })
      .subscribe((status) => {
        console.log('🔌 Estado de suscripción:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Suscripción exitosa');
          // Desuscribir después de la prueba
          setTimeout(() => {
            channel.unsubscribe();
            console.log('🔌 Desuscripción completada');
          }, 2000);
        } else {
          console.log('❌ Error en suscripción');
        }
      });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar verificación
checkRealtimeSetup(); 