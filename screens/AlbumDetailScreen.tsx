import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Linking,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getAlbumEditions } from '../services/discogs';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { UserCollectionService } from '../services/database';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { ENV } from '../config/env';
import { YouTubeAudioService } from '../services/youtube-audio';

const { width } = Dimensions.get('window');

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
}

export default function AlbumDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [album, setAlbum] = useState<AlbumDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentVideoTitle, setCurrentVideoTitle] = useState('');
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [showFloatingAudioButton, setShowFloatingAudioButton] = useState(false);
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [editions, setEditions] = useState<any[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [showRatioModal, setShowRatioModal] = useState(false);
  const [currentRatioData, setCurrentRatioData] = useState<{ ratio: number; level: string; color: string } | null>(null);
  const [showAllEditions, setShowAllEditions] = useState(false);
  const [videoRef, setVideoRef] = useState<Video | null>(null);
  const [videoStatus, setVideoStatus] = useState<AVPlaybackStatus | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [audioPlayerVisible, setAudioPlayerVisible] = useState(false);
  const [currentAudioTrack, setCurrentAudioTrack] = useState<{
    title: string;
    artist: string;
    coverUrl: string;
    youtubeUrl: string;
  } | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | null>(null);

  const { albumId } = route.params as { albumId: string };

  useEffect(() => {
    loadAlbumDetail();
    
    // Configurar audio para reproducción
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };
    
    setupAudio();
  }, [albumId]);

  // Limpiar el audio cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAlbumDetail = async () => {
    if (!user || !albumId) return;

    console.log('🔄 Iniciando carga de detalles del álbum:', albumId);

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('user_collection')
        .select(`
          id,
          added_at,
          audio_note,
          is_gem,
          albums (
            *,
            album_styles (styles (name)),
            album_youtube_urls (url),
            album_stats (avg_price, want, have),
            tracks (position, title, duration)
          )
        `)
        .eq('user_id', user.id)
        .eq('album_id', albumId)
        .single();

      if (error) {
        console.error('Error loading album detail:', error);
        Alert.alert('Error', 'No se pudo cargar la información del álbum');
        return;
      }

      // Obtener las estanterías donde está este álbum
      const { data: shelfData, error: shelfError } = await supabase
        .from('user_lists')
        .select(`
          id,
          title,
          description
        `)
        .eq('user_id', user.id);

      console.log('📚 Shelf query params:', { albumId, userId: user.id });
      console.log('📚 Shelf data:', shelfData);
      console.log('📚 Shelf error:', shelfError);
      console.log('📚 Shelf data length:', shelfData?.length);

      // Obtener list_items que pertenezcan a estanterías del usuario actual
      const { data: listItemsData, error: listItemsError } = await supabase
        .from('list_items')
        .select(`
          list_id,
          album_id
        `)
        .eq('album_id', albumId);

      console.log('📚 List items data:', listItemsData);
      console.log('📚 List items error:', listItemsError);
      console.log('📚 List items length:', listItemsData?.length);

      // También verificar listas públicas donde podría estar el álbum
      const { data: publicListItems, error: publicListError } = await supabase
        .from('list_items')
        .select(`
          list_id,
          album_id,
          user_lists!inner (
            id,
            title,
            description,
            is_public
          )
        `)
        .eq('album_id', albumId)
        .eq('user_lists.is_public', true);

      console.log('📚 Public list items:', publicListItems);
      console.log('📚 Public list items length:', publicListItems?.length);

      // Combinar list_items del usuario y públicos
      const allListItems = [
        ...(listItemsData || []),
        ...(publicListItems || [])
      ];

      // Filtrar las estanterías que contienen este álbum
      const shelvesWithAlbum = shelfData?.filter(shelf => {
        return allListItems?.some(item => 
          item.list_id === shelf.id
        );
      }) || [];

      console.log('📚 Shelves with album:', shelvesWithAlbum);
      console.log('📚 Shelves with album length:', shelvesWithAlbum.length);

      if (shelfError) {
        console.error('Error loading shelves:', shelfError);
      }

      // Combinar los datos
      const combinedData: AlbumDetail = {
        id: data.id,
        added_at: data.added_at,
        audio_note: data.audio_note,
        is_gem: data.is_gem,
        albums: Array.isArray(data.albums) ? data.albums[0] : data.albums,
        user_list_items: shelvesWithAlbum.map(shelf => ({
          id: shelf.id,
          title: shelf.title,
          description: shelf.description,
          list_items: allListItems?.filter(item => item.list_id === shelf.id) || []
        }))
      };

      setAlbum(combinedData);
      
      // Logs simplificados para debug
      console.log('📀 Album detail loaded:', combinedData.albums?.title);
      console.log('📀 Catalog number:', combinedData.albums?.catalog_no);
      console.log('📀 Country:', combinedData.albums?.country);
      console.log('📀 Album stats:', combinedData.albums?.album_stats);
      console.log('📀 Avg price:', combinedData.albums?.album_stats?.avg_price);
      console.log('📀 Want count:', combinedData.albums?.album_stats?.want);
      console.log('📀 Have count:', combinedData.albums?.album_stats?.have);
      console.log('📀 Audio note exists:', !!combinedData.audio_note);
      console.log('📚 Shelves with album:', shelvesWithAlbum);
      console.log('📚 List items data:', listItemsData);
      console.log('📚 User list items:', combinedData.user_list_items);
      console.log('📚 User list items length:', combinedData.user_list_items?.length);
      
      // Procesar URLs de YouTube de forma más segura
      const youtubeUrls = combinedData.albums?.album_youtube_urls
        ?.filter(video => video && video.url)
        ?.map(video => video.url)
        ?.filter(Boolean) || [];

      // Cargar ediciones disponibles
      console.log('🎯 Llamando loadAlbumEditions con:', {
        artist: combinedData.albums?.artist,
        title: combinedData.albums?.title
      });
      await loadAlbumEditions(combinedData.albums?.artist, combinedData.albums?.title);

    } catch (error) {
      console.error('Error processing album detail:', error);
      Alert.alert('Error', 'No se pudo procesar la información del álbum');
    } finally {
      setLoading(false);
    }
  };

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
    if (!user || !albumId) {
      console.error('❌ handleSaveAudioNote: Missing user or albumId', { 
        user: user?.id, 
        albumId,
        hasUser: !!user,
        hasAlbumId: !!albumId 
      });
      Alert.alert('Error', 'Usuario no autenticado o álbum no válido');
      return;
    }

    try {
      console.log('🎤 Guardando nota de audio:', {
        userId: user.id,
        albumId,
        audioUri,
        userEmail: user.email
      });
      
      // Verificar sesión actual
      const { data: { user: currentUser }, error: sessionError } = await supabase.auth.getUser();
      if (sessionError) {
        console.error('❌ Error verificando sesión:', sessionError);
        Alert.alert('Error', 'Sesión expirada. Por favor, inicia sesión nuevamente');
        return;
      }
      
      if (!currentUser) {
        console.error('❌ No hay usuario autenticado');
        Alert.alert('Error', 'No hay usuario autenticado');
        return;
      }
      
      console.log('✅ Usuario autenticado:', currentUser.id);
      
      // Guardar la URI del audio en la base de datos
      const result = await UserCollectionService.saveAudioNote(user.id, albumId, audioUri);
      console.log('✅ Resultado del guardado:', result);
      
      // Recargar los datos del álbum para mostrar la nueva nota de audio
      await loadAlbumDetail();
      
      Alert.alert('Éxito', 'Nota de audio guardada correctamente');
      setShowAudioRecorder(false);
    } catch (error) {
      console.error('❌ Error guardando nota de audio:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        details: (error as any)?.details
      });
      Alert.alert('Error', 'No se pudo guardar la nota de audio');
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
              // Buscar el álbum en Discogs
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
              // URL del marketplace de Discogs para vender
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

  const handleOpenYouTubeVideo = async (url: string) => {
    try {
      
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        Alert.alert('Error', 'No se pudo procesar la URL del video');
        return;
      }

      // Usar una URL de embed más compatible con parámetros adicionales para autoplay
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent('https://www.youtube.com')}&widget_referrer=${encodeURIComponent('https://www.youtube.com')}&mute=0&controls=1&showinfo=1`;
      const videoTitle = `Video - ${album?.albums.artist}`;
      
      setCurrentVideoUrl(embedUrl);
      setCurrentVideoTitle(videoTitle);
      setShowVideoPlayer(true);
      
    } catch (error) {
      console.error('🎥 Error al abrir video:', error);
      Alert.alert('Error', 'No se pudo abrir el video');
    }
  };

  const handleOpenInYouTube = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir YouTube');
      }
    } catch (error) {
      console.error('Error opening YouTube:', error);
      Alert.alert('Error', 'No se pudo abrir YouTube');
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Función para obtener URL directa del video de YouTube
  const getDirectVideoUrl = async (youtubeUrl: string): Promise<string> => {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) return '';
    
    try {
      // Usar un servicio público de extracción de YouTube
      const response = await fetch(`https://api.vevioz.com/@api/button/videos/${videoId}`);
      
      if (response.ok) {
        const html = await response.text();
        // Extraer URL del HTML (simplificado)
        const urlMatch = html.match(/href="([^"]*\.mp4[^"]*)"/);
        if (urlMatch && urlMatch[1]) {
          return urlMatch[1];
        }
      }
    } catch (error) {
      console.error('Error extracting YouTube URL:', error);
    }
    
    // Fallback: usar una URL de ejemplo si falla la extracción
    return `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`;
  };

  // Función para reproducir audio de YouTube usando el servicio
  const handlePlayYouTubeAudio = async () => {
    if (!album?.albums?.album_youtube_urls || album.albums.album_youtube_urls.length === 0) {
      Alert.alert('Sin videos', 'Este álbum no tiene videos de YouTube asociados.');
      return;
    }

    try {
      setAudioPlayerVisible(true);
      setVideoLoading(true);

      // Tomar el primer video disponible
      const firstVideo = album.albums.album_youtube_urls[0];
      console.log('🎵 Reproduciendo video:', firstVideo.url);

      // Usar el servicio de YouTube Audio
      const result = await YouTubeAudioService.extractAudioFromYouTube(firstVideo.url);

      if (result.success && result.audioUrl && result.videoInfo) {
        console.log('🎵 Audio extraído exitosamente:', result.audioUrl);
        
        // Configurar el track actual
        setCurrentAudioTrack({
          title: result.videoInfo.title,
          artist: album.albums.artist,
          coverUrl: album.albums.cover_url || '',
          youtubeUrl: firstVideo.url
        });

        // Cargar y reproducir el audio
        await loadAndPlayAudio(result.audioUrl);
        
      } else {
        console.error('🎵 Error en la extracción:', result.error);
        Alert.alert('Error', 'No se pudo extraer el audio del video. Intenta con otro video.');
        setAudioPlayerVisible(false);
      }

    } catch (error) {
      console.error('Error playing YouTube audio:', error);
      Alert.alert('Error', 'No se pudo reproducir el audio. Intenta más tarde.');
      setAudioPlayerVisible(false);
    } finally {
      setVideoLoading(false);
    }
  };

  // Función para cargar y reproducir audio
  const loadAndPlayAudio = async (audioUrl: string) => {
    try {
      console.log('🎵 Cargando audio desde:', audioUrl);

      // Limpiar audio anterior si existe
      if (sound) {
        await sound.unloadAsync();
      }

      // Crear nuevo objeto de audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsAudioPlaying(true);
      console.log('🎵 Audio cargado y reproduciendo');

    } catch (error) {
      console.error('Error loading audio:', error);
      Alert.alert('Error', 'No se pudo cargar el audio. Verifica tu conexión a internet.');
      setAudioPlayerVisible(false);
    }
  };

  // Función para actualizar el estado de reproducción
  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setIsAudioPlaying(status.isPlaying);
      if (status.durationMillis) {
        const progress = status.positionMillis / status.durationMillis;
        setAudioProgress(progress);
      }
    }
  };

  // Función para toggle play/pause
  const handleToggleAudio = async () => {
    if (!sound) {
      console.log('🎵 No hay sonido cargado, iniciando reproducción...');
      // Si no hay sonido cargado, intentar cargar el audio
      if (currentAudioTrack) {
        await loadAndPlayAudio(currentAudioTrack.youtubeUrl);
      }
      return;
    }

    try {
      const status = await sound.getStatusAsync();
      
      if (status.isLoaded) {
        if (isAudioPlaying) {
          await sound.pauseAsync();
          console.log('🎵 Audio pausado');
        } else {
          await sound.playAsync();
          console.log('🎵 Audio reanudado');
        }
      } else {
        console.log('🎵 Sonido no cargado, recargando...');
        // Si el sonido no está cargado, recargarlo
        if (currentAudioTrack) {
          await loadAndPlayAudio(currentAudioTrack.youtubeUrl);
        }
      }
    } catch (error) {
      console.error('Error toggling audio:', error);
      // Si hay error, intentar recargar el audio
      if (currentAudioTrack) {
        await loadAndPlayAudio(currentAudioTrack.youtubeUrl);
      }
    }
  };

  // Función para cerrar el reproductor
  const handleCloseAudioPlayer = async () => {
    try {
      if (sound) {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
        setSound(null);
      }
    } catch (error) {
      console.error('Error closing audio player:', error);
    }
    
    setAudioPlayerVisible(false);
    setIsAudioPlaying(false);
    setCurrentAudioTrack(null);
    setAudioProgress(0);
  };

  const handleStopYouTubeAudio = async () => {
    // Cleanup si es necesario en el futuro
  };

  const handleToggleYouTubeAudio = () => {
    handlePlayYouTubeAudio();
  };

  const handleOpenEdition = async (uri: string) => {
    try {
      const supported = await Linking.canOpenURL(uri);
      if (supported) {
        await Linking.openURL(uri);
      } else {
        Alert.alert('Error', 'No se pudo abrir el enlace de la edición');
      }
    } catch (error) {
      console.error('Error opening edition:', error);
      Alert.alert('Error', 'No se pudo abrir la edición');
    }
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



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando álbum...</Text>
      </View>
    );
  }

  if (!album) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#dc3545" />
        <Text style={styles.errorText}>No se encontró el álbum</Text>
      </View>
    );
  }

  const stylesList = album.albums.album_styles?.map(as => as.styles?.name).filter(Boolean) || [];
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
                <Text style={styles.country}>{album.albums.country}</Text>
              )}
            </View>
          )}
          
          {/* Estilos integrados en la información básica */}
          {stylesList.length > 0 && (
            <View style={styles.stylesContainer}>
              {stylesList.map((style, index) => (
                <View key={index} style={styles.styleTag}>
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
          </View>
        </View>

        {/* Sección de Tracks */}
        {album.albums.tracks && album.albums.tracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracks</Text>
            {album.albums.tracks.map((track, index) => (
              <View key={index} style={styles.trackItem}>
                <View style={styles.trackInfo}>
                  <Text style={styles.trackPosition}>{track.position}</Text>
                  <Text style={styles.trackTitle}>{track.title}</Text>
                </View>
                {track.duration && (
                  <Text style={styles.trackDuration}>{track.duration}</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Sección de Ediciones */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ediciones Disponibles</Text>
          {editionsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.loadingText}>Cargando ediciones...</Text>
            </View>
          ) : editions.length > 0 ? (
            <View style={styles.editionsContainer}>
              {(showAllEditions ? editions : editions.slice(0, 3)).map((edition, index) => (
                <TouchableOpacity
                  key={edition.id}
                  style={styles.editionItem}
                  onPress={() => handleOpenEdition(edition.uri)}
                >
                  {edition.thumb && (
                    <Image 
                      source={{ uri: edition.thumb }} 
                      style={styles.editionCover}
                      resizeMode="cover"
                    />
                  )}
                  <View style={styles.editionInfo}>
                    <Text style={styles.editionTitle}>{edition.title}</Text>
                    <Text style={styles.editionArtist}>{edition.artist}</Text>
                    <View style={styles.editionDetails}>
                      <Text style={styles.editionYear}>{edition.year}</Text>
                      <Text style={styles.editionCountry}>{edition.country}</Text>
                      <Text style={styles.editionFormat}>{edition.format}</Text>
                    </View>
                    {edition.label && (
                      <Text style={styles.editionLabel}>{edition.label}</Text>
                    )}
                    {edition.catno && (
                      <Text style={styles.editionCatno}>{edition.catno}</Text>
                    )}
                  </View>
                  <Ionicons name="open-outline" size={20} color="#007AFF" />
                </TouchableOpacity>
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
            <Text style={styles.noEditionsText}>No se encontraron ediciones adicionales</Text>
          )}
        </View>

        {/* Sección de YouTube Videos */}
        {youtubeUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos</Text>
            {youtubeUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoButton}
                onPress={() => handlePlayYouTubeAudio()}
              >
                <Text style={styles.videoButtonText}>Reproducir audio {index + 1}</Text>
              </TouchableOpacity>
            ))}
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

        {/* Sección cuando no está en ninguna lista */}
        {(!album.user_list_items || album.user_list_items.length === 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Organizar</Text>
            <View style={styles.noShelvesItem}>
              <Ionicons name="add-circle-outline" size={20} color="#6c757d" />
              <View style={styles.noShelvesInfo}>
                <Text style={styles.noShelvesTitle}>No está en ninguna lista</Text>
                <Text style={styles.noShelvesDescription}>
                  Puedes agregar este álbum a una de tus estanterías para organizarlo mejor
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Reproductor flotante */}
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
      />

      {/* Modal del reproductor de audio */}
      <Modal
        visible={showVideoPlayer}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.audioModalContainer}>
          <View style={styles.audioModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowVideoPlayer(false)}
              style={styles.audioCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.audioModalTitle}>{currentVideoTitle}</Text>
            <TouchableOpacity 
              onPress={() => {
                const videoId = extractYouTubeVideoId(currentVideoUrl);
                if (videoId) {
                  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  Linking.openURL(youtubeUrl);
                }
              }}
              style={styles.audioYouTubeButton}
            >
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.audioPlayerContainer}>
            {/* Área de visualización del álbum */}
            <View style={styles.audioAlbumArt}>
              {album?.albums.cover_url ? (
                <Image 
                  source={{ uri: album.albums.cover_url }} 
                  style={styles.audioAlbumImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.audioAlbumPlaceholder}>
                  <Ionicons name="musical-notes" size={48} color="#fff" />
                </View>
              )}
            </View>
            
            {/* Información del álbum */}
            <View style={styles.audioInfo}>
              <Text style={styles.audioArtist}>{album?.albums.artist}</Text>
              <Text style={styles.audioTitle}>{album?.albums.title}</Text>
            </View>
            
            {/* Controles de reproducción */}
            <View style={styles.audioControls}>
              <TouchableOpacity style={styles.audioControlButton}>
                <Ionicons name="play-skip-back" size={32} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.audioPlayButton}>
                <Ionicons name="play" size={48} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.audioControlButton}>
                <Ionicons name="play-skip-forward" size={32} color="#fff" />
              </TouchableOpacity>
            </View>
            
            {/* Barra de progreso */}
            <View style={styles.audioProgress}>
              <View style={styles.audioProgressBar}>
                <View style={styles.audioProgressFill} />
              </View>
              <View style={styles.audioTimeInfo}>
                <Text style={styles.audioTimeText}>0:00</Text>
                <Text style={styles.audioTimeText}>0:00</Text>
              </View>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Botón flotante para reproducir audio de YouTube */}
      {youtubeUrls.length > 0 && (
        <>
          <TouchableOpacity
            style={styles.floatingAudioButton}
            onPress={handleToggleYouTubeAudio}
            activeOpacity={0.8}
          >
            <Ionicons
              name="play-circle"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </>
      )}
      
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

      {/* Reproductor de audio flotante */}
      {audioPlayerVisible && currentAudioTrack && (
        <View style={styles.floatingAudioPlayer}>
          {/* Portada del álbum */}
          <View style={styles.audioPlayerCover}>
            {currentAudioTrack.coverUrl ? (
              <Image 
                source={{ uri: currentAudioTrack.coverUrl }} 
                style={styles.audioPlayerCoverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.audioPlayerCoverPlaceholder}>
                <Ionicons name="musical-notes" size={20} color="#fff" />
              </View>
            )}
          </View>
          
          {/* Información del track */}
          <View style={styles.audioPlayerInfo}>
            <Text style={styles.audioPlayerTitle} numberOfLines={1}>
              {currentAudioTrack.title}
            </Text>
            <Text style={styles.audioPlayerArtist} numberOfLines={1}>
              {currentAudioTrack.artist}
            </Text>
          </View>
          
          {/* Controles */}
          <View style={styles.audioPlayerControls}>
            <TouchableOpacity 
              style={styles.audioPlayerPlayButton}
              onPress={handleToggleAudio}
            >
              <Ionicons 
                name={isAudioPlaying ? "pause" : "play"} 
                size={24} 
                color="#fff" 
              />
            </TouchableOpacity>
          </View>
          
          {/* Botón cerrar */}
          <TouchableOpacity 
            style={styles.audioPlayerCloseButton}
            onPress={handleCloseAudioPlayer}
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
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
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#dc3545',
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
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  editionInfo: {
    flex: 1.5,
  },
  editionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  editionArtist: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  editionDetails: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  editionYear: {
    fontSize: 11,
    color: '#007AFF',
    marginRight: 8,
  },
  editionCountry: {
    fontSize: 11,
    color: '#28a745',
    marginRight: 8,
  },
  editionFormat: {
    fontSize: 11,
    color: '#6c757d',
  },
  editionLabel: {
    fontSize: 11,
    color: '#6c757d',
    marginBottom: 2,
  },
  editionCatno: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  noEditionsText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
  },
  editionCover: {
    width: 100,
    height: 100,
    borderRadius: 4,
    marginRight: 12,
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
    padding: 4,
  },
  noShelvesItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6c757d',
  },
  noShelvesInfo: {
    flex: 1,
    marginLeft: 12,
  },
  noShelvesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 2,
  },
  noShelvesDescription: {
    fontSize: 14,
    color: '#6c757d',
    fontStyle: 'italic',
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
}); 