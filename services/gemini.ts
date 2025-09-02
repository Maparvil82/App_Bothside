import { ENV } from '../config/env';
import { WebSearchService } from './web-search';

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CollectionAlbum {
  album_id: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    discogs_id?: string;
    label?: string;
    release_year?: string;
    cover_url?: string;
    album_stats?: {
      avg_price?: number;
      low_price?: number;
      high_price?: number;
    };
    album_styles?: Array<{
      styles: {
        name: string;
      };
    }>;
  };
}

export class GeminiService {
  private static readonly API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private static readonly VISION_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
  private static readonly API_KEY = ENV.GEMINI_API_KEY;

  static async generateResponse(
    userMessage: string, 
    collectionContext: string,
    collectionData?: CollectionAlbum[]
  ): Promise<string> {
    try {
      // Buscar información web adicional usando discogs_id si está disponible
      let webInfo = '';
      if (collectionData && collectionData.length > 0) {
        webInfo = await WebSearchService.enrichResponseWithCollection(userMessage, collectionData);
      } else {
        webInfo = await WebSearchService.enrichResponse(userMessage, collectionContext);
      }
      
      const systemPrompt = `Eres un asistente experto en música y colecciones de discos con acceso completo a toda la información de la colección del usuario, como si fueras Gemini Web.

      INFORMACIÓN COMPLETA DE LA COLECCIÓN:
      ${collectionContext}
      
      ${webInfo ? `INFORMACIÓN ADICIONAL DE LA WEB:\n${webInfo}` : ''}
      
      INSTRUCCIONES IMPORTANTES:
      - Tienes acceso completo a todos los datos de la colección (171 álbumes, 144 artistas, 28 estilos)
      - Responde de manera amigable y útil en español
      - Sé específico y detallado con los datos de la colección
      - Si te preguntan sobre un artista específico, menciona TODOS sus álbumes con detalles
      - Si te preguntan sobre un estilo musical, menciona ejemplos específicos de álbumes
      - Si te preguntan sobre precios, usa los valores exactos de la colección
      - Si te preguntan sobre sellos discográficos, menciona los álbumes específicos
      - Proporciona análisis detallados y respuestas completas
      - Puedes hacer comparaciones entre artistas, estilos, años, etc.
      - Termina tus respuestas de manera natural, no las cortes abruptamente
      - Usa la información completa disponible para dar respuestas precisas
      - Si hay información web adicional, úsala para enriquecer tu respuesta con datos históricos, biográficos o técnicos
      - Combina la información de la colección con los datos web para dar respuestas más completas
      - Si se mencionan álbumes específicos, incluye los enlaces a Discogs cuando estén disponibles`;

      const fullPrompt = `${systemPrompt}\n\nUsuario: ${userMessage}`;

      const response = await fetch(`${this.API_URL}?key=${this.API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: fullPrompt
            }]
          }]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        throw new Error(`Error de API: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No se recibió respuesta de la API');
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error al generar respuesta con Gemini:', error);
      throw new Error('No se pudo generar una respuesta. Inténtalo de nuevo.');
    }
  }

  static async analyzeAlbumImage(imageBase64: string): Promise<{ artist: string; album: string }> {
    try {
      console.log('🔍 Analizando imagen de álbum con Gemini Vision...');
      
      // Remover el prefijo data:image/jpeg;base64, si está presente
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      
      // PROMPT OPTIMIZADO para respuestas más rápidas
      const prompt = `Identifica el álbum de música en esta imagen. Responde SOLO con:

ARTISTA: [nombre]
ALBUM: [título]

Sin texto adicional.`;

      // Crear AbortController para timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

      try {
        const response = await fetch(`${this.VISION_API_URL}?key=${this.API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: prompt
                },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }],
            // CONFIGURACIÓN OPTIMIZADA para velocidad
            generationConfig: {
              temperature: 0.1,        // Respuestas más deterministas
              topK: 1,                // Solo la mejor respuesta
              topP: 0.1,              // Respuestas más concisas
              maxOutputTokens: 50,    // Respuestas cortas
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error en Gemini Vision:', errorText);
          throw new Error(`Error de API Vision: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();
        
        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No se recibió respuesta de la API Vision');
        }

        const responseText = data.candidates[0].content.parts[0].text;
        console.log('📝 Respuesta de Gemini Vision:', responseText);

        // Extraer artista y álbum de la respuesta
        const artistMatch = responseText.match(/ARTISTA:\s*(.+)/i);
        const albumMatch = responseText.match(/ALBUM:\s*(.+)/i);

        if (!artistMatch || !albumMatch) {
          throw new Error('Formato de respuesta inesperado de Gemini Vision');
        }

        const artist = artistMatch[1].trim();
        const album = albumMatch[1].trim();

        if (artist === 'DESCONOCIDO' || album === 'DESCONOCIDO') {
          throw new Error('No se pudo identificar completamente el álbum');
        }

        console.log('✅ Álbum identificado:', { artist, album });
        return { artist, album };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Timeout: La API tardó demasiado en responder');
        }
        throw fetchError;
      }

    } catch (error) {
      console.error('Error al analizar imagen con Gemini Vision:', error);
      throw new Error('No se pudo analizar la imagen del álbum. Intenta con otra foto.');
    }
  }

  static formatCollectionContext(collectionData: any[]): string {
    if (!collectionData || collectionData.length === 0) {
      return 'La colección está vacía.';
    }

    const totalAlbums = collectionData.length;
    const artists = new Set();
    const styles = new Set();
    const labels = new Set();
    const years = new Set();
    let totalValue = 0;
    
    // Crear listas detalladas de álbumes
    const albumDetails: Array<{
      title: string;
      artist: string;
      year: string;
      label: string;
      price: number;
      styles: string[];
      discogsId: string | null;
    }> = [];
    const artistAlbums = new Map<string, Array<{
      title: string;
      year: string;
      label: string;
      price: number;
    }>>(); // Para agrupar álbumes por artista

    collectionData.forEach((item: any) => {
      const album = item.albums;
      if (album) {
        if (album.artist) {
          artists.add(album.artist);
          
          // Agrupar álbumes por artista
          if (!artistAlbums.has(album.artist)) {
            artistAlbums.set(album.artist, []);
          }
          const artistAlbumsList = artistAlbums.get(album.artist);
          if (artistAlbumsList) {
            artistAlbumsList.push({
              title: album.title || 'Sin título',
              year: album.release_year || 'Año desconocido',
              label: album.label || 'Sello desconocido',
              price: album.album_stats?.avg_price || 0
            });
          }
        }
        if (album.label) labels.add(album.label);
        if (album.release_year) years.add(album.release_year);
        if (album.album_stats?.avg_price) {
          totalValue += album.album_stats.avg_price;
        }
        if (album.album_styles) {
          album.album_styles.forEach((styleItem: any) => {
            if (styleItem.styles?.name) {
              styles.add(styleItem.styles.name);
            }
          });
        }
        
        // Añadir detalles del álbum
        albumDetails.push({
          title: album.title || 'Sin título',
          artist: album.artist || 'Artista desconocido',
          year: album.release_year || 'Año desconocido',
          label: album.label || 'Sello desconocido',
          price: album.album_stats?.avg_price || 0,
          styles: album.album_styles?.map((s: any) => s.styles?.name).filter(Boolean) || [],
          discogsId: album.discogs_id || null
        });
      }
    });

    // Crear lista de artistas con sus álbumes
    const artistList = Array.from(artistAlbums.entries()).map(([artist, albums]) => {
      return `${artist} (${albums.length} álbum${albums.length > 1 ? 'es' : ''}): ${albums.map((a: any) => a.title).join(', ')}`;
    });

    const context = `
      📊 RESUMEN DE LA COLECCIÓN:
      - Total de álbumes: ${totalAlbums}
      - Artistas únicos: ${artists.size}
      - Estilos musicales: ${styles.size}
      - Sellos discográficos: ${labels.size}
      - Valor estimado total: ${totalValue.toFixed(2)}€
      - Rango de años: ${Math.min(...Array.from(years).map(Number))} - ${Math.max(...Array.from(years).map(Number))}
      
      🎵 LISTA COMPLETA DE ARTISTAS (${artists.size}):
      ${Array.from(artists).join(', ')}
      
      🎼 ARTISTAS CON MÚLTIPLES ÁLBUMES:
      ${Array.from(artistAlbums.entries())
        .filter(([artist, albums]) => albums.length > 1)
        .sort((a, b) => b[1].length - a[1].length)
        .map(([artist, albums]) => `${artist} (${albums.length}): ${albums.map((a: any) => a.title).join(', ')}`)
        .join('\n')}
      
      🎶 ESTILOS MÚSICALES (${styles.size}):
      ${Array.from(styles).join(', ')}
      
      🏷️ SELLOS DISCOGRÁFICOS (${labels.size}):
      ${Array.from(labels).join(', ')}
      
      💰 ÁLBUMES MÁS VALIOSOS:
      ${albumDetails
        .sort((a, b) => b.price - a.price)
        .slice(0, 20)
        .map(album => `• ${album.title} - ${album.artist} (${album.year}) - ${album.price.toFixed(2)}€`)
        .join('\n')}
      
      📈 ÁLBUMES POR ESTILO:
      ${Array.from(styles).map((style) => {
        const albumsInStyle = albumDetails.filter(album => album.styles.includes(style as string));
        return `${style} (${albumsInStyle.length}): ${albumsInStyle.slice(0, 5).map(a => a.title).join(', ')}${albumsInStyle.length > 5 ? ` y ${albumsInStyle.length - 5} más` : ''}`;
      }).join('\n')}
      
      📋 CATÁLOGO COMPLETO DE ÁLBUMES:
      ${albumDetails
        .sort((a, b) => a.artist.localeCompare(b.artist))
        .map(album => {
          const discogsInfo = album.discogsId ? ` - 🔗 https://www.discogs.com/es/release/${album.discogsId}` : '';
          return `• ${album.title} - ${album.artist} (${album.year}) - ${album.label} - ${album.price.toFixed(2)}€ - Estilos: ${album.styles.join(', ')}${discogsInfo}`;
        })
        .join('\n')}
    `;

    return context;
  }
} 