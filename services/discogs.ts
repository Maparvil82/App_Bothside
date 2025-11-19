import { DiscogsRelease, DiscogsSearchResponse } from '../types';

import { ENV } from '../config/env';

const DISCOGS_API_URL = 'https://api.discogs.com';
const DISCOGS_TOKEN = ENV.DISCOGS_TOKEN;

export class DiscogsService {
  private static cache = new Map<string, { expiresAt: number; data: any }>();
  private static async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static getFromCache(endpoint: string) {
    const entry = this.cache.get(endpoint);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(endpoint);
      return null;
    }
    return entry.data;
  }

  private static setCache(endpoint: string, data: any, ttlMs: number) {
    if (ttlMs <= 0) return;
    this.cache.set(endpoint, { expiresAt: Date.now() + ttlMs, data });
  }

  private static async makeRequest(
    endpoint: string,
    options?: { cacheTtlMs?: number; retries?: number }
  ): Promise<any> {
    const cacheTtlMs = options?.cacheTtlMs ?? 5 * 60 * 1000; // 5 min por defecto
    const retries = options?.retries ?? 1; // 1 reintento por defecto

    try {
      // Cache in-memory por endpoint
      const cached = this.getFromCache(endpoint);
      if (cached) {
        return cached;
      }

      const response = await fetch(`${DISCOGS_API_URL}${endpoint}`, {
        headers: {
          Authorization: `Discogs token=${DISCOGS_TOKEN}`,
          'User-Agent': 'BothsideApp/1.0',
        },
      });

      if (!response.ok) {
        // Manejo especial de rate limit
        if (response.status === 429 && retries > 0) {
          const retryAfterHeader = response.headers.get('Retry-After');
          const retryAfterMs = retryAfterHeader
            ? parseInt(retryAfterHeader, 10) * 1000
            : 1500; // fallback 1.5s
          console.warn(`⏳ Discogs 429. Reintentando en ${retryAfterMs}ms...`);
          await this.sleep(retryAfterMs);
          return this.makeRequest(endpoint, { cacheTtlMs, retries: retries - 1 });
        }

        // Si es un error de autenticación, no fallar la aplicación
        if (response.status === 401) {
          console.warn('⚠️ Token de Discogs inválido. Las búsquedas de Discogs no funcionarán.');
          return null;
        }

        const errorText = await response.text().catch(() => '');
        console.warn('❌ Error de respuesta Discogs:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
        });
        return null; // degradar a null para no interrumpir la app
      }

      const data = await response.json();
      this.setCache(endpoint, data, cacheTtlMs);
      return data;
    } catch (error) {
      if (retries > 0) {
        const backoffMs = 1000;
        console.warn(`⚠️ Error de red Discogs. Reintentando en ${backoffMs}ms...`);
        await this.sleep(backoffMs);
        return this.makeRequest(endpoint, { cacheTtlMs, retries: retries - 1 });
      }
      console.warn('Error making Discogs request (degradado a null):', error);
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

      const result = await this.makeRequest(endpoint, { cacheTtlMs: 2 * 60 * 1000, retries: 1 });
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
      const result = await this.makeRequest(endpoint, { cacheTtlMs: 10 * 60 * 1000, retries: 1 });
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
      const result = await this.makeRequest(endpoint, { cacheTtlMs: 5 * 60 * 1000, retries: 1 });
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
      const result = await this.makeRequest(endpoint, { cacheTtlMs: 10 * 60 * 1000, retries: 1 });
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

  /**
   * Refresh CC0 data for a release (title, year, artists, images, labels, genres, styles, tracklist)
   * Does NOT include marketplace data (prices, stats)
   * @param releaseId - Discogs release ID
   * @returns CC0 data object or null if failed
   */
  static async refreshReleaseCC0Data(releaseId: number): Promise<{
    title: string;
    year: number;
    artists: string;
    cover_url: string | null;
    label: string;
    genres: string[];
    styles: string[];
    tracklist: Array<{ position: string; title: string; duration: string }>;
  } | null> {
    try {
      console.log(`🔄 Refreshing CC0 data for release ${releaseId}...`);

      const release = await this.getRelease(releaseId);
      if (!release) {
        console.warn(`⚠️ Could not fetch release ${releaseId} from Discogs`);
        return null;
      }

      // Extract CC0 data only (no marketplace data)
      const cc0Data = {
        title: release.title || '',
        year: release.year || 0,
        artists: release.artists?.map((a: any) => a.name).join(', ') || '',
        cover_url: release.images?.[0]?.uri || null,
        label: release.labels?.[0]?.name || '',
        genres: release.genres || [],
        styles: release.styles || [],
        tracklist: (release.tracklist || []).map((track: any) => ({
          position: track.position || '',
          title: track.title || '',
          duration: track.duration || '',
        })),
      };

      console.log(`✅ CC0 data refreshed for: ${cc0Data.title}`);
      return cc0Data;
    } catch (error) {
      console.error(`❌ Error refreshing CC0 data for release ${releaseId}:`, error);
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
        if (release.type !== 'release' || !release.title) {
          return false;
        }

        // Filtrar solo formatos de vinilo
        const format = Array.isArray(release.format) ? release.format.join(', ').toLowerCase() : (release.format || '').toLowerCase();
        const isVinyl = format.includes('vinyl') ||
          format.includes('lp') ||
          format.includes('12"') ||
          format.includes('7"') ||
          format.includes('10"') ||
          format.includes('single') ||
          format.includes('ep') ||
          format.includes('maxi-single');

        // Excluir explícitamente formatos que no son vinilo
        const isNotVinyl = format.includes('cd') ||
          format.includes('dvd') ||
          format.includes('cassette') ||
          format.includes('mp3') ||
          format.includes('digital') ||
          format.includes('blu-ray') ||
          format.includes('vhs');

        return isVinyl && !isNotVinyl;
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