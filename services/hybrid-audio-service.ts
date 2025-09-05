import { supabase } from '../lib/supabase';
import { YouTubeAudioServiceV2, YouTubeAudioResult } from './youtube-audio-v2';

export interface HybridAudioResult {
  success: boolean;
  audioUrl?: string;
  videoInfo?: {
    title: string;
    thumbnail: string;
    duration?: string;
  };
  error?: string;
  source: 'supabase' | 'local' | 'none';
}

export class HybridAudioService {
  // Método principal que intenta múltiples fuentes
  static async extractAudioFromYouTube(url: string): Promise<HybridAudioResult> {
    console.log('🎵 [Hybrid] Iniciando extracción híbrida para:', url);

    // Método 1: Intentar con Supabase (ytdl-core)
    try {
      console.log('🎵 [Hybrid] Probando Supabase (ytdl-core)...');
      const supabaseResult = await this.trySupabaseExtraction(url);
      
      if (supabaseResult.success && supabaseResult.audioUrl) {
        console.log('🎵 [Hybrid] ✅ Supabase exitoso');
        return {
          ...supabaseResult,
          source: 'supabase'
        };
      }
    } catch (error) {
      console.warn('🎵 [Hybrid] Supabase falló:', error);
    }

    // Método 2: Intentar con servicio local
    try {
      console.log('🎵 [Hybrid] Probando servicio local...');
      const localResult = await YouTubeAudioServiceV2.extractAudioFromYouTube(url);
      
      if (localResult.success && localResult.audioUrl) {
        console.log('🎵 [Hybrid] ✅ Servicio local exitoso');
        return {
          ...localResult,
          source: 'local'
        };
      }
    } catch (error) {
      console.warn('🎵 [Hybrid] Servicio local falló:', error);
    }

    // Si ambos fallan
    console.log('🎵 [Hybrid] ❌ Todos los métodos fallaron');
    return {
      success: false,
      error: 'No se pudo extraer audio del video de YouTube',
      source: 'none'
    };
  }

  // Intentar extracción con Supabase
  private static async trySupabaseExtraction(url: string): Promise<YouTubeAudioResult> {
    try {
      const { data, error } = await supabase.functions.invoke('extract-youtube-audio', {
        body: { url }
      });

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      if (data.success && data.audioUrl) {
        return {
          success: true,
          audioUrl: data.audioUrl,
          videoInfo: {
            title: 'Video de YouTube',
            thumbnail: `https://img.youtube.com/vi/${data.videoId}/mqdefault.jpg`,
            duration: 'Desconocida'
          }
        };
      } else {
        throw new Error(data.error || 'Extracción falló');
      }
    } catch (error) {
      throw new Error(`Supabase extraction failed: ${error}`);
    }
  }

  // Método para obtener información del video sin extraer audio
  static async getVideoInfo(url: string) {
    const videoId = YouTubeAudioServiceV2.extractVideoId(url);
    if (!videoId) {
      return null;
    }

    return {
      videoId,
      title: 'Video de YouTube',
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: 'Desconocida'
    };
  }

  // Método para validar si una URL de YouTube es válida
  static isValidYouTubeUrl(url: string): boolean {
    return YouTubeAudioServiceV2.extractVideoId(url) !== null;
  }
}
