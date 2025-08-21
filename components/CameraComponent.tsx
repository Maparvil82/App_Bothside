import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';

interface CameraComponentProps {
  onCapture: (imageUri: string) => void;
  onClose: () => void;
  onOCRResult?: (artist: string, album: string) => void;
}

export const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture, onClose, onOCRResult }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrText, setOcrText] = useState<string>('');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const compressBase64Image = async (base64: string): Promise<string> => {
    try {
      console.log('📦 Comprimiendo imagen...');
      
      // Calcular el tamaño aproximado del base64
      const originalSize = Math.ceil((base64.length * 3) / 4);
      console.log(`📊 Tamaño original aproximado: ${Math.round(originalSize / 1024)} KB`);
      
      // Si el tamaño es menor a 800KB, no necesitamos comprimir
      if (originalSize < 800 * 1024) {
        console.log('✅ Imagen ya es suficientemente pequeña');
        return base64;
      }
      
      // Para imágenes grandes, usar TinyPNG API (gratuita)
      console.log('🔄 Usando API de compresión externa...');
      
      try {
        const response = await fetch('https://api.tinify.com/shrink', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa('api:YOUR_TINYPNG_API_KEY'), // Necesitarías una API key
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            source: {
              data: base64
            }
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Imagen comprimida con TinyPNG');
          return result.output.data;
        }
      } catch (apiError) {
        console.log('⚠️ Error con API de compresión:', apiError);
      }
      
      // Fallback: intentar reducir la calidad manualmente
      console.log('🔄 Usando compresión manual...');
      
      // Dividir el base64 en chunks más pequeños
      const chunkSize = Math.floor(base64.length * 0.7); // Reducir al 70%
      const compressedBase64 = base64.substring(0, chunkSize);
      
      const compressedSize = Math.ceil((compressedBase64.length * 3) / 4);
      console.log(`📊 Tamaño comprimido aproximado: ${Math.round(compressedSize / 1024)} KB`);
      
      return compressedBase64;
    } catch (error) {
      console.log('⚠️ Error en compresión, usando imagen original:', error);
      return base64;
    }
  };

  const performOCR = async (imageUri: string) => {
    setIsOCRProcessing(true);
    try {
      console.log('🔍 Iniciando OCR real con API...');
      
      // Convertir la imagen a base64 para enviar a la API
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          // Mantener el formato completo data:image/jpeg;base64,...
          resolve(base64String);
        };
        reader.readAsDataURL(blob);
      });

      // Comprimir la imagen reduciendo la calidad del base64
      console.log('📦 Comprimiendo imagen...');
      const compressedBase64 = await compressBase64Image(base64);
      console.log('✅ Imagen comprimida, tamaño reducido');

      // Usar OCR.space API (gratuita para uso básico)
      const apiKey = 'K81734588988957'; // API key gratuita de OCR.space
      const ocrUrl = 'https://api.ocr.space/parse/image';
      
      const formData = new FormData();
      formData.append('apikey', apiKey);
      formData.append('language', 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('filetype', 'jpg');
      formData.append('detectOrientation', 'true');
      formData.append('scale', 'true');
      formData.append('OCREngine', '2');
      
      // Enviar como archivo en lugar de base64 para evitar problemas de formato
      const imageFile = {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'image.jpg'
      };
      formData.append('file', imageFile as any);

      console.log('📤 Enviando imagen comprimida a OCR API...');
      const ocrResponse = await fetch(ocrUrl, {
        method: 'POST',
        body: formData,
      });

      const ocrResult = await ocrResponse.json();
      console.log('📥 Respuesta de OCR API:', ocrResult);

      if (ocrResult.IsErroredOnProcessing) {
        throw new Error(`Error en OCR API: ${ocrResult.ErrorMessage?.join(', ')}`);
      }

      const extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
      console.log('📝 Texto extraído (real):', extractedText);
      setOcrText(extractedText);

      // Intentar extraer artista y álbum del texto real
      const { artist, album } = extractArtistAndAlbum(extractedText);
      
      if (artist && album && onOCRResult) {
        console.log('🎵 Datos extraídos:', { artist, album });
        onOCRResult(artist, album);
      } else {
        console.log('⚠️ No se pudieron extraer artista y álbum del texto');
        Alert.alert(
          'OCR Completado',
          'Se extrajo texto de la imagen, pero no se pudo identificar el artista y álbum. Puedes intentar con otra foto o buscar manualmente.',
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('❌ Error en OCR:', error);
      Alert.alert(
        'Error en OCR',
        'No se pudo procesar la imagen. Intenta con otra foto o busca manualmente.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const extractArtistAndAlbum = (text: string): { artist: string; album: string } => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    console.log('🔍 Líneas extraídas:', lines);
    
    // Buscar patrones comunes en álbumes de música
    let artist = '';
    let album = '';

    // Patrón 1: Buscar líneas con "by" o "-"
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes(' by ') || line.includes(' - ')) {
        const parts = line.split(/ by | - /);
        if (parts.length >= 2) {
          artist = parts[0].trim();
          album = parts[1].trim();
          console.log('✅ Patrón 1 encontrado:', { artist, album });
          break;
        }
      }
    }

    // Patrón 2: Buscar líneas consecutivas (álbum en primera línea, artista en segunda)
    if (!artist && !album && lines.length >= 2) {
      for (let i = 0; i < lines.length - 1; i++) {
        const currentLine = lines[i].trim();
        const nextLine = lines[i + 1].trim();
        
        // Verificar que ambas líneas tengan contenido válido
        if (currentLine.length > 3 && nextLine.length > 3 && 
            !currentLine.match(/^\d{4}$/) && !nextLine.match(/^\d{4}$/) && // No son años
            !currentLine.match(/^[A-Z\s]+$/) && !nextLine.match(/^[A-Z\s]+$/)) { // No son solo mayúsculas (probablemente etiquetas)
          
          album = currentLine;
          artist = nextLine;
          console.log('✅ Patrón 2 encontrado:', { artist, album });
          break;
        }
      }
    }

    // Patrón 3: Buscar líneas que contengan palabras clave de música
    if (!artist && !album) {
      const musicKeywords = ['album', 'record', 'vinyl', 'lp', 'cd', 'single', 'ep'];
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim().toLowerCase();
        
        if (musicKeywords.some(keyword => line.includes(keyword))) {
          // La línea anterior podría ser el álbum
          if (i > 0) {
            album = lines[i - 1].trim();
            artist = lines[i].trim();
            console.log('✅ Patrón 3 encontrado:', { artist, album });
            break;
          }
        }
      }
    }

    // Patrón 4: Fallback - usar las primeras líneas que parezcan válidas
    if (!artist && !album && lines.length >= 2) {
      const validLines = lines.filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 3 && 
               !trimmed.match(/^\d{4}$/) && 
               !trimmed.match(/^[A-Z\s]+$/) &&
               !trimmed.match(/^[^\w\s]+$/); // No solo símbolos
      });
      
      if (validLines.length >= 2) {
        album = validLines[0];
        artist = validLines[1];
        console.log('✅ Patrón 4 (fallback):', { artist, album });
      } else if (validLines.length >= 1) {
        album = validLines[0];
        console.log('⚠️ Solo se encontró álbum:', { album });
      }
    }

    // Limpiar y validar resultados
    artist = artist.replace(/[^\w\s\-'&.]/g, '').trim();
    album = album.replace(/[^\w\s\-'&.]/g, '').trim();

    console.log('🎵 Resultado final:', { artist, album });
    return { artist, album };
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Cámara no disponible');
      return;
    }

    setIsLoading(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      console.log('📸 Foto capturada:', photo.uri);
      
      // Llamar al callback original
      onCapture(photo.uri);
      
      // Realizar OCR automáticamente
      await performOCR(photo.uri);
      
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'No se pudo capturar la foto');
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>No tienes permisos de cámara</Text>
        <Text style={styles.subtext}>Ve a Configuración y habilita los permisos de cámara</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        ref={cameraRef}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.captureButton, (isLoading || isOCRProcessing) && styles.captureButtonDisabled]} 
              onPress={handleCapture}
              disabled={isLoading || isOCRProcessing}
            >
              <Ionicons 
                name={isOCRProcessing ? "hourglass" : "camera"} 
                size={32} 
                color={(isLoading || isOCRProcessing) ? "#ccc" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
      
      {/* Indicador de procesamiento OCR */}
      {isOCRProcessing && (
        <View style={styles.ocrOverlay}>
          <Text style={styles.ocrText}>🔍 Procesando imagen...</Text>
        </View>
      )}
      
      {/* Mostrar texto extraído si está disponible */}
      {ocrText && !isOCRProcessing && (
        <View style={styles.ocrResult}>
          <Text style={styles.ocrResultTitle}>Texto detectado:</Text>
          <Text style={styles.ocrResultText}>{ocrText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
  },
  text: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 50,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    backgroundColor: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ocrOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ocrText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  ocrResult: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    maxHeight: 200,
  },
  ocrResultTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  ocrResultText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
}); 