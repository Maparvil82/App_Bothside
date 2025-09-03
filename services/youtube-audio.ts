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
          console.warn('🎵 ⚠️ URL extraída no es válida');
          return {
            success: false,
            error: 'No se pudo obtener una URL de audio válida'
          };
        }
      } else {
        console.log('🎵 ❌ Extracción falló completamente');
        return {
          success: false,
          error: 'No se pudo extraer audio del video de YouTube'
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
    ];

    console.log('🎵 Probando', methods.length, 'métodos de extracción...');

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🎵 Probando método ${i + 1}/${methods.length}...`);
        const result = await methods[i]();
        if (result) {
          console.log(`🎵 ✅ Método ${i + 1} exitoso`);
          return result;
        }
      } catch (error) {
        console.warn(`🎵 ❌ Método ${i + 1} falló:`, error);
        continue;
      }
    }

    console.log('🎵 ❌ Todos los métodos de extracción fallaron');
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
        console.log('🎵 Respuesta de Cobalt:', data);
        
        if (data.status === 'success' && data.url) {
          console.log('🎵 ✅ Cobalt exitoso - URL obtenida');
          return data.url;
        } else if (data.status === 'error') {
          console.warn('🎵 Error de Cobalt:', data.text);
        }
      } else {
        console.warn('🎵 Cobalt HTTP error:', response.status, response.statusText);
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
        console.log('🎵 Respuesta de Loader.to:', data);
        
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
        console.log('🎵 Respuesta de SaveTube:', data);
        
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



  // Método para validar URLs de audio
  private static async validateAudioUrl(url: string): Promise<boolean> {
    try {
      console.log('🎵 Validando URL de audio:', url);
      
      // Verificar formato de URL
      new URL(url);
      
      // Para URLs de YouTube o servicios de extracción, hacer validación HTTP
      const response = await fetch(url, { 
        method: 'HEAD'
      });
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Verificar que sea un archivo de audio válido
      const hasValidContentType = contentType ? (contentType.includes('audio') || contentType.includes('video')) : false;
      const hasValidSize = contentLength ? parseInt(contentLength) > 1000 : false;
      const isValid = response.ok && hasValidContentType && hasValidSize; // Al menos 1KB
      
      console.log('🎵 URL válida:', isValid, 'Content-Type:', contentType, 'Size:', contentLength);
      
      return isValid;
    } catch (error) {
      console.warn('🎵 Error validando URL:', error);
      return false; // Si hay error, consideramos la URL como inválida
    }
  }


} 