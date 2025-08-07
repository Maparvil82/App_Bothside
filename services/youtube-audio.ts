import { supabase } from '../lib/supabase';
import { ENV } from '../config/env';

export interface YouTubeVideo {
  id: string;
  url: string;
  title: string;
  type: string;
  is_playlist: boolean;
  imported_from_discogs: boolean;
  discogs_video_id?: string;
  added_by: string;
  created_at: string;
}

export interface AudioExtractionResult {
  success: boolean;
  audioUrl?: string;
  error?: string;
  videoInfo?: {
    title: string;
    duration: string;
    thumbnail: string;
  };
}

export class YouTubeAudioService {
  private static async callEdgeFunction(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
    params?: Record<string, any>
  ) {
    try {
      const url = new URL(`${ENV.SUPABASE_URL}/functions/v1/manage-album-youtube-audio`);
      
      if (params) {
        Object.keys(params).forEach(key => {
          url.searchParams.append(key, params[key]);
        });
      }

      const response = await fetch(url.toString(), {
        method,
        headers: {
          'Authorization': `Bearer ${ENV.SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: method !== 'GET' ? JSON.stringify(params) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error calling Edge Function:', response.status, errorText);
        throw new Error(`Edge Function error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in YouTubeAudioService:', error);
      throw error;
    }
  }

  // Obtener URLs de YouTube para un álbum
  static async getYouTubeUrls(albumId: string): Promise<YouTubeVideo[]> {
    try {
      const result = await this.callEdgeFunction('GET', { albumId });
      
      if (result.success && result.urls) {
        return result.urls;
      }
      
      return [];
    } catch (error) {
      console.error('Error getting YouTube URLs:', error);
      return [];
    }
  }

  // Extraer audio de una URL de YouTube
  static async extractAudioFromYouTube(url: string): Promise<AudioExtractionResult> {
    try {
      console.log('🎵 Iniciando extracción de audio desde:', url);
      
      // Extraer video ID de la URL
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        throw new Error('No se pudo extraer el ID del video de YouTube');
      }

      console.log('🎵 Video ID extraído:', videoId);

      // Obtener información del video usando YouTube Data API
      const videoInfo = await this.getVideoInfo(videoId);
      console.log('🎵 Información del video obtenida:', videoInfo);

      // Extraer URL de audio usando un servicio confiable
      const audioUrl = await this.extractAudioUrl(videoId);
      console.log('🎵 URL de audio extraída:', audioUrl);

      return {
        success: true,
        audioUrl,
        videoInfo
      };

    } catch (error) {
      console.error('Error extracting audio:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Extraer ID del video de una URL de YouTube
  private static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  // Obtener información del video usando YouTube Data API
  private static async getVideoInfo(videoId: string) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${ENV.YOUTUBE_API_KEY}`
      );

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const video = data.items[0];
        return {
          title: video.snippet.title,
          duration: video.contentDetails.duration,
          thumbnail: video.snippet.thumbnails.medium.url
        };
      }

      throw new Error('Video no encontrado');
    } catch (error) {
      console.error('Error getting video info:', error);
      throw error;
    }
  }

  // Extraer URL de audio usando un servicio confiable
  private static async extractAudioUrl(videoId: string): Promise<string> {
    try {
      console.log('🎵 Extrayendo audio para video ID:', videoId);
      
      // Usar un servicio de extracción confiable
      const response = await fetch(`https://api.vevioz.com/@api/button/videos/${videoId}`);
      
      if (!response.ok) {
        throw new Error(`Servicio de extracción error: ${response.status}`);
      }

      const html = await response.text();
      console.log('🎵 HTML recibido, longitud:', html.length);

      // Buscar URLs de audio con patrones específicos
      const audioPatterns = [
        /href="([^"]*\.mp3[^"]*)"/g,
        /href="([^"]*\.m4a[^"]*)"/g,
        /href="([^"]*\.aac[^"]*)"/g,
        /href="([^"]*audio[^"]*\.mp4[^"]*)"/g
      ];

      for (const pattern of audioPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          const audioUrl = matches[0].replace('href="', '').replace('"', '');
          console.log('🎵 URL de audio encontrada:', audioUrl);
          return audioUrl;
        }
      }

      console.log('🎵 No se encontraron URLs de audio');
      console.log('🎵 Fragmento del HTML:', html.substring(0, 300));
      
      throw new Error('No se pudo extraer URL de audio');

    } catch (error) {
      console.error('Error extracting audio URL:', error);
      throw error;
    }
  }

  // Agregar nueva URL de YouTube a un álbum
  static async addYouTubeUrl(albumId: string, url: string, title?: string): Promise<YouTubeVideo | null> {
    try {
      const result = await this.callEdgeFunction('POST', {
        urlData: {
          album_id: albumId,
          url,
          title: title || 'Video de YouTube',
          type: 'other',
          is_playlist: false,
          imported_from_discogs: false
        }
      });

      if (result.success && result.url) {
        return result.url;
      }

      return null;
    } catch (error) {
      console.error('Error adding YouTube URL:', error);
      return null;
    }
  }

  // Actualizar URLs de YouTube desde Discogs
  static async refreshFromDiscogs(albumId: string): Promise<{ success: boolean; count: number }> {
    try {
      const result = await this.callEdgeFunction('PATCH', { albumId });
      
      return {
        success: result.success,
        count: result.count || 0
      };
    } catch (error) {
      console.error('Error refreshing from Discogs:', error);
      return { success: false, count: 0 };
    }
  }
} 