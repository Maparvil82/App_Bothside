const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_ANON_KEY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreateList() {
  console.log('🧪 Probando creación de lista...\n');

  try {
    // Datos de prueba
    const testList = {
      title: 'Lista de Prueba',
      description: 'Esta es una lista de prueba',
      is_public: false,
      user_id: 'TU_USER_ID' // Reemplaza con un user_id válido
    };

    console.log('📝 Datos de la lista:', testList);

    // Intentar crear la lista
    const { data, error } = await supabase
      .from('user_lists')
      .insert([testList])
      .select()
      .single();

    if (error) {
      console.error('❌ Error al crear lista:', error);
      console.log('Código de error:', error.code);
      console.log('Mensaje:', error.message);
      console.log('Detalles:', error.details);
    } else {
      console.log('✅ Lista creada exitosamente:', data);
    }

    // Intentar obtener las listas del usuario
    console.log('\n📋 Obteniendo listas del usuario...');
    const { data: lists, error: listsError } = await supabase
      .from('user_lists')
      .select('*')
      .eq('user_id', testList.user_id);

    if (listsError) {
      console.error('❌ Error al obtener listas:', listsError);
    } else {
      console.log('✅ Listas encontradas:', lists.length);
      lists.forEach(list => {
        console.log(`- ${list.title} (${list.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testCreateList(); 