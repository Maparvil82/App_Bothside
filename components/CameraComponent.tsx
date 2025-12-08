import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Modal, FlatList, Image } from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { GeminiService } from '../services/gemini';
import { supabase } from '../lib/supabase';
import { DiscogsService } from '../services/discogs';
import { DiscogsStatsService } from '../services/discogs-stats';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';

interface CameraComponentProps {
  onCapture: (imageUri: string) => void;
  onClose: () => void;
  onOCRResult?: (artist: string, album: string) => void;
}

export const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture, onClose, onOCRResult }) => {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [showEditionsModal, setShowEditionsModal] = useState(false);
  const [discogsResults, setDiscogsResults] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const cameraRef = useRef<any>(null);
  const { user } = useAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const performAIAlbumRecognition = async (imageUri: string) => {
    const startTime = Date.now();
    console.log('🚀 Iniciando análisis de álbum, isAIProcessing:', isAIProcessing);
    setIsAIProcessing(true);
    setAiResult(''); // Limpiar resultado anterior
    console.log('🔄 Estado actualizado, isAIProcessing:', true);

    try {
      console.log('🤖 Iniciando reconocimiento de álbum con IA...');

      // OPTIMIZACIÓN: Usar base64 directamente si está disponible
      let base64Data = imageUri;

      // Si es un URI, convertirlo a base64 (solo si es necesario)
      if (imageUri.startsWith('file://') || imageUri.startsWith('http')) {
        const conversionStart = Date.now();
        console.log('📤 Convirtiendo URI a base64...');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String);
          };
          reader.readAsDataURL(blob);
        });
        const conversionEnd = Date.now();
        console.log(`⏱️ Conversión URI a base64: ${conversionEnd - conversionStart}ms`);
      }

      // Validar que tenemos datos base64 válidos
      if (!base64Data || base64Data.length < 100) {
        throw new Error('Imagen capturada no válida o muy pequeña');
      }

      console.log('📏 Tamaño de imagen base64:', base64Data.length, 'caracteres');

      // OPTIMIZACIÓN: Reducir tamaño si es muy grande (más de 500KB)
      if (base64Data.length > 500000) {
        console.log('⚠️ Imagen muy grande, considerando reducción...');
        // Para imágenes muy grandes, podríamos implementar compresión adicional
        // Por ahora, solo logueamos el tamaño
      }

      const geminiStart = Date.now();
      console.log('📤 Enviando imagen a Gemini Vision...');

      // Usar Gemini Vision para reconocer el álbum
      const { artist, album } = await GeminiService.analyzeAlbumImage(base64Data);

      // 🔥 Consumir crédito por análisis de portada
      if (user) {
        try {
          await supabase.rpc("consume_ai_credit", {
            p_user_id: user.id,
            p_amount: 5
          });
        } catch (err) {
          console.error("Error consumiendo crédito IA (portada):", err);
        }
      }

      const geminiEnd = Date.now();
      console.log(`⏱️ Gemini Vision completado: ${geminiEnd - geminiStart}ms`);

      console.log('🎵 Álbum reconocido por IA:', { artist, album });
      setAiResult(`🎵 ${album} - ${artist}`);

      // Llamar al callback con los resultados
      if (onOCRResult) {
        onOCRResult(artist, album);
      }

      // Preguntar si quiere guardar el álbum en la colección
      Alert.alert(
        t('camera_success_recognized_title'),
        `${album} - ${artist}\n\n${t('camera_success_recognized_message')}`,
        [
          {
            text: t('common_cancel'),
            style: 'cancel',
            onPress: () => {
              console.log('❌ Usuario canceló el guardado del álbum');
            }
          },
          {
            text: t('common_save'),
            style: 'default',
            onPress: () => {
              console.log('💾 Usuario quiere guardar el álbum, iniciando proceso...');
              saveRecognizedAlbum(artist, album);
            }
          }
        ]
      );

    } catch (error) {
      console.error('❌ Error en reconocimiento de IA:', error);
      setAiResult('❌ No se pudo reconocer el álbum');

      Alert.alert(
        t('camera_error_recognition_title'),
        t('camera_error_recognition_message'),
        [{ text: 'OK' }]
      );
    } finally {
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      console.log(`🏁 Análisis completado en ${totalTime}ms, estableciendo isAIProcessing a false`);
      setIsAIProcessing(false);
    }
  };

  // Función para guardar el álbum reconocido en la colección
  const saveRecognizedAlbum = async (artist: string, album: string) => {
    if (!user?.id) {
      Alert.alert(t('common_error'), t('camera_error_user_id'));
      return;
    }

    try {
      console.log('🔍 Buscando en Discogs:', artist, '-', album);

      // Buscar en Discogs API
      const results = await DiscogsService.searchReleases(`${artist} ${album}`);

      if (results && results.results && results.results.length > 0) {
        // Filtrar solo versiones en vinilo
        const vinylResults = results.results.filter((release: any) => {
          const formats = release.format;

          let formatString = '';
          if (Array.isArray(formats)) {
            formatString = formats.join(',').toLowerCase();
          } else if (typeof formats === 'string') {
            formatString = formats.toLowerCase();
          } else {
            formatString = '';
          }

          return formatString.includes('vinyl') ||
            formatString.includes('lp') ||
            formatString.includes('12"') ||
            formatString.includes('7"');
        });

        console.log('💿 Versiones en vinilo encontradas:', vinylResults.length);

        if (vinylResults.length > 0) {
          // Guardar resultados y mostrar modal
          setDiscogsResults(vinylResults);
          setShowEditionsModal(true);
        } else {
          Alert.alert(t('camera_error_no_vinyl_title'), t('camera_error_no_vinyl_message'));
        }
      } else {
        Alert.alert(t('common_search'), t('camera_error_no_results_discogs'));
      }
    } catch (error) {
      console.error('❌ Error buscando en Discogs:', error);
      Alert.alert(t('common_error'), t('camera_error_search_discogs'));
    }
  };

  // Función para guardar un release específico de Discogs
  const saveDiscogsRelease = async (release: any) => {
    if (!user?.id) return;

    setIsSaving(true); // Activar estado de guardado

    try {
      console.log('🎵 Guardando release de Discogs:', release.id);

      // Llamar a la Edge Function de Supabase
      const { data, error } = await supabase.functions.invoke('save-discogs-release', {
        body: {
          discogsReleaseId: release.id,
          userId: user.id
        }
      });

      if (error) {
        console.error('❌ Error llamando a Edge Function:', error);
        throw error;
      }

      if (data?.success) {
        console.log('✅ Disco guardado exitosamente con ID:', data.albumId);

        // Obtener estadísticas de Discogs en segundo plano
        if (data.albumId && release.id) {
          DiscogsStatsService.fetchAndSaveDiscogsStats(data.albumId, release.id)
            .catch((error) => {
              console.error('❌ Error obteniendo estadísticas de Discogs:', error);
            });
        }

        // Cerrar el modal y mostrar opciones mejoradas
        setShowEditionsModal(false);
        setDiscogsResults([]);

        Alert.alert(
          t('camera_success_saved_title'),
          `${release.title} ${t('camera_success_saved_message_suffix')}`,
          [
            {
              text: t('camera_action_go_collection'),
              style: 'default',
              onPress: () => {
                console.log('🚀 Navegando a la colección...');
                // Navegar a la pestaña Search (que contiene la colección real)
                (navigation as any).navigate('Main', { screen: 'SearchTab' });
                // Cerrar la cámara después de navegar
                onClose();
              }
            },
            {
              text: t('camera_action_add_more'),
              style: 'default',
              onPress: () => {
                console.log('📸 Volviendo a la vista de cámara...');
                // Limpiar el resultado anterior para permitir nueva foto
                setAiResult('');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('❌ Error guardando release:', error);
      Alert.alert(t('common_error'), t('camera_error_save_collection'));
    } finally {
      setIsSaving(false); // Desactivar estado de guardado
    }
  };

  // Función para renderizar cada release de Discogs en el modal
  const renderDiscogsRelease = ({ item }: { item: any }) => {
    // Extraer artista y título del álbum de manera más robusta
    let artistName = '';
    let albumTitle = item.title || '';

    // Intentar diferentes formas de obtener el artista
    if (item.artists && Array.isArray(item.artists) && item.artists.length > 0) {
      artistName = item.artists[0].name;
    } else if (item.artist) {
      artistName = item.artist;
    } else if (item.title && item.title.includes(' - ')) {
      // Si el título tiene formato "Artista - Álbum", separarlo
      const parts = item.title.split(' - ');
      if (parts.length >= 2) {
        artistName = parts[0].trim();
        albumTitle = parts.slice(1).join(' - ').trim();
      }
    }

    // Si aún no tenemos artista, intentar extraer del título
    if (!artistName && item.title) {
      // Buscar patrones comunes como "Artista - Álbum" o "Artista: Álbum"
      const patterns = [
        /^(.+?)\s*[-–—]\s*(.+)$/,  // Artista - Álbum
        /^(.+?)\s*:\s*(.+)$/,      // Artista: Álbum
        /^(.+?)\s*by\s*(.+)$/i,    // Artista by Álbum
      ];

      for (const pattern of patterns) {
        const match = item.title.match(pattern);
        if (match) {
          artistName = match[1].trim();
          albumTitle = match[2].trim();
          break;
        }
      }
    }

    // Fallback: si no se pudo extraer, usar el título completo
    if (!artistName) {
      artistName = t('common_unknown_artist');
    }

    return (
      <View style={styles.albumItem}>
        <Image
          source={{ uri: item.cover_image || item.thumb || 'https://via.placeholder.com/80' }}
          style={styles.albumThumbnail}
        />
        <View style={styles.albumInfo}>
          <Text style={styles.albumTitle} numberOfLines={1} ellipsizeMode="tail">
            {albumTitle}
          </Text>
          <Text style={styles.albumArtist}>
            {artistName}
          </Text>
          <Text style={styles.albumDetails}>
            {item.year && `${item.year} • `}
            {item.label && `${Array.isArray(item.label) ? item.label[0] : item.label} • `}
            {item.catno && `${item.catno}`}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.addButton, isSaving && styles.addButtonDisabled]}
          onPress={() => saveDiscogsRelease(item)}
          disabled={isSaving}
        >
          {isSaving ? (
            <BothsideLoader size="small" fullscreen={false} />
          ) : (
            <Ionicons name="add" size={24} color="white" />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const handleCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert(t('common_error'), t('camera_error_unavailable'));
      return;
    }

    setIsLoading(true);
    try {
      // OPTIMIZACIÓN: Capturar con balance entre calidad y velocidad
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.6,        // ← Calidad balanceada para velocidad
        base64: true,        // ← Base64 directo (sin conversiones)
        skipProcessing: true, // ← Saltar procesamiento para velocidad
        exif: false,         // ← Sin metadatos EXIF para reducir tamaño
      });
      console.log('📸 Foto capturada en base64, tamaño:', photo.base64?.length || 0);

      // PRIMERO: Realizar reconocimiento de álbum con IA
      await performAIAlbumRecognition(photo.base64 || '');

      // DESPUÉS: Llamar al callback original solo si el análisis fue exitoso
      if (aiResult && !aiResult.includes('❌')) {
        onCapture(photo.uri);
      }

    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert(t('common_error'), t('camera_error_capture'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('camera_permission_requesting')}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>{t('camera_permission_denied')}</Text>
        <Text style={styles.subtext}>{t('camera_permission_instruction')}</Text>
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
          {/* Botón de cerrar */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>

          {/* Barra inferior con botón de captura */}
          <View style={styles.bottomControls}>
            {/* Botón de captura principal */}
            <TouchableOpacity
              style={[styles.captureButton, (isLoading || isAIProcessing) && styles.captureButtonDisabled]}
              onPress={handleCapture}
              disabled={isLoading || isAIProcessing}
            >
              <View style={styles.captureButtonInner}>
                {isAIProcessing ? (
                  <BothsideLoader size="small" fullscreen={false} />
                ) : (
                  <View style={styles.captureButtonIcon} />
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Indicador de estado de la cámara */}
          {(isLoading || isAIProcessing) && (
            <View style={styles.cameraStatusIndicator}>
              <BothsideLoader size="small" fullscreen={false} />
              <Text style={styles.cameraStatusText}>
                {isLoading ? t('camera_preparing') : t('camera_analyzing')}
              </Text>
            </View>
          )}
        </View>
      </CameraView>

      {/* Indicador de procesamiento de IA */}
      {isAIProcessing && (
        <View style={styles.aiOverlay}>
          <View style={styles.aiProcessingContainer}>
            <Text style={styles.aiText}>{t('camera_ai_analyzing')}</Text>
            <Text style={styles.aiSubtext}>{t('camera_ai_wait')}</Text>
            <View style={styles.loadingSpinner}>
              <Text style={styles.spinnerText}>⏳</Text>
            </View>
          </View>
        </View>
      )}

      {/* Mostrar resultado de IA si está disponible */}
      {aiResult && !isAIProcessing && (
        <View style={styles.aiResult}>
          <Text style={styles.aiResultTitle}>{t('camera_success_recognized_title')}:</Text>
          <Text style={styles.aiResultText}>{aiResult}</Text>
        </View>
      )}

      {/* Modal de Ediciones de Discogs */}
      <Modal
        visible={showEditionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('camera_select_edition')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowEditionsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={discogsResults}
              renderItem={renderDiscogsRelease}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalContent}
            />

            {/* Overlay de carga cuando se está guardando */}
            {isSaving && (
              <View style={styles.savingOverlay}>
                <View style={styles.savingContainer}>
                  <BothsideLoader />
                  <Text style={styles.savingText}>{t('camera_saving')}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.8)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  captureButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraStatusIndicator: {
    position: 'absolute',
    bottom: 150,
    left: '50%',
    transform: [{ translateX: -50 }],
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    minWidth: 200,
  },
  cameraStatusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
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
  // Estilos para el modal de ediciones
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    width: '90%',
    maxHeight: '80%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 5,
  },
  modalContent: {
    paddingBottom: 20,
  },
  // Estilos para los items del álbum (igual que en AddDiscScreen)
  albumItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  albumInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  albumDetails: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#000',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  // Estilos para el overlay de guardado
  savingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savingContainer: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  savingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
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