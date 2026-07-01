import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Linking,
  ScrollView,
  TextInput,
  DeviceEventEmitter,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useIsFocused, useTheme } from '@react-navigation/native';
import { GeminiService } from '../services/GeminiService';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { AiConsentModal } from '../components/AiConsentModal';
import { checkAiAllowedState, setAiConsent, setAiEnabled } from '../src/privacy/aiConsent';
import { AnalyticsService } from '../services/analytics';
import { supabase } from '../lib/supabase';
import { AlbumService, UserCollectionService } from '../services/database';
import { DiscogsService } from '../services/discogs';
import { DiscogsStatsService } from '../services/discogs-stats';

interface SpineAlbum {
  artist: string;
  title: string;
  selected: boolean;
}

export const SpineScanScreen = () => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  // Screen States
  const [scanning, setScanning] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [albums, setAlbums] = useState<SpineAlbum[]>([]);
  const [estimatedSpines, setEstimatedSpines] = useState<number>(0);
  const [adding, setAdding] = useState(false);
  const [summary, setSummary] = useState<{ addedCount: number } | null>(null);

  // Credit Logic
  const { user } = useAuth();
  const { credits, deductCredit } = useCredits();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused && user) {
      if (credits <= 0) {
        Alert.alert(
          'Sin Créditos AI',
          'Necesitas créditos para usar el Escáner Mágico. ¿Quieres adquirir un paquete?',
          [
            { text: t('common_cancel'), onPress: () => navigation.goBack() },
            {
              text: 'Ir a la Tienda', onPress: () => {
                navigation.goBack();
                navigation.navigate('AICreditsStore');
              }
            }
          ]
        );
      }
    }
  }, [isFocused, user]);

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && isFocused) {
      requestPermission();
    }
  }, [permission, isFocused]);

  if (!permission) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.message}>{t('camera_preparing')}</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: 'black' }]}>
        <View style={styles.permissionModal}>
          <Ionicons name="camera-outline" size={48} color="white" style={{ marginBottom: 16 }} />
          <Text style={styles.permissionTitle}>{t('common_permissions_required')}</Text>
          <Text style={styles.permissionSubtitle}>
            {permission.canAskAgain ? t('camera_permission_request') : t('camera_permission_denied')}
          </Text>
          <TouchableOpacity
            onPress={permission.canAskAgain ? requestPermission : Linking.openSettings}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonText}>
              {permission.canAskAgain ? t('camera_permission_grant') : t('camera_permission_settings')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingVertical: 12 }}>
            <Text style={{ color: '#A0A0A0', fontSize: 16 }}>{t('common_cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current && !scanning) {
      const { allowed, needsConsentPrompt } = await checkAiAllowedState();
      if (!allowed) {
        if (needsConsentPrompt) {
          setShowConsentModal(true);
          return;
        } else {
          Alert.alert(t('ai_consent_title'), t('ai_consent_settings_disabled'), [{ text: t('common_cancel') }]);
          return;
        }
      }

      const COST_SCAN = 5;
      if (credits < COST_SCAN) {
        Alert.alert('Créditos Insuficientes', `Necesitas ${COST_SCAN} créditos para escanear.`);
        return;
      }

      setScanning(true);
      AnalyticsService.track('spines_scan_started');
      try {
        const photo = await cameraRef.current.takePictureAsync({
          base64: true,
          quality: 0.5,
          skipProcessing: true
        });

        if (photo?.base64) {
          console.log('📸 Lomos capturados, analizando con Gemini...');
          const result = await GeminiService.identifySpinesFromImage(photo.base64);
          console.log('🤖 Gemini Spines Result:', result);

          // Deduct credits
          await deductCredit(COST_SCAN);
          AnalyticsService.track('spines_scan_success');

          const formattedAlbums = (result.albums || []).map((album) => ({
            artist: album.artist,
            title: album.title,
            selected: true,
          }));

          setPhotoBase64(photo.base64);
          setAlbums(formattedAlbums);
          setEstimatedSpines(result.estimatedSpinesCount);
        }
      } catch (error) {
        console.error('Error scanning spines:', error);
        Alert.alert('Error', 'Hubo un problema al analizar los lomos de la imagen.');
      } finally {
        setScanning(false);
      }
    }
  };

  const handleToggleSelect = (index: number) => {
    setAlbums((prev) =>
      prev.map((alb, idx) => (idx === index ? { ...alb, selected: !alb.selected } : alb))
    );
  };

  const handleTextChange = (index: number, field: 'artist' | 'title', value: string) => {
    setAlbums((prev) =>
      prev.map((alb, idx) => (idx === index ? { ...alb, [field]: value } : alb))
    );
  };

  const handleAddDiscs = async () => {
    if (!user) return;
    const selected = albums.filter((a) => a.selected && a.artist.trim() && a.title.trim());
    if (selected.length === 0) {
      Alert.alert('Atención', 'Selecciona al menos un disco válido para añadir.');
      return;
    }

    // Informar inmediatamente al usuario de que se inicia en segundo plano
    Alert.alert(
      'Importando lomos',
      `Hemos empezado a importar ${selected.length} discos en segundo plano. Puedes seguir usando Bothside, te enviaremos una notificación cuando termine.`,
      [
        {
          text: 'Entendido',
          onPress: () => {
            // Regresamos inmediatamente al buscador o dashboard
            navigation.navigate('SearchTab');
          }
        }
      ]
    );

    // Ejecutar en segundo plano de manera asíncrona no bloqueante
    runBackgroundImport(selected);
  };

  const runBackgroundImport = async (selected: SpineAlbum[]) => {
    if (!user) return;

    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🎧 Importación iniciada',
          body: `Añadiendo ${selected.length} discos a tu colección en segundo plano...`,
        },
        trigger: null,
      });
    } catch (e) {
      console.warn('Error scheduling start notification:', e);
    }

    setAdding(true);
    let addedCount = 0;

    try {
      for (const item of selected) {
        try {
          // Check if album already exists in catologue
          const { data: existingAlbum } = await supabase
            .from('albums')
            .select('id')
            .ilike('artist', item.artist.trim())
            .ilike('title', item.title.trim())
            .limit(1)
            .maybeSingle();

          let albumId: string;
          if (existingAlbum?.id) {
            albumId = existingAlbum.id;
          } else {
            // Search in Discogs to get details (especially cover_url and discogs_id)
            let discogsRelease: any = null;
            try {
              const query = `${item.artist.trim()} ${item.title.trim()}`;
              const searchResult = await DiscogsService.searchReleases(query, 1);
              if (searchResult && searchResult.results && searchResult.results.length > 0) {
                // Get the first result (most relevant)
                discogsRelease = searchResult.results[0];
              }
            } catch (searchErr) {
              console.warn('Error searching Discogs in background:', searchErr);
            }

            const newAlbum = await AlbumService.createAlbum({
              artist: item.artist.trim(),
              title: item.title.trim(),
              cover_url: discogsRelease ? (discogsRelease.cover_image || discogsRelease.thumb || undefined) : undefined,
              discogs_id: discogsRelease ? discogsRelease.id : undefined,
              release_year: discogsRelease?.year ? String(discogsRelease.year) : undefined,
              label: discogsRelease?.label ? (Array.isArray(discogsRelease.label) ? discogsRelease.label[0] : discogsRelease.label) : undefined,
              country: discogsRelease?.country || undefined,
            });
            albumId = newAlbum.id;

            if (discogsRelease?.id) {
              // Fetch and save statistics in background
              DiscogsStatsService.fetchAndSaveDiscogsStats(albumId, discogsRelease.id).catch(() => {});

              // Fetch full release details to import videos (audio) and tracklist!
              try {
                const fullRelease = await DiscogsService.getRelease(discogsRelease.id);
                if (fullRelease) {
                  // Import YouTube Videos (Audios)
                  const videos = (fullRelease as any)?.videos || [];
                  const youtubeVideos = videos.filter((v: any) => v?.uri && (v.uri.includes('youtube.com') || v.uri.includes('youtu.be')));
                  if (youtubeVideos.length > 0) {
                    const payload = youtubeVideos.map((v: any) => ({
                      album_id: albumId,
                      url: v.uri,
                      title: v.title || '',
                      is_playlist: false,
                      imported_from_discogs: true,
                      discogs_video_id: v.id ? String(v.id) : null,
                    }));
                    await supabase.from('album_youtube_urls').insert(payload);
                  }

                  // Import Tracklist
                  const tracklist = (fullRelease as any)?.tracklist || [];
                  if (Array.isArray(tracklist) && tracklist.length > 0) {
                    const tracksPayload = tracklist
                      .filter((t: any) => t?.title)
                      .map((t: any) => ({
                        album_id: albumId,
                        position: t.position?.toString() || null,
                        title: t.title?.toString() || '',
                        duration: t.duration?.toString() || null,
                      }));
                    if (tracksPayload.length > 0) {
                      await supabase.from('tracks').insert(tracksPayload);
                    }
                  }
                }
              } catch (importErr) {
                console.warn(`Error importing tracklist/videos for release ${discogsRelease.id}:`, importErr);
              }
            }
          }

          // Check if already in user collection
          const { data: alreadyCollected } = await supabase
            .from('user_collection')
            .select('id')
            .eq('user_id', user.id)
            .eq('album_id', albumId)
            .maybeSingle();

          if (!alreadyCollected) {
            await UserCollectionService.addToCollection(user.id, albumId);
            addedCount++;
          }
        } catch (itemErr) {
          console.warn('Error adding single spine item in background:', item.title, itemErr);
          // Continue loop to add as many as possible
        }
      }

      // Notificación de finalización
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🎧 Importación completada',
            body: `Se han añadido ${addedCount} discos a tu colección.`,
          },
          trigger: null,
        });
      } catch (e) {
        console.warn('Error scheduling completion notification:', e);
      }

      // Emitir eventos globales para que se muestren en la colección y se recargue en tiempo real
      DeviceEventEmitter.emit('collection_changed');
      DeviceEventEmitter.emit('maleta_changed');

      setSummary({ addedCount });
      AnalyticsService.track('spines_add_completed', { count: addedCount });
    } catch (err) {
      console.error('Error adding batch discs:', err);
    } finally {
      setAdding(false);
    }
  };

  const handleReset = () => {
    setPhotoBase64(null);
    setAlbums([]);
    setEstimatedSpines(0);
    setSummary(null);
  };

  // ----------------------------------------------------
  // Render Summary State
  // ----------------------------------------------------
  if (summary) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FAF9F6' }]}>
        <View style={styles.summaryContainer}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#2ECC71" />
          </View>
          
          <Text style={[styles.summaryTitle, { color: colors.text }]}>
            ¡Discos Añadidos!
          </Text>
          
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Discos añadidos:</Text>
              <Text style={[styles.summaryVal, { color: colors.text }]}>{summary.addedCount}</Text>
            </View>
            {estimatedSpines > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Lomos detectados:</Text>
                <Text style={[styles.summaryVal, { color: colors.text }]}>{estimatedSpines}</Text>
              </View>
            )}
          </View>

          <Text style={styles.summaryNotice}>
            Nota: Algunos lomos pueden no haber sido identificados o añadidos si ya se encontraban en tu colección o debido a la luz o legibilidad del texto en la imagen.
          </Text>

          <View style={styles.summaryActions}>
            <TouchableOpacity style={styles.primaryBtn} onPress={handleReset}>
              <Ionicons name="camera-outline" size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.primaryBtnText}>Escanear otra zona</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => {
                navigation.goBack();
                navigation.navigate('SearchTab');
              }}
            >
              <Ionicons name="search-outline" size={20} color="#000" style={{ marginRight: 8 }} />
              <Text style={styles.secondaryBtnText}>Buscar manualmente</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // Render Preview State
  // ----------------------------------------------------
  if (photoBase64) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#FAF9F6' }]}>
        <View style={styles.previewHeader}>
          <TouchableOpacity onPress={handleReset} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.previewTitle, { color: colors.text }]}>Discos Reconocidos</Text>
          <View style={{ width: 40 }} />
        </View>

        {adding ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={AppColors.primary} />
            <Text style={[styles.loadingText, { color: colors.text, marginTop: 12 }]}>
              Añadiendo discos a tu colección...
            </Text>
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={styles.previewScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.previewInstructions}>
                Hemos reconocido {albums.length} discos. Puedes desmarcar los que no quieras añadir o editar sus nombres:
              </Text>

              {albums.map((item, index) => (
                <View key={index} style={[styles.albumCard, { backgroundColor: colors.card }]}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => handleToggleSelect(index)}
                  >
                    <Ionicons
                      name={item.selected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={item.selected ? AppColors.primary : '#A0A0A0'}
                    />
                  </TouchableOpacity>

                  <View style={styles.cardFields}>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Título:</Text>
                      <TextInput
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                        value={item.title}
                        onChangeText={(val) => handleTextChange(index, 'title', val)}
                        placeholder="Título del disco"
                        placeholderTextColor="#A0A0A0"
                      />
                    </View>
                    <View style={styles.inputWrapper}>
                      <Text style={styles.inputLabel}>Artista:</Text>
                      <TextInput
                        style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
                        value={item.artist}
                        onChangeText={(val) => handleTextChange(index, 'artist', val)}
                        placeholder="Artista"
                        placeholderTextColor="#A0A0A0"
                      />
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.previewFooter}>
              <TouchableOpacity style={styles.primaryBtn} onPress={handleAddDiscs}>
                <Text style={styles.primaryBtnText}>
                  Añadir {albums.filter((a) => a.selected).length} discos
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </SafeAreaView>
    );
  }

  // ----------------------------------------------------
  // Render Camera State
  // ----------------------------------------------------
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <SafeAreaView style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <Text style={styles.title}>Escanear fila de lomos (Beta)</Text>
          </View>

          <View style={styles.spineGuideFrame}>
            <Text style={styles.guideText}>
              Alinea los lomos de tus vinilos dentro del recuadro
            </Text>
            <Text style={styles.experimentalText}>
              ⚠️ Funcionalidad experimental en fase Beta
            </Text>
            <View style={styles.spineHorizontalBox}>
              <View style={[styles.corner, styles.tl]} />
              <View style={[styles.corner, styles.tr]} />
              <View style={[styles.corner, styles.bl]} />
              <View style={[styles.corner, styles.br]} />
            </View>
          </View>

          <View style={styles.footer}>
            {scanning ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingText}>Identificando lomos con Gemini AI...</Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
                <View style={styles.captureInner} />
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </CameraView>

      <AiConsentModal
        visible={showConsentModal}
        onAccept={async () => {
          await setAiConsent(true);
          await setAiEnabled(true);
          setShowConsentModal(false);
          takePicture();
        }}
        onDecline={async () => {
          await setAiConsent(false);
          await setAiEnabled(false);
          setShowConsentModal(false);
          Alert.alert(
            t('ai_consent_title'),
            t('ai_consent_settings_disabled'),
            [{ text: t('common_understood') }]
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  closeButton: {
    padding: 5,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 20,
  },
  spineGuideFrame: {
    alignSelf: 'center',
    alignItems: 'center',
    width: '90%',
  },
  guideText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  experimentalText: {
    color: '#F1C40F',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    textShadowColor: 'black',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  spineHorizontalBox: {
    width: '100%',
    height: 160,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: 'white',
    borderWidth: 3,
  },
  tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  footer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'white',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontWeight: '600',
  },
  permissionModal: {
    width: '85%',
    backgroundColor: '#1C1C1E',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  permissionTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  permissionSubtitle: {
    color: '#A0A0A0',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },

  // Preview Styles
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E4E2',
  },
  backBtn: {
    padding: 4,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  previewInstructions: {
    fontSize: 14,
    color: '#7F8C8D',
    lineHeight: 20,
    marginBottom: 18,
  },
  albumCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E4E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  checkboxContainer: {
    padding: 4,
    marginRight: 12,
  },
  cardFields: {
    flex: 1,
    gap: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputLabel: {
    width: 50,
    fontSize: 13,
    fontWeight: 'bold',
    color: '#7F8C8D',
  },
  textInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
    backgroundColor: '#FAF9F6',
  },
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E4E2',
  },

  // Summary Styles
  summaryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  summaryIconContainer: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 24,
  },
  summaryDetails: {
    width: '100%',
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E4E2',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#7F8C8D',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  summaryNotice: {
    fontSize: 13,
    color: '#7F8C8D',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 36,
  },
  summaryActions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'black',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  primaryBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 16,
    borderRadius: 12,
    width: '100%',
  },
  secondaryBtnText: {
    color: 'black',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
