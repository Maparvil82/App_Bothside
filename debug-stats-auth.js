// Script de debug con autenticación para verificar el proceso de guardado de estadísticas
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://jbzafvoavdbcwfgoyrzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiemFmdm9hdmRiY3dmZ295cnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI1MjAwNDcsImV4cCI6MjA1ODA5NjA0N30.NJbOMzab6whafcIRiMru6O7zyABwKkD6UL9_8ENOfqY';

const DISCOGS_TOKEN = 'EgtwXHcqDecFYsPbrDSxiCtRXVdrrlnNDABZdAfw';
const DISCOGS_API_URL = 'https://api.discogs.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class DiscogsService {
  static async makeRequest(endpoint) {
    try {
      const response = await fetch(`${DISCOGS_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
          'User-Agent': 'BothsideApp/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making Discogs request:', error);
      throw error;
    }
  }

  static async getRelease(id) {
    const endpoint = `/releases/${id}`;
    return this.makeRequest(endpoint);
  }

  static async getReleaseMarketplaceStats(releaseId) {
    const endpoint = `/marketplace/price_suggestions/${releaseId}`;
    return this.makeRequest(endpoint);
  }

  static async getReleaseStats(releaseId) {
    try {
      // Obtener el release completo que incluye algunos datos de marketplace
      const releaseData = await this.getRelease(releaseId);
      
      // Obtener sugerencias de precios por condición
      const priceSuggestions = await this.getReleaseMarketplaceStats(releaseId);
      
      // Combinar los datos
      const stats = {
        lowest_price: releaseData.lowest_price,
        highest_price: releaseData.highest_price,
        avg_price: releaseData.avg_price,
        have: releaseData.have,
        want: releaseData.want,
        last_sold_date: releaseData.last_sold_date,
        price_suggestions: priceSuggestions
      };
      
      // Calcular precio medio si no está disponible
      if (!stats.avg_price && priceSuggestions) {
        const prices = Object.values(priceSuggestions).map((suggestion) => suggestion.value);
        if (prices.length > 0) {
          stats.avg_price = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting release stats:', error);
      throw error;
    }
  }
}

async function debugStatsWithAuth() {
  console.log('🔍 Debug: Verificando proceso de estadísticas con autenticación...');
  
  try {
    // Paso 1: Autenticarse (necesitamos un usuario real)
    console.log('\n📊 Paso 1: Verificando autenticación...');
    
    // Primero, vamos a verificar si podemos acceder a la tabla sin autenticación
    console.log('📊 Probando acceso sin autenticación...');
    const { data: testData, error: testError } = await supabase
      .from('album_stats')
      .select('count')
      .limit(1);
    
    if (testError) {
      console.log('❌ Error sin autenticación:', testError.message);
    } else {
      console.log('✅ Acceso sin autenticación exitoso');
    }
    
    // Paso 2: Obtener un álbum con discogs_id
    console.log('\n📊 Paso 2: Obteniendo álbum con discogs_id...');
    const { data: albums, error: albumsError } = await supabase
      .from('albums')
      .select('id, title, discogs_id')
      .not('discogs_id', 'is', null)
      .limit(1);
    
    if (albumsError) {
      console.error('❌ Error obteniendo álbumes:', albumsError);
      return;
    }
    
    if (!albums || albums.length === 0) {
      console.log('⚠️ No hay álbumes con discogs_id');
      return;
    }
    
    const album = albums[0];
    console.log(`✅ Álbum encontrado: ${album.title} (ID: ${album.id}, Discogs ID: ${album.discogs_id})`);
    
    // Paso 3: Verificar políticas RLS
    console.log('\n📊 Paso 3: Verificando políticas RLS...');
    
    // Intentar leer estadísticas existentes
    const { data: existingStats, error: statsError } = await supabase
      .from('album_stats')
      .select('*')
      .eq('album_id', album.id);
    
    if (statsError) {
      console.log('❌ Error leyendo estadísticas (RLS):', statsError.message);
    } else {
      console.log(`📊 Estadísticas existentes: ${existingStats ? existingStats.length : 0}`);
    }
    
    // Paso 4: Obtener estadísticas de Discogs
    console.log('\n📊 Paso 4: Obteniendo estadísticas de Discogs...');
    const discogsStats = await DiscogsService.getReleaseStats(album.discogs_id);
    console.log('✅ Estadísticas de Discogs obtenidas:', JSON.stringify(discogsStats, null, 2));
    
    // Paso 5: Preparar datos para inserción
    console.log('\n📊 Paso 5: Preparando datos para inserción...');
    const statsData = {
      album_id: album.id,
      low_price: discogsStats.lowest_price,
      high_price: discogsStats.highest_price,
      avg_price: discogsStats.avg_price,
      have: discogsStats.have,
      want: discogsStats.want,
      last_sold: discogsStats.last_sold_date
    };
    
    console.log('📊 Datos preparados:', JSON.stringify(statsData, null, 2));
    
    // Paso 6: Intentar insertar con diferentes enfoques
    console.log('\n📊 Paso 6: Intentando diferentes enfoques de inserción...');
    
    // Enfoque 1: Insertar directamente
    console.log('📊 Enfoque 1: Inserción directa...');
    const { data: insertData1, error: insertError1 } = await supabase
      .from('album_stats')
      .insert([statsData])
      .select()
      .single();
    
    if (insertError1) {
      console.log('❌ Error inserción directa:', insertError1.message);
    } else {
      console.log('✅ Inserción directa exitosa:', insertData1);
    }
    
    // Enfoque 2: Usar upsert
    console.log('📊 Enfoque 2: Usando upsert...');
    const { data: upsertData, error: upsertError } = await supabase
      .from('album_stats')
      .upsert([statsData], { onConflict: 'album_id' })
      .select()
      .single();
    
    if (upsertError) {
      console.log('❌ Error upsert:', upsertError.message);
    } else {
      console.log('✅ Upsert exitoso:', upsertData);
    }
    
    // Enfoque 3: Verificar si existe y actualizar/insertar
    console.log('📊 Enfoque 3: Verificar y actualizar/insertar...');
    const { data: checkData, error: checkError } = await supabase
      .from('album_stats')
      .select('album_id')
      .eq('album_id', album.id)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // No existe, insertar
      console.log('📊 No existe, insertando...');
      const { data: insertData3, error: insertError3 } = await supabase
        .from('album_stats')
        .insert([statsData])
        .select()
        .single();
      
      if (insertError3) {
        console.log('❌ Error insertando:', insertError3.message);
      } else {
        console.log('✅ Inserción exitosa:', insertData3);
      }
    } else if (checkError) {
      console.log('❌ Error verificando existencia:', checkError.message);
    } else {
      // Existe, actualizar
      console.log('📊 Existe, actualizando...');
      const { data: updateData, error: updateError } = await supabase
        .from('album_stats')
        .update(statsData)
        .eq('album_id', album.id)
        .select()
        .single();
      
      if (updateError) {
        console.log('❌ Error actualizando:', updateError.message);
      } else {
        console.log('✅ Actualización exitosa:', updateData);
      }
    }
    
    // Paso 7: Verificar resultado final
    console.log('\n📊 Paso 7: Verificando resultado final...');
    const { data: finalStats, error: finalError } = await supabase
      .from('album_stats')
      .select('*')
      .eq('album_id', album.id);
    
    if (finalError) {
      console.log('❌ Error verificando resultado:', finalError.message);
    } else {
      console.log(`📊 Estadísticas finales: ${finalStats ? finalStats.length : 0}`);
      if (finalStats && finalStats.length > 0) {
        console.log('📊 Datos finales:', finalStats[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

debugStatsWithAuth(); 