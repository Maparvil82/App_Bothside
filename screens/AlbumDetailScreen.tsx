import React, { useState, useCallback, useEffect, useRef } from 'react';
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
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGems } from '../contexts/GemsContext';
import { useThemeMode } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { getAlbumEditions, DiscogsService } from '../services/discogs';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { UserCollectionService, AlbumService, UserMaletaService } from '../services/database';
import { needsDiscogsRefresh, hoursSinceCache } from '../utils/cache';
import ShelfGrid from '../components/ShelfGrid';
import { MaletaCoverCollage } from '../components/MaletaCoverCollage';
import { DiscogsAttribution } from '../components/DiscogsAttribution';
import { CreateMaletaModalContext } from '../contexts/CreateMaletaModalContext';

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

export default function AlbumDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { isGem, addGem, removeGem, refreshGems, updateGemStatus } = useGems();
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const { openCreateMaletaModal } = React.useContext(CreateMaletaModalContext);

  // Color constante para botones y tags
  const LIGHT_BG_COLOR = '#f1f1f1ff';

  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');
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

  // Estados para álbumes similares
  const [similarAlbums, setSimilarAlbums] = useState<any[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);


  const { albumId } = route.params as { albumId: string };

  // Preguntas del TypeForm
  const typeFormQuestions = [
    "¿Cuál es tu canción favorita de este álbum?",
    "¿Cuándo escuchaste este álbum por última vez?",
    "¿Qué recuerdos te trae este álbum?",
    "¿Recuerdas donde lo descubriste?",
    "¿Cómo te hace sentir este álbum?"
  ];

  // Funciones para manejar el TypeForm
  const handleTypeFormAnswer = (answer: string) => {
    const newAnswers = [...typeFormAnswers];
    newAnswers[currentQuestion] = answer;
    setTypeFormAnswers(newAnswers);
  };



  // Función para guardar una pregunta individual
  const handleSaveQuestion = async () => {
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
          Alert.alert('Error', 'No se pudo guardar la respuesta. Inténtalo de nuevo.');
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
          console.error('Error al insertar respuesta:', insertError);
          Alert.alert('Error', 'No se pudo guardar la respuesta. Inténtalo de nuevo.');
          return;
        }
      }

      setShowTypeForm(false);
      setCurrentQuestion(0);
      setTypeFormAnswers(['', '', '', '', '']);
      // Recargar las respuestas existentes para actualizar la vista
      await loadExistingTypeFormResponse();
      Alert.alert('¡Guardado!', 'Tu respuesta ha sido guardada correctamente.');
    } catch (error) {
      console.error('Error al guardar respuesta:', error);
      Alert.alert('Error', 'No se pudo guardar la respuesta. Inténtalo de nuevo.');
    }
  };

  // Cargar respuestas existentes del TypeForm
  const loadExistingTypeFormResponse = useCallback(async () => {
    if (!user?.id || !album?.id) return;

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

      // Update database with fresh data
      const success = await AlbumService.updateAlbumCC0Data(albumDbId, cc0Data);

      if (success) {
        console.log('✅ Discogs data refreshed successfully, reloading album...');
        // Trigger a reload by calling loadAlbumDetail again
        setTimeout(() => {
          if (user?.id) {
            loadAlbumDetail();
          }
        }, 100);
      }
    } catch (error) {
      console.error('❌ Error refreshing Discogs data:', error);
      // Don't show error to user, just log it
    } finally {
      setIsRefreshingDiscogs(false);
      refreshInProgressRef.current = false;
    }
  }, [user?.id]);

  const loadAlbumDetail = useCallback(() => {
    const fetchFullAlbumData = async () => {
      if (!albumId || !user) {
        setError("No se proporcionó un ID de álbum o el usuario no está autenticado.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data: albumData, error: albumError } = await supabase
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
          .single();

        if (albumError) throw new Error(`Error al cargar el álbum: ${albumError.message}`);
        if (!albumData) throw new Error("Álbum no encontrado en tu colección.");

        // Normalizar estructura del álbum y asignar nombre de estantería si viene en la consulta
        const normalizedAlbums = Array.isArray((albumData as any).albums)
          ? (albumData as any).albums[0]
          : ((albumData as any).albums || (albumData as any).album);

        const fullAlbumData = {
          ...albumData,
          albums: normalizedAlbums,
          shelf_name: (albumData as any)?.shelves?.name || null,
        } as AlbumDetail;

        const { data: shelvesData, error: shelvesError } = await supabase
          .from('shelves')
          .select('id, name, shelf_rows, shelf_columns');

        if (shelvesError) throw new Error(`Error al cargar las estanterías: ${shelvesError.message}`);

        // Obtener las listas donde está guardado este álbum con sus álbumes para portadas
        const { data: listItems, error: listItemsError } = await supabase
          .from('maleta_albums')
          .select(`
            *,
            user_maletas (
              id,
              title,
              description
            )
          `)
          .eq('album_id', fullAlbumData.albums.id);

        // Para cada lista, obtener sus álbumes para las portadas
        const listsWithAlbums = await Promise.all(
          (listItems || []).map(async (item) => {
            try {
              const { data: albums, error: albumsError } = await supabase
                .from('maleta_albums')
                .select(`
                  *,
                  albums (
                    id,
                    title,
                    artist,
                    cover_url
                  )
                `)
                .eq('maleta_id', item.user_maletas.id)
                .limit(4); // Solo los primeros 4 para el collage

              if (albumsError) {
                console.error('Error getting albums for list:', item.user_maletas.id, albumsError);
                return { ...item.user_maletas, albums: [] };
              }

              return {
                ...item.user_maletas,
                albums: albums?.map(la => la.albums).filter(Boolean) || []
              };
            } catch (error) {
              console.error('Error processing list:', item.user_maletas.id, error);
              return { ...item.user_maletas, albums: [] };
            }
          })
        );

        if (listItemsError) {
          console.error('Error al cargar listas del álbum:', listItemsError);
        }

        // Agregar la información de listas al álbum
        const albumWithLists = {
          ...fullAlbumData,
          user_list_items: listsWithAlbums.map(list => ({
            id: list.id,
            title: list.title,
            description: list.description,
            albums: list.albums,
            list_items: [{ album_id: fullAlbumData.albums.id }]
          }))
        };

        setAlbum(albumWithLists);
        setShelves(shelvesData || []);

        if (fullAlbumData.albums) {
          await loadAlbumEditions(fullAlbumData.albums.artist, fullAlbumData.albums.title);

          // Check if Discogs data needs refresh (>6 hours old)
          const cachedAt = (fullAlbumData.albums as any)?.discogs_cached_at;
          const discogsId = (fullAlbumData as any)?.albums?.discogs_id;

          if (discogsId && needsDiscogsRefresh(cachedAt)) {
            const hoursSince = hoursSinceCache(cachedAt);
            console.log(`🔄 Album data is ${hoursSince.toFixed(1)}h old, refreshing from Discogs...`);

            // Refresh in background without blocking UI
            refreshDiscogsData(fullAlbumData.albums.id, discogsId);
          } else if (discogsId) {
            console.log(`✅ Album data is fresh (${hoursSinceCache(cachedAt).toFixed(1)}h old)`);
          }

          // Backfill de tracks y YouTube para usuarios nuevos si faltan datos
          const hasTracks = Array.isArray((fullAlbumData.albums as any)?.tracks) && (fullAlbumData.albums as any)?.tracks.length > 0;
          const hasYouTube = Array.isArray((fullAlbumData.albums as any)?.album_youtube_urls) && (fullAlbumData.albums as any)?.album_youtube_urls.length > 0;
          if ((!hasTracks || !hasYouTube) && discogsId && lastBackfilledAlbumIdRef.current !== fullAlbumData.albums.id) {
            lastBackfilledAlbumIdRef.current = fullAlbumData.albums.id;
            backfillDiscogsDetails(fullAlbumData.albums.id, discogsId).catch(() => {
              // noop
            });
          }
        }

      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFullAlbumData();
  }, [albumId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAlbumDetail();
      loadExistingTypeFormResponse();
    }, [loadAlbumDetail, loadExistingTypeFormResponse])
  );

  // Monitor YouTube URLs for debugging
  useEffect(() => {
    if (album?.albums?.album_youtube_urls) {
      const urlCount = album.albums.album_youtube_urls.length;
      console.log('🔍 Album YouTube URLs updated:', urlCount, 'URLs found');
      if (urlCount > 0) {
        console.log('✅ Botón flotante de YouTube debería estar visible');
      } else {
        console.log('❌ No hay URLs de YouTube, botón no visible');
      }
    }
  }, [album?.albums?.album_youtube_urls]);



  // Descarga desde Discogs y guarda tracks/YouTube si faltan
  const backfillDiscogsDetails = async (internalAlbumId: string, discogsId: number | string) => {
    try {
      // Backfill directo desde el cliente usando DiscogsService
      console.log('🎵 Iniciando backfill directo para álbum:', internalAlbumId, 'discogs:', discogsId);

      // Importar y usar DiscogsService directamente
      const { DiscogsService } = await import('../services/discogs');
      const release: any = await DiscogsService.getRelease(Number(discogsId));

      if (!release) {
        console.warn('❌ No se pudo obtener release de Discogs');
        return;
      }

      console.log('📀 Release obtenido de Discogs:', release.title);

      // Procesar videos de YouTube
      const videos = release.videos || [];
      console.log('🎬 Videos encontrados:', videos.length);

      if (videos.length > 0) {
        const youtubeVideos = videos.filter((v: any) =>
          v?.uri && (v.uri.includes('youtube.com') || v.uri.includes('youtu.be'))
        );

        console.log('📺 Videos de YouTube filtrados:', youtubeVideos.length);

        if (youtubeVideos.length > 0) {
          // Eliminar URLs existentes importadas desde Discogs (como hace save-discogs-release)
          console.log('🧹 Eliminando URLs de YouTube importadas previamente desde Discogs...');
          const { error: deleteError } = await supabase
            .from('album_youtube_urls')
            .delete()
            .eq('album_id', internalAlbumId)
            .eq('imported_from_discogs', true);

          if (deleteError) {
            console.warn('❌ Error eliminando URLs anteriores:', deleteError.message);
          } else {
            console.log('✅ URLs anteriores eliminadas');
          }

          // Preparar todas las URLs para inserción (sin filtrar duplicados ya que las eliminamos)
          const urlsToInsert = youtubeVideos.map((v: any) => ({
            album_id: internalAlbumId,
            url: v.uri,
            title: v.title || 'Video de YouTube',
            is_playlist: false,
            imported_from_discogs: true,
            discogs_video_id: v.id?.toString() || null
          }));

          console.log('➕ URLs a insertar:', urlsToInsert.length);

          if (urlsToInsert.length > 0) {
            const { error: insertError } = await supabase
              .from('album_youtube_urls')
              .insert(urlsToInsert);

            if (insertError) {
              console.warn('❌ Error insertando URLs:', insertError.message);
            } else {
              console.log('✅ URLs de YouTube insertadas exitosamente');

              // Actualizar el estado inmediatamente
              setAlbum(prevAlbum => {
                if (!prevAlbum) return prevAlbum;
                const newUrls = urlsToInsert.map((u: any) => ({ url: u.url }));
                return {
                  ...prevAlbum,
                  albums: {
                    ...prevAlbum.albums,
                    album_youtube_urls: newUrls // Reemplazar completamente ya que eliminamos las anteriores
                  }
                };
              });

              // Recargar después de un momento
              setTimeout(() => {
                console.log('🔄 Recargando detalle completo...');
                loadAlbumDetail();
              }, 1000);
            }
          }
        }
      }

      // Procesar tracks si faltan
      const tracklist = release.tracklist || [];
      if (tracklist.length > 0) {
        const { data: existingTracks } = await supabase
          .from('tracks')
          .select('position, title, duration')
          .eq('album_id', internalAlbumId);

        const existingTrackKeys = new Set(
          (existingTracks || []).map((t: any) =>
            `${(t.position || '').toString().trim()}|${(t.title || '').toString().trim()}|${(t.duration || '').toString().trim()}`
          )
        );

        const tracksToInsert = tracklist
          .filter((t: any) => t?.title)
          .map((t: any) => ({
            album_id: internalAlbumId,
            position: t.position?.toString() || null,
            title: t.title?.toString() || '',
            duration: t.duration?.toString() || null
          }))
          .filter((t: any) => !existingTrackKeys.has(
            `${(t.position || '').toString().trim()}|${(t.title || '').toString().trim()}|${(t.duration || '').toString().trim()}`
          ));

        if (tracksToInsert.length > 0) {
          const { error: tracksError } = await supabase
            .from('tracks')
            .insert(tracksToInsert);

          if (tracksError) {
            console.warn('❌ Error insertando tracks:', tracksError.message);
          } else {
            console.log('✅ Tracks insertados exitosamente');
          }
        }
      }

    } catch (error) {
      console.error('💥 Error en backfill:', error);
    }
  };

  // Ensure hooks are declared before any conditional returns
  useEffect(() => {
    const fetchGenresStyles = async () => {
      try {
        const discogsId = (album as any)?.albums?.discogs_id;
        if (!discogsId) return;

        const computedGenresList = (album as any)?.albums?.album_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [];
        const computedStylesList = album?.albums?.album_styles?.map(as => as.styles?.name).filter(Boolean) || [];

        if (computedGenresList.length === 0 || computedStylesList.length === 0) {
          const { DiscogsService } = await import('../services/discogs');
          const release: any = await DiscogsService.getRelease(discogsId);
          if (release) {
            if (computedGenresList.length === 0 && Array.isArray(release.genres)) {
              setFallbackGenres(release.genres.filter((g: any) => typeof g === 'string'));
            }
            if (computedStylesList.length === 0 && Array.isArray(release.styles)) {
              setFallbackStyles(release.styles.filter((s: any) => typeof s === 'string'));
            }
          }
        }
      } catch (e) {
        console.warn('No se pudieron cargar géneros/estilos de Discogs como fallback');
      }
    };
    if (album?.albums) fetchGenresStyles();
  }, [album?.albums?.id]);

  const loadAlbumEditions = async (artist?: string, title?: string) => {
    if (!artist || !title) {
      return;
    }

    try {
      setEditionsLoading(true);
      const editionsData = await getAlbumEditions(artist, title);
      setEditions(editionsData);
    } catch (error) {
      console.error('❌ Error loading editions:', error);
    } finally {
      setEditionsLoading(false);
    }
  };

  const handlePlayAudio = (audioUri: string) => {
    setFloatingAudioUri(audioUri);
    setFloatingAlbumTitle(album?.albums.title || '');
    setShowFloatingPlayer(true);
  };

  const handleRecordAudio = () => {
    setShowAudioRecorder(true);
  };

  const handleSaveAudioNote = async (audioUri: string) => {
    if (!user || !album?.albums?.id) {
      Alert.alert('Error', 'Usuario no autenticado o álbum no válido');
      return;
    }
    try {
      await UserCollectionService.saveAudioNote(user.id, album.albums.id, audioUri);
      loadAlbumDetail();
      Alert.alert('Éxito', 'Nota de audio guardada correctamente');
      setShowAudioRecorder(false);
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar la nota de audio.');
    }
  };

  const handleSellAlbum = async () => {
    Alert.alert(
      'Vender Álbum',
      `¿Qué quieres hacer con "${album?.albums.title}"?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Ver en Discogs',
          onPress: async () => {
            try {
              const searchQuery = `${album?.albums.artist} ${album?.albums.title}`;
              const discogsUrl = `https://www.discogs.com/search/?q=${encodeURIComponent(searchQuery)}&type=release`;
              console.log('🔗 Abriendo Discogs:', discogsUrl);

              const supported = await Linking.canOpenURL(discogsUrl);
              if (supported) {
                await Linking.openURL(discogsUrl);
              } else {
                Alert.alert('Error', 'No se pudo abrir el enlace de Discogs');
              }
            } catch (error) {
              console.error('Error opening Discogs:', error);
              Alert.alert('Error', 'No se pudo abrir Discogs');
            }
          },
        },
        {
          text: 'Vender en Marketplace',
          onPress: async () => {
            try {
              const searchQuery = `${album?.albums.artist} ${album?.albums.title}`;
              const marketplaceUrl = `https://www.discogs.com/sell/release?q=${encodeURIComponent(searchQuery)}`;
              console.log('💰 Abriendo Marketplace:', marketplaceUrl);

              const supported = await Linking.canOpenURL(marketplaceUrl);
              if (supported) {
                await Linking.openURL(marketplaceUrl);
              } else {
                Alert.alert('Error', 'No se pudo abrir el marketplace');
              }
            } catch (error) {
              console.error('Error opening marketplace:', error);
              Alert.alert('Error', 'No se pudo abrir el marketplace');
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: string | null | undefined) => {
    if (!price) return 'N/A';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  // Función para calcular el ratio de venta
  const calculateSalesRatio = (want: number, have: number): { ratio: number; level: string; color: string } => {
    if (!want || !have || have === 0) {
      return { ratio: 0, level: 'Sin datos', color: '#9ca3af' };
    }

    const ratio = want / have;

    if (ratio < 2) {
      return { ratio, level: 'Bajo', color: '#dc3545' };
    } else if (ratio >= 2 && ratio < 8) {
      return { ratio, level: 'Medio', color: '#ffc107' };
    } else if (ratio >= 8 && ratio < 25) {
      return { ratio, level: 'Alto', color: '#28a745' };
    } else {
      return { ratio, level: 'Excepcional', color: '#6f42c1' };
    }
  };

  // Función para obtener la información del ratio según el nivel
  const getRatioInfo = (level: string) => {
    switch (level) {
      case 'Bajo':
        return {
          title: 'Ratio Bajo (Menos de 2)',
          significado: 'La demanda es igual o apenas superior a la oferta registrada. Hay muchos discos en esta categoría.',
          probabilidad: 'Baja a media. La venta no es segura y puede tardar mucho tiempo.',
          estrategia: 'Para vender, tu copia debe tener un precio muy competitivo (probablemente en el rango bajo del historial de ventas) y/o estar en un estado impecable (Near Mint). La competencia es alta.'
        };
      case 'Medio':
        return {
          title: 'Ratio Medio (Entre 2 y 8)',
          significado: 'Hay una demanda saludable y constante. El disco tiene un público y se vende con regularidad.',
          probabilidad: 'Media a alta. Si el precio es justo y el estado es bueno (VG+ o mejor), se venderá en un tiempo razonable (días o algunas semanas).',
          estrategia: 'Revisa el historial de ventas para poner un precio acorde al mercado. No necesitas ser el más barato, pero sí ser razonable.'
        };
      case 'Alto':
        return {
          title: 'Ratio Alto (Entre 8 y 25)',
          significado: 'La demanda supera claramente a la oferta. Es un disco buscado y no es fácil de encontrar.',
          probabilidad: 'Muy alta. Una copia en buen estado y a un precio justo se venderá muy rápidamente, a menudo en cuestión de horas o pocos días.',
          estrategia: 'Tienes más poder de negociación. Puedes fijar un precio en el rango medio-alto del historial de ventas. Los compradores están activamente esperando que aparezca una copia.'
        };
      case 'Excepcional':
        return {
          title: 'Ratio Excepcional o "Grial" (Más de 25)',
          significado: 'Demanda masiva para una oferta extremadamente escasa. Es lo que se considera un "santo grial" o una pieza de coleccionista muy codiciada.',
          probabilidad: 'Prácticamente garantizada e inmediata.',
          estrategia: 'La venta será casi instantánea. Es probable que recibas múltiples ofertas al poco tiempo de ponerlo a la venta. Puedes fijar un precio en el rango más alto del historial, ya que los compradores saben que las oportunidades son muy raras.'
        };
      default:
        return {
          title: 'Sin datos suficientes',
          significado: 'No hay suficientes datos para calcular un ratio confiable.',
          probabilidad: 'No determinable.',
          estrategia: 'Se necesitan más datos de ventas para evaluar el potencial.'
        };
    }
  };

  // ========== FUNCIONES DE REPRODUCCIÓN INTERNA ==========


  // ========== FUNCIONES DE YOUTUBE (ABRIR DIRECTAMENTE) ==========

  // Abrir YouTube directamente en el navegador
  // Abrir YouTube directamente en el navegador (MODIFICADO: Ahora reproduce solo audio)
  const handlePlayYouTubeDirect = () => {
    if (!album?.albums?.album_youtube_urls || album.albums.album_youtube_urls.length === 0) {
      Alert.alert('Sin videos', 'Este álbum no tiene videos de YouTube asociados.');
      return;
    }

    const youtubeUrl = album.albums.album_youtube_urls[0].url;
    if (!youtubeUrl) {
      Alert.alert('Error', 'URL de YouTube inválida.');
      return;
    }

    // En lugar de abrir en navegador, usamos el reproductor flotante que ya maneja URLs de YouTube
    // extrayendo el audio automáticamente
    handlePlayAudio(youtubeUrl);
  };


  // ========== FIN FUNCIONES YOUTUBE ==========

  // ========== FUNCIONES ÁLBUMES SIMILARES ==========

  // Cargar álbumes similares de la colección del usuario
  const loadSimilarAlbums = useCallback(async () => {
    if (!user || !album?.albums) return;

    setLoadingSimilar(true);
    try {
      // Obtener álbumes del mismo artista o con estilos similares
      const { data: similarData, error } = await supabase
        .from('user_collection')
        .select(`
          *,
          albums (
            id,
            title,
            artist,
            cover_url,
            year,
            album_styles (
              styles ( name )
            )
          )
        `)
        .eq('user_id', user.id)
        .neq('album_id', album.albums.id) // Excluir el álbum actual
        .limit(10);

      if (error) {
        console.error('Error loading similar albums:', error);
        return;
      }

      // Filtrar y priorizar álbumes similares
      const filteredAlbums = similarData?.filter(item => {
        const albumData = item.albums;
        if (!albumData) return false;

        // Priorizar mismo artista
        const sameArtist = albumData.artist === album.albums.artist;

        // Priorizar estilos similares
        const currentStyles = album.albums.album_styles?.map((s: any) => s.styles?.name).filter(Boolean) || [];
        const itemStyles = albumData.album_styles?.map((s: any) => s.styles?.name).filter(Boolean) || [];
        const hasSimilarStyle = currentStyles.some((style: string) => itemStyles.includes(style));

        return sameArtist || hasSimilarStyle;
      }).slice(0, 8) || []; // Limitar a 8 álbumes

      setSimilarAlbums(filteredAlbums);
    } catch (error) {
      console.error('Error loading similar albums:', error);
    } finally {
      setLoadingSimilar(false);
    }
  }, [user, album]);

  // ========== FIN FUNCIONES ÁLBUMES SIMILARES ==========

  // ========== FUNCIONES GEMS Y LISTAS ==========

  // Función para cargar las listas del usuario con portadas
  const loadUserLists = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Usar exactamente el mismo servicio que usa ListsScreen
      const { UserMaletaService } = await import('../services/database');
      const maletas = await UserMaletaService.getUserMaletasWithAlbums(user.id);

      console.log('✅ Listas cargadas con portadas:', maletas?.length || 0);
      if (maletas && maletas.length > 0) {
        console.log('📋 Primera lista:', {
          id: maletas[0].id,
          title: maletas[0].title,
          albumsCount: maletas[0].albums?.length || 0
        });
      }
      setUserMaletas(maletas || []);
    } catch (error) {
      console.error('Error cargando listas:', error);
      setUserMaletas([]);
    }
  }, [user?.id]);

  // Función para añadir/quitar gem
  const handleToggleGem = async () => {
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
        Alert.alert('Gem Removido', 'El álbum se ha removido de tus Gems');
      } else {
        console.log('➕ Añadiendo gem para album.albums.id:', album.albums.id);
        // Usar el servicio de base de datos para toggle
        await UserCollectionService.toggleGemStatus(user.id, album.albums.id);
        // Actualizar el contexto local
        updateGemStatus(album.albums.id, true);
        Alert.alert('Gem Añadido', 'El álbum se ha añadido a tus Gems');
      }

      // Recargar el álbum para actualizar el estado
      console.log('🔄 Recargando álbum...');
      loadAlbumDetail();

      // Refrescar el contexto de gems para sincronizar
      console.log('🔄 Refrescando contexto de gems...');
      refreshGems();
    } catch (error) {
      console.error('❌ Error al gestionar gem:', error);
      Alert.alert('Error', 'No se pudo gestionar el Gem');
    }
  };

  // Función para añadir álbum a una lista
  const handleAddToList = async (listId: string) => {
    if (!user?.id || !album?.albums.id) return;

    try {
      // Verificar si el álbum ya está en la lista usando el servicio correcto
      const { UserMaletaService } = await import('../services/database');
      const isAlreadyInList = await UserMaletaService.isAlbumInMaleta(listId, album.albums.id);

      if (isAlreadyInList) {
        Alert.alert('Ya en la maleta', 'Este álbum ya está en esta maleta');
        return;
      }

      // Añadir el álbum a la lista usando el servicio correcto
      await UserMaletaService.addAlbumToMaleta(listId, album.albums.id);

      Alert.alert('¡Añadido!', 'El álbum se ha añadido a la maleta');
      setShowListsModal(false);
      setSelectedListId(null);

      // Recargar las listas para actualizar la información
      loadUserLists();
      // Recargar el álbum para actualizar la información
      loadAlbumDetail();
    } catch (error) {
      console.error('Error al añadir a maleta:', error);
      Alert.alert('Error', 'No se pudo añadir el álbum a la maleta');
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
    loadUserLists();
  }, [loadUserLists]);

  // Cargar álbumes similares cuando se monta el componente
  useEffect(() => {
    loadSimilarAlbums();
  }, [loadSimilarAlbums]);

  // Refrescar gems cuando se monta el componente
  useEffect(() => {
    if (user?.id) {
      refreshGems();
    }
  }, [user?.id, refreshGems]);

  if (loading) {
    return <BothsideLoader />;
  }

  if (error || !album) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc3545" />
        <Text style={styles.errorText}>{error || 'No se encontró el álbum'}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.errorButton}>
          <Text style={styles.errorButtonText}>Volver</Text>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{album.albums.title}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Portada */}
        <View style={[styles.coverSection, { backgroundColor: colors.card }]}>
          {album.albums.cover_url ? (
            <Image
              source={{ uri: album.albums.cover_url }}
              style={styles.fullCoverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.fullCoverPlaceholder, { backgroundColor: colors.border }]}>
              <Text style={[styles.fullCoverPlaceholderText, { color: colors.text }]}>Sin portada</Text>
            </View>
          )}
        </View>

        {/* Sección Unificada: Valor de Mercado y Ratio de Venta */}
        {(album.albums.album_stats?.avg_price || (album.albums.album_stats?.want && album.albums.album_stats?.have)) && (
          <View style={[styles.unifiedMarketCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.marketRowContainer}>
              {/* Valor de Mercado */}
              {album.albums.album_stats?.avg_price && (
                <View style={styles.marketValueSection}>
                  <Text style={[styles.valueCardTitle, { color: colors.text }]}>Valor de mercado</Text>
                  <Text style={[styles.valueCardAmount, { color: colors.primary }]}>
                    ${album.albums.album_stats.avg_price.toFixed(2)}
                  </Text>
                  <Text style={[styles.valueCardSubtitle, { color: colors.text }]}>Precio promedio</Text>
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
                        <Text style={styles.ratioCardTitle}>Ratio de Venta</Text>
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
                {isGem(album.albums.id) ? 'Quitar Gem' : 'Añadir Gem'}
              </Text>
            </TouchableOpacity>

            {/* Botón Lista */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: LIGHT_BG_COLOR }]}
              onPress={() => setShowListsModal(true)}
            >
              <Ionicons name="cube-outline" size={20} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>Añadir a Maleta</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Listas donde está guardado */}
        {album.user_list_items && album.user_list_items.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Guardado en estas maletas</Text>
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
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text} />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sección de Tracks */}
        {album.albums.tracks && album.albums.tracks.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tracks</Text>
            {(() => {
              const seen = new Set<string>();
              const uniqueTracks = (album.albums.tracks || []).filter((t) => {
                const key = `${(t.position || '').toString().trim()}|${(t.title || '').toString().trim()}|${(t.duration || '').toString().trim()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return uniqueTracks.map((track, index) => (
                <View key={index} style={[styles.trackItem, { borderBottomColor: colors.border }]}>
                  <View style={styles.trackInfo}>
                    <Text style={[styles.trackPosition, { color: colors.text }]}>{track.position}</Text>
                    <Text style={[styles.trackTitle, { color: colors.text }]}>{track.title}</Text>
                  </View>
                  {track.duration && (
                    <Text style={[styles.trackDuration, { color: colors.text }]}>{track.duration}</Text>
                  )}
                </View>
              ));
            })()}
          </View>
        )}



        {/* Sección de Ediciones */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ediciones en Vinilo</Text>
          {editionsLoading ? (
            <View style={styles.loadingContainer}>
              <BothsideLoader size="small" fullscreen={false} />
              <Text style={[styles.loadingText, { color: colors.text }]}>Cargando ediciones...</Text>
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
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">Formato:</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.format}</Text>
                      </View>
                    )}

                    {/* Sello */}
                    {edition.label && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">Sello:</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.label}</Text>
                      </View>
                    )}

                    {/* Año */}
                    {edition.year && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">Año:</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.year}</Text>
                      </View>
                    )}

                    {/* País */}
                    {edition.country && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">País:</Text>
                        <Text style={[styles.editionDetailValue, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">{edition.country}</Text>
                      </View>
                    )}

                    {/* Catálogo */}
                    {edition.catno && (
                      <View style={styles.editionDetailRow}>
                        <Text style={[styles.editionDetailLabel, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">Catálogo:</Text>
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
                    {showAllEditions ? 'Ver menos' : `Ver ${editions.length - 3} más`}
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
            <Text style={[styles.noEditionsText, { color: colors.text }]}>No se encontraron ediciones en vinilo</Text>
          )}
        </View>

        {/* Nota de Audio */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Nota de Audio</Text>
          {album.audio_note ? (
            // Si existe nota de audio
            <>
              <View style={styles.audioSection}>
                <View style={styles.audioInfo}>
                  <Ionicons name="mic" size={20} color={colors.primary} />
                  <Text style={[styles.audioInfoText, { color: colors.text }]}>Tienes una nota de audio para este álbum</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.playAudioButton]}
                onPress={() => handlePlayAudio(album.audio_note!)}
              >
                <Ionicons name="play-circle" size={24} color={colors.primary} />
                <Text style={[styles.playAudioButtonText]}>Reproducir nota de audio</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Si no existe nota de audio
            <>
              <View style={styles.audioSection}>
                <View style={styles.audioInfo}>
                  <Ionicons name="mic-outline" size={20} color={colors.text} />
                  <Text style={[styles.audioInfoText, { color: colors.text }]}>No tienes una nota de audio para este álbum</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.recordAudioButton, { backgroundColor: colors.border, borderColor: colors.border }]}
                onPress={() => handleRecordAudio()}
              >
                <Ionicons name="mic" size={24} color={colors.primary} />
                <Text style={[styles.recordAudioButtonText, { color: colors.primary }]}>Grabar nota de audio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>


        {/* Nueva Sección de Ubicación RECONSTRUIDA */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Ubicación</Text>

          {album.shelf_id && album.location_row && album.location_column ? (
            <>
              <Text style={[styles.currentShelfTitle, { color: colors.text }]}>Actualmente en: {album.shelf_name || 'Estantería sin nombre'}</Text>
              <ShelfGrid
                rows={shelves.find(s => s.id === album.shelf_id)?.shelf_rows || 0}
                columns={shelves.find(s => s.id === album.shelf_id)?.shelf_columns || 0}
                highlightRow={album.location_row}
                highlightColumn={album.location_column}
              />
              <Text style={[styles.selectShelfTitle, { color: colors.text }]}>Cambiar ubicación:</Text>
            </>
          ) : (
            <Text style={[styles.selectShelfTitle, { color: colors.text }]}>Asignar a una estantería:</Text>
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
            <Text style={[styles.noShelvesText, { color: colors.text }]}>No tienes estanterías para asignar.</Text>
          )}
        </View>



        {/* Sección TypeForm */}
        <View style={[styles.typeFormSection, { backgroundColor: colors.card }]}>
          <Text style={[styles.typeFormSectionTitle, { color: colors.text }]}>Cuéntanos sobre este álbum</Text>
          <Text style={[styles.typeFormSectionSubtitle, { color: colors.text }]}>
            Responde las preguntas que quieras para personalizar tu experiencia
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
                      <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
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

        {/* Sección de Álbumes Similares */}
        {similarAlbums.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>De tu colección</Text>
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
                      {item.albums?.title || 'Sin título'}
                    </Text>
                    <Text style={[styles.similarAlbumArtist, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
                      {item.albums?.artist || 'Artista desconocido'}
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
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
      />

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
              <Text style={styles.modalTitle}>Selecciona una Maleta</Text>
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
                      <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyListsContainer}>
                    <Text style={styles.emptyListsText}>No tienes maletas creadas</Text>
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
                <Text style={styles.createListButtonText}>Crear Nueva Maleta</Text>
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
                    <Text style={styles.ratioInfoTitle}>Significado</Text>
                    <Text style={styles.ratioInfoText}>
                      {getRatioInfo(currentRatioData.level).significado}
                    </Text>
                  </View>

                  <View style={styles.ratioInfoSection}>
                    <Text style={styles.ratioInfoTitle}>Probabilidad de venta</Text>
                    <Text style={styles.ratioInfoText}>
                      {getRatioInfo(currentRatioData.level).probabilidad}
                    </Text>
                  </View>

                  <View style={styles.ratioInfoSection}>
                    <Text style={styles.ratioInfoTitle}>Estrategia</Text>
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
                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Resto de preguntas: Input de texto normal
                <TextInput
                  style={[styles.typeFormInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
                  placeholder="Escribe tu respuesta..."
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
                <Text style={styles.typeFormSaveText}>Guardar</Text>
                <Ionicons name="checkmark" size={20} color="white" />
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Botón flotante de YouTube */}
      {youtubeUrls.length > 0 && !showFloatingPlayer && (
        <TouchableOpacity
          style={[styles.floatingPlayButton, styles.youtubeButton]}
          onPress={handlePlayYouTubeDirect}
          activeOpacity={0.8}
        >
          <Ionicons
            name="logo-youtube"
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      )}

      {/* Reproductor de audio flotante */}
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


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    color: '#007AFF',
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

    shadowColor: '#000',
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
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    backgroundColor: '#f0f9ff',
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    borderLeftColor: '#007AFF',
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
    backgroundColor: '#000',
  },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000',
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
    backgroundColor: '#000',
  },
  videoPlayer: {
    flex: 1,
    backgroundColor: '#000',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
    margin: 10,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    color: '#007AFF',
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
    color: '#007AFF',
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
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    backgroundColor: '#000',
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
    backgroundColor: '#000',
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
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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
    borderColor: '#007AFF',

  },
  trackTitleSelected: {
    color: '#007AFF',
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
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
    borderRadius: 50,
    padding: 15,
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
    borderRadius: 50,
    width: 56,
    height: 56,
    justifyContent: 'center',
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
    shadowColor: '#000',
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
}); 