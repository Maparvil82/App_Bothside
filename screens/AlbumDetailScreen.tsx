import React, { useState, useCallback, useEffect, useRef } from 'react';
// Refreshed to fix ReferenceError
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Modal,
  SafeAreaView,
  Linking,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useRoute, useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGems } from '../contexts/GemsContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { DiscogsService, getAlbumEditions } from '../services/discogs';
import { AudioMiniPlayer } from '../components/AudioMiniPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { UserCollectionService, AlbumService, UserMaletaService } from '../services/database';
import { needsDiscogsRefresh, hoursSinceCache } from '../utils/cache';
import ShelfGrid from '../components/ShelfGrid';
import { MaletaCoverCollage } from '../components/MaletaCoverCollage';
import { DiscogsAttribution } from '../components/DiscogsAttribution';
import { CreateMaletaModalContext } from '../contexts/CreateMaletaModalContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { PublicAlbumView } from '../components/PublicAlbumView';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

const { width } = Dimensions.get('window');

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

interface AlbumDetail {
  id: string;
  added_at: string;
  audio_note?: string;
  is_gem?: boolean;
  albums: {
    id: string;
    title: string;
    artist: string;
    release_year: string;
    label: string;
    cover_url?: string;
    estimated_value?: string;
    catalog_no?: string;
    country?: string;
    album_styles?: Array<{ styles: { name: string } }>;
    album_youtube_urls?: Array<{ url: string }>;
    album_stats?: { avg_price: number; want?: number; have?: number };
    tracks?: Array<{ position: string; title: string; duration: string }>;
    discogs_id?: number;
    discogs_cached_at?: string;
  };
  user_list_items?: Array<{
    id: string;
    title: string;
    description?: string;
    is_collaborative?: boolean;
    albums?: Array<{
      id: string;
      title: string;
      artist: string;
      cover_url?: string;
    }>;
    list_items: Array<{ album_id: string }>;
  }>;
  shelf_id?: string;
  shelf_name?: string;
  location_row?: number;
  location_column?: number;
}

// Helper to extract YouTube ID
const extractYouTubeId = (url: string | null | undefined): string | null => {
  if (!url) return null;
  try {
    const parsed = new URL(url);

    // Formato corto: https://youtu.be/VIDEO_ID
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || null;
    }

    // Formato estándar: https://www.youtube.com/watch?v=VIDEO_ID
    const vParam = parsed.searchParams.get('v');
    if (vParam) return vParam;

    // Otros formatos posibles (embed, shorts, etc.)
    const match = url.match(/(?:embed\/|shorts\/|v\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : null;
  } catch {
    // fallback por si URL() falla
    const match = url.match(/(?:embed\/|shorts\/|v\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    return match ? match[1] : null;
  }
};

export default function AlbumDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isGem, addGem, removeGem, refreshGems, updateGemStatus } = useGems();
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const { t } = useTranslation();
  const { openCreateMaletaModal } = React.useContext(CreateMaletaModalContext);

  // Header configuration moved down to include delete handler
  // useEffect(() => {
  //   navigation.setOptions({ title: t("album_detail_header") });
  // }, [navigation, t]);

  // Color constante para botones y tags
  const LIGHT_BG_COLOR = '#f1f1f1ff';

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [editions, setEditions] = useState<any[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [showRatioModal, setShowRatioModal] = useState(false);
  const [currentRatioData, setCurrentRatioData] = useState<{ ratio: number; level: string; color: string } | null>(null);
  const [showAllEditions, setShowAllEditions] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [fallbackGenres, setFallbackGenres] = useState<string[]>([]);
  const [fallbackStyles, setFallbackStyles] = useState<string[]>([]);
  const [userMaletas, setUserMaletas] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [showListsModal, setShowListsModal] = useState(false);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const lastBackfilledAlbumIdRef = useRef<string | null>(null);

  // Estados para TypeForm
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [typeFormAnswers, setTypeFormAnswers] = useState<string[]>(['', '', '', '', '']);
  const [existingTypeFormResponse, setExistingTypeFormResponse] = useState<any>(null);
  const [loadingTypeForm, setLoadingTypeForm] = useState(false);

  // Estados para reproductor de audio
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Estado para refresco de Discogs
  const [isRefreshingDiscogs, setIsRefreshingDiscogs] = useState(false);
  const refreshInProgressRef = useRef<boolean>(false);

  // Audio Mini Player State
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // Animation for cover
  const coverAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(coverAnim, {
      toValue: isPlayerExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isPlayerExpanded]);

  const coverHeight = coverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [width, 100],
  });

  const coverOpacity = coverAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.8],
  });

  // Estados para álbumes similares
  const [similarAlbums, setSimilarAlbums] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // ESTADO STRICT MODE
  const [collectionStatus, setCollectionStatus] = useState<'loading' | 'in_collection' | 'not_in_collection'>('loading');
  const [isInCollection, setIsInCollection] = useState(false);


  const { albumId } = route.params as { albumId: string };

  // --- DELETE MODAL LOGIC ---
  // Helper to truncate title
  const truncate = (text: string, maxLen = 30) =>
    text && text.length > maxLen ? text.slice(0, maxLen) + "…" : text;

  const confirmDeleteAlbum = useCallback((albumToDelete: any) => {
    if (!albumToDelete) return;

    // Determine the correct title path. 
    // In SearchScreen it's item.albums.title. 
    // In AlbumDetailScreen, 'album' state might be the user_collection row joined with albums.
    // Based on usage like album.albums.id, the title is likely in album.albums.title.
    // However, sometimes it might be flattened or different. 
    // We'll try both: albumToDelete.albums?.title || albumToDelete.title
    const title = albumToDelete.albums?.title || albumToDelete.title || '';
    const truncatedTitle = truncate(title);

    Alert.alert(
      t("collection_delete_title", { title: truncatedTitle }),
      t("collection_delete_message"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: async () => {
            // Pass the user_collection ID (albumToDelete.id)
            await handleDeleteConfirmed(albumToDelete.id);
          }
        }
      ],
      { cancelable: true }
    );
  }, [t]);

  const handleDeleteConfirmed = async (userCollectionId: string) => {
    if (!userCollectionId) return;

    try {
      // Delete directly from user_collection using the primary key ID
      const { error } = await supabase
        .from('user_collection')
        .delete()
        .eq('id', userCollectionId);

      if (error) throw error;

      navigation.goBack();
    } catch (error) {
      console.error('Error deleting album:', error);
      Alert.alert(t('common_error'), t('search_error_deleting'));
    }
  };

  // Update header with delete button
  useEffect(() => {
    navigation.setOptions({
      title: t("album_detail_header"),
      headerRight: () => (
        <TouchableOpacity
          onPress={() => confirmDeleteAlbum(album)}
          style={{ marginRight: 16 }}
        >
          <Ionicons name="trash-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      )
    });
  }, [navigation, t, album, confirmDeleteAlbum]);
  // --------------------------

  // Preguntas del TypeForm
  // Preguntas del TypeForm
  const typeFormQuestions = [
    t('album_detail_question_favorite_song'),
    t('album_detail_question_last_listened'),
    t('album_detail_question_memories'),
    t('album_detail_question_discovery'),
    t('album_detail_question_feelings')
  ];

  // Funciones para manejar el TypeForm
  const handleTypeFormAnswer = (answer: string) => {
    const newAnswers = [...typeFormAnswers];
    newAnswers[currentQuestion] = answer;
    setTypeFormAnswers(newAnswers);
  };



  // Función para guardar una pregunta individual
  const handleSaveQuestion = async () => {
    // Si es un álbum temporal, no permitir guardar notas
    if (album?.id?.startsWith('temp_')) {
      Alert.alert(
        t('common_notice'),
        t('album_detail_add_to_collection_first') || 'Debes añadir este álbum a tu colección para guardar notas.'
      );
      return;
    }

    try {
      // Primero intentar actualizar si ya existe una respuesta
      if (existingTypeFormResponse) {
        const { error: updateError } = await supabase
          .from('album_typeform_responses')
          .update({
            [`question_${currentQuestion + 1}`]: typeFormAnswers[currentQuestion],
          })
          .eq('user_id', user?.id)
          .eq('user_collection_id', album?.id);

        if (updateError) {
          console.error('Error al actualizar respuesta:', updateError);
          Alert.alert(t('common_error'), t('album_detail_error_saving_answer'));
          return;
        }
      } else {
        // Si no existe, crear un nuevo registro
        const { error: insertError } = await supabase
          .from('album_typeform_responses')
          .insert({
            user_id: user?.id,
            user_collection_id: album?.id,
            [`question_${currentQuestion + 1}`]: typeFormAnswers[currentQuestion],
          });

        if (insertError) {
        }

        setShowTypeForm(false);
        setCurrentQuestion(0);
        setTypeFormAnswers(['', '', '', '', '']);
        // Recargar las respuestas existentes para actualizar la vista
        await loadExistingTypeFormResponse();
        Alert.alert(t('common_saved'), t('album_detail_success_saved_answer'));
      }
    } catch (error) {
      console.error('Error al guardar respuesta:', error);
      Alert.alert(t('common_error'), t('album_detail_error_saving_answer'));
    }
  };

  // Cargar respuestas existentes del TypeForm
  const loadExistingTypeFormResponse = useCallback(async () => {
    if (!user?.id || !album?.id) return;

    // Si es un álbum temporal (no está en user_collection), no intentar cargar respuestas
    if (album.id.startsWith('temp_')) {
      setExistingTypeFormResponse(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('album_typeform_responses')
        .select('*')
        .eq('user_id', user.id)
        .eq('user_collection_id', album.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error al cargar respuestas del TypeForm:', error);
      } else if (data) {
        setExistingTypeFormResponse(data);
      }
    } catch (error) {
      console.error('Error al cargar respuestas del TypeForm:', error);
    }
  }, [user?.id, album?.id]);

  // Refresh Discogs CC0 data if cache is older than 6 hours
  const refreshDiscogsData = useCallback(async (albumDbId: string, discogsId: number) => {
    // Prevent multiple simultaneous refreshes
    if (refreshInProgressRef.current) {
      console.log('⏭️ Discogs refresh already in progress, skipping...');
      return;
    }

    // GUARD: MODO PÚBLICO - No refrescar si no está en colección
    if (!isInCollection) {
      console.log("🔍 MODO PÚBLICO: NO refrescar Discogs/CC0 ni recargar álbum");
      return;
    }

    try {
      refreshInProgressRef.current = true;
      setIsRefreshingDiscogs(true);

      console.log(`🔄 Refreshing Discogs data for album ${albumDbId}, release ${discogsId}...`);

      // Fetch fresh CC0 data from Discogs
      const cc0Data = await DiscogsService.refreshReleaseCC0Data(discogsId);

      if (!cc0Data) {
        console.warn('⚠️ Could not refresh Discogs data, keeping cached version');
        return;
      }

      // DEEP COMPARISON: Check if data actually changed
      // We need to compare specific fields that we care about
      const currentAlbumData = album?.albums;

      if (currentAlbumData) {
        // Construct a comparable object from current data
        // Note: This is a simplified comparison. For a perfect match we'd need to normalize everything.
        // But checking title, artist, year and track count is usually enough to catch "no changes"
        const currentComparable = {
          title: currentAlbumData.title,
          artist: currentAlbumData.artist,
          year: parseInt(currentAlbumData.release_year || '0'),
          label: currentAlbumData.label,
          trackCount: currentAlbumData.tracks?.length || 0
        };

        const newComparable = {
          title: cc0Data.title,
          artist: cc0Data.artists,
          year: cc0Data.year,
          label: cc0Data.label,
          trackCount: cc0Data.tracklist?.length || 0
        };

        // Simple JSON stringify comparison for these core fields
        if (JSON.stringify(currentComparable) === JSON.stringify(newComparable)) {
          console.log('⏭️ Data is identical, skipping full DB update to prevent loops.');

          // Update ONLY the timestamp to prevent re-checking immediately
          try {
            await AlbumService.updateAlbum(albumDbId, {
              discogs_cached_at: new Date().toISOString()
            });
            console.log('✅ Updated cached_at timestamp only.');

            // Update local state timestamp
            setAlbum(prev => {
              if (!prev || !prev.albums) return prev;
              return {
                ...prev,
                albums: {
                  ...prev.albums,
                  discogs_cached_at: new Date().toISOString()
                }
              };
            });
          } catch (e) {
            console.error('Error updating timestamp:', e);
          }

          return;
        }
      }

      // Update database with fresh data
      const success = await AlbumService.updateAlbumCC0Data(albumDbId, cc0Data);

      if (success) {
        console.log('✅ Discogs data refreshed successfully. Updating local state...');

        // UPDATE LOCAL STATE MANUALLY instead of reloading
        // This prevents the infinite loop of loadAlbumDetail -> refreshDiscogsData -> loadAlbumDetail
        setAlbum(prev => {
          if (!prev || !prev.albums) return prev;

          return {
            ...prev,
            albums: {
              ...prev.albums,
              title: cc0Data.title,
              artist: cc0Data.artists,
              release_year: cc0Data.year.toString(),
              label: cc0Data.label,
              cover_url: cc0Data.cover_url || prev.albums.cover_url,
              discogs_cached_at: new Date().toISOString(), // Update timestamp locally
              // We might need to reload tracks if they changed, but for now let's assume
              // the main info update is enough to stop the loop. 
              // If tracks changed significantly, a manual pull-to-refresh would be better
              // than an auto-loop.
            }
          };
        });
      }
    } catch (error) {
      console.error('❌ Error refreshing Discogs data:', error);
      // Don't show error to user, just log it
    } finally {
      setIsRefreshingDiscogs(false);
      refreshInProgressRef.current = false;
    }
  }, [user?.id, isInCollection, album?.albums]);

  // Check collection status immediately
  useEffect(() => {
    const checkStatus = async () => {
      if (!user?.id || !albumId) return;

      try {
        const { count } = await supabase
          .from('user_collection')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .or(`id.eq.${albumId},album_id.eq.${albumId}`);

        const isIn = count !== null && count > 0;
        console.log('🔒 Collection Status Check:', isIn ? 'IN COLLECTION' : 'NOT IN COLLECTION');
        setCollectionStatus(isIn ? 'in_collection' : 'not_in_collection');
        setIsInCollection(isIn);
      } catch (e) {
        console.error('Error checking collection status:', e);
        setCollectionStatus('not_in_collection');
      }
    };

    checkStatus();
  }, [user?.id, albumId]);

  const loadAlbumDetail = useCallback(() => {
    const fetchFullAlbumData = async () => {
      if (!albumId || !user) {
        setError(t('album_detail_error_no_id'));
        setLoading(false);
        return;
      }

      // Helper para deduplicar tracks
      const deduplicateTracks = (tracks: any[]) => {
        if (!tracks || !Array.isArray(tracks)) return [];
        const seen = new Set<string>();
        return tracks.filter(track => {
          // Crear una clave única basada en posición y título
          const key = `${track.position}-${track.title}-${track.duration}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      };

      // Si ya sabemos que NO está en la colección, forzar modo público directo
      if (collectionStatus === 'not_in_collection') {
        console.log('🚀 Fast-track Public Mode loading');
        // Cargar solo datos públicos
        const { data: albumDirectData, error: albumDirectError } = await supabase
          .from('albums')
          .select(`
              *,
              artists ( name ),
              labels ( name ),
              album_genres ( genres ( name ) ),
              album_styles ( styles ( name ) ),
              tracks ( * ),
              album_youtube_urls ( url ),
              album_stats ( avg_price, want, have )
            `)
          .eq('id', albumId)
          .maybeSingle();

        if (albumDirectData) {
          // Deduplicar tracks antes de guardar
          if (albumDirectData.tracks) {
            albumDirectData.tracks = deduplicateTracks(albumDirectData.tracks);
          }

          const publicAlbum = {
            id: 'temp_' + albumDirectData.id,
            added_at: new Date().toISOString(),
            albums: albumDirectData,
          } as AlbumDetail;
          setAlbum(publicAlbum);
          setLoading(false);
          return;
        }
      }

      setLoading(true);
      setError(null);

      try {
        let fullAlbumData: AlbumDetail | null = null;
        let foundInCollection = false;

        // 1. MODO PRIVADO: Intentar buscar en user_collection primero
        // SOLO si el status dice que está o está cargando
        if (collectionStatus !== 'not_in_collection') {
          const { data: collectionData, error: collectionError } = await supabase
            .from('user_collection')
            .select(`
                *,
                albums (
                  *,
                  artists ( name ),
                  labels ( name ),
                  album_genres ( genres ( name ) ),
                  album_styles ( styles ( name ) ),
                  tracks ( * ),
                  album_youtube_urls ( url ),
                  album_stats ( avg_price, want, have )
                ),
                shelves ( name )
              `)
            .eq('user_id', user.id)
            .or(`id.eq.${albumId},album_id.eq.${albumId}`)
            .maybeSingle();

          if (collectionData && collectionData.albums) {
            // Normalizar estructura del álbum
            const normalizedAlbums = Array.isArray((collectionData as any).albums)
              ? (collectionData as any).albums[0]
              : ((collectionData as any).albums || (collectionData as any).album);

            if (normalizedAlbums) {
              // Deduplicar tracks antes de guardar
              if (normalizedAlbums.tracks) {
                normalizedAlbums.tracks = deduplicateTracks(normalizedAlbums.tracks);
              }

              fullAlbumData = {
                ...collectionData,
                albums: normalizedAlbums,
                shelf_name: (collectionData as any)?.shelves?.name || null,
              } as AlbumDetail;
              foundInCollection = true;
            }
          }
        }

        // 2. MODO PÚBLICO: Si no se encontró en user_collection
        if (!fullAlbumData) {
          // ... (rest of logic same as before)
          console.log('🔍 MODO PÚBLICO: Album no en colección, cargando datos públicos para:', albumId);

          const { data: albumDirectData, error: albumDirectError } = await supabase
            .from('albums')
            .select(`
              *,
              artists ( name ),
              labels ( name ),
              album_genres ( genres ( name ) ),
              album_styles ( styles ( name ) ),
              tracks ( * ),
              album_youtube_urls ( url ),
              album_stats ( avg_price, want, have )
            `)
            .eq('id', albumId)
            .maybeSingle();

          if (albumDirectError) {
            console.error('Error fetching from albums:', albumDirectError);
            throw new Error(`${t('album_detail_error_loading')}: ${albumDirectError.message}`);
          }

          if (!albumDirectData) {
            throw new Error(t('album_detail_error_not_found'));
          }

          // Construir objeto AlbumDetail simulado para modo público
          // Deduplicar tracks antes de guardar
          if (albumDirectData.tracks) {
            albumDirectData.tracks = deduplicateTracks(albumDirectData.tracks);
          }

          fullAlbumData = {
            id: 'temp_' + albumDirectData.id, // ID temporal
            added_at: new Date().toISOString(),
            albums: albumDirectData,
            // Campos privados explícitamente undefined
            audio_note: undefined,
            is_gem: false,
            shelf_id: undefined,
            shelf_name: undefined,
            location_row: undefined,
            location_column: undefined
          } as AlbumDetail;

          foundInCollection = false;
        }

        // Verificar integridad de datos
        if (!fullAlbumData?.albums?.id) {
          throw new Error('Invalid album data structure');
        }

        // Actualizar estado de colección
        setIsInCollection(foundInCollection);
        setAlbum(fullAlbumData);

        // Si encontramos que NO está en colección, actualizar status para futuros renders
        if (!foundInCollection && collectionStatus !== 'not_in_collection') {
          setCollectionStatus('not_in_collection');
        }

        // 3. CARGA DE DATOS ADICIONALES (Condicional)

        // Cargar ediciones (Público y Privado - es info de catálogo)
        if (fullAlbumData.albums) {
          await loadAlbumEditions(fullAlbumData.albums.artist, fullAlbumData.albums.title);
        }

        // SOLO MODO PRIVADO: Cargar estanterías y listas
        if (foundInCollection) {
          const { data: shelvesData, error: shelvesError } = await supabase
            .from('shelves')
            .select('id, name, shelf_rows, shelf_columns');

          if (shelvesError) console.warn('Error loading shelves:', shelvesError);
          setShelves(shelvesData || []);

          // Cargar listas donde está el álbum (solo si es mío)
          const { data: listItems, error: listItemsError } = await supabase
            .from('maleta_albums')
            .select(`
              *,
              user_maletas (
                id,
                title,
                description,
                is_collaborative
              )
            `)
            .eq('album_id', fullAlbumData.albums.id);

          if (listItems) {
            const listsWithAlbums = await Promise.all(
              (listItems || []).map(async (item) => {
                try {
                  const { data: albums } = await supabase
                    .from('maleta_albums')
                    .select('*, albums(id, title, artist, cover_url)')
                    .eq('maleta_id', item.user_maletas.id)
                    .limit(4);

                  return {
                    ...item.user_maletas,
                    albums: albums?.map((la: any) => la.albums).filter(Boolean) || []
                  };
                } catch (e) { return { ...item.user_maletas, albums: [] }; }
              })
            );

            setAlbum(prev => prev ? ({
              ...prev,
              user_list_items: listsWithAlbums.map(list => ({
                id: list.id,
                title: list.title,
                description: list.description,
                is_collaborative: list.is_collaborative,
                albums: list.albums,
                list_items: [{ album_id: fullAlbumData!.albums.id }]
              }))
            }) : null);
          }
        }

        // REFRESCO DISCOGS (Público y Privado)
        if (fullAlbumData.albums) {
          const cachedAt = (fullAlbumData.albums as any)?.discogs_cached_at;
          const discogsId = (fullAlbumData as any)?.albums?.discogs_id;

          // GUARD: Solo refrescar si está en colección
          if (foundInCollection && discogsId && needsDiscogsRefresh(cachedAt)) {
            refreshDiscogsData(fullAlbumData.albums.id, discogsId);
          }

          // Backfill logic...
        }

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFullAlbumData();
  }, [albumId, user?.id, collectionStatus]);

  useFocusEffect(
    useCallback(() => {
      loadAlbumDetail();
    }, [loadAlbumDetail])
  );

  // Cargar respuestas del TypeForm cuando cambia el álbum (SOLO MODO PRIVADO)
  useEffect(() => {
    if (album?.id && collectionStatus === 'in_collection') {
      loadExistingTypeFormResponse();
    } else {
      setExistingTypeFormResponse(null);
    }
  }, [album?.id, collectionStatus, loadExistingTypeFormResponse]);

  // ... (existing code) ...

  // Función para añadir/quitar gem
  const handleToggleGem = async () => {
    if (!isInCollection) {
      Alert.alert(
        t('common_notice'),
        t('album_detail_add_to_collection_first') || 'Añade este álbum a tu colección para marcarlo como joya.'
      );
      return;
    }

    // ... (rest of handleToggleGem logic) ...
    console.log('🔍 handleToggleGem llamado con:', {
      userId: user?.id,
      albumId: album?.id,
      albumAlbumsId: album?.albums?.id,
      isCurrentlyGem: album?.albums?.id ? isGem(album.albums.id) : 'undefined'
    });

    if (!user?.id || !album?.albums?.id) {
      console.log('❌ Validación falló:', { userId: user?.id, albumAlbumsId: album?.albums?.id });
      return;
    }

    try {
      // Usar el ID del álbum para verificar si es gem
      const isCurrentlyGem = isGem(album.albums.id);
      console.log('💎 Estado actual del gem:', isCurrentlyGem);

      if (isCurrentlyGem) {
        console.log('🗑️ Removiendo gem para album.albums.id:', album.albums.id);
        // Usar el servicio de base de datos para toggle
        await UserCollectionService.toggleGemStatus(user.id, album.albums.id);
        // Actualizar el contexto local
        updateGemStatus(album.albums.id, false);
        Alert.alert(t('album_detail_gem_removed_title'), t('album_detail_gem_removed_message'));
      } else {
        console.log('➕ Añadiendo gem para album.albums.id:', album.albums.id);
        // Usar el servicio de base de datos para toggle
        await UserCollectionService.toggleGemStatus(user.id, album.albums.id);
        // Actualizar el contexto local
        updateGemStatus(album.albums.id, true);
        Alert.alert(t('album_detail_gem_added_title'), t('album_detail_gem_added_message'));
      }

      // Recargar el álbum para actualizar el estado
      console.log('🔄 Recargando álbum...');
      loadAlbumDetail();

      // Refrescar el contexto de gems para sincronizar
      console.log('🔄 Refrescando contexto de gems...');
      refreshGems();
    } catch (error) {
      console.error('❌ Error al gestionar gem:', error);
      Alert.alert(t('common_error'), t('album_detail_gem_error_message'));
    }
  };

  // ... (existing code) ...




  // Cargar listas del usuario
  const loadUserLists = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { UserMaletaService } = await import('../services/database');
      const lists = await UserMaletaService.getUserMaletas(user.id);
      setUserMaletas(lists || []);
    } catch (error) {
      console.error('Error loading user lists:', error);
    }
  }, [user?.id]);

  // Cargar álbumes similares
  const loadSimilarAlbums = useCallback(async () => {
    if (!user?.id || !album?.albums?.artist) return;
    try {
      const { data } = await supabase
        .from('user_collection')
        .select('*, albums(*)')
        .eq('user_id', user.id)
        .neq('album_id', album.albums.id) // Excluir el actual
        .textSearch('albums.artist', album.albums.artist) // Búsqueda simple por artista
        .limit(5);

      if (data) {
        setSimilarAlbums(data as any);
      }
    } catch (error) {
      console.error('Error loading similar albums:', error);
    }
  }, [user?.id, album?.albums?.artist, album?.albums?.id]);

  // Calcular ratio de ventas
  const calculateSalesRatio = (want: number, have: number) => {
    if (!have || have === 0) return { ratio: 0, level: 'N/A', color: '#9ca3af' };
    const ratio = want / have;
    let level = 'Normal';
    let color = '#9ca3af';

    if (ratio > 10) {
      level = 'Holy Grail';
      color = '#FFD700'; // Gold
    } else if (ratio > 5) {
      level = 'Muy Deseado';
      color = '#FF4500'; // OrangeRed
    } else if (ratio > 2) {
      level = 'Popular';
      color = '#32CD32'; // LimeGreen
    }

    return { ratio, level, color };
  };

  // Obtener info del ratio
  const getRatioInfo = (level: string) => {
    switch (level) {
      case 'Holy Grail':
        return {
          title: 'Holy Grail',
          significado: 'Este álbum es extremadamente raro y deseado.',
          probabilidad: 'Muy baja probabilidad de encontrarlo.',
          estrategia: 'Si lo ves, cómpralo inmediatamente.'
        };
      case 'Muy Deseado':
        return {
          title: 'Muy Deseado',
          significado: 'Mucha gente quiere este álbum.',
          probabilidad: 'Difícil de encontrar a buen precio.',
          estrategia: 'Mantente alerta a ofertas.'
        };
      case 'Popular':
        return {
          title: 'Popular',
          significado: 'Es un álbum conocido y buscado.',
          probabilidad: 'Disponible pero con demanda.',
          estrategia: 'Buen álbum para tener en la colección.'
        };
      default:
        return {
          title: 'Normal',
          significado: 'Demanda estándar.',
          probabilidad: 'Fácil de encontrar.',
          estrategia: 'Compara precios antes de comprar.'
        };
    }
  };

  // Audio handlers
  const handlePlayAudio = async (uri: string) => {
    try {
      if (currentAudioUrl === uri && isPlaying) {
        setIsPlaying(false);
        setCurrentAudioUrl(null);
      } else {
        setCurrentAudioUrl(uri);
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const handleRecordAudio = () => {
    setShowAudioRecorder(true);
  };

  const handleSaveAudioNote = async (uri: string) => {
    if (!user?.id || !album?.id) return;
    try {
      // Actualizar en DB
      const { error } = await supabase
        .from('user_collection')
        .update({ audio_note: uri })
        .eq('id', album.id);

      if (error) throw error;

      // Recargar álbum
      loadAlbumDetail();
      setShowAudioRecorder(false);
      Alert.alert(t('common_success'), t('album_detail_audio_saved'));
    } catch (error) {
      console.error('Error saving audio note:', error);
      Alert.alert(t('common_error'), t('album_detail_error_saving_audio'));
    }
  };



  // Cargar ediciones
  const loadAlbumEditions = async (artist?: string, title?: string) => {
    if (!artist || !title) return;

    setEditionsLoading(true);
    try {
      const results = await getAlbumEditions(artist, title);
      setEditions(results);
    } catch (error) {
      console.error('Error loading editions:', error);
    } finally {
      setEditionsLoading(false);
    }
  };

  // Backfill Discogs (Stub)
  const backfillDiscogsDetails = async () => {
    // Placeholder
  };

  // Función para añadir álbum a una lista
  const handleAddToList = async (listId: string) => {
    if (!user?.id || !album?.albums.id) return;

    try {
      // Verificar si el álbum ya está en la lista usando el servicio correcto
      const { UserMaletaService } = await import('../services/database');
      const isAlreadyInList = await UserMaletaService.isAlbumInMaleta(listId, album.albums.id);

      if (isAlreadyInList) {
        Alert.alert(t('album_detail_already_in_bag_title'), t('album_detail_already_in_bag_message'));
        return;
      }

      // Añadir el álbum a la lista usando el servicio correcto
      await UserMaletaService.addAlbumToMaleta(listId, album.albums.id);

      Alert.alert(t('album_detail_added_to_bag_title'), t('album_detail_added_to_bag_message'));
      setShowListsModal(false);
      setSelectedListId(null);

      // Recargar las listas para actualizar la información
      loadUserLists();
      // Recargar el álbum para actualizar la información
      loadAlbumDetail();
    } catch (error) {
      console.error('Error al añadir a maleta:', error);
      Alert.alert(t('common_error'), t('album_detail_error_adding_to_bag_message'));
    }
  };

  // Función para crear nueva lista
  const handleCreateNewList = async () => {
    try {
      setShowListsModal(false);
      // Open global modal with album ID to auto-add album to new maleta
      // Use album.albums.id (albums table ID) not album.id (user_collection ID)
      // Pass loadAlbumDetail as callback to reload maleta lists after creation
      if (album?.albums?.id) {
        openCreateMaletaModal(album.albums.id, loadAlbumDetail);
      }
    } catch (error) {
      console.error('Error opening create maleta modal:', error);
    }
  };

  // ========== FIN FUNCIONES GEMS Y LISTAS ==========

  // Cargar listas del usuario cuando se monta el componente
  useEffect(() => {
    if (collectionStatus === 'in_collection') {
      loadUserLists();
    }
  }, [loadUserLists, collectionStatus]);

  // Cargar álbumes similares cuando se monta el componente
  useEffect(() => {
    if (collectionStatus === 'in_collection') {
      loadSimilarAlbums();
    }
  }, [loadSimilarAlbums, collectionStatus]);

  // Refrescar gems cuando se monta el componente
  useEffect(() => {
    if (user?.id && collectionStatus === 'in_collection') {
      refreshGems();
    }
  }, [user?.id, refreshGems, collectionStatus]);

  // EARLY RETURN FOR PUBLIC MODE
  if (collectionStatus === 'loading' && !album) {
    return <BothsideLoader />;
  }

  if (collectionStatus === 'not_in_collection') {
    return (
      <PublicAlbumView
        album={album}
        loading={loading}
      />
    );
  }

  if (loading) {
    return <BothsideLoader />;
  }

  if (error || !album) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc3545" />
        <Text style={styles.errorText}>{error || t('album_detail_not_found')}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>{t('common_back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const stylesList = (album.albums.album_styles?.map(as => as.styles?.name).filter(Boolean) || []) as string[];
  const genresList = ((album as any)?.albums?.album_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || []) as string[];

  // Eliminar duplicados usando Set
  const uniqueGenres: string[] = [...new Set(genresList)];
  const uniqueStyles: string[] = [...new Set(stylesList)];

  const mergedGenres = uniqueGenres.length > 0 ? uniqueGenres : fallbackGenres;
  const mergedStyles = uniqueStyles.length > 0 ? uniqueStyles : fallbackStyles;

  const youtubeUrls = album.albums.album_youtube_urls?.map(ay => ay.url).filter(Boolean) || [];

  const youtubeVideoId = youtubeUrls.length > 0 ? extractYouTubeId(youtubeUrls[0]) : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background, paddingBottom: 20 }]}>


      <ScrollView showsVerticalScrollIndicator={false} removeClippedSubviews={false} style={[styles.detalleScroll]}>
        {/* Portada */}
        <Animated.View style={[
          styles.coverSection,
          {
            backgroundColor: colors.card,
            height: coverHeight, // Animate height
            overflow: 'hidden'
          }
        ]}>
          {album.albums.cover_url ? (
            <Animated.Image
              source={{ uri: album.albums.cover_url }}
              style={[
                styles.fullCoverImage,
                { opacity: coverOpacity }
              ]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fullCoverPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={[styles.fullCoverPlaceholderText, { color: colors.text }]}>{t('album_detail_no_cover')}</Text>
            </View>
          )}
        </Animated.View>



        {/* Sección Unificada: Valor de Mercado y Ratio de Venta */}
        {(album.albums.album_stats?.avg_price || (album.albums.album_stats?.want && album.albums.album_stats?.have)) && (
          <View style={[styles.unifiedMarketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.marketRowContainer}>
              {/* Valor de Mercado */}
              {album.albums.album_stats?.avg_price && (
                <View style={styles.marketValueSection}>
                  <Text style={[styles.valueCardTitle, { color: colors.text }]}>{t('album_detail_market_value')}</Text>
                  <Text style={[styles.valueCardAmount, { color: colors.primary }]}>
                    ${album.albums.album_stats.avg_price.toFixed(2)}
                  </Text>
                  <Text style={[styles.valueCardSubtitle, { color: colors.text }]}>{t('album_detail_avg_price')}</Text>
                </View>
              )}

              {/* Divisor vertical si ambos están presentes */}
              {album.albums.album_stats?.avg_price && album.albums.album_stats?.want && album.albums.album_stats?.have && (
                <View style={[styles.marketCardVerticalDivider, { backgroundColor: colors.border }]} />
              )}

              {/* Ratio de Venta */}
              {album.albums.album_stats?.want && album.albums.album_stats?.have && (
                (() => {
                  const { ratio, level, color } = calculateSalesRatio(
                    album.albums.album_stats.want,
                    album.albums.album_stats.have
                  );
                  return (
                    <TouchableOpacity
                      style={[styles.ratioSection, { backgroundColor: color }]}
                      onPress={() => {
                        setCurrentRatioData({ ratio, level, color });
                        setShowRatioModal(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.ratioCardHeader}>
                        <Text style={styles.ratioCardTitle}>{t('album_detail_sales_ratio')}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={styles.ratioCardAmount}>
                          {ratio > 0 ? ratio.toFixed(1) : 'N/A'}
                        </Text>
                        <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.8)" style={{ marginLeft: 6 }} />
                      </View>
                      <Text style={styles.ratioCardLevel}>{level}</Text>
                    </TouchableOpacity>
                  );
                })()
              )}
            </View>
          </View>
        )}

        {/* Información principal del álbum */}
        <View style={[styles.albumInfoSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.albumTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{album.albums.title}</Text>
          <Text style={[styles.artist, { color: colors.text }]}>{album.albums.artist}</Text>
          <View style={styles.labelYearContainer}>
            <Text style={[styles.label, { color: colors.text }]}>{album.albums.label}</Text>
            {album.albums.release_year && (
              <>
                <Text style={[styles.separator, { color: colors.text }]}> • </Text>
                <Text style={[styles.year, { color: colors.text }]}>{album.albums.release_year}</Text>
              </>
            )}
          </View>
          {(album.albums.catalog_no || album.albums.country) && (
            <View style={styles.catalogCountryContainer}>
              {album.albums.catalog_no && (
                <>
                  <Text style={[styles.catalog, { color: colors.text }]}>{album.albums.catalog_no}</Text>
                  {album.albums.country && <Text style={[styles.separator, { color: colors.text }]}> • </Text>}
                </>
              )}
              {album.albums.country && (
                <Text style={[styles.countryText, { color: colors.text }]}>{album.albums.country}</Text>
              )}
            </View>
          )}

          {/* Géneros y Estilos */}
          {(mergedGenres.length > 0 || mergedStyles.length > 0) && (
            <View style={styles.stylesContainer}>
              {mergedGenres.map((genre: string, index: number) => (
                <View key={`g-${index}`} style={[styles.styleTag, { backgroundColor: LIGHT_BG_COLOR }]}>
                  <Text style={[styles.styleText, { color: colors.text }]}>{genre}</Text>
                </View>
              ))}
              {mergedStyles.map((style: string, index: number) => (
                <View key={`s-${index}`} style={[styles.styleTag, { backgroundColor: LIGHT_BG_COLOR }]}>
                  <Text style={[styles.styleText, { color: colors.text }]}>{style}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags de Gem y Audio Note */}
          {/* <View style={styles.tagsContainer}>
            {album.is_gem && (
              <View style={[styles.gemTag, { backgroundColor: colors.border }]}>
                <Ionicons name="diamond" size={16} color="#d97706" />
                <Text style={[styles.gemTagText, { color: colors.text }]}>Gema</Text>
              </View>
            )}
            {album.audio_note && (
              <View style={[styles.audioTag, { backgroundColor: colors.border }]}>
                <Ionicons name="mic" size={16} color={colors.primary} />
                <Text style={[styles.audioTagText, { color: colors.text }]}>Audio</Text>
              </View>
            )}
          </View>*/}

          {/* Botones de Acción */}
          <View style={styles.actionButtonsContainer}>
            {/* Botón Gem */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: LIGHT_BG_COLOR },
                isGem(album.albums.id) && styles.actionButtonActive
              ]}
              onPress={handleToggleGem}
            >
              <Ionicons
                name={isGem(album.albums.id) ? "diamond" : "diamond-outline"}
                size={20}
                color={isGem(album.albums.id) ? "#d97706" : colors.text}
              />
              <Text style={[
                styles.actionButtonText,
                { color: colors.text },
                isGem(album.albums.id) && styles.actionButtonTextActive
              ]}>
                {isGem(album.albums.id) ? t('album_detail_remove_gem') : t('album_detail_add_gem')}
              </Text>
            </TouchableOpacity>

            {/* Botón Lista */}
            {/* Botón Lista */}
            <TouchableOpacity
              style={[
                styles.actionButton,
                { backgroundColor: (album.user_list_items && album.user_list_items.length > 0) ? '#e0f2fe' : LIGHT_BG_COLOR },
                (album.user_list_items && album.user_list_items.length > 0) && { borderColor: '#0284c7', borderWidth: 1 }
              ]}
              onPress={async () => {
                if (album.user_list_items && album.user_list_items.length > 0) {
                  // Si ya está en listas, quitar de todas
                  try {
                    // Mostrar alerta de confirmación
                    Alert.alert(
                      t('album_detail_remove_from_bag_title'),
                      t('album_detail_remove_from_bag_message'),
                      [
                        { text: t('common_cancel'), style: "cancel" },
                        {
                          text: t('common_delete'),
                          style: "destructive",
                          onPress: async () => {
                            // Eliminar de todas las listas
                            if (album.user_list_items) {
                              for (const item of album.user_list_items) {
                                await UserMaletaService.removeAlbumFromMaleta(item.id, album.albums.id);
                              }
                              // Recargar datos
                              loadAlbumDetail();
                            }
                          }
                        }
                      ]
                    );
                  } catch (error) {
                    console.error("Error removing from maletas:", error);
                    Alert.alert(t('common_error'), t('album_detail_error_removing_from_bag'));
                  }
                } else {
                  // Si no está, abrir modal
                  setShowListsModal(true);
                }
              }}
            >
              <Ionicons
                name={(album.user_list_items && album.user_list_items.length > 0) ? "cube" : "cube-outline"}
                size={20}
                color={(album.user_list_items && album.user_list_items.length > 0) ? '#0284c7' : colors.text}
              />
              <Text style={[
                styles.actionButtonText,
                { color: (album.user_list_items && album.user_list_items.length > 0) ? '#0284c7' : colors.text }
              ]}>
                {(album.user_list_items && album.user_list_items.length > 0) ? t('album_detail_in_bag') : t('album_detail_add_to_bag')}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Listas donde está guardado */}
        {album.user_list_items && album.user_list_items.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_saved_in_bags')}</Text>
            {album.user_list_items.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.listItemContainer, { backgroundColor: LIGHT_BG_COLOR, borderColor: LIGHT_BG_COLOR }]}
                onPress={() => {
                  console.log('🔍 AlbumDetailScreen: Navigating to ViewList with:', {
                    listId: item.id,
                    listTitle: item.title
                  });
                  // Navegar al tab de Maletas y luego a ViewMaleta
                  (navigation as any).navigate('Main', {
                    screen: 'MaletasTab',
                    params: {
                      screen: 'ViewMaleta',
                      params: {
                        maletaId: item.id,
                        listTitle: item.title
                      }
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <MaletaCoverCollage
                  albums={(item.albums || []).map(album => ({ albums: album }))}
                  size={60}
                />
                <View style={styles.listInfo}>
                  <Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={[styles.listDescription, { color: colors.text }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  )}
                  {/* Collaborative Badge */}
                  {item.is_collaborative && (
                    <View style={{
                      backgroundColor: '#dbeafe', // blue-100
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 4,
                      alignSelf: 'flex-start',
                      marginTop: 4
                    }}>
                      <Text style={{
                        fontSize: 10,
                        color: '#1e40af', // blue-800
                        fontWeight: '600'
                      }}>
                        {t('collaborative_label')}
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sección de Tracks */}
        {album.albums.tracks && album.albums.tracks.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_tracks')}</Text>
            {album.albums.tracks.map((track, index) => (
              <View key={index} style={[styles.trackItem, { borderBottomColor: colors.border }]}>
                <View style={styles.trackInfo}>
                  <Text style={[styles.trackPosition, { color: colors.text }]}>{track.position}</Text>
                  <Text style={[styles.trackTitle, { color: colors.text }]}>{track.title}</Text>
                </View>
                {track.duration && (
                  <Text style={[styles.trackDuration, { color: colors.text }]}>{track.duration}</Text>
                )}
              </View>
            ))}
          </View>
        )}



        {/* Sección de Ediciones */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_vinyl_editions')}</Text>
          {editionsLoading ? (
            <View style={styles.loadingContainer}>
              <BothsideLoader />
              <Text style={[styles.loadingText, { color: colors.text }]}>{t('album_detail_loading_editions')}</Text>
            </View>
          ) : editions.length > 0 ? (
            <View style={styles.editionsContainer}>
              {(showAllEditions ? editions : editions.slice(0, 3)).map((edition, index) => (
                <View
                  key={edition.id}
                  style={[styles.editionItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
                >
                  {edition.thumb && (
                    <Image
                      source={{ uri: edition.thumb }}
                      style={styles.editionCover}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.editionInfo}>
                    <Text style={[styles.editionTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.title}</Text>
                    <Text style={[styles.editionArtist, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.artist}</Text>

                    {/* Formato */}
                    {edition.format && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t('album_detail_format')}</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.format}</Text>
                      </View>
                    )}

                    {/* Sello */}
                    {edition.label && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t('album_detail_label')}</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.label}</Text>
                      </View>
                    )}

                    {/* Año */}
                    {edition.year && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t('album_detail_year')}</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.year}</Text>
                      </View>
                    )}

                    {/* País */}
                    {edition.country && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t('album_detail_country')}</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.country}</Text>
                      </View>
                    )}

                    {/* Catálogo */}
                    {edition.catno && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{t('album_detail_catalog')}</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.catno}</Text>
                      </View>
                    )}
                  </View>
                </View>
              ))}

              {/* Botón "Ver más" o "Ver menos" */}
              {editions.length > 3 && (
                <TouchableOpacity
                  style={[styles.seeMoreButton]}
                  onPress={() => setShowAllEditions(!showAllEditions)}
                >
                  <Text style={[styles.seeMoreButtonText]}>
                    {showAllEditions ? t('album_detail_see_less') : `${t('album_detail_see_more')} (${editions.length - 3})`}
                  </Text>
                  <Ionicons
                    name={showAllEditions ? "chevron-up" : "chevron-down"}
                    size={16}
                    color={colors.text}
                  />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <Text style={[styles.noEditionsText, { color: colors.text }]}>{t('album_detail_no_editions')}</Text>
          )}
        </View>

        {/* Nota de Audio */}
        {isInCollection && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_audio_note')}</Text>
            {album.audio_note ? (
              // Si existe nota de audio
              <>
                <View style={styles.audioSection}>
                  <View style={styles.audioInfo}>
                    <Ionicons name="mic" size={20} color={colors.primary} />
                    <Text style={[styles.audioInfoText, { color: colors.text }]}>{t('album_detail_has_audio_note')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.playAudioButton]}
                  onPress={() => handlePlayAudio(album.audio_note!)}
                >
                  <Ionicons name="play-circle" size={24} color={colors.primary} />
                  <Text style={[styles.playAudioButtonText]}>{t('album_detail_play_audio_note')}</Text>
                </TouchableOpacity>
              </>
            ) : (
              // Si no existe nota de audio
              <>
                <View style={styles.audioSection}>
                  <View style={styles.audioInfo}>
                    <Ionicons name="mic-outline" size={20} color={colors.text} />
                    <Text style={[styles.audioInfoText, { color: colors.text }]}>{t('album_detail_no_audio_note')}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.recordAudioButton]}
                  onPress={() => handleRecordAudio()}
                >
                  <Ionicons name="mic" size={24} />
                  <Text style={[styles.recordAudioButtonText]}>{t('album_detail_record_audio_note')}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        )}


        {/* Nueva Sección de Ubicación RECONSTRUIDA */}
        {isInCollection && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_location')}</Text>

            {album.shelf_id && album.location_row && album.location_column ? (
              <>
                <Text style={[styles.currentShelfTitle, { color: colors.text }]}>{t('album_detail_currently_in')} {album.shelf_name || t('album_detail_unnamed_shelf')}</Text>
                <ShelfGrid
                  rows={shelves.find(s => s.id === album.shelf_id)?.shelf_rows || 0}
                  columns={shelves.find(s => s.id === album.shelf_id)?.shelf_columns || 0}
                  highlightRow={album.location_row}
                  highlightColumn={album.location_column}
                />
                <Text style={[styles.selectShelfTitle, { color: colors.text }]}>{t('album_detail_change_location')}</Text>
              </>
            ) : (
              <Text style={[styles.selectShelfTitle, { color: colors.text }]}>{t('album_detail_assign_shelf')}</Text>
            )}

            {shelves.map((shelf) => {
              const isCurrentShelf = album.shelf_id === shelf.id;
              return (
                <TouchableOpacity
                  key={shelf.id}
                  style={[
                    styles.shelfSelectItem,
                    { backgroundColor: LIGHT_BG_COLOR, borderColor: LIGHT_BG_COLOR }
                  ]}
                  onPress={() => (navigation as any).navigate('SelectCell', {
                    user_collection_id: album.id,
                    shelf: shelf,
                    current_row: isCurrentShelf ? album.location_row : undefined,
                    current_column: isCurrentShelf ? album.location_column : undefined,
                  })}
                >
                  <Text style={[styles.shelfSelectItemText, { color: colors.text }]}>{shelf.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.text} />
                </TouchableOpacity>
              );
            })}
            {shelves.length === 0 && (
              <Text style={[styles.noShelvesText, { color: colors.text }]}>{t('album_detail_no_shelves')}</Text>
            )}
          </View>
        )}



        {/* Sección TypeForm */}
        {isInCollection && (
          <View style={[styles.typeFormSection, { backgroundColor: colors.card }]}>
            <Text style={[styles.typeFormSectionTitle, { color: colors.text }]}>{t('album_detail_tell_us')}</Text>
            <Text style={[styles.typeFormSectionSubtitle, { color: colors.text }]}>
              {t('album_detail_subtitle')}
            </Text>

            {/* Mostrar todas las preguntas directamente */}
            <View style={styles.typeFormQuestionsContainer}>
              {typeFormQuestions.map((question, index) => {
                const hasAnswer = existingTypeFormResponse?.[`question_${index + 1}`];
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.typeFormQuestionItem,
                      hasAnswer && styles.typeFormQuestionItemAnswered,
                      { backgroundColor: LIGHT_BG_COLOR, borderColor: LIGHT_BG_COLOR }
                    ]}
                    onPress={() => {
                      // Cargar respuesta existente si la hay
                      const currentAnswers = [...typeFormAnswers];
                      currentAnswers[index] = existingTypeFormResponse?.[`question_${index + 1}`] || '';
                      setTypeFormAnswers(currentAnswers);
                      setCurrentQuestion(index);
                      setShowTypeForm(true);
                    }}
                  >
                    <View style={styles.typeFormQuestionHeader}>
                      <Text style={[styles.typeFormQuestionNumber, { color: colors.primary }]}>
                        {index + 1}
                      </Text>
                      <Text style={[styles.typeFormQuestionText, { color: colors.text }]}>
                        {question}
                      </Text>
                      {hasAnswer ? (
                        <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={20} color="#000" />
                      )}
                    </View>
                    {hasAnswer && (
                      <Text style={[styles.typeFormQuestionPreview, { color: colors.text }]}>
                        {existingTypeFormResponse[`question_${index + 1}`]}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Sección de Álbumes Similares */}
        {similarAlbums.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('album_detail_from_collection')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.similarAlbumsContainer}
              contentContainerStyle={styles.similarAlbumsContent}
            >
              {similarAlbums.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.similarAlbumCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    // Navegar al álbum similar
                    (navigation as any).navigate('AlbumDetail', { albumId: item.id });
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.similarAlbumImageContainer}>
                    {item.albums?.cover_url ? (
                      <Image
                        source={{ uri: item.albums.cover_url }}
                        style={styles.similarAlbumImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.similarAlbumImage, styles.similarAlbumPlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="musical-notes" size={24} color={colors.text} />
                      </View>
                    )}
                    {item.is_gem && (
                      <View style={styles.similarAlbumGemBadge}>
                        <Ionicons name="diamond" size={12} color="#FFD700" />
                      </View>
                    )}
                  </View>
                  <View style={styles.similarAlbumInfo}>
                    <Text style={[styles.similarAlbumTitle, { color: colors.text }]} numberOfLines={2} ellipsizeMode="tail">
                      {item.albums?.title || t('common_untitled')}
                    </Text>
                    <Text style={[styles.similarAlbumArtist, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {item.albums?.artist || t('common_unknown_artist')}
                    </Text>
                    {item.albums?.year && (
                      <Text style={[styles.similarAlbumYear, { color: colors.text }]}>
                        {item.albums.year}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Discogs Attribution - Required by Discogs API Terms */}
        {album.albums.discogs_id && (
          <DiscogsAttribution releaseId={album.albums.discogs_id} />
        )}
      </ScrollView>



      {/* Reproductor flotante */}


      {/* Audio Recorder Modal */}
      <AudioRecorder
        visible={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleSaveAudioNote}
        albumTitle={album?.albums.title || 'Álbum'}
      />

      {/* Modal de Listas */}
      <Modal
        visible={showListsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowListsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('album_detail_select_bag')}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowListsModal(false)}
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View style={{ flexShrink: 1 }}>
              <ScrollView style={styles.modalBody}>
                {userMaletas.length > 0 ? (
                  userMaletas.map((list: any) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.listOption}
                      onPress={() => handleAddToList(list.id)}
                    >
                      <MaletaCoverCollage
                        albums={list.albums || []}
                        size={60}
                      />
                      <View style={styles.listOptionInfo}>
                        <Text style={styles.listOptionTitle}>{list.title}</Text>
                        {list.description && (
                          <Text style={styles.listOptionDescription}>{list.description}</Text>
                        )}
                      </View>
                      <Ionicons name="add-circle-outline" size={24} color="#000" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyListsContainer}>
                    <Text style={styles.emptyListsText}>{t('album_detail_no_bags')}</Text>
                  </View>
                )}
              </ScrollView>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.createListButton}
                onPress={handleCreateNewList}
              >
                <Ionicons name="cube-outline" size={20} color="#fff" />
                <Text style={styles.createListButtonText}>{t('album_detail_create_new_bag')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ratio Modal */}
      <Modal
        visible={showRatioModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {currentRatioData && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: currentRatioData.color }]}>
                    {getRatioInfo(currentRatioData.level).title}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowRatioModal(false)}
                  >
                    <Ionicons name="close" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody}>
                  <View style={styles.ratioInfoSection}>
                    <Text style={styles.ratioInfoTitle}>{t('album_detail_meaning')}</Text>
                    <Text style={styles.ratioInfoText}>
                      {getRatioInfo(currentRatioData.level).significado}
                    </Text>
                  </View>

                  <View style={styles.ratioInfoSection}>
                    <Text style={styles.ratioInfoTitle}>{t('album_detail_probability')}</Text>
                    <Text style={styles.ratioInfoText}>
                      {getRatioInfo(currentRatioData.level).probabilidad}
                    </Text>
                  </View>

                  <View style={styles.ratioInfoSection}>
                    <Text style={styles.ratioInfoTitle}>{t('album_detail_strategy')}</Text>
                    <Text style={styles.ratioInfoText}>
                      {getRatioInfo(currentRatioData.level).estrategia}
                    </Text>
                  </View>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* TypeForm Modal */}
      <Modal
        visible={showTypeForm}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.typeFormContainer}>
          <KeyboardAvoidingView
            style={styles.typeFormKeyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            {/* Header del TypeForm */}
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => {
                  setShowTypeForm(false);
                  setCurrentQuestion(0);
                  setTypeFormAnswers(['', '', '', '', '']);
                }}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {album?.albums?.title || 'Álbum'}
              </Text>
              <View style={styles.headerRight} />
            </View>

            {/* Contenido de la pregunta */}
            <ScrollView style={styles.typeFormContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.typeFormQuestion}>
                {typeFormQuestions[currentQuestion]}
              </Text>

              {currentQuestion === 0 && album?.albums?.tracks && album.albums.tracks.length > 0 ? (
                // Primera pregunta: Selección de canción favorita
                <View style={styles.tracklistContainer}>
                  {album.albums.tracks.map((track, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.trackItem,
                        { borderBottomColor: colors.border },
                        typeFormAnswers[0] === track.title && styles.trackItemSelected
                      ]}
                      onPress={() => handleTypeFormAnswer(track.title)}
                    >
                      <View style={styles.trackInfo}>
                        <Text style={[styles.trackPosition, { color: colors.text }]}>{track.position}</Text>
                        <Text style={[
                          styles.trackTitle,
                          { color: colors.text },
                          typeFormAnswers[0] === track.title && styles.trackTitleSelected
                        ]}>
                          {track.title}
                        </Text>
                      </View>
                      <Text style={[styles.trackDuration, { color: colors.text }]}>{track.duration}</Text>
                      {typeFormAnswers[0] === track.title && (
                        <Ionicons name="checkmark-circle" size={24} color="#000" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Resto de preguntas: Input de texto normal
                <TextInput
                  style={[styles.typeFormInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  placeholder={t('album_detail_tell_us_placeholder') || "Escribe tu respuesta..."}
                  value={typeFormAnswers[currentQuestion]}
                  onChangeText={handleTypeFormAnswer}
                  multiline
                  textAlignVertical="top"
                  placeholderTextColor="#999"
                  returnKeyType="done"
                />
              )}
            </ScrollView>

            {/* Botón Guardar */}
            <View style={[styles.typeFormFooter, { justifyContent: 'center' }]}>
              <TouchableOpacity
                style={[
                  styles.typeFormSaveButton,
                  !typeFormAnswers[currentQuestion].trim() && styles.typeFormSaveButtonDisabled
                ]}
                onPress={handleSaveQuestion}
                disabled={!typeFormAnswers[currentQuestion].trim()}
              >
                <Text style={styles.typeFormSaveText}>{t('common_save')}</Text>
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>



      {/* Reproductor de audio flotante (Notas de voz) */}
      {currentAudioUrl && (
        <View style={styles.floatingAudioPlayer}>
          <AudioPlayer
            audioUrl={currentAudioUrl}
            title={album?.albums?.title || 'Música del álbum'}
            onError={(error) => {
              console.error('Audio player error:', error);
              setIsPlaying(false);
              setCurrentAudioUrl(null);
            }}
          />
        </View>
      )}

      {/* Audio Mini Player (Fixed Bottom) */}
      <AudioMiniPlayer
        videoId={youtubeVideoId}
        title={album?.albums?.title || 'Álbum'}
        isVisible={!!youtubeVideoId}
        onExpandChange={setIsPlayerExpanded}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#9ca3af',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },
  albumHeader: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  coverContainer: {
    width: 180,
    height: 180,
    marginRight: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'left',
    marginTop: 4,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  artist: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'left',
  },
  year: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 4,
    textAlign: 'left',
  },
  label: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'left',
  },
  catalogNumber: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  country: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
    marginTop: 2,
  },
  estimatedValue: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: 'bold',
    marginTop: 4,
    backgroundColor: '#28a745',
  },
  addedDate: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  audioNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#f0f9ff',
    padding: 8,
    borderRadius: 6,
  },
  audioNoteText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },

  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  audioInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginTop: 8,
    borderRadius: 4,
    backgroundColor: '#f0f9ff',

    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  playAudioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  recordAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginTop: 8,
    borderRadius: 12,

    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#f0efefff',
  },
  recordAudioButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  sellButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#28a745',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sellButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  youtubeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  youtubeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  youtubeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  youtubePlayButton: {
    padding: 4,
  },
  gemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    padding: 12,
    borderRadius: 8,
  },
  gemText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#d97706',
    fontWeight: '500',
  },
  trackItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  trackInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  trackPosition: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginRight: 12,
    minWidth: 30,
  },
  trackTitle: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  trackDuration: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 8,
  },
  shelfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: AppColors.primary,
  },
  shelfInfo: {
    flex: 1,
    marginLeft: 12,
  },
  shelfTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  shelfDescription: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 12,
    color: '#dc3545',
    marginBottom: 4,
  },
  emptyYouTubeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  emptyYouTubeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: AppColors.primary,
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: AppColors.primary,
  },
  videoCloseButton: {
    padding: 8,
    marginRight: 12,
  },
  videoModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
  },
  videoYouTubeButton: {
    padding: 8,
  },
  videoContainer: {
    flex: 1,
    backgroundColor: AppColors.primary,
  },
  videoPlayer: {
    flex: 1,
    backgroundColor: AppColors.primary,
  },
  videoPlayerHidden: {
    display: 'none',
  },
  videoLoadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
  },
  videoLoadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#fff',
  },
  videoErrorContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
  },
  videoErrorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
  },
  videoErrorButton: {
    marginTop: 15,
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  videoErrorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  playButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -48 }], // Centrar el botón
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 24,
  },
  playButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  valueSection: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  valueText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#28a745',
    marginLeft: 8,
  },
  valueLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  valueCard: {
    backgroundColor: AppColors.primary,
    margin: 10,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  valueCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  valueCardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  valueCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  ratioCard: {
    margin: 10,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ratioCardHeader: {
    position: 'relative',
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  ratioCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  ratioCardAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  ratioCardLevel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  ratioCardSubtitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  albumInfoSection: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,
  },
  albumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'left',
  },
  headerInfoContainer: {
    alignItems: 'flex-start',
  },
  labelYearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  separator: {
    marginHorizontal: 4,
    color: '#9ca3af',
    fontSize: 16,
  },
  catalogCountryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  catalog: {
    fontSize: 12,
    color: AppColors.primary,
    fontWeight: '500',
  },
  countryText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
  stylesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  styleTag: {
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  styleText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  coverSection: {
    width: '100%',
    height: width * 1, // Altura proporcional al ancho de la pantalla
    backgroundColor: '#f8fafc',
    marginBottom: 0,
    overflow: 'hidden',
  },
  fullCoverImage: {
    width: '100%',
    height: '100%',
  },
  fullCoverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  fullCoverPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  tracksSection: {
    marginTop: 10,
  },
  videoButton: {
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  videoButtonText: {
    fontSize: 14,
    color: AppColors.primary,
    fontWeight: '500',
  },
  videosSection: {
    marginTop: 10,
  },
  coverValueContainer: {
    flexDirection: 'row',
    margin: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingAudioButton: {
    position: 'absolute',
    bottom: 30, // Cambiado de 120 a 30 para que esté más pegado al fondo
    right: 20,
    backgroundColor: AppColors.primary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1000, // Agregado para asegurar que esté por encima
  },
  gemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fefce8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  gemTagText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#d97706',
    fontWeight: '500',
  },
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginTop: 8,
  },
  audioTagText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  editionsContainer: {
    marginTop: 8,
  },
  editionItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  editionCover: {
    width: 100,
    height: 100,
    borderRadius: 4,
    marginRight: 10,
  },
  editionInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  editionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  editionArtist: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  editionDetailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  editionDetailLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 4,
  },
  editionDetailValue: {
    fontSize: 12,
    color: '#9ca3af',
    flex: 1,
  },
  noEditionsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',

  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  ratioInfoSection: {
    marginBottom: 20,
  },
  ratioInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  ratioInfoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
  seeMoreButton: {
    flexDirection: 'row',
    backgroundColor: '#f1f1f1f1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 16,
    borderRadius: 4,


    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  seeMoreButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
    letterSpacing: 0.2,
  },
  ratioCardIcon: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioOnlyButton: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    transform: [{ translateX: -48 }], // Centrar el botón
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 24,
    flexDirection: 'row',
    gap: 4,
  },
  audioOnlyButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '500',
  },
  videoLoadingContainerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
  },
  videoLoadingTextModal: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  videoErrorContainerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
  },
  videoErrorTextModal: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
  },
  videoErrorButtonModal: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FF0000',
    borderRadius: 8,
  },
  videoErrorButtonTextModal: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  videoControls: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  videoControlButton: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 12,
    borderRadius: 24,
  },
  audioModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  audioModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  audioCloseButton: {
    padding: 8,
  },
  audioModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  audioYouTubeButton: {
    padding: 8,
  },
  audioPlayerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  audioAlbumArt: {
    width: 280,
    height: 280,
    borderRadius: 140,
    marginBottom: 40,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  audioAlbumImage: {
    width: '100%',
    height: '100%',
    borderRadius: 140,
  },
  audioAlbumPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 140,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioInfoModal: {
    alignItems: 'center',
    marginBottom: 40,
  },
  audioArtist: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 4,
  },
  audioTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  audioControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 40,
  },
  audioControlButton: {
    padding: 12,
  },
  audioPlayButton: {
    backgroundColor: '#1DB954',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1DB954',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  audioProgress: {
    width: '100%',
  },
  audioProgressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 2,
    marginBottom: 8,
  },
  audioProgressFill: {
    height: '100%',
    backgroundColor: '#1DB954',
    borderRadius: 2,
    width: '30%', // Ejemplo de progreso
  },
  audioTimeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioTimeText: {
    fontSize: 12,
    color: '#ccc',
  },
  audioPlayerCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    marginRight: 12,
    overflow: 'hidden',
  },
  audioPlayerCoverImage: {
    width: '100%',
    height: '100%',
  },
  audioPlayerCoverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayerInfo: {
    flex: 1,
    marginRight: 12,
  },
  audioPlayerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 2,
  },
  audioPlayerArtist: {
    fontSize: 12,
    color: '#ccc',
  },
  audioPlayerControls: {
    marginRight: 12,
  },
  audioPlayerPlayButton: {
    backgroundColor: '#1DB954',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayerCloseButton: {
    padding: 4,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 4,
  },

  youtubeButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  youtubePlayerModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubePlayerContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    width: '90%',
    maxWidth: 400,
  },
  youtubePlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  youtubePlayerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  youtubeCloseButton: {
    padding: 8,
  },
  youtubeThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginBottom: 16,
    alignSelf: 'center',
  },
  youtubeThumbnailPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  youtubeAudioInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },
  youtubeAudioTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  youtubeAudioArtist: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
  },
  youtubeControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  youtubeModalPlayButton: {
    backgroundColor: '#FF0000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentLocationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationShelfName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  locationPosition: {
    fontSize: 12,
    color: '#9ca3af',
  },
  selectShelfTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  shelfSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  shelfSelectItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  noShelvesText: {
    fontSize: 14,
  },
  // Estilos para TypeForm
  typeFormContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  typeFormKeyboardContainer: {
    flex: 1,
  },
  typeFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  typeFormCloseButton: {
    padding: 8,
    zIndex: 1,
  },
  typeFormProgress: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
  },
  typeFormHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  typeFormTitleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeFormModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  typeFormModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  typeFormProgressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f1f5f9',
  },
  typeFormProgressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
  },
  typeFormContent: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
  },
  typeFormQuestion: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 30,
    textAlign: 'center',
    lineHeight: 32,
  },
  typeFormInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 120,
    maxHeight: 200,
    textAlignVertical: 'top',
    backgroundColor: '#f8fafc',
    flex: 1,
  },
  typeFormFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    backgroundColor: '#fff',
    minHeight: 80,
  },
  typeFormSkipButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  typeFormSkipText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  typeFormNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  typeFormNavButton: {
    padding: 12,
  },
  typeFormNextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  typeFormNextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  typeFormNextText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  typeFormSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
    alignSelf: 'center',
  },
  typeFormSaveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  typeFormSaveText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  typeFormSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginTop: 10,
  },
  typeFormSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  typeFormSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  typeFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormButtonText: {
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
    flex: 1,
    marginLeft: 12,
  },
  typeFormCompletedContainer: {
    marginTop: 8,
  },
  typeFormCompletedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
  },
  typeFormCompletedText: {
    fontSize: 14,
    color: '#155724',
    fontWeight: '600',
    marginLeft: 8,
  },
  typeFormResponsesContent: {
    flex: 1,
    padding: 20,
  },
  typeFormResponseItem: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormResponseQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  typeFormResponseAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  tracklistContainer: {
    marginTop: 20,
  },
  trackItemSelected: {
    backgroundColor: '#f0f9ff',
    borderColor: AppColors.primary,

  },
  trackTitleSelected: {
    color: AppColors.primary,
    fontWeight: '600',
  },
  typeFormResponsesInline: {
    marginTop: 16,
  },
  typeFormResponseInlineItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormResponseInlineQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  typeFormResponseInlineAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  typeFormQuestionsContainer: {
    marginTop: 16,
  },
  typeFormQuestionItem: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormQuestionItemAnswered: {
    backgroundColor: '#f0fdf4',
    borderColor: '#28a745',
  },
  typeFormQuestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeFormQuestionNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: AppColors.primary,
    marginRight: 12,
    minWidth: 20,
  },
  typeFormQuestionText: {
    fontSize: 16,
    color: '#4b5563',
    flex: 1,
    fontWeight: '500',
  },
  typeFormQuestionPreview: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 32,
  },
  currentShelfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  errorButton: {
    marginTop: 20,
    backgroundColor: AppColors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  floatingYouTubeButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: '#FF0000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
    zIndex: 1000,
  },
  // Estilos para la sección de audio
  audioSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  audioSectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4b5563',
    marginBottom: 8,
  },
  audioSectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  loadingAudioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingAudioText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  audioErrorContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  audioErrorText: {
    fontSize: 14,
    color: '#721c24',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  retryAudioButton: {
    backgroundColor: AppColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryAudioButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  audioOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  audioOptionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioOptionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },

  // Estilos para botones de acción
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonActive: {
    backgroundColor: '#fefce8',
    borderColor: '#d97706',
  },
  actionButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtonTextActive: {
    color: '#d97706',
    fontWeight: '600',
  },

  // Estilos para información de listas
  listsInfoContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  listsInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  listItemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  listItemText: {
    marginLeft: 6,
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },

  // Estilos para el modal de listas
  listOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    minHeight: 80,
  },
  listOptionInfo: {
    flex: 1,
    marginLeft: 10,
  },
  listOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  listOptionDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  emptyListsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyListsText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  createListButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createListButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 50,
    padding: 15,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  // Estilos para las listas funcionales
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  listInfo: {
    flex: 1,
    marginLeft: 16,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  floatingPlayButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  youtubeButton: {
    backgroundColor: '#FF0000',
  },
  similarAlbumsContainer: {
    marginTop: 12,
  },
  similarAlbumsContent: {
    paddingHorizontal: 4,
  },
  similarAlbumCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  similarAlbumImageContainer: {
    position: 'relative',
  },
  similarAlbumImage: {
    width: '100%',
    height: 120,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  similarAlbumPlaceholder: {
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarAlbumGemBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  similarAlbumInfo: {
    padding: 8,
  },
  similarAlbumTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 2,
    lineHeight: 14,
  },
  similarAlbumArtist: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 2,
  },
  similarAlbumYear: {
    fontSize: 10,
    color: '#9ca3af',
  },
  floatingAudioPlayer: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  // Estilos para card unificado de mercado
  unifiedMarketCard: {
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginTop: 0,
    borderRadius: 0,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: '#e9ecef',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  marketRowContainer: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  marketValueSection: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marketCardVerticalDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
  },
  marketCardDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 20,
  },
  ratioSection: {
    padding: 20,
    borderRadius: 0,
    alignItems: 'center',
  },
  detalleScroll: {
    marginBottom: 55,

  },
});

