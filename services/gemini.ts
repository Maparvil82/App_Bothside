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

interface AlbumStory {
  user_collection_id: string;
  question_1?: string; // ¿Qué significa este álbum para ti?
  question_2?: string; // ¿Cuál es tu canción favorita y por qué?
  question_3?: string; // ¿Tienes algún recuerdo especial asociado?
  question_4?: string; // ¿Cuándo sueles escucharlo?
  question_5?: string; // Notas adicionales
}

export class GeminiService {
  // Google Gemini API Key
  private static readonly API_KEY = ENV.GEMINI_API_KEY;
  // Modelo estándar y estable
  private static readonly MODEL_NAME = 'gemini-1.5-flash';

  static async generateResponse(
    userMessage: string,
    collectionContext: string,
    collectionData?: CollectionAlbum[]
  ): Promise<string> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    // Buscar información web (solo un intento, ya que WebSearchService debe manejar sus propios errores)
    let webInfo = '';
    try {
      if (collectionData && collectionData.length > 0) {
        webInfo = await WebSearchService.enrichResponseWithCollection(userMessage, collectionData);
      } else {
        webInfo = await WebSearchService.enrichResponse(userMessage, collectionContext);
      }
    } catch (e) {
      console.warn('⚠️ Web search failed, continuing without it:', e);
    }

    const systemPrompt = `Eres un asistente experto en música y colecciones de discos con acceso completo a toda la información de la colección del usuario, como si fueras Gemini Web.
    
    INSTRUCCIONES IMPORTANTES:
    - Tienes acceso completo a todos los datos de la colección (171 álbumes, 144 artistas, 28 estilos) listados en el "CATÁLOGO COMPLETO DE ÁLBUMES".
    - ADEMÁS, tienes acceso a "HISTORIAS Y NOTAS PERSONALES" que el usuario ha escrito sobre algunos discos.
    - Responde de manera amigable y útil en español.
    - Sé específico y detallado con los datos de la colección.
    - Termina tus respuestas de manera natural.
    
    INFORMACIÓN COMPLETA DE LA COLECCIÓN:
    ${collectionContext}
    
    ${webInfo ? `INFORMACIÓN ADICIONAL DE LA WEB:\n${webInfo}` : ''}`;

    const fullPrompt = `${systemPrompt}\n\nUsuario: ${userMessage}`;

    // URL directa al modelo estable
    const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`💬 Generando respuesta de Chat... (Intento ${attempt}/${maxRetries})`);

        const controller = new AbortController();
        const timeoutDuration = 15000 + (attempt * 5000); // 15s, 20s, 25s
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const response = await fetch(`${modelUrl}?key=${this.API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: fullPrompt
              }]
            }]
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Chat API Error (Intento ${attempt}): ${response.status} - ${errorText}`);

          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            throw new Error(`Rate limit exceeded (429)`);
          }

          throw new Error(`Error de API: ${response.status}`);
        }

        const data: GeminiResponse = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('No se recibió respuesta de la API');
        }

        return data.candidates[0].content.parts[0].text;

      } catch (error: any) {
        lastError = error;
        console.error(`⚠️ Fallo en chat (Intento ${attempt}):`, error.message);

        if (attempt < maxRetries) {
          const waitTime = 1000 * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }

    throw new Error('No se pudo generar una respuesta después de varios intentos. Verifique su conexión.');
  }

  static async analyzeAlbumImage(imageBase64: string): Promise<{ artist: string; album: string }> {
    const maxRetries = 3;
    let lastError: Error | null = null;
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    console.log('🔍 Iniciando análisis con MODELO ESTÁNDAR (gemini-1.5-flash).');

    // Log de seguridad para verificar la key (oculta)
    const keyMasked = this.API_KEY ? `${this.API_KEY.substring(0, 5)}...${this.API_KEY.substring(this.API_KEY.length - 4)}` : 'UNDEFINED';
    console.log(`🔑 Key en uso: ${keyMasked}`);

    const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL_NAME}:generateContent`;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🚀 Intento ${attempt}/${maxRetries} conectando a Gemini...`);

        const controller = new AbortController();
        const timeoutDuration = 25000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

        const prompt = `Identify the music album in this image. Return strictly JSON: {"artist": "Name", "album": "Title"}. Nothing else.`;

        const response = await fetch(`${modelUrl}?key=${this.API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1, // Baja temperatura para precisión
              responseMimeType: "application/json"
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`❌ Error API (${response.status}): ${errorText}`);
          if (response.status === 400 && errorText.includes('API key')) throw new Error('API Key inválida o rechazada por Google.');
          if (response.status === 429) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue; // Retry
          }
          throw new Error(`Error del servidor (${response.status})`);
        }

        const data: GeminiResponse = await response.json();

        if (!data.candidates || data.candidates.length === 0) {
          throw new Error('Respuesta vacía de Google');
        }

        const text = data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim();
        const { artist, album } = JSON.parse(text);

        if (!artist || !album) throw new Error('No se detectó artista/álbum válido');

        console.log('✅ Reconocido:', artist, '-', album);
        return { artist, album };

      } catch (error: any) {
        lastError = error;
        console.error(`⚠️ Error intento ${attempt}:`, error.message);
        if (error.message.includes('API Key')) throw error; // No reintentar si la key es mala
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    throw new Error(lastError?.message || 'Fallo de conexión');
  }

  static formatCollectionContext(collectionData: any[], albumStories: AlbumStory[] = []): string {
    if (!collectionData || collectionData.length === 0) {
      return 'La colección está vacía.';
    }

    const totalAlbums = collectionData.length;
    const artists = new Set();
    const styles = new Set();
    const labels = new Set();
    const years = new Set();
    let totalValue = 0;

    // Crear mapa de historias para acceso rápido
    const storiesMap = new Map<string, AlbumStory>();
    albumStories.forEach(story => {
      if (story.user_collection_id) {
        storiesMap.set(story.user_collection_id, story);
      }
    });

    // Crear maletas detalladas de álbumes
    const albumDetails: Array<{
      id: string; // user_collection_id
      title: string;
      artist: string;
      year: string;
      label: string;
      price: number;
      styles: string[];
      discogsId: string | null;
      hasStory: boolean;
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
          id: item.id || item.album_id, // Asegurar que tenemos el ID correcto para mapear historias
          title: album.title || 'Sin título',
          artist: album.artist || 'Artista desconocido',
          year: album.release_year || 'Año desconocido',
          label: album.label || 'Sello desconocido',
          price: album.album_stats?.avg_price || 0,
          styles: album.album_styles?.map((s: any) => s.styles?.name).filter(Boolean) || [],
          discogsId: album.discogs_id || null,
          hasStory: storiesMap.has(item.id || item.album_id)
        });
      }
    });

    // Formatear historias de usuarios
    let storiesContext = '';
    const albumsWithStories = albumDetails.filter(a => a.hasStory);

    if (albumsWithStories.length > 0) {
      storiesContext = `
      📖 HISTORIAS Y NOTAS PERSONALES DEL USUARIO (${albumsWithStories.length} historias):
      El usuario ha compartido detalles personales sobre los siguientes álbumes. USA ESTA INFORMACIÓN para personalizar tus respuestas y recomendaciones.
      
      ${albumsWithStories.map(album => {
        const story = storiesMap.get(album.id);
        if (!story) return '';

        const parts = [];
        if (story.question_1) parts.push(`- Significado: "${story.question_1}"`);
        if (story.question_2) parts.push(`- Canción favorita: "${story.question_2}"`);
        if (story.question_3) parts.push(`- Recuerdo: "${story.question_3}"`);
        if (story.question_4) parts.push(`- Momento de escucha: "${story.question_4}"`);
        if (story.question_5) parts.push(`- Notas: "${story.question_5}"`);

        return `📀 SOBRE "${album.title}" de ${album.artist}:\n${parts.join('\n')}`;
      }).join('\n\n')}
      `;
    }

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
          const storyIndicator = album.hasStory ? ' [⭐ TIENE HISTORIA PERSONAL]' : '';
          return `• ${album.title} - ${album.artist} (${album.year}) - ${album.label} - ${album.price.toFixed(2)}€ - Estilos: ${album.styles.join(', ')}${storyIndicator}`;
        })
        .join('\n')}

      ${storiesContext}
    `;

    return context;
  }
} 