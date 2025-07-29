import { DiscogsService } from './discogs';
import { AlbumService } from './database';

export class DiscogsStatsService {
  // Obtener y guardar estadísticas de Discogs para un álbum
  static async fetchAndSaveDiscogsStats(albumId: string, discogsId: number): Promise<boolean> {
    try {
      console.log('📊 Obteniendo estadísticas de Discogs para release:', discogsId);
      
      // Obtener estadísticas del release
      const stats = await DiscogsService.getReleaseStats(discogsId);
      
      if (stats) {
        console.log('📊 Estadísticas obtenidas:', stats);
        
        // Actualizar el álbum con las estadísticas
        await AlbumService.updateAlbumWithDiscogsStats(albumId, stats);
        
        console.log('✅ Estadísticas de Discogs guardadas para álbum:', albumId);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de Discogs:', error);
      // No lanzar error para no romper el flujo principal
      return false;
    }
  }

  // Obtener estadísticas de Discogs sin guardarlas (para mostrar en tiempo real)
  static async getDiscogsStats(discogsId: number): Promise<any> {
    try {
      console.log('📊 Obteniendo estadísticas de Discogs para release:', discogsId);
      
      const stats = await DiscogsService.getReleaseStats(discogsId);
      
      if (stats) {
        console.log('📊 Estadísticas obtenidas:', stats);
        return stats;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas de Discogs:', error);
      return null;
    }
  }

  // Formatear precio para mostrar
  static formatPrice(price: number): string {
    if (!price || price <= 0) return 'N/A';
    return `${price.toFixed(2)} €`;
  }

  // Formatear fecha de última venta
  static formatLastSoldDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (error) {
      return 'N/A';
    }
  }

  // Formatear rating
  static formatRating(rating: number, ratingCount: number): string {
    if (!rating || rating <= 0) return 'N/A';
    return `${rating.toFixed(1)}/5 (${ratingCount || 0})`;
  }
} 