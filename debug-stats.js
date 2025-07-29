// Script de debug para verificar el proceso de guardado de estadísticas
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

async function debugStats() {
  console.log('🔍 Debug: Verificando proceso de estadísticas...');
  
  try {
    // Paso 1: Obtener un álbum con discogs_id
    console.log('\n📊 Paso 1: Obteniendo álbum con discogs_id...');
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
    
    // Paso 2: Verificar si ya tiene estadísticas
    console.log('\n📊 Paso 2: Verificando estadísticas existentes...');
    const { data: existingStats, error: statsError } = await supabase
      .from('album_stats')
      .select('*')
      .eq('album_id', album.id);
    
    if (statsError) {
      console.error('❌ Error verificando estadísticas:', statsError);
      return;
    }
    
    console.log(`📊 Estadísticas existentes: ${existingStats ? existingStats.length : 0}`);
    if (existingStats && existingStats.length > 0) {
      console.log('📊 Datos existentes:', existingStats[0]);
    }
    
    // Paso 3: Obtener estadísticas de Discogs
    console.log('\n📊 Paso 3: Obteniendo estadísticas de Discogs...');
    const discogsStats = await DiscogsService.getReleaseStats(album.discogs_id);
    console.log('✅ Estadísticas de Discogs obtenidas:', JSON.stringify(discogsStats, null, 2));
    
    // Paso 4: Preparar datos para inserción
    console.log('\n📊 Paso 4: Preparando datos para inserción...');
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
    
    // Paso 5: Intentar insertar estadísticas
    console.log('\n📊 Paso 5: Intentando insertar estadísticas...');
    
    if (existingStats && existingStats.length > 0) {
      // Actualizar existente
      console.log('📊 Actualizando estadísticas existentes...');
      const { data: updateData, error: updateError } = await supabase
        .from('album_stats')
        .update(statsData)
        .eq('album_id', album.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error actualizando estadísticas:', updateError);
      } else {
        console.log('✅ Estadísticas actualizadas:', updateData);
      }
    } else {
      // Insertar nuevo
      console.log('📊 Insertando nuevas estadísticas...');
      const { data: insertData, error: insertError } = await supabase
        .from('album_stats')
        .insert([statsData])
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error insertando estadísticas:', insertError);
      } else {
        console.log('✅ Estadísticas insertadas:', insertData);
      }
    }
    
    // Paso 6: Verificar resultado final
    console.log('\n📊 Paso 6: Verificando resultado final...');
    const { data: finalStats, error: finalError } = await supabase
      .from('album_stats')
      .select('*')
      .eq('album_id', album.id);
    
    if (finalError) {
      console.error('❌ Error verificando resultado:', finalError);
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

debugStats(); 