import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

interface FloatingAudioPlayerProps {
  visible: boolean;
  audioUri: string;
  albumTitle: string;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

export const FloatingAudioPlayer: React.FC<FloatingAudioPlayerProps> = ({
  visible,
  audioUri,
  albumTitle,
  onClose,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [slideAnim] = useState(new Animated.Value(0));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      console.log('🔍 FloatingAudioPlayer: Component became visible');
      console.log('🔍 FloatingAudioPlayer: Audio URI:', audioUri);
      console.log('🔍 FloatingAudioPlayer: Album title:', albumTitle);
      
      setError(null);
      loadAudio();
      
      // Animación de entrada
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    } else {
      // Animación de salida
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
      
      // Limpiar el sonido cuando se oculta
      if (sound) {
        sound.unloadAsync();
        setSound(null);
      }
    }
  }, [visible, audioUri]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  const loadAudio = async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    
    try {
      console.log('🔍 FloatingAudioPlayer: Loading audio from URI:', audioUri);
      
      if (!audioUri) {
        const errorMsg = 'No audio URI provided';
        console.error('❌ FloatingAudioPlayer:', errorMsg);
        setError(errorMsg);
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setIsPlaying(false);
      
      // Timeout para evitar carga infinita
      timeoutId = setTimeout(() => {
        console.warn('⚠️ FloatingAudioPlayer: Loading timeout');
        setError('Tiempo de carga agotado. Inténtalo de nuevo.');
        setIsLoading(false);
      }, 30000); // 30 segundos timeout
      
      if (sound) {
        console.log('🔍 FloatingAudioPlayer: Unloading previous sound');
        await sound.unloadAsync();
      }

      console.log('🔍 FloatingAudioPlayer: Creating new sound...');
      
      // Validación mejorada de URI
      if (!audioUri.startsWith('file://') && !audioUri.startsWith('http://') && !audioUri.startsWith('https://')) {
        const errorMsg = `Invalid URI format: ${audioUri}`;
        console.error('❌ FloatingAudioPlayer:', errorMsg);
        setError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Para URLs HTTP/HTTPS, verificar que sean accesibles
      if (audioUri.startsWith('http')) {
        // Skip validation for known good fallback URLs and YouTube audio URLs
        const knownGoodUrls = [
          'cs.uic.edu',
          'sample-videos.com',
          'cobalt.tools',
          'loader.to',
          'savetube.me',
          'vevioz.com'
        ];
        
        const isKnownGoodUrl = knownGoodUrls.some(domain => audioUri.includes(domain));
        
        if (!isKnownGoodUrl) {
          try {
            console.log('🔍 FloatingAudioPlayer: Validating HTTP URL...');
            const response = await fetch(audioUri, { 
              method: 'HEAD',
              headers: {
                'User-Agent': 'BothsideApp/1.0'
              }
            });
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            console.log('🔍 FloatingAudioPlayer: URL validation successful');
          } catch (fetchError) {
            console.error('❌ FloatingAudioPlayer: URL validation failed:', fetchError);
            setError(`URL no accesible: ${fetchError}`);
            setIsLoading(false);
            return;
          }
        } else {
          console.log('🔍 FloatingAudioPlayer: Skipping validation for known good URL');
        }
      }
      
      console.log('🔍 FloatingAudioPlayer: URI format is valid, creating sound...');
      
      // Configurar el modo de audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      
      // Crear el sonido con configuración más robusta
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { 
          shouldPlay: false, // No reproducir automáticamente para mejor control
          progressUpdateIntervalMillis: 100,
          positionMillis: 0,
          isLooping: false,
          volume: 1.0,
        },
        onPlaybackStatusUpdate
      );

      console.log('🔍 FloatingAudioPlayer: Sound created successfully');
      setSound(newSound);
      
      // Verificar que el audio se cargó correctamente
      const status = await newSound.getStatusAsync();
      console.log('🔍 FloatingAudioPlayer: Initial sound status:', status);
      
      if (!status.isLoaded) {
        const errorMsg = 'Failed to load audio file';
        console.error('❌ FloatingAudioPlayer:', errorMsg);
        setError(errorMsg);
        // Limpiar el sonido si no se pudo cargar
        await newSound.unloadAsync();
        setSound(null);
      } else {
        console.log('🔍 FloatingAudioPlayer: Audio loaded successfully');
        // Limpiar timeout
        if (timeoutId) clearTimeout(timeoutId);
        // Iniciar reproducción automáticamente
        try {
          await newSound.playAsync();
          console.log('🔍 FloatingAudioPlayer: Auto-play started');
          setIsPlaying(true);
        } catch (playError) {
          console.error('❌ FloatingAudioPlayer: Error starting auto-play:', playError);
          setError(`Error de reproducción: ${playError}`);
          setIsPlaying(false);
        }
      }
      
      setIsLoading(false);
      
    } catch (error) {
      console.error('❌ FloatingAudioPlayer: Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(`Error loading audio: ${errorMessage}`);
      setIsLoading(false);
      setIsPlaying(false);
      
      // Limpiar timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      // Limpiar el sonido en caso de error
      if (sound) {
        try {
          await sound.unloadAsync();
        } catch (cleanupError) {
          console.warn('⚠️ FloatingAudioPlayer: Error during cleanup:', cleanupError);
        }
        setSound(null);
      }
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      const newIsPlaying = !status.isPaused;
      
      console.log('🔍 FloatingAudioPlayer: Status update:', {
        isPlaying: newIsPlaying,
        isPaused: status.isPaused,
        position: status.positionMillis,
        duration: status.durationMillis
      });
      
      setIsPlaying(newIsPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);

      if (status.didJustFinish) {
        console.log('🔍 FloatingAudioPlayer: Audio finished');
        setIsPlaying(false);
        setPosition(0);
      }
    } else if (status.error) {
      console.error('❌ FloatingAudioPlayer: Playback error:', status.error);
      const errorMessage = status.error.message || status.error;
      setError(`Error de reproducción: ${errorMessage}`);
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const togglePlayPause = async () => {
    console.log('🔍 FloatingAudioPlayer: togglePlayPause called, sound exists:', !!sound);
    console.log('🔍 FloatingAudioPlayer: Audio URI:', audioUri);
    console.log('🔍 FloatingAudioPlayer: Is playing:', isPlaying);
    
    if (!sound) {
      console.log('❌ FloatingAudioPlayer: No sound available, trying to load again...');
      await loadAudio();
      return;
    }

    try {
      // Obtener el estado actual del sonido
      const status = await sound.getStatusAsync();
      console.log('🔍 FloatingAudioPlayer: Current sound status:', status);
      
      if (!status.isLoaded) {
        console.log('❌ FloatingAudioPlayer: Sound not loaded, reloading...');
        await loadAudio();
        return;
      }
      
      if (isPlaying) {
        console.log('🔍 FloatingAudioPlayer: Pausing audio...');
        await sound.pauseAsync();
        console.log('🔍 FloatingAudioPlayer: Audio paused successfully');
        // El estado isPlaying se actualizará automáticamente en onPlaybackStatusUpdate
      } else {
        console.log('🔍 FloatingAudioPlayer: Playing audio...');
        // Verificar si el audio terminó y necesitamos reiniciarlo
        if (status.didJustFinish || position >= duration) {
          console.log('🔍 FloatingAudioPlayer: Audio finished, restarting from beginning...');
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        console.log('🔍 FloatingAudioPlayer: Audio play command sent');
        // El estado isPlaying se actualizará automáticamente en onPlaybackStatusUpdate
      }
    } catch (error) {
      console.error('❌ FloatingAudioPlayer: Error toggling play/pause:', error);
      setError(`Playback error: ${error}`);
      
      // Intentar recargar el audio si hay error
      console.log('🔍 FloatingAudioPlayer: Attempting to reload audio...');
      await loadAudio();
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [100, 0],
              }),
            },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.albumInfo}>
          <Ionicons name="musical-note" size={16} color="#007AFF" />
          <Text style={styles.albumTitle} numberOfLines={1}>
            {albumTitle}
          </Text>
        </View>

        <View style={styles.controls}>
          {error ? (
            // Mostrar error al usuario
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#dc3545" />
              <Text style={styles.errorText} numberOfLines={2}>
                {error.includes('timeout') ? 'Tiempo agotado' : 
                 error.includes('HTTP') ? 'Error de conexión' :
                 error.includes('NSURLErrorDomain') ? 'URL no válida' :
                 'Error de audio'}
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={loadAudio}
              >
                <Ionicons name="refresh" size={16} color="#007AFF" />
              </TouchableOpacity>
            </View>
          ) : (
            // Controles normales
            <>
              <TouchableOpacity
                style={[styles.controlButton, isLoading && styles.disabledButton]}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                <Ionicons
                  name={isLoading ? 'hourglass' : (isPlaying ? 'pause' : 'play')}
                  size={20}
                  color={isLoading ? '#999' : '#007AFF'}
                />
              </TouchableOpacity>

              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {formatTime(position)} / {formatTime(duration)}
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20, // Distancia desde abajo
    right: 20, // Distancia desde la derecha
    backgroundColor: 'white',
    borderRadius: 12, // Bordes redondeados
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 300, // Ancho máximo
    minWidth: 200, // Ancho mínimo
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  albumInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  albumTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'flex-end', // Alinear elementos hacia abajo
    flex: 1,
    paddingBottom: 4, // Añadir padding inferior
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 4,
    marginTop: 8, // Mover el botón más abajo
  },
  disabledButton: {
    opacity: 0.5,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  closeButton: {
    padding: 8,
    marginLeft: 4,
    marginTop: 4, // Mover el botón más abajo para alinearlo con el botón de play
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#721c24',
  },
  retryButton: {
    padding: 4,
  },
}); 