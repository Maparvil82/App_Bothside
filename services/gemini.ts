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
  private static readonly API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent';
  private static readonly VISION_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent';
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
      
      INSTRUCCIONES IMPORTANTES:
      - Tienes acceso completo a todos los datos de la colección (171 álbumes, 144 artistas, 28 estilos) listados en el "CATÁLOGO COMPLETO DE ÁLBUMES".
      - ADEMÁS, tienes acceso a "HISTORIAS Y NOTAS PERSONALES" que el usuario ha escrito sobre algunos discos.
      - Responde de manera amigable y útil en español.
      - Sé específico y detallado con los datos de la colección.
      - Si te preguntan sobre un artista específico, menciona TODOS sus álbumes con detalles.
      - Si te preguntan sobre un estilo musical, menciona ejemplos específicos de álbumes.
      - Si te preguntan sobre precios, usa los valores exactos de la colección.
      - Si te preguntan sobre sellos discográficos, menciona los álbumes específicos.
      - Proporciona análisis detallados y respuestas completas.
      - Puedes hacer comparaciones entre artistas, estilos, años, etc.
      - Termina tus respuestas de manera natural, no las cortes abruptamente.
      - Usa la información completa disponible para dar respuestas precisas.
      - Si hay información web adicional, úsala para enriquecer tu respuesta con datos históricos, biográficos o técnicos.
      - Combina la información de la colección con los datos web y las historias personales para dar respuestas más completas y personalizadas.
      
      INFORMACIÓN COMPLETA DE LA COLECCIÓN:
      ${collectionContext}
      
      ${webInfo ? `INFORMACIÓN ADICIONAL DE LA WEB:\n${webInfo}` : ''}`;

      const fullPrompt = `${systemPrompt}\n\nUsuario: ${userMessage}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const response = await fetch(`${this.API_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'x-goog-api-key': this.API_KEY,
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
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Analizando imagen de álbum con Gemini Vision... (Intento ${attempt}/${maxRetries})`);

        // Remover el prefijo data:image/jpeg;base64, si está presente
        const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

        // PROMPT DE EXPERTO EN MÚSICA para análisis completo del disco
        const prompt = `Eres un EXPERTO EN MÚSICA y DISCOGRAFÍA con 30 años de experiencia. Analiza esta imagen de un álbum con la precisión de un profesional.

ANÁLISIS REQUERIDO:
1. **TEXTO VISIBLE**: Lee exactamente el nombre del artista y título del álbum
2. **DISEÑO VISUAL**: Observa colores, tipografías, estilo gráfico
3. **ELEMENTOS DISTINTIVOS**: Logos, sellos discográficos, años, códigos
4. **COMPOSICIÓN**: Layout, posicionamiento de elementos
5. **ESTILO ARTÍSTICO**: Género musical sugerido por la estética

REGLAS DE EXPERTO:
- Identifica al artista REAL, no variaciones o nombres similares
- Distingue entre "Bill Spoon" y "Bill Brandon" como artistas completamente diferentes
- Si ves "The Beatles" NO lo confundas con "The Beats" o similar
- Si ves "Pink Floyd" NO lo confundas con "Pink" o "Floyd"
- Analiza el contexto visual completo, no solo texto
- Si hay elementos únicos (logos, sellos, años), úsalos para confirmar identidad

CRITERIOS DE VALIDACIÓN:
- El artista debe coincidir EXACTAMENTE con lo visible
- El título debe ser el que aparece en la portada
- Si hay dudas sobre la identidad, escribe "DESCONOCIDO"
- NO uses conocimiento previo para "corregir" lo que ves
- NO confundas artistas con nombres parecidos

IMPORTANTE: Como experto, tu reputación depende de la precisión. Si no puedes identificar con 100% de certeza, escribe "DESCONOCIDO".

Responde ÚNICAMENTE en este formato:

ARTISTA: [nombre exacto del artista o DESCONOCIDO]
ALBUM: [título exacto del álbum o DESCONOCIDO]

Sin explicaciones adicionales.`;

        // Crear AbortController para timeout más generoso
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout

        try {
          const response = await fetch(`${this.VISION_API_URL}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'x-goog-api-key': this.API_KEY,
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
              // CONFIGURACIÓN OPTIMIZADA para precisión
              generationConfig: {
                temperature: 0.0,        // Máxima precisión, sin creatividad
                topK: 1,                // Solo la mejor respuesta
                topP: 0.1,              // Respuestas más concisas
                maxOutputTokens: 100,   // Suficiente para nombres completos
              }
            }),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Error en Gemini Vision (intento ${attempt}):`, errorText);
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

          // Validar que no sean respuestas vacías o genéricas
          if (!artist || !album || artist === 'DESCONOCIDO' || album === 'DESCONOCIDO') {
            throw new Error('No se pudo identificar completamente el álbum');
          }

          // Validar que no sean respuestas demasiado genéricas
          if (artist.length < 2 || album.length < 2) {
            throw new Error('Nombres de artista o álbum demasiado cortos');
          }

          console.log('✅ Álbum identificado:', { artist, album });
          return { artist, album };

        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            lastError = new Error('Timeout: La API tardó demasiado en responder');
            console.log(`⏰ Timeout en intento ${attempt}, ${attempt < maxRetries ? 'reintentando...' : 'agotados todos los intentos'}`);
          } else {
            lastError = fetchError;
            console.log(`❌ Error en intento ${attempt}:`, fetchError.message);
          }

          // Si no es el último intento, esperar un poco antes de reintentar
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Espera progresiva
          }
        }

      } catch (error) {
        lastError = error as Error;
        console.error(`Error al analizar imagen con Gemini Vision (intento ${attempt}):`, error);

        // Si no es el último intento, esperar un poco antes de reintentar
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Espera progresiva
        }
      }
    }

    // Si llegamos aquí, todos los intentos fallaron
    console.error('❌ Todos los intentos de análisis fallaron');
    throw new Error('No se pudo analizar la imagen del álbum después de varios intentos. Intenta con otra foto o verifica tu conexión.');
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