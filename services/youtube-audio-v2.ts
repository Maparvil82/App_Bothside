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

export class YouTubeAudioServiceV2 {
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

  // Método principal para extraer audio (versión mejorada)
  static async extractAudioFromYouTube(url: string): Promise<YouTubeAudioResult> {
    try {
      console.log('🎵 [V2] Iniciando extracción de audio para:', url);

      // Extraer ID del video
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: 'No se pudo extraer el ID del video de YouTube'
        };
      }

      console.log('🎵 [V2] ID del video extraído:', videoId);

      // Obtener información básica del video
      const videoInfo = this.getVideoInfo(videoId);

      // Intentar extraer audio usando múltiples métodos
      const audioUrl = await this.tryExtractAudio(videoId);

      if (audioUrl) {
        // Validar que la URL obtenida sea válida
        if (await this.validateAudioUrl(audioUrl)) {
          console.log('🎵 [V2] ✅ Extracción exitosa, URL válida');
          return {
            success: true,
            audioUrl,
            videoInfo
          };
        } else {
          console.warn('🎵 [V2] ⚠️ URL extraída no es válida');
          return {
            success: false,
            error: 'No se pudo obtener una URL de audio válida'
          };
        }
      } else {
        console.log('🎵 [V2] ❌ Extracción falló completamente');
        return {
          success: false,
          error: 'No se pudo extraer audio del video de YouTube'
        };
      }

    } catch (error) {
      console.error('🎵 [V2] ❌ Error general en extracción:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  // Intentar extraer audio usando diferentes servicios
  private static async tryExtractAudio(videoId: string): Promise<string | null> {
    const methods = [
      () => this.extractWithY2Mate(videoId),
      () => this.extractWithYTMP3(videoId),
      () => this.extractWithLoaderTo(videoId),
      () => this.extractWithSaveTube(videoId),
    ];

    console.log('🎵 [V2] Probando', methods.length, 'métodos de extracción...');

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`🎵 [V2] Probando método ${i + 1}/${methods.length}...`);
        const result = await methods[i]();
        if (result) {
          console.log(`🎵 [V2] ✅ Método ${i + 1} exitoso`);
          return result;
        }
      } catch (error) {
        console.warn(`🎵 [V2] ❌ Método ${i + 1} falló:`, error);
        continue;
      }
    }

    console.log('🎵 [V2] ❌ Todos los métodos de extracción fallaron');
    return null;
  }

  // Método 1: Y2Mate (más confiable)
  private static async extractWithY2Mate(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 [V2] Probando Y2Mate...');
      
      // Paso 1: Obtener la página de Y2Mate
      const searchUrl = `https://www.y2mate.com/youtube-mp3/${videoId}`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // Buscar el enlace de descarga en el HTML
      const downloadMatch = html.match(/href="([^"]*download[^"]*\.mp3[^"]*)"/);
      if (downloadMatch && downloadMatch[1]) {
        const downloadUrl = downloadMatch[1].startsWith('http') 
          ? downloadMatch[1] 
          : `https://www.y2mate.com${downloadMatch[1]}`;
        
        console.log('🎵 [V2] ✅ Y2Mate exitoso');
        return downloadUrl;
      }

      throw new Error('No se encontró enlace de descarga');
    } catch (error) {
      console.warn('🎵 [V2] Y2Mate falló:', error);
      throw error;
    }
  }

  // Método 2: YTMP3 (alternativo)
  private static async extractWithYTMP3(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 [V2] Probando YTMP3...');
      
      const response = await fetch('https://ytmp3.cc/api/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: `url=https://www.youtube.com/watch?v=${videoId}&format=mp3`
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 [V2] Respuesta de YTMP3:', data);
        
        if (data.status === 'success' && data.link) {
          console.log('🎵 [V2] ✅ YTMP3 exitoso');
          return data.link;
        }
      }

      throw new Error('YTMP3 API failed');
    } catch (error) {
      console.warn('🎵 [V2] YTMP3 falló:', error);
      throw error;
    }
  }

  // Método 3: Loader.to
  private static async extractWithLoaderTo(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 [V2] Probando Loader.to...');
      
      const response = await fetch('https://loader.to/ajax/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: `query=https://www.youtube.com/watch?v=${videoId}`
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 [V2] Respuesta de Loader.to:', data);
        
        if (data.status === 'success' && data.links && data.links.mp3) {
          const mp3Links = Object.values(data.links.mp3);
          if (mp3Links.length > 0) {
            const audioLink = (mp3Links[0] as any).url;
            if (audioLink) {
              console.log('🎵 [V2] ✅ Loader.to exitoso');
              return audioLink;
            }
          }
        }
      }

      throw new Error('Loader.to API failed');
    } catch (error) {
      console.warn('🎵 [V2] Loader.to falló:', error);
      throw error;
    }
  }

  // Método 4: SaveTube
  private static async extractWithSaveTube(videoId: string): Promise<string | null> {
    try {
      console.log('🎵 [V2] Probando SaveTube...');
      
      const response = await fetch(`https://savetube.me/api/v1/tetr?url=https://www.youtube.com/watch?v=${videoId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🎵 [V2] Respuesta de SaveTube:', data);
        
        if (data.status === 'success' && data.data && data.data.audio) {
          const audioUrl = data.data.audio[0]?.url;
          if (audioUrl) {
            console.log('🎵 [V2] ✅ SaveTube exitoso');
            return audioUrl;
          }
        }
      }

      throw new Error('SaveTube API failed');
    } catch (error) {
      console.warn('🎵 [V2] SaveTube falló:', error);
      throw error;
    }
  }

  // Método para validar URLs de audio
  private static async validateAudioUrl(url: string): Promise<boolean> {
    try {
      console.log('🎵 [V2] Validando URL de audio:', url);
      
      // Verificar formato de URL
      new URL(url);
      
      // Para URLs de YouTube o servicios de extracción, hacer validación HTTP
      const response = await fetch(url, { 
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      
      // Verificar que sea un archivo de audio válido
      const hasValidContentType = contentType ? (contentType.includes('audio') || contentType.includes('video')) : false;
      const hasValidSize = contentLength ? parseInt(contentLength) > 1000 : false;
      const isValid = response.ok && (hasValidContentType || hasValidSize); // Al menos 1KB
      
      console.log('🎵 [V2] URL válida:', isValid, 'Content-Type:', contentType, 'Size:', contentLength);
      
      return isValid;
    } catch (error) {
      console.warn('🎵 [V2] Error validando URL:', error);
      return false; // Si hay error, consideramos la URL como inválida
    }
  }
}
