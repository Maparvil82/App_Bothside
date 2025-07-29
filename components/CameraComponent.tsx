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

  const performOCR = async (imageUri: string) => {
    setIsOCRProcessing(true);
    try {
      console.log('🔍 Iniciando OCR simulado...');
      
      // Simular procesamiento de OCR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Texto simulado extraído de una imagen de álbum
      const simulatedText = `The Dark Side of the Moon
Pink Floyd
1973
Harvest Records
Progressive Rock`;
      
      console.log('📝 Texto extraído (simulado):', simulatedText);
      setOcrText(simulatedText);

      // Intentar extraer artista y álbum del texto
      const { artist, album } = extractArtistAndAlbum(simulatedText);
      
      if (artist && album && onOCRResult) {
        onOCRResult(artist, album);
      }

      return simulatedText;
    } catch (error) {
      console.error('❌ Error en OCR:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen con OCR');
      return null;
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const extractArtistAndAlbum = (text: string): { artist: string; album: string } => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Buscar patrones comunes en álbumes de música
    let artist = '';
    let album = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Si encontramos una línea con "by" o "-", podría ser artista
      if (line.includes(' by ') || line.includes(' - ')) {
        const parts = line.split(/ by | - /);
        if (parts.length >= 2) {
          artist = parts[0].trim();
          album = parts[1].trim();
          break;
        }
      }
      
      // Si encontramos líneas consecutivas, la primera podría ser el álbum y la segunda el artista
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1].trim();
        if (line.length > 3 && nextLine.length > 3) {
          album = line;
          artist = nextLine;
          break;
        }
      }
    }

    // Si no encontramos nada específico, usar las primeras líneas
    if (!artist && !album && lines.length >= 2) {
      album = lines[0];
      artist = lines[1];
    } else if (!artist && !album && lines.length >= 1) {
      album = lines[0];
    }

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