import { Alert } from 'react-native';

export interface YouTubeAudioResult {
  success: boolean;
  audioUrl?: string;
  videoInfo?: {
    title: string;
    thumbnail: string;
    duration?: string;
  };
  error?: string;
}

export class YouTubeAudioService {
  // Extraer ID del video de una URL de YouTube
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
      /(?:youtu\.be\/)([^&\n?#]+)/,
      /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
      /(?:youtube\.com\/v\/)([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  // Obtener información básica del video
  static getVideoInfo(videoId: string) {
    return {
      title: `Video de YouTube`,
      thumbnail: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
      duration: 'Desconocida'
    };
  }

  // Método principal para extraer audio (mejorado)
  static async extractAudioFromYouTube(url: string): Promise<YouTubeAudioResult> {
    try {
      console.log('🎵 Iniciando extracción de audio para:', url);

      // Extraer ID del video
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: 'No se pudo extraer el ID del video de YouTube'
        };
      }

      console.log('🎵 ID del video extraído:', videoId);

      // Obtener información básica del video
      const videoInfo = this.getVideoInfo(videoId);

      // Intentar extraer audio
      const audioUrl = await this.tryExtractAudio(videoId);

      if (audioUrl) {
        // Validar que la URL obtenida sea válida
        if (await this.validateAudioUrl(audioUrl)) {
          console.log('🎵 ✅ Extracción exitosa, URL válida');
          return {
            success: true,
            audioUrl,
            videoInfo
          };
        } else {
          console.warn('🎵 ⚠️ URL extraída no es válida, usando fallback');
          const fallbackUrl = this.getFallbackAudio(videoId);
          return {
            success: true,
            audioUrl: fallbackUrl,
            videoInfo
          };
        }
      } else {
        console.log('🎵 ⚠️ Extracción falló, usando audio de fallback');
        const fallbackUrl = this.getFallbackAudio(videoId);
        return {
          success: true,
          audioUrl: fallbackUrl,
          videoInfo
        };
      }

    } catch (error) {
      console.error('🎵 ❌ Error general en extracción:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Intentar extraer audio usando diferentes servicios
  private static async tryExtractAudio(videoId: string): Promise<string | null> {
    const methods = [
      () => this.extractWithCobalt(videoId),
      () => this.extractWithY2mate(videoId),
      () => this.extractWithSaveTube(videoId),
      () => this.getFallbackAudio(videoId)
    ];

    for (const method of methods) {
      try {
        const result = await method();
        if (result) {
          return result;
        }
      } catch (error) {
        console.warn('🎵 Método falló, probando siguiente:', error);
        continue;
      }
    }

    return null;
  }

  // Método 1: Cobalt API (mejorado)
  private static async extractWithCobalt(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 Probando Cobalt API...');
      
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'User-Agent': 'BothsideApp/1.0'
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${videoId}`,
          vCodec: 'h264',
          vQuality: '720',
          aFormat: 'mp3',
          isAudioOnly: true,
          isNoTTWatermark: false,
          dubLang: false
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Respuesta de Cobalt:', data.status);
        
        if (data.status === 'success' && data.url) {
          console.log('🎵 ✅ Cobalt exitoso - URL obtenida');
          return data.url;
        } else if (data.status === 'error') {
          console.warn('🎵 Error de Cobalt:', data.text);
        }
      } else {
        console.warn('🎵 Cobalt HTTP error:', response.status);
      }

      throw new Error('Cobalt API failed');
    } catch (error) {
      console.warn('🎵 Cobalt falló:', error);
      throw error;
    }
  }

  // Método 2: Loader.to API
  private static async extractWithY2mate(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 Probando Loader.to API...');
      
      // Usar Loader.to que es más confiable
      const response = await fetch('https://loader.to/ajax/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `query=https://www.youtube.com/watch?v=${videoId}`
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Respuesta de Loader.to:', data.status);
        
        if (data.status === 'success' && data.links && data.links.mp3) {
          const mp3Links = Object.values(data.links.mp3);
          if (mp3Links.length > 0) {
            const audioLink = (mp3Links[0] as any).url;
            if (audioLink) {
              console.log('🎵 ✅ Loader.to exitoso');
              return audioLink;
            }
          }
        }
      }

      throw new Error('Loader.to API failed');
    } catch (error) {
      console.warn('🎵 Loader.to falló:', error);
      throw error;
    }
  }

  // Método 3: SaveTube API
  private static async extractWithSaveTube(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 Probando SaveTube API...');
      
      const response = await fetch(`https://savetube.me/api/v1/tetr?url=https://www.youtube.com/watch?v=${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 Respuesta de SaveTube:', data.status);
        
        if (data.status === 'success' && data.data && data.data.audio) {
          const audioUrl = data.data.audio[0]?.url;
          if (audioUrl) {
            console.log('🎵 ✅ SaveTube exitoso');
            return audioUrl;
          }
        }
      }

      throw new Error('SaveTube API failed');
    } catch (error) {
      console.warn('🎵 SaveTube falló:', error);
      throw error;
    }
  }

  // Método 4: Audio de fallback para testing (URLs más simples)
  private static getFallbackAudio(videoId: string): string {
    console.log('🎵 Usando audio de fallback para:', videoId);
    
    // URLs de audio de prueba más simples y confiables
    const fallbackAudios = [
      // Archivo WAV simple y confiable
      'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav',
      // Otro archivo WAV simple
      'https://www2.cs.uic.edu/~i101/SoundFiles/PinkPanther30.wav',
    ];
    
    // Seleccionar uno basado en el videoId para consistencia
    const index = videoId.charCodeAt(0) % fallbackAudios.length;
    const selectedAudio = fallbackAudios[index];
    
    console.log('🎵 Audio de fallback seleccionado:', selectedAudio);
    return selectedAudio;
  }

  // Método para validar URLs de audio
  private static async validateAudioUrl(url: string): Promise<boolean> {
    try {
      console.log('🎵 Validando URL de audio:', url);
      
      // Verificar formato de URL
      new URL(url);
      
      // Para URLs de fallback conocidas, asumir que son válidas
      const knownGoodUrls = [
        'cs.uic.edu',
        'sample-videos.com'
      ];
      
      if (knownGoodUrls.some(domain => url.includes(domain))) {
        console.log('🎵 URL de fallback conocida, asumiendo válida');
        return true;
      }
      
      // Para otras URLs, hacer validación HTTP
      const response = await fetch(url, { 
        method: 'HEAD'
      });
      
      const contentType = response.headers.get('content-type');
      const isValid = response.ok && !!(contentType?.includes('audio') || contentType?.includes('video'));
      console.log('🎵 URL válida:', isValid);
      
      return isValid;
    } catch (error) {
      console.warn('🎵 Error validando URL:', error);
      return false; // Si hay error, consideramos la URL como inválida
    }
  }

  // Método auxiliar para mostrar alertas informativas (mejorado)
  static showExtractionStatus(result: YouTubeAudioResult) {
    if (result.success && result.audioUrl) {
      const isRealAudio = !result.audioUrl.includes('cs.uic.edu') && 
                         !result.audioUrl.includes('sample-videos.com') &&
                         !result.audioUrl.includes('file-examples.com');
      
      if (isRealAudio) {
        console.log('🎵 ✅ Reproduciendo audio real de YouTube');
        // No mostrar alerta para audio real, solo log
      } else {
        console.log('🎵 ⚠️ Reproduciendo audio de demostración');
        Alert.alert(
          'Audio de demostración',
          'Se está reproduciendo un audio de prueba porque no se pudo extraer el audio real del video de YouTube. Esto puede deberse a restricciones del contenido o problemas de conectividad.',
          [{ text: 'Entendido', style: 'default' }]
        );
      }
    }
  }
} 