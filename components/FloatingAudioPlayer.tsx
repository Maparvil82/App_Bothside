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
import { AppColors } from '../src/theme/colors';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from "react-native-youtube-iframe";

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

  const [isMinimized, setIsMinimized] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      console.log('🔍 FloatingAudioPlayer: Component became visible');
      console.log('🔍 FloatingAudioPlayer: Audio URI:', audioUri);

      setError(null);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);

      // Check if it's a YouTube URL
      const ytId = extractVideoId(audioUri);
      if (ytId) {
        console.log('🔍 FloatingAudioPlayer: YouTube URL detected, ID:', ytId);
        setIsYouTube(true);
        setVideoId(ytId);
        setIsLoading(true); // YouTube player loading
        // Delay autoplay slightly to ensure component is mounted
        setTimeout(() => setIsPlaying(true), 500);
      } else {
        setIsYouTube(false);
        setVideoId(null);
        loadAudio();
      }

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
      setIsPlaying(false);
    }
  }, [visible, audioUri]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Helper to extract YouTube ID
  const extractVideoId = (url: string): string | null => {
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
  };

  const loadAudio = async () => {
    try {
      console.log('🔍 FloatingAudioPlayer: Loading standard audio from URI:', audioUri);
      setIsLoading(true);

      if (sound) {
        await sound.unloadAsync();
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsLoading(false);
      setIsPlaying(true);
    } catch (error) {
      console.error('❌ FloatingAudioPlayer: Error loading audio:', error);
      setError('Error cargando audio');
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsPlaying(status.isPlaying);
      setDuration(status.durationMillis || 0);
      setPosition(status.positionMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
      }
    } else if (status.error) {
      console.error('❌ FloatingAudioPlayer: Playback error:', status.error);
      setError('Error de reproducción');
    }
  };

  // YouTube Event Handlers
  const onYouTubeStateChange = (state: string) => {
    console.log('YouTube State:', state);
    if (state === 'playing') {
      setIsPlaying(true);
      setIsLoading(false);
    } else if (state === 'paused') {
      setIsPlaying(false);
    } else if (state === 'ended') {
      setIsPlaying(false);
    } else if (state === 'buffering') {
      setIsLoading(true);
    } else if (state === 'unstarted') {
      // Sometimes it stays in unstarted, try to force play
      setIsLoading(true);
    }
  };

  const formatTime = (millis: number) => {
    const minutes = Math.floor(millis / 60000);
    const seconds = Math.floor((millis % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        isMinimized ? styles.minimizedContainer : styles.expandedContainer,
        {
          transform: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }],
          opacity: slideAnim,
        },
      ]}
    >
      {/* YouTube Player */}
      {isYouTube && videoId && (
        <View style={isMinimized ? styles.hiddenVideo : styles.videoContainer}>
          <YoutubePlayer
            height={isMinimized ? 1 : 180}
            width={isMinimized ? 1 : 300}
            play={isPlaying}
            videoId={videoId}
            onChangeState={onYouTubeStateChange}
            onError={(e: any) => {
              console.error('YouTube Error:', e);
              setError('Error de YouTube');
              setIsLoading(false);
            }}
            initialPlayerParams={{
              preventAutoplay: false,
              controls: true,
              modestbranding: true,
              playsinline: true
            }}
          />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.albumInfo}>
          <Ionicons name="musical-note" size={16} color="#000" />
          <Text style={styles.albumTitle} numberOfLines={1}>
            {albumTitle}
          </Text>
        </View>

        <View style={styles.controls}>
          {error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="warning" size={16} color="#dc3545" />
              <Text style={styles.errorText} numberOfLines={1}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => isYouTube ? setIsPlaying(true) : loadAudio()}>
                <Ionicons name="refresh" size={16} color="#000" />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Minimize/Maximize Button */}
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleMinimize}
              >
                <Ionicons
                  name={isMinimized ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={AppColors.primary}
                />
              </TouchableOpacity>

              {/* Progress bar for non-YouTube */}
              {!isYouTube && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${duration > 0 ? position / duration * 100 : 0}%` }]} />
                  </View>
                  <Text style={styles.timeText}>
                    {formatTime(position)} / {formatTime(duration)}
                  </Text>
                </View>
              )}
            </>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  expandedContainer: {
    width: 300,
    padding: 0,
  },
  minimizedContainer: {
    width: 250, // Smaller width when minimized
    padding: 0,
  },
  videoContainer: {
    width: '100%',
    height: 180,
    backgroundColor: AppColors.primary,
  },
  hiddenVideo: {
    width: 1,
    height: 1,
    opacity: 0.01, // Keep it slightly visible to avoid OS suspension
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
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
    alignItems: 'center',
  },
  controlButton: {
    padding: 8,
    marginHorizontal: 4,
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
    backgroundColor: AppColors.primary,
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
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    marginHorizontal: 12,
    marginTop: 8,
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