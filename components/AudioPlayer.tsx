import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer as ExpoAudioPlayer, type AudioStatus } from 'expo-audio';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  onError?: (error: string) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  title,
  onError,
}) => {
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const soundRef = useRef<ExpoAudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAudio();
    return () => {
      soundRef.current?.remove();
      soundRef.current = null;
    };
  }, [audioUrl]);

  const loadAudio = async () => {
    if (!audioUrl) return;

    try {
      setIsLoading(true);
      setError(null);

      soundRef.current?.remove();
      soundRef.current = null;

      // Configurar el modo de audio
      await setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      console.log('🎵 Intentando cargar audio desde:', audioUrl);

      // Crear el sonido con configuración más robusta
      const player = createAudioPlayer({ uri: audioUrl }, { updateInterval: 100 });
      player.loop = false;
      player.volume = 1;
      player.addListener('playbackStatusUpdate', onPlaybackStatusUpdate);
      soundRef.current = player;
      setIsLoading(false);
      console.log('✅ Audio cargado exitosamente');

    } catch (error) {
      console.error('❌ Error loading audio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMessage);
      setIsLoading(false);
      onError?.(errorMessage);
    }
  };

  const onPlaybackStatusUpdate = (status: AudioStatus) => {
    if (status.isLoaded) {
      setIsPlaying(status.playing);
      setDuration(status.duration * 1000);
      setPosition(status.currentTime * 1000);
    }
  };

  const togglePlayPause = async () => {
    const sound = soundRef.current;
    if (!sound) return;

    try {
      if (isPlaying) {
        sound.pause();
      } else {
        sound.play();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
      setError('Error al reproducir el audio');
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    if (duration === 0) return 0;
    return (position / duration) * 100;
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color="#dc3545" />
          <Text style={styles.errorText}>Error al cargar el audio</Text>
          <Text style={styles.errorDetails}>{error}</Text>
          <TouchableOpacity style={[styles.retryButton, { backgroundColor: primaryColor }]} onPress={loadAudio}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.playerContainer}>
        <View style={styles.header}>
          <Ionicons name="musical-notes" size={20} color="#000" />
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
        </View>

        <View style={styles.controlsContainer}>
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: primaryColor }]}
            onPress={togglePlayPause}
            disabled={isLoading}
          >
            {isLoading ? (
              <BothsideLoader size="small" fullscreen={false} />
            ) : (
              <Ionicons
                name={isPlaying ? "pause" : "play"}
                size={24}
                color="#fff"
              />
            )}
          </TouchableOpacity>

          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${getProgressPercentage()}%`, backgroundColor: primaryColor }
                ]}
              />
            </View>
            <View style={styles.timeContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  playerContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginLeft: 8,
    flex: 1,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 2,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 12,
    color: '#6c757d',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 14,
    marginTop: 8,
    marginBottom: 4,
  },
  errorDetails: {
    color: '#6c757d',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});
