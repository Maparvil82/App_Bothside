import { DiscogsRelease, DiscogsSearchResponse } from '../types';

import { ENV } from '../config/env';

const DISCOGS_API_URL = 'https://api.discogs.com';
const DISCOGS_TOKEN = ENV.DISCOGS_TOKEN;

export class DiscogsService {
  private static async makeRequest(endpoint: string): Promise<any> {
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

  static async searchReleases(query: string, page: number = 1): Promise<DiscogsSearchResponse> {
    const encodedQuery = encodeURIComponent(query);
    const endpoint = `/database/search?q=${encodedQuery}&type=release&page=${page}&per_page=20`;
    
    return this.makeRequest(endpoint);
  }

  static async getRelease(id: number): Promise<DiscogsRelease> {
    const endpoint = `/releases/${id}`;
    return this.makeRequest(endpoint);
  }

  static async getArtistReleases(artistId: number, page: number = 1): Promise<DiscogsSearchResponse> {
    const endpoint = `/artists/${artistId}/releases?page=${page}&per_page=20`;
    return this.makeRequest(endpoint);
  }

  // Obtener estadísticas de mercado de un release (precios, valoraciones, etc.)
  static async getReleaseMarketplaceStats(releaseId: number): Promise<any> {
    const endpoint = `/marketplace/price_suggestions/${releaseId}`;
    return this.makeRequest(endpoint);
  }

  // Obtener información de precios y estadísticas de un release
  static async getReleaseStats(releaseId: number): Promise<any> {
    try {
      // Obtener el release completo que incluye algunos datos de marketplace
      const releaseData = await this.getRelease(releaseId);
      
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
      
      console.log('📊 Estadísticas calculadas:', {
        lowest_price: stats.lowest_price,
        highest_price: stats.highest_price,
        avg_price: stats.avg_price,
        have: stats.have,
        want: stats.want
      });
      
      return stats;
    } catch (error) {
      console.error('Error getting release stats:', error);
      throw error;
    }
  }
} 