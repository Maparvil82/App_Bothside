import { DiscogsRelease, DiscogsSearchResponse } from '../types';

import { ENV } from '../config/env';

const DISCOGS_API_URL = 'https://api.discogs.com';
const DISCOGS_TOKEN = ENV.DISCOGS_TOKEN;

export class DiscogsService {
  private static async makeRequest(endpoint: string): Promise<any> {
    try {
      console.log('🔑 Intentando conectar a Discogs con token:', DISCOGS_TOKEN ? 'Token configurado' : 'Sin token');
      
      const response = await fetch(`${DISCOGS_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
          'User-Agent': 'BothsideApp/1.0',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error de respuesta Discogs:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          errorText: errorText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        // Si es un error de autenticación, no fallar la aplicación
        if (response.status === 401) {
          console.warn('⚠️ Token de Discogs inválido. Las búsquedas de Discogs no funcionarán.');
          return null;
        }
        
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making Discogs request:', error);
      // No fallar la aplicación por errores de Discogs
      return null;
    }
  }

  // Función de prueba para verificar si el token funciona
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Probando conexión con Discogs...');
      const response = await this.makeRequest('/database/search?q=test&type=release&per_page=1');
      if (response === null) {
        console.log('❌ Conexión con Discogs fallida - token inválido');
        return false;
      }
      console.log('✅ Conexión con Discogs exitosa');
      return true;
    } catch (error) {
      console.error('❌ Error de conexión con Discogs:', error);
      return false;
    }
  }

  static async searchReleases(query: string, page: number = 1): Promise<DiscogsSearchResponse | null> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const endpoint = `/database/search?q=${encodedQuery}&type=release&page=${page}&per_page=20`;
      
      const result = await this.makeRequest(endpoint);
      if (result === null) {
        console.warn('⚠️ No se pudo buscar en Discogs - token inválido');
        return null;
      }
      
      return result;
    } catch (error) {
      console.error('Error searching releases:', error);
      return null;
    }
  }

  static async getRelease(id: number): Promise<DiscogsRelease | null> {
    try {
      const endpoint = `/releases/${id}`;
      const result = await this.makeRequest(endpoint);
      if (result === null) {
        console.warn('⚠️ No se pudo obtener release de Discogs - token inválido');
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error getting release:', error);
      return null;
    }
  }

  static async getArtistReleases(artistId: number, page: number = 1): Promise<DiscogsSearchResponse | null> {
    try {
      const endpoint = `/artists/${artistId}/releases?page=${page}&per_page=20`;
      const result = await this.makeRequest(endpoint);
      if (result === null) {
        console.warn('⚠️ No se pudo obtener releases del artista - token inválido');
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error getting artist releases:', error);
      return null;
    }
  }

  // Obtener estadísticas de mercado de un release (precios, valoraciones, etc.)
  static async getReleaseMarketplaceStats(releaseId: number): Promise<any | null> {
    try {
      const endpoint = `/marketplace/price_suggestions/${releaseId}`;
      const result = await this.makeRequest(endpoint);
      if (result === null) {
        console.warn('⚠️ No se pudo obtener estadísticas de marketplace - token inválido');
        return null;
      }
      return result;
    } catch (error) {
      console.error('Error getting marketplace stats:', error);
      return null;
    }
  }

  // Obtener información de precios y estadísticas de un release
  static async getReleaseStats(releaseId: number): Promise<any | null> {
    try {
      // Obtener el release completo que incluye algunos datos de marketplace
      const releaseData = await this.getRelease(releaseId);
      if (!releaseData) {
        return null;
      }
      
      // Obtener sugerencias de precios por condición
      const priceSuggestions = await this.getReleaseMarketplaceStats(releaseId);
      
      // Inicializar stats con datos del release
      const stats: any = {
        lowest_price: releaseData.lowest_price,
        highest_price: null,
        avg_price: null,
        have: releaseData.community?.have,
        want: releaseData.community?.want,
        last_sold_date: releaseData.last_sold_date,
        price_suggestions: priceSuggestions
      };
      
      // Calcular precios desde las sugerencias si están disponibles
      if (priceSuggestions && Object.keys(priceSuggestions).length > 0) {
        const prices = Object.values(priceSuggestions).map((suggestion: any) => suggestion.value);
        if (prices.length > 0) {
          // Calcular precio medio
          stats.avg_price = prices.reduce((sum: number, price: number) => sum + price, 0) / prices.length;
          
          // Calcular precio más alto
          stats.highest_price = Math.max(...prices);
          
          // Si no hay lowest_price del release, usar el más bajo de las sugerencias
          if (!stats.lowest_price) {
            stats.lowest_price = Math.min(...prices);
          }
        }
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting release stats:', error);
      return null;
    }
  }
} 

export const getAlbumEditions = async (artist: string, title: string): Promise<any[]> => {
  try {
    // Buscar el álbum en Discogs usando el servicio
    const searchQuery = `${artist} ${title}`;
    const searchResult = await DiscogsService.searchReleases(searchQuery, 1);
    
    if (!searchResult || !searchResult.results) {
      return [];
    }

    const releases = searchResult.results;
    
    // Filtrar y procesar las ediciones más relevantes
    const processedEditions = releases
      .filter((release: any) => {
        // Verificar que sea un release válido
        return release.type === 'release' && release.title;
      })
      .slice(0, 10) // Limitar a 10 ediciones
      .map((release: any) => {
        // Extraer artista del título si no está disponible
        let extractedArtist = release.artist;
        let extractedTitle = release.title;
        
        if (!extractedArtist && release.title) {
          // Intentar extraer artista del título (formato: "Artista - Título")
          const titleParts = release.title.split(' - ');
          if (titleParts.length >= 2) {
            extractedArtist = titleParts[0];
            extractedTitle = titleParts.slice(1).join(' - ');
          } else {
            extractedArtist = 'Artista desconocido';
          }
        }
        
        return {
          id: release.id,
          title: extractedTitle,
          artist: extractedArtist,
          year: release.year || 'Año desconocido',
          country: release.country || 'País desconocido',
          format: Array.isArray(release.format) ? release.format.join(', ') : (release.format || ''),
          label: Array.isArray(release.label) ? release.label.join(', ') : (release.label || ''),
          catno: release.catno || '',
          thumb: release.thumb,
          uri: release.uri
        };
      });

    return processedEditions;
  } catch (error) {
    console.error('❌ Error obteniendo ediciones:', error);
    return [];
  }
}; 