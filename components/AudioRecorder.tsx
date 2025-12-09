import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  Dimensions,
} from 'react-native';
import { Audio } from 'expo-av';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
// TODO: Migrar a la nueva API de filesystem cuando se reescriba el flujo de notas de audio
import * as FileSystem from 'expo-file-system/legacy';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Buffer } from 'buffer';
import { useTranslation } from '../src/i18n/useTranslation';

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
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [timer, setTimer] = useState<number | null>(null);

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
      setTimer(Number(interval));
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
        Alert.alert(t('common_permissions'), t('audio_recorder_permission_error'));
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
      Alert.alert(t('common_error'), t('audio_recorder_error_start'));
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
      Alert.alert(t('common_error'), t('audio_recorder_error_stop'));
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
      Alert.alert(t('common_error'), t('audio_recorder_error_play'));
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
      Alert.alert(t('common_error'), t('audio_recorder_error_no_recording'));
      return;
    }

    try {
      console.log('🎵 Iniciando guardado de audio...');
      console.log('🎵 URI local:', recordingUri);

      // Verificar que el archivo existe
      const fileInfo = await FileSystem.getInfoAsync(recordingUri);
      console.log('🎵 File info:', fileInfo);

      if (!fileInfo.exists) {
        console.error('❌ El archivo no existe:', recordingUri);
        Alert.alert(t('common_error'), t('audio_recorder_error_file_not_found'));
        return;
      }

      // Verificar autenticación antes de guardar
      console.log('🔐 Verificando autenticación...');
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('❌ Error de autenticación:', authError);
        Alert.alert(
          t('common_auth_error'),
          t('audio_recorder_error_auth_verify')
        );
        return;
      }

      if (!user) {
        console.error('❌ Usuario no autenticado');
        Alert.alert(
          t('common_auth_error'),
          t('audio_recorder_error_auth_login')
        );
        return;
      }

      console.log('✅ Usuario autenticado:', user.id);
      console.log('✅ Archivo de audio válido, guardando URI local...');

      // Guardar la URI local directamente en la base de datos
      onSave(recordingUri);
      onClose();

      Alert.alert(t('common_success'), t('audio_recorder_success_save'));
    } catch (error) {
      console.error('❌ Error al guardar:', error);

      // Mensajes de error más específicos
      let errorMessage = 'No se pudo guardar la nota de audio';

      if (error instanceof Error) {
        if (error.message.includes('autenticado') || error.message.includes('authentication')) {
          Alert.alert(
            t('common_auth_error'),
            t('audio_recorder_error_auth_verify')
          );
        } else if (error.message.includes('network') || error.message.includes('Network')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet.';
        } else if (error.message.includes('permission') || error.message.includes('forbidden')) {
          errorMessage = 'No tienes permisos para realizar esta acción.';
        }
      }

      Alert.alert(t('common_error'), errorMessage);
    }
  };

  const handleClose = () => {
    if (isRecording) {
      Alert.alert(
        t('audio_recorder_recording_progress_title'),
        t('audio_recorder_recording_progress_message'),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('common_close'),
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
              {t('audio_recorder_title').replace('{0}', albumTitle)}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            <Text style={styles.instructions}>
              {t('audio_recorder_instructions')}
            </Text>

            <View style={styles.timerContainer}>
              <Text style={styles.timer}>
                {formatTime(recordingTime)} / 1:00
              </Text>
            </View>

            <View style={styles.controlsContainer}>
              {!isRecording && !recordingUri ? (
                <TouchableOpacity
                  style={[styles.recordButton, { backgroundColor: primaryColor }]}
                  onPress={startRecording}
                >
                  <Ionicons name="mic" size={32} color="white" />
                  <Text style={styles.recordButtonText}>{t('audio_recorder_start')}</Text>
                </TouchableOpacity>
              ) : isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, styles.stopButton]}
                  onPress={stopRecording}
                >
                  <Ionicons name="stop" size={32} color="white" />
                  <Text style={styles.recordButtonText}>{t('audio_recorder_stop')}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.playbackContainer}>
                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: primaryColor }]}
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
                      <Text style={styles.actionButtonText}>{t('audio_recorder_rerecord')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.saveButton]}
                      onPress={handleSave}
                    >
                      <Ionicons name="checkmark" size={20} color="white" />
                      <Text style={[styles.actionButtonText, styles.saveButtonText]}>
                        {t('common_save')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {isRecording && (
              <View style={styles.recordingIndicator}>
                <View style={styles.recordingDot} />
                <Text style={styles.recordingText}>{t('audio_recorder_recording')}</Text>
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
    backgroundColor: AppColors.primary,
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
    backgroundColor: AppColors.primary,
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