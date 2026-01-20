import { GoogleGenerativeAI, ChatSession, GenerativeModel } from '@google/generative-ai';
import { ENV } from '../config/env';
import { UserCollection } from './database';

export class GeminiService {
    private static genAI: GoogleGenerativeAI;
    private static model: GenerativeModel;
    private static chatSession: ChatSession | null = null;

    private static initialize() {
        if (!this.genAI) {
            if (!ENV.GEMINI_API_KEY) {
                console.error('❌ GeminiService: Missing API Key');
                throw new Error('Gemini API Key is missing');
            }
            console.log('🔑 GeminiService: Initializing with Key prefix:', ENV.GEMINI_API_KEY.substring(0, 8) + '...');
            this.genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        }
    }

    /**
     * Generates a system instruction/context based on the user's collection.
     */
    static generateContextFromCollection(collection: any[]): string {
        if (!collection || collection.length === 0) {
            return "El usuario no tiene discos en su colección actualmente.";
        }

        // 1. Pre-procesar la colección para calcular precios y ordenarlos
        const processedCollection = collection.map((item) => {
            const album = item.albums;
            if (!album) return null;

            // Procesar estilos
            const styles = album.album_styles
                ?.map((s: any) => s.styles?.name)
                .filter(Boolean)
                .join(', ') || 'Desconocido';

            // Procesar precio (usar avg_price o high_price de stats)
            const stats = Array.isArray(album.album_stats) ? album.album_stats[0] : album.album_stats;
            const avgPrice = stats?.avg_price || 0;
            const highPrice = stats?.high_price || 0;
            const displayPrice = avgPrice > 0 ? avgPrice : highPrice;

            return {
                title: album.title,
                artist: album.artist,
                year: album.release_year || 'Año desconocido',
                styles,
                price: displayPrice,
                priceSource: avgPrice > 0 ? 'avg' : 'high',
                currency: 'USD' // Asumimos USD por defecto en Discogs
            };
        }).filter(Boolean) as any[];

        // 2. Identificar los más caros explícitamente
        const topExpensive = [...processedCollection]
            .sort((a, b) => b.price - a.price)
            .slice(0, 5)
            .map((item, index) => `${index + 1}. "${item.title}" (${item.price > 0 ? '$' + item.price : 'Sin precio'})`)
            .join('\n');

        // 3. Generar la lista completa
        const albumsList = processedCollection.map((img) => {
            const priceText = img.price > 0 ? `$${img.price}` : 'Sin estimación';
            return `- "${img.title}" de ${img.artist} (${img.year}) | Estilos: ${img.styles} | Valor Est.: ${priceText}`;
        }).join('\n');

        return `
Eres un experto en música, vinilos y mercado discográfico.
Estás hablando con el dueño de una colección de discos.

*** DATOS CLAVE DE LA COLECCIÓN ***
Top 5 Discos Más Valiosos (Úsalos si preguntan por lo más caro):
${topExpensive}

Aquí tienes la lista COMPLETA de su colección:
${albumsList}

Instrucciones:
1. ANÁLISIS DE VALOR: Si preguntan por el disco más caro, REVISA SIEMPRE la lista de "Top 5 Discos Más Valiosos" primero.
2. GÉNEROS/ESTILOS: Si preguntan qué estilos escucha, analiza los campos "Estilos" de la lista completa.
3. RECOMENDACIONES: Basa tus recomendaciones en los estilos que predominan en su colección.
4. CURIOSIDADES: Si ves discos raros o caros, coméntalo proactivamente.
5. Responde siempre en Español con tono experto pero cercano.
`.trim();
    }

    /**
     * Starts a new chat session with the provided context.
     */
    static async startChat(history: { role: 'user' | 'model', parts: string }[] = [], systemInstruction?: string) {
        this.initialize();

        // Note: 'systemInstruction' is supported in newer models/SDK versions as a separate config
        // For gemini-pro (v1), we often prepend it to the history or first message, 
        // but the SDK now supports 'systemInstruction' at model retrieval or via specific methods depending on version.
        // For simplicity with standard gemini-pro, we will include the context as the first "user" message 
        // if it's not already established, OR use the systemInstruction property if using a model that supports it (like 1.5).
        // Let's stick to prepending context for robustness across model versions for now unless we switch to 1.5-flash.

        // Attempting to use a model that likely supports system instructions well or fall back to prepending.
        // Let's try 1.5-flash explicitly if available for better context handling, otherwise standard pro.
        // Updating model initialization to try a newer model if possible, or stick to 'gemini-pro'.

        // Re-initializing with specific model if needed, but for now using the instance 'model'.

        // We will inject the system context as a 'user' message with a 'model' acknowledgement at the start of history
        // to "prime" the chat if no history exists.

        let adjustedHistory = [...history];

        if (systemInstruction && adjustedHistory.length === 0) {
            adjustedHistory = [
                {
                    role: 'user',
                    parts: [{ text: `Instrucciones del Sistema:\n${systemInstruction}` as any }]
                },
                {
                    role: 'model',
                    parts: [{ text: "Entendido. He analizado tu colección y estoy listo para responder preguntas sobre ella." as any }]
                }
            ] as any;
        }

        this.chatSession = this.model.startChat({
            history: adjustedHistory as any,
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        return this.chatSession;
    }

    /**
     * Sends a message to the active chat session.
     */
    static async sendMessage(message: string): Promise<string> {
        if (!this.chatSession) {
            throw new Error('Chat session not initialized. Call startChat first.');
        }

        try {
            const result = await this.chatSession.sendMessage(message);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ GeminiService: Error sending message:', error);
            throw error;
        }
    }

    /**
     * Simple one-off generation (non-chat)
     */
    static async generateContent(prompt: string): Promise<string> {
        this.initialize();
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }
    /**
     * Identifies an album from a base64 image.
     * Returns a JSON string with { artist, title } or throws an error.
     */
    static async identifyAlbumFromImage(base64Image: string): Promise<{ artist: string; title: string }> {
        this.initialize();

        const prompt = `
Identifica el álbum de vinilo en esta imagen.
Responde SOLAMENTE con un objeto JSON válido (sin markdown, sin texto extra) con el siguiente formato:
{
  "artist": "Nombre del Artista",
  "title": "Título del Álbum"
}
Si no puedes identificar el álbum con certeza, responde con un JSON con campos vacíos o null.
`;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType: "image/jpeg",
            },
        };

        try {
            // Note: Use gemini-1.5-flash for best vision performance if available, otherwise current model
            // For now reusing the instance model (gemini-2.0-flash-lite should be multimodal)
            const result = await this.model.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            // Clean markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const data = JSON.parse(jsonStr);
            return data;
        } catch (error) {
            console.error('❌ GeminiService: Error identifying image:', error);
            throw error;
        }
    }
}
