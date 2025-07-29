const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugLists() {
  console.log('🔍 Debugging Lists System...\n');

  try {
    // 1. Verificar estructura de tablas
    console.log('1. Verificando estructura de tablas...');
    
    const { data: userListsStructure, error: userListsError } = await supabase
      .from('user_lists')
      .select('*')
      .limit(1);
    
    if (userListsError) {
      console.error('❌ Error con user_lists:', userListsError);
    } else {
      console.log('✅ user_lists table accessible');
    }

    const { data: listAlbumsStructure, error: listAlbumsError } = await supabase
      .from('list_albums')
      .select('*')
      .limit(1);
    
    if (listAlbumsError) {
      console.error('❌ Error con list_albums:', listAlbumsError);
    } else {
      console.log('✅ list_albums table accessible');
    }

    // 2. Verificar RLS policies
    console.log('\n2. Verificando RLS policies...');
    
    const { data: policies, error: policiesError } = await supabase
      .from('pg_policies')
      .select('*')
      .in('tablename', ['user_lists', 'list_albums']);

    if (policiesError) {
      console.error('❌ Error al verificar policies:', policiesError);
    } else {
      console.log('✅ Policies encontradas:', policies.length);
      policies.forEach(policy => {
        console.log(`   - ${policy.tablename}: ${policy.policyname} (${policy.cmd})`);
      });
    }

    // 3. Verificar replicaciones
    console.log('\n3. Verificando replicaciones...');
    
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
    }

    // 4. Probar operaciones CRUD
    console.log('\n4. Probando operaciones CRUD...');
    
    // Crear lista de prueba
    const testList = {
      title: 'Lista de Prueba Debug',
      description: 'Esta es una lista de prueba para debugging',
      is_public: false,
      user_id: 'TU_USER_ID' // Reemplazar con un user_id real
    };

    console.log('📝 Creando lista de prueba...');
    const { data: createdList, error: createError } = await supabase
      .from('user_lists')
      .insert([testList])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creando lista:', createError);
    } else {
      console.log('✅ Lista creada:', createdList);

      // Leer la lista
      console.log('📖 Leyendo lista...');
      const { data: readList, error: readError } = await supabase
        .from('user_lists')
        .select('*')
        .eq('id', createdList.id)
        .single();

      if (readError) {
        console.error('❌ Error leyendo lista:', readError);
      } else {
        console.log('✅ Lista leída:', readList);

        // Eliminar la lista
        console.log('🗑️ Eliminando lista...');
        const { error: deleteError } = await supabase
          .from('user_lists')
          .delete()
          .eq('id', createdList.id);

        if (deleteError) {
          console.error('❌ Error eliminando lista:', deleteError);
        } else {
          console.log('✅ Lista eliminada correctamente');
        }
      }
    }

    // 5. Verificar suscripción en tiempo real
    console.log('\n5. Probando suscripción en tiempo real...');
    
    const channel = supabase.channel('debug_test');
    
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
          console.log('✅ Suscripción exitosa');
          // Desuscribir después de la prueba
          setTimeout(() => {
            channel.unsubscribe();
            console.log('🔌 Desuscripción completada');
          }, 3000);
        } else {
          console.log('❌ Error en suscripción');
        }
      });

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar debug
debugLists(); 