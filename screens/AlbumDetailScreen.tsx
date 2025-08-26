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
  ActivityIndicator,
  Linking,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAlbumEditions } from '../services/discogs';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { UserCollectionService } from '../services/database';
import ShelfGrid from '../components/ShelfGrid';

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
  };
  user_list_items?: Array<{
    id: string;
    title: string;
    description?: string;
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
  const lastBackfilledAlbumIdRef = useRef<string | null>(null);
  
  // Estados para TypeForm
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [typeFormAnswers, setTypeFormAnswers] = useState<string[]>(['', '', '', '', '']);
  const [existingTypeFormResponse, setExistingTypeFormResponse] = useState<any>(null);
  const [loadingTypeForm, setLoadingTypeForm] = useState(false);
  
  const { albumId } = route.params as { albumId: string };

  // Preguntas del TypeForm
  const typeFormQuestions = [
    "¿Cuál es tu canción favorita de este álbum?",
    "¿En qué momento de tu vida descubriste este disco?",
    "¿Qué recuerdos te trae este álbum?",
    "¿Recomendarías este disco a un amigo? ¿Por qué?",
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
      const { error } = await supabase
        .from('album_typeform_responses')
        .upsert({
          user_id: user?.id,
          user_collection_id: album?.id,
          [`question_${currentQuestion + 1}`]: typeFormAnswers[currentQuestion],
        });

      if (error) {
        console.error('Error al guardar respuesta:', error);
        Alert.alert('Error', 'No se pudo guardar la respuesta. Inténtalo de nuevo.');
      } else {
        setShowTypeForm(false);
        setCurrentQuestion(0);
        setTypeFormAnswers(['', '', '', '', '']);
        // Recargar las respuestas existentes para actualizar la vista
        await loadExistingTypeFormResponse();
        Alert.alert('¡Guardado!', 'Tu respuesta ha sido guardada correctamente.');
      }
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

        setAlbum(fullAlbumData);
        setShelves(shelvesData || []);
        
        if (fullAlbumData.albums) {
            await loadAlbumEditions(fullAlbumData.albums.artist, fullAlbumData.albums.title);
            // Backfill de tracks y YouTube para usuarios nuevos si faltan datos
            const hasTracks = Array.isArray((fullAlbumData.albums as any)?.tracks) && (fullAlbumData.albums as any)?.tracks.length > 0;
            const hasYouTube = Array.isArray((fullAlbumData.albums as any)?.album_youtube_urls) && (fullAlbumData.albums as any)?.album_youtube_urls.length > 0;
            const discogsId = (fullAlbumData as any)?.albums?.discogs_id;
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
    if (!user || !album?.id) {
      Alert.alert('Error', 'Usuario no autenticado o álbum no válido');
      return;
    }
    try {
      await UserCollectionService.saveAudioNote(user.id, album.id, audioUri);
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
      return { ratio: 0, level: 'Sin datos', color: '#6c757d' };
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
          title: 'Ratio Bajo (Menos de 2:1)',
          significado: 'La demanda es igual o apenas superior a la oferta registrada. Hay muchos discos en esta categoría.',
          probabilidad: 'Baja a media. La venta no es segura y puede tardar mucho tiempo.',
          estrategia: 'Para vender, tu copia debe tener un precio muy competitivo (probablemente en el rango bajo del historial de ventas) y/o estar en un estado impecable (Near Mint). La competencia es alta.'
        };
      case 'Medio':
        return {
          title: 'Ratio Medio (Entre 2:1 y 8:1)',
          significado: 'Hay una demanda saludable y constante. El disco tiene un público y se vende con regularidad.',
          probabilidad: 'Media a alta. Si el precio es justo y el estado es bueno (VG+ o mejor), se venderá en un tiempo razonable (días o algunas semanas).',
          estrategia: 'Revisa el historial de ventas para poner un precio acorde al mercado. No necesitas ser el más barato, pero sí ser razonable.'
        };
      case 'Alto':
        return {
          title: 'Ratio Alto (Entre 8:1 y 25:1)',
          significado: 'La demanda supera claramente a la oferta. Es un disco buscado y no es fácil de encontrar.',
          probabilidad: 'Muy alta. Una copia en buen estado y a un precio justo se venderá muy rápidamente, a menudo en cuestión de horas o pocos días.',
          estrategia: 'Tienes más poder de negociación. Puedes fijar un precio en el rango medio-alto del historial de ventas. Los compradores están activamente esperando que aparezca una copia.'
        };
      case 'Excepcional':
        return {
          title: 'Ratio Excepcional o "Grial" (Más de 25:1)',
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

  // ========== FUNCIONES DE YOUTUBE (ABRIR DIRECTAMENTE) ==========

  // Extraer audio vía Supabase y reproducir en el FloatingAudioPlayer
  const handleExtractYouTubeAudio = async () => {
    if (!album?.albums?.album_youtube_urls || album.albums.album_youtube_urls.length === 0) {
      Alert.alert('Sin videos', 'Este álbum no tiene videos de YouTube asociados.');
      return;
    }

    try {
      const youtubeUrl = album.albums.album_youtube_urls[0].url;
      if (!youtubeUrl) {
        Alert.alert('Error', 'URL de YouTube inválida.');
        return;
      }

      setShowFloatingPlayer(true);
      setFloatingAlbumTitle(album.albums.title || 'YouTube');

      // Llamar a la función de Supabase que devuelve la URL de audio extraída
      const { data, error } = await supabase.functions.invoke('extract-youtube-audio', {
        body: { url: youtubeUrl },
      });

      if (error) {
        console.error('❌ Error desde extract-youtube-audio:', error);
        Alert.alert('Error', 'No se pudo extraer el audio de YouTube.');
        setShowFloatingPlayer(false);
        return;
      }

      const audioUrl = (data && (data.audioUrl || data.audio_url)) as string | undefined;
      if (!audioUrl) {
        Alert.alert('Error', 'La función no devolvió una URL de audio.');
        setShowFloatingPlayer(false);
        return;
      }

      setFloatingAudioUri(audioUrl);
    } catch (err) {
      console.error('❌ Error general extrayendo audio de YouTube:', err);
      Alert.alert('Error', 'Ocurrió un error al intentar extraer el audio.');
      setShowFloatingPlayer(false);
    }
  };

  // ========== FIN FUNCIONES YOUTUBE ==========

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando álbum...</Text>
      </View>
    );
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

  const stylesList = album.albums.album_styles?.map(as => as.styles?.name).filter(Boolean) || [];
  const genresList = (album as any)?.albums?.album_genres?.map((ag: any) => ag.genres?.name).filter(Boolean) || [];
  const mergedGenres = genresList.length > 0 ? genresList : fallbackGenres;
  const mergedStyles = stylesList.length > 0 ? stylesList : fallbackStyles;

  const youtubeUrls = album.albums.album_youtube_urls?.map(ay => ay.url).filter(Boolean) || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{album.albums.title}</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Portada */}
        <View style={styles.coverSection}>
          {album.albums.cover_url ? (
            <Image
              source={{ uri: album.albums.cover_url }}
              style={styles.fullCoverImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.fullCoverPlaceholder}>
              <Text style={styles.fullCoverPlaceholderText}>Sin portada</Text>
            </View>
          )}
        </View>

        {/* Sección de Valor */}
        {album.albums.album_stats?.avg_price && (
          <View style={styles.valueCard}>
            <Text style={styles.valueCardTitle}>Valor de mercado</Text>
            <Text style={styles.valueCardAmount}>
              ${album.albums.album_stats.avg_price.toFixed(2)}
            </Text>
            <Text style={styles.valueCardSubtitle}>Precio promedio en el mercado basado en Discogs</Text>
          </View>
        )}

        {/* Sección de Ratio de Venta */}
        {album.albums.album_stats?.want && album.albums.album_stats?.have && (
          (() => {
            const { ratio, level, color } = calculateSalesRatio(
              album.albums.album_stats.want,
              album.albums.album_stats.have
            );
            return (
              <TouchableOpacity 
                style={[styles.ratioCard, { backgroundColor: color }]}
                onPress={() => {
                  setCurrentRatioData({ ratio, level, color });
                  setShowRatioModal(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.ratioCardHeader}>
                  <Text style={styles.ratioCardTitle}>Ratio de Venta</Text>
                  <View style={styles.ratioCardIcon}>
                    <Ionicons name="information-circle" size={20} color="rgba(255, 255, 255, 0.8)" />
                  </View>
                </View>
                <Text style={styles.ratioCardAmount}>
                  {ratio > 0 ? ratio.toFixed(1) : 'N/A'}
                </Text>
                <Text style={styles.ratioCardLevel}>{level}</Text>
                <Text style={styles.ratioCardSubtitle}>
                  {ratio > 0 
                    ? `${album.albums.album_stats.want.toLocaleString()} quieren / ${album.albums.album_stats.have.toLocaleString()} tienen`
                    : 'Demanda vs. oferta en Discogs'
                  }
                </Text>
              </TouchableOpacity>
            );
          })()
        )}

        {/* Información principal del álbum */}
        <View style={styles.albumInfoSection}>
          <Text style={styles.albumTitle}>{album.albums.title}</Text>
          <Text style={styles.artist}>{album.albums.artist}</Text>
          <View style={styles.labelYearContainer}>
            <Text style={styles.label}>{album.albums.label}</Text>
            {album.albums.release_year && (
              <>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.year}>{album.albums.release_year}</Text>
              </>
            )}
          </View>
          {(album.albums.catalog_no || album.albums.country) && (
            <View style={styles.catalogCountryContainer}>
              {album.albums.catalog_no && (
                <>
                  <Text style={styles.catalog}>{album.albums.catalog_no}</Text>
                  {album.albums.country && <Text style={styles.separator}> • </Text>}
                </>
              )}
              {album.albums.country && (
                <Text style={styles.countryText}>{album.albums.country}</Text>
              )}
            </View>
          )}
          
          {/* Géneros y Estilos */}
          {(mergedGenres.length > 0 || mergedStyles.length > 0) && (
            <View style={styles.stylesContainer}>
              {mergedGenres.map((genre: string, index: number) => (
                <View key={`g-${index}`} style={[styles.styleTag, { backgroundColor: '#eef6ff' }]}> 
                  <Text style={[styles.styleText, { color: '#1d4ed8' }]}>{genre}</Text>
                </View>
              ))}
              {mergedStyles.map((style: string, index: number) => (
                <View key={`s-${index}`} style={styles.styleTag}>
                  <Text style={styles.styleText}>{style}</Text>
                </View>
              ))}
            </View>
          )}
          
          {/* Tags de Gem y Audio Note */}
          <View style={styles.tagsContainer}>
            {album.is_gem && (
              <View style={styles.gemTag}>
                <Ionicons name="diamond" size={16} color="#d97706" />
                <Text style={styles.gemTagText}>Gema</Text>
              </View>
            )}
            {album.audio_note && (
              <View style={styles.audioTag}>
                <Ionicons name="mic" size={16} color="#007AFF" />
                <Text style={styles.audioTagText}>Audio</Text>
              </View>
            )}
            {/* Sticker QR eliminado */}
          </View>
        </View>

        {/* Sección de Tracks */}
        {album.albums.tracks && album.albums.tracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracks</Text>
            {(() => {
              const seen = new Set<string>();
              const uniqueTracks = (album.albums.tracks || []).filter((t) => {
                const key = `${(t.position || '').toString().trim()}|${(t.title || '').toString().trim()}|${(t.duration || '').toString().trim()}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return uniqueTracks.map((track, index) => (
                <View key={index} style={styles.trackItem}>
                  <View style={styles.trackInfo}>
                    <Text style={styles.trackPosition}>{track.position}</Text>
                    <Text style={styles.trackTitle}>{track.title}</Text>
                  </View>
                  {track.duration && (
                    <Text style={styles.trackDuration}>{track.duration}</Text>
                  )}
                </View>
              ));
            })()}
          </View>
        )}



        {/* Nota de Audio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nota de Audio</Text>
          {album.audio_note ? (
            // Si existe nota de audio
            <>
              <View style={styles.audioSection}>
                <View style={styles.audioInfo}>
                  <Ionicons name="mic" size={20} color="#007AFF" />
                  <Text style={styles.audioInfoText}>Tienes una nota de audio para este álbum</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.playAudioButton}
                onPress={() => handlePlayAudio(album.audio_note!)}
              >
                <Ionicons name="play-circle" size={24} color="#007AFF" />
                <Text style={styles.playAudioButtonText}>Reproducir nota de audio</Text>
              </TouchableOpacity>
            </>
          ) : (
            // Si no existe nota de audio
            <>
              <View style={styles.audioSection}>
                <View style={styles.audioInfo}>
                  <Ionicons name="mic-outline" size={20} color="#6c757d" />
                  <Text style={styles.audioInfoText}>No tienes una nota de audio para este álbum</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.recordAudioButton}
                onPress={() => handleRecordAudio()}
              >
                <Ionicons name="mic" size={24} color="#007AFF" />
                <Text style={styles.recordAudioButtonText}>Grabar nota de audio</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Estanterías */}
        {album.user_list_items && album.user_list_items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 En mis listas</Text>
            {album.user_list_items.map((item, index) => (
              <View key={index} style={styles.shelfItem}>
                <Ionicons name="library" size={20} color="#007AFF" />
                <View style={styles.shelfInfo}>
                  <Text style={styles.shelfTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.shelfDescription}>{item.description}</Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={16} color="#6c757d" />
              </View>
            ))}
          </View>
        )}

        {/* Nueva Sección de Ubicación RECONSTRUIDA */}
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ubicación</Text>
            
            {album.shelf_id && album.location_row && album.location_column ? (
              <>
                <Text style={styles.currentShelfTitle}>Actualmente en: {album.shelf_name || 'Estantería sin nombre'}</Text>
                <ShelfGrid 
                  rows={shelves.find(s => s.id === album.shelf_id)?.shelf_rows || 0} 
                  columns={shelves.find(s => s.id === album.shelf_id)?.shelf_columns || 0}
                  highlightRow={album.location_row}
                  highlightColumn={album.location_column}
                />
                <Text style={styles.selectShelfTitle}>Cambiar ubicación:</Text>
              </>
            ) : (
              <Text style={styles.selectShelfTitle}>Asignar a una estantería:</Text>
            )}

            {shelves.map((shelf) => {
              const isCurrentShelf = album.shelf_id === shelf.id;
              return (
                <TouchableOpacity
                  key={shelf.id}
                  style={styles.shelfSelectItem}
                  onPress={() => (navigation as any).navigate('SelectCell', { 
                    user_collection_id: album.id, 
                    shelf: shelf,
                    current_row: isCurrentShelf ? album.location_row : undefined,
                    current_column: isCurrentShelf ? album.location_column : undefined,
                  })}
                >
                  <Text style={styles.shelfSelectItemText}>{shelf.name}</Text>
                  <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                </TouchableOpacity>
              );
            })}
            {shelves.length === 0 && (
              <Text style={styles.noShelvesText}>No tienes estanterías para asignar.</Text>
            )}
          </View>

          {/* Sección de Ediciones */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ediciones en Vinilo</Text>
            {editionsLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando ediciones...</Text>
              </View>
            ) : editions.length > 0 ? (
              <View style={styles.editionsContainer}>
                {(showAllEditions ? editions : editions.slice(0, 3)).map((edition, index) => (
                  <View
                    key={edition.id}
                    style={styles.editionItem}
                  >
                    {edition.thumb && (
                      <Image 
                        source={{ uri: edition.thumb }} 
                        style={styles.editionCover}
                        resizeMode="cover"
                      />
                    )}
                    <View style={styles.editionInfo}>
                      <Text style={styles.editionTitle} numberOfLines={1} ellipsizeMode="tail">{edition.title}</Text>
                      <Text style={styles.editionArtist} numberOfLines={1} ellipsizeMode="tail">{edition.artist}</Text>
                      
                      {/* Formato */}
                      {edition.format && (
                        <View style={styles.editionDetailRow}>
                          <Text style={styles.editionDetailLabel} numberOfLines={1} ellipsizeMode="tail">Formato:</Text>
                          <Text style={styles.editionDetailValue} numberOfLines={1} ellipsizeMode="tail">{edition.format}</Text>
                        </View>
                      )}
                      
                      {/* Sello */}
                      {edition.label && (
                        <View style={styles.editionDetailRow}>
                          <Text style={styles.editionDetailLabel} numberOfLines={1} ellipsizeMode="tail">Sello:</Text>
                          <Text style={styles.editionDetailValue} numberOfLines={1} ellipsizeMode="tail">{edition.label}</Text>
                        </View>
                      )}
                      
                      {/* Año */}
                      {edition.year && (
                        <View style={styles.editionDetailRow}>
                          <Text style={styles.editionDetailLabel} numberOfLines={1} ellipsizeMode="tail">Año:</Text>
                          <Text style={styles.editionDetailValue} numberOfLines={1} ellipsizeMode="tail">{edition.year}</Text>
                        </View>
                      )}
                      
                      {/* País */}
                      {edition.country && (
                        <View style={styles.editionDetailRow}>
                          <Text style={styles.editionDetailLabel} numberOfLines={1} ellipsizeMode="tail">País:</Text>
                          <Text style={styles.editionDetailValue} numberOfLines={1} ellipsizeMode="tail">{edition.country}</Text>
                        </View>
                      )}
                      
                      {/* Catálogo */}
                      {edition.catno && (
                        <View style={styles.editionDetailRow}>
                          <Text style={styles.editionDetailLabel} numberOfLines={1} ellipsizeMode="tail">Catálogo:</Text>
                          <Text style={styles.editionDetailValue} numberOfLines={1} ellipsizeMode="tail">{edition.catno}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
                
                {/* Botón "Ver más" o "Ver menos" */}
                {editions.length > 3 && (
                  <TouchableOpacity
                    style={styles.seeMoreButton}
                    onPress={() => setShowAllEditions(!showAllEditions)}
                  >
                    <Text style={styles.seeMoreButtonText}>
                      {showAllEditions ? 'Ver menos' : `Ver ${editions.length - 3} más`}
                    </Text>
                    <Ionicons 
                      name={showAllEditions ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#007AFF" 
                    />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Text style={styles.noEditionsText}>No se encontraron ediciones en vinilo</Text>
            )}
          </View>

          {/* Sección TypeForm */}
          <View style={styles.typeFormSection}>
            <Text style={styles.typeFormSectionTitle}>Cuéntanos sobre este álbum</Text>
            <Text style={styles.typeFormSectionSubtitle}>
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
                      hasAnswer && styles.typeFormQuestionItemAnswered
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
                      <Text style={styles.typeFormQuestionNumber}>
                        {index + 1}
                      </Text>
                      <Text style={styles.typeFormQuestionText}>
                        {question}
                      </Text>
                      {hasAnswer ? (
                        <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                      ) : (
                        <Ionicons name="add-circle-outline" size={20} color="#007AFF" />
                      )}
                    </View>
                    {hasAnswer && (
                      <Text style={styles.typeFormQuestionPreview}>
                        {existingTypeFormResponse[`question_${index + 1}`]}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
      </ScrollView>

      {/* Botón flotante de YouTube */}
      {youtubeUrls.length > 0 && (
        <TouchableOpacity
          style={[styles.floatingYouTubeButton, { bottom: showFloatingPlayer ? 100 : 30 }]}
          onPress={handleExtractYouTubeAudio}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-youtube" size={28} color="#fff" />
        </TouchableOpacity>
      )}

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
                    <Ionicons name="close" size={24} color="#6c757d" />
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
            <View style={styles.typeFormHeader}>
              <TouchableOpacity
                style={styles.typeFormCloseButton}
                onPress={() => {
                  setShowTypeForm(false);
                  setCurrentQuestion(0);
                  setTypeFormAnswers(['', '', '', '', '']);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
              <View style={styles.typeFormTitleContainer}>
                <Text style={styles.typeFormHeaderTitle}>
                  {album?.albums?.title || 'Álbum'}
                </Text>
              </View>
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
                        typeFormAnswers[0] === track.title && styles.trackItemSelected
                      ]}
                      onPress={() => handleTypeFormAnswer(track.title)}
                    >
                      <View style={styles.trackInfo}>
                        <Text style={styles.trackPosition}>{track.position}</Text>
                        <Text style={[
                          styles.trackTitle,
                          typeFormAnswers[0] === track.title && styles.trackTitleSelected
                        ]}>
                          {track.title}
                        </Text>
                      </View>
                      <Text style={styles.trackDuration}>{track.duration}</Text>
                      {typeFormAnswers[0] === track.title && (
                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                // Resto de preguntas: Input de texto normal
                <TextInput
                  style={styles.typeFormInput}
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


      </SafeAreaView>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
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
    color: '#212529',
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
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverPlaceholderText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'left',
    marginTop: 4,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  artist: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 4,
    textAlign: 'left',
  },
  year: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 4,
    textAlign: 'left',
  },
  label: {
    fontSize: 16,
    color: '#6c757d',
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
    color: '#6c757d',
    marginTop: 2,
  },
  audioNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: '#e3f2fd',
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
    color: '#212529',
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
    color: '#6c757d',
    marginLeft: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  tag: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '500',
  },
  audioSection: {
    marginBottom: 12,
  },
  audioInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  audioInfoText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  playAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  playAudioButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  recordAudioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  recordAudioButtonText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
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
    color: '#495057',
    fontWeight: '500',
  },
  youtubePlayButton: {
    padding: 4,
  },
  gemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
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
    color: '#6c757d',
    marginRight: 12,
    minWidth: 30,
  },
  trackTitle: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
  },
  trackDuration: {
    fontSize: 12,
    color: '#6c757d',
    marginLeft: 8,
  },
  shelfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
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
    color: '#212529',
    marginBottom: 2,
  },
  shelfDescription: {
    fontSize: 14,
    color: '#6c757d',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyYouTubeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#6c757d',
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
    color: '#6c757d',
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
    color: '#212529',
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
    color: '#6c757d',
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
    marginTop: 8,
  },
  styleTag: {
    backgroundColor: '#e3f2fd',
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
    height: width * 0.6, // Altura proporcional al ancho de la pantalla
    backgroundColor: '#f8f9fa',
    marginBottom: 10,
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
    backgroundColor: '#e9ecef',
  },
  fullCoverPlaceholderText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 8,
  },
  tracksSection: {
    marginTop: 10,
  },
  videoButton: {
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#fef3c7',
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
    backgroundColor: '#e3f2fd',
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
    color: '#333',
    marginBottom: 4,
  },
  editionArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  editionDetailRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  editionDetailLabel: {
    fontSize: 12,
    color: '#999',
    marginRight: 4,
  },
  editionDetailValue: {
    fontSize: 12,
    color: '#999',
    flex: 1,
  },
  noEditionsText: {
    fontSize: 14,
    color: '#6c757d',
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
    maxHeight: '80%',
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
    color: '#212529',
    marginBottom: 8,
  },
  ratioInfoText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  seeMoreButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginRight: 4,
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
  floatingAudioPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#1a1a1a',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
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
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 4,
  },
  youtubeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF0000',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationShelfName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  locationPosition: {
    fontSize: 12,
    color: '#6c757d',
  },
  selectShelfTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    marginTop: 16,
  },
  shelfSelectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f8f9fa',
  },
  shelfSelectItemText: {
    fontSize: 14,
    color: '#212529',
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
    color: '#333',
  },
  typeFormHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
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
    backgroundColor: '#f0f0f0',
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
    color: '#333',
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
    backgroundColor: '#f9f9f9',
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
    color: '#666',
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
    color: '#333',
    marginBottom: 8,
  },
  typeFormSectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  typeFormButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#d4edda',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormResponseQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  typeFormResponseAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tracklistContainer: {
    marginTop: 20,
  },
  trackItemSelected: {
    backgroundColor: '#e3f2fd',
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
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormResponseInlineQuestion: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  typeFormResponseInlineAnswer: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  typeFormQuestionsContainer: {
    marginTop: 16,
  },
  typeFormQuestionItem: {
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  typeFormQuestionItemAnswered: {
    backgroundColor: '#e8f5e8',
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
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  typeFormQuestionPreview: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
    paddingLeft: 32,
  },
  currentShelfTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212529',
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
}); 