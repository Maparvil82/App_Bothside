import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';

interface AudioRecorderProps {
  visible: boolean;
  onClose: () => void;
  onSave: (audioUri: string) => void;
  albumTitle: string;
}

export const AudioRecorder: React.FC<AudioRecorderProps> = ({
  visible,
  onClose,
  onSave,
  albumTitle,
}) => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      const interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= 60) {
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
      setTimer(interval);
    } else {
      if (timer) {
        clearInterval(timer);
        setTimer(null);
      }
    }

    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Solicitar permisos
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos necesarios', 'Se necesitan permisos de micrófono para grabar audio.');
        return;
      }

      // Configurar audio
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Iniciar grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.LOW_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingTime(0);
      setRecordingUri(null);
      
      console.log('🎤 Grabación iniciada');
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      Alert.alert('Error', 'No se pudo iniciar la grabación');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (uri) {
        setRecordingUri(uri);
        console.log('✅ Grabación completada:', uri);
      }
      
      setRecording(null);
    } catch (error) {
      console.error('❌ Error al detener grabación:', error);
      Alert.alert('Error', 'No se pudo detener la grabación');
    }
  };

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      setIsPlaying(true);
      const { sound } = await Audio.Sound.createAsync({ uri: recordingUri });
      setSound(sound);
      
      await sound.playAsync();
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('❌ Error al reproducir:', error);
      Alert.alert('Error', 'No se pudo reproducir la grabación');
      setIsPlaying(false);
    }
  };

  const stopPlaying = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
    }
  };

  const handleSave = async () => {
    if (!recordingUri) {
      Alert.alert('Error', 'No hay grabación para guardar');
      return;
    }

    try {
      // Subir el archivo a Supabase Storage
      const fileName = `audio_notes/${Date.now()}_${albumTitle.replace(/[^a-zA-Z0-9]/g, '_')}.m4a`;
      const fileUri = recordingUri;
      
      // Por ahora, guardamos la URI local
      // En producción, aquí subirías el archivo a Supabase Storage
      onSave(fileUri);
      onClose();
      
      Alert.alert('Éxito', 'Nota de audio guardada correctamente');
    } catch (error) {
      console.error('❌ Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar la nota de audio');
    }
  };

  const handleClose = () => {
    if (isRecording) {
      Alert.alert(
        'Grabación en progreso',
        '¿Estás seguro de que quieres cerrar? Se perderá la grabación actual.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Cerrar', 
            style: 'destructive',
            onPress: () => {
              if (recording) {
                recording.stopAndUnloadAsync();
              }
              if (sound) {
                sound.unloadAsync();
              }
              setIsRecording(false);
              setIsPlaying(false);
              setRecordingTime(0);
              setRecordingUri(null);
              onClose();
            }
          }
        ]
      );
    } else {
      if (sound) {
        sound.unloadAsync();
      }
      onClose();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Nota de audio para "{albumTitle}"
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.instructions}>
              Graba una nota de audio de máximo 1 minuto sobre este álbum
            </Text>

            <View style={styles.timerContainer}>
              <Text style={styles.timer}>
                {formatTime(recordingTime)} / 1:00
              </Text>
            </View>

            <View style={styles.controlsContainer}>
              {!isRecording && !recordingUri ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={32} color="white" />
                  <Text style={styles.recordButtonText}>Iniciar Grabación</Text>
                </TouchableOpacity>
              ) : isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, styles.stopButton]}
                  onPress={stopRecording}
                >
                  <Ionicons name="stop" size={32} color="white" />
                  <Text style={styles.recordButtonText}>Detener Grabación</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.playbackContainer}>
                  <TouchableOpacity
                    style={styles.playButton}
                    onPress={isPlaying ? stopPlaying : playRecording}
                  >
                    <Ionicons 
                      name={isPlaying ? "stop" : "play"} 
                      size={24} 
                      color="white" 
                    />
                  </TouchableOpacity>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => {
                        setRecordingUri(null);
                        setRecordingTime(0);
                      }}
                    >
                      <Ionicons name="refresh" size={20} color="#666" />
                      <Text style={styles.actionButtonText}>Regrabar</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={handleSave}
                    >
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                        Guardar
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>Grabando...</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
    alignItems: 'center',
  },
  instructions: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  timerContainer: {
    marginBottom: 20,
  },
  timer: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  recordButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 200,
    justifyContent: 'center',
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  recordButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  playbackContainer: {
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#34C759',
    borderColor: '#34C759',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  saveButtonText: {
    color: 'white',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
});