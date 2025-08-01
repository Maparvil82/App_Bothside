const { createClient } = require('@supabase/supabase-js');

// Configuración desde config/env.ts
const ENV = {
  SUPABASE_URL: 'https://jbzafvoavdbcwfgoyrzl.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiemFmdm9hdmRiY3dmZ295cnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MjAwNDcsImV4cCI6MjA1ODA5NjA0N30.NJbOMzab6whafcIRiMru6O7zyABwKkD6UL9_8ENOfqY',
};

const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);

async function testRealData() {
  try {
    console.log('🔍 Verificando datos reales...');
    
    // 1. Verificar user_collection sin filtro de usuario
    const { data: allUserCollection, error: collectionError } = await supabase
      .from('user_collection')
      .select(`
        *,
        albums (
          id,
          title,
          artist
        )
      `)
      .limit(5);
    
    if (collectionError) {
      console.error('❌ Error al obtener user_collection:', collectionError);
    } else {
      console.log('📊 User_collection encontrados:', allUserCollection?.length || 0);
      if (allUserCollection && allUserCollection.length > 0) {
        console.log('📄 Datos de user_collection:');
        allUserCollection.forEach((item, index) => {
          console.log(`  ${index + 1}. User ID: ${item.user_id}, Album: ${item.albums?.title || 'N/A'}`);
        });
      }
    }
    
    // 2. Verificar list_items sin filtro
    const { data: allListItems, error: listItemsError } = await supabase
      .from('list_items')
      .select(`
        *,
        user_lists (
          id,
          title,
          user_id
        )
      `)
      .limit(10);
    
    if (listItemsError) {
      console.error('❌ Error al obtener list_items:', listItemsError);
    } else {
      console.log('📋 List_items encontrados:', allListItems?.length || 0);
      if (allListItems && allListItems.length > 0) {
        console.log('📄 Datos de list_items:');
        allListItems.forEach((item, index) => {
          console.log(`  ${index + 1}. List ID: ${item.list_id}, Album ID: ${item.album_id}, User ID: ${item.user_lists?.user_id}`);
        });
      }
    }
    
    // 3. Verificar user_lists sin filtro
    const { data: allUserLists, error: userListsError } = await supabase
      .from('user_lists')
      .select('*')
      .limit(5);
    
    if (userListsError) {
      console.error('❌ Error al obtener user_lists:', userListsError);
    } else {
      console.log('📚 User_lists encontrados:', allUserLists?.length || 0);
      if (allUserLists && allUserLists.length > 0) {
        console.log('📄 Datos de user_lists:');
        allUserLists.forEach((list, index) => {
          console.log(`  ${index + 1}. ID: ${list.id}, Title: ${list.title}, User ID: ${list.user_id}`);
        });
      }
    }
    
    console.log('\n📊 RESUMEN:');
    console.log(`- User_collection: ${allUserCollection?.length || 0}`);
    console.log(`- List_items: ${allListItems?.length || 0}`);
    console.log(`- User_lists: ${allUserLists?.length || 0}`);
    
    // 4. Si hay datos, probar la consulta específica
    if (allUserCollection && allUserCollection.length > 0 && allListItems && allListItems.length > 0) {
      console.log('\n🔍 Probando consulta específica...');
      
      for (const collectionItem of allUserCollection) {
        const listItemsForAlbum = allListItems.filter(item => 
          item.album_id === collectionItem.album_id && 
          item.user_lists?.user_id === collectionItem.user_id
        );
        
        if (listItemsForAlbum.length > 0) {
          console.log(`✅ Álbum "${collectionItem.albums?.title}" está en ${listItemsForAlbum.length} estantería(s) del usuario ${collectionItem.user_id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

testRealData(); 