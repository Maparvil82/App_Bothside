import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { GeminiService } from '../services/gemini';

interface CameraComponentProps {
  onCapture: (imageUri: string) => void;
  onClose: () => void;
  onOCRResult?: (artist: string, album: string) => void;
}

export const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture, onClose, onOCRResult }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const performAIAlbumRecognition = async (imageUri: string) => {
    console.log('🚀 Iniciando análisis de álbum, isAIProcessing:', isAIProcessing);
    setIsAIProcessing(true);
    setAiResult(''); // Limpiar resultado anterior
    console.log('🔄 Estado actualizado, isAIProcessing:', true);
    
    try {
      console.log('🤖 Iniciando reconocimiento de álbum con IA...');
      
      // Convertir la imagen a base64 para enviar a Gemini Vision
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          resolve(base64String);
        };
        reader.readAsDataURL(blob);
      });

      console.log('📤 Enviando imagen a Gemini Vision...');
      
      // Usar Gemini Vision para reconocer el álbum
      const { artist, album } = await GeminiService.analyzeAlbumImage(base64);
      
      console.log('🎵 Álbum reconocido por IA:', { artist, album });
      setAiResult(`🎵 ${album} - ${artist}`);

      // Llamar al callback con los resultados
      if (onOCRResult) {
        onOCRResult(artist, album);
      }

      Alert.alert(
        '✅ Álbum Reconocido',
        `${album} - ${artist}`,
        [{ text: 'Perfecto' }]
      );

    } catch (error) {
      console.error('❌ Error en reconocimiento de IA:', error);
      setAiResult('❌ No se pudo reconocer el álbum');
      
      Alert.alert(
        'Error en Reconocimiento',
        'No se pudo identificar el álbum. Intenta con otra foto o busca manualmente.',
        [{ text: 'OK' }]
      );
    } finally {
      console.log('🏁 Finalizando análisis, estableciendo isAIProcessing a false');
      setIsAIProcessing(false);
    }
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
      
      // PRIMERO: Realizar reconocimiento de álbum con IA
      await performAIAlbumRecognition(photo.uri);
      
      // DESPUÉS: Llamar al callback original solo si el análisis fue exitoso
      if (aiResult && !aiResult.includes('❌')) {
        onCapture(photo.uri);
      }
      
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
              style={[styles.captureButton, (isLoading || isAIProcessing) && styles.captureButtonDisabled]} 
              onPress={handleCapture}
              disabled={isLoading || isAIProcessing}
            >
              <Ionicons 
                name={isAIProcessing ? "hourglass" : "camera"} 
                size={32} 
                color={(isLoading || isAIProcessing) ? "#ccc" : "white"} 
              />
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
      
      {/* Indicador de procesamiento de IA */}
      {isAIProcessing && (
        <View style={styles.aiOverlay}>
          <View style={styles.aiProcessingContainer}>
            <Text style={styles.aiText}>🤖 Analizando portada...</Text>
            <Text style={styles.aiSubtext}>Esto puede tomar unos segundos</Text>
            <View style={styles.loadingSpinner}>
              <Text style={styles.spinnerText}>⏳</Text>
            </View>
          </View>
        </View>
      )}
      
      {/* Mostrar resultado de IA si está disponible */}
      {aiResult && !isAIProcessing && (
        <View style={styles.aiResult}>
          <Text style={styles.aiResultTitle}>✅ Álbum Reconocido:</Text>
          <Text style={styles.aiResultText}>{aiResult}</Text>
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
  aiOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  aiProcessingContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    maxWidth: 300,
  },
  aiSubtext: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  spinnerText: {
    fontSize: 24,
    color: 'white',
  },
  aiResult: {
    position: 'absolute',
    bottom: 150,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 10,
    maxHeight: 200,
  },
  aiResultTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  aiResultText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
}); 