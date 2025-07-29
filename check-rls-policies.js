const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS...\n');

  try {
    // Verificar políticas de user_lists
    console.log('📋 Tabla user_lists:');
    const { data: userListsPolicies, error: userListsError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_name', 'user_lists');

    if (userListsError) {
      console.error('Error getting user_lists policies:', userListsError);
    } else {
      console.log('Políticas encontradas:', userListsPolicies.length);
      userListsPolicies.forEach(policy => {
        console.log(`- ${policy.policy_name}: ${policy.definition}`);
      });
    }

    // Verificar políticas de list_albums
    console.log('\n📋 Tabla list_albums:');
    const { data: listAlbumsPolicies, error: listAlbumsError } = await supabase
      .from('information_schema.policies')
      .select('*')
      .eq('table_name', 'list_albums');

    if (listAlbumsError) {
      console.error('Error getting list_albums policies:', listAlbumsError);
    } else {
      console.log('Políticas encontradas:', listAlbumsPolicies.length);
      listAlbumsPolicies.forEach(policy => {
        console.log(`- ${policy.policy_name}: ${policy.definition}`);
      });
    }

    // Verificar estructura de las tablas
    console.log('\n🏗️ Estructura de tablas:');
    
    const { data: userListsColumns, error: userListsColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'user_lists')
      .order('ordinal_position');

    if (userListsColumnsError) {
      console.error('Error getting user_lists columns:', userListsColumnsError);
    } else {
      console.log('user_lists columns:');
      userListsColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    const { data: listAlbumsColumns, error: listAlbumsColumnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'list_albums')
      .order('ordinal_position');

    if (listAlbumsColumnsError) {
      console.error('Error getting list_albums columns:', listAlbumsColumnsError);
    } else {
      console.log('\nlist_albums columns:');
      listAlbumsColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

  } catch (error) {
    console.error('Error general:', error);
  }
}

checkRLSPolicies(); 