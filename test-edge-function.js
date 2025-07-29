// Script para probar la Edge Function save-discogs-release
const SUPABASE_URL = 'https://your-project.supabase.co'; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = 'your-anon-key'; // Reemplaza con tu anon key

async function testEdgeFunction() {
  console.log('🔍 Probando Edge Function save-discogs-release...');
  
  try {
    // Datos de prueba
    const testData = {
      discogsReleaseId: 1, // Stockholm - The Persuader
      userId: 'test-user-id'
    };
    
    console.log('📤 Enviando datos a la Edge Function:', testData);
    
    // Llamar a la Edge Function
    const response = await fetch(`${SUPABASE_URL}/functions/v1/save-discogs-release`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Respuesta de la Edge Function:');
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    const responseText = await response.text();
    console.log('Response Body:', responseText);
    
    if (response.ok) {
      const result = JSON.parse(responseText);
      console.log('✅ Éxito:', result);
      
      if (result.albumId) {
        console.log('🎵 Álbum guardado con ID:', result.albumId);
        
        // Verificar si se guardaron las estadísticas
        console.log('\n🔍 Verificando estadísticas guardadas...');
        await checkAlbumStats(result.albumId);
      }
    } else {
      console.log('❌ Error en la Edge Function');
    }
    
  } catch (error) {
    console.error('❌ Error probando Edge Function:', error);
  }
}

async function checkAlbumStats(albumId) {
  try {
    // Verificar las estadísticas en la base de datos
    const statsResponse = await fetch(`${SUPABASE_URL}/rest/v1/album_stats?album_id=eq.${albumId}`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log('📊 Estadísticas guardadas:', stats);
      
      if (stats.length > 0) {
        const albumStats = stats[0];
        console.log('💰 Precios guardados:');
        console.log('  - low_price:', albumStats.low_price);
        console.log('  - high_price:', albumStats.high_price);
        console.log('  - avg_price:', albumStats.avg_price);
        console.log('  - have:', albumStats.have);
        console.log('  - want:', albumStats.want);
      } else {
        console.log('⚠️ No se encontraron estadísticas para este álbum');
      }
    } else {
      console.log('❌ Error verificando estadísticas:', statsResponse.status);
    }
  } catch (error) {
    console.error('❌ Error verificando estadísticas:', error);
  }
}

// Ejecutar la prueba
testEdgeFunction(); 