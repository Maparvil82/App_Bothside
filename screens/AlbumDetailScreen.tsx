import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Linking,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { AudioRecorder } from '../components/AudioRecorder';
import { WebView } from 'react-native-webview';
import { Audio } from 'expo-av';
import { UserCollectionService } from '../services/database';

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
    album_stats?: { avg_price: number };
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

  const { albumId } = route.params as { albumId: string };

  useEffect(() => {
    loadAlbumDetail();
  }, [albumId]);

  // Limpiar el audio cuando el componente se desmonte
  useEffect(() => {
    return () => {
      // Cleanup si es necesario en el futuro
    };
  }, []);

  const loadAlbumDetail = async () => {
    if (!user || !albumId) return;

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
            album_stats (avg_price),
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
          album_id,
          user_lists!inner (
            id,
            user_id
          )
        `)
        .eq('album_id', albumId)
        .eq('user_lists.user_id', user.id);

      console.log('📚 List items data:', listItemsData);
      console.log('📚 List items error:', listItemsError);
      console.log('📚 List items length:', listItemsData?.length);

      // Filtrar las estanterías que contienen este álbum
      const shelvesWithAlbum = shelfData?.filter(shelf => {
        return listItemsData?.some(item => 
          item.list_id === shelf.id && item.album_id === albumId
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
          list_items: listItemsData?.filter(item => item.list_id === shelf.id) || []
        }))
      };

      setAlbum(combinedData);
      
      // Logs simplificados para debug
      console.log('📀 Album detail loaded:', combinedData.albums?.title);
      console.log('📀 Catalog number:', combinedData.albums?.catalog_no);
      console.log('📀 Country:', combinedData.albums?.country);
      console.log('📀 Album stats:', combinedData.albums?.album_stats);
      console.log('📀 Avg price:', combinedData.albums?.album_stats?.avg_price);
      console.log('📀 Audio note exists:', !!combinedData.audio_note);
      console.log('🎥 YouTube URLs count:', combinedData.albums?.album_youtube_urls?.length || 0);
      
      // Debug específico para YouTube URLs de forma más segura
      if (combinedData.albums?.album_youtube_urls && Array.isArray(combinedData.albums.album_youtube_urls)) {
        console.log('🎥 Raw YouTube videos data:', combinedData.albums.album_youtube_urls);
        combinedData.albums.album_youtube_urls.forEach((video, index) => {
          if (video && video.url) {
            console.log(`🎥 Video ${index + 1} URL:`, video.url);
            const videoId = extractYouTubeVideoId(video.url);
            console.log(`🎥 Video ${index + 1} ID:`, videoId);
          }
        });
      }

      // Procesar URLs de YouTube de forma más segura
      const youtubeUrls = combinedData.albums?.album_youtube_urls
        ?.filter(video => video && video.url)
        ?.map(video => video.url)
        ?.filter(Boolean) || [];
      
      console.log('🎥 YouTube URLs encontradas:', youtubeUrls.length);

    } catch (error) {
      console.error('Error processing album detail:', error);
      Alert.alert('Error', 'No se pudo procesar la información del álbum');
    } finally {
      setLoading(false);
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
    if (!user || !albumId) return;

    try {
      console.log('🎤 Guardando nota de audio:', audioUri);
      
      // Guardar la URI del audio en la base de datos
      await UserCollectionService.saveAudioNote(user.id, albumId, audioUri);
      
      // Recargar los datos del álbum para mostrar la nueva nota de audio
      await loadAlbumDetail();
      
      Alert.alert('Éxito', 'Nota de audio guardada correctamente');
      setShowAudioRecorder(false);
    } catch (error) {
      console.error('❌ Error guardando nota de audio:', error);
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
      console.log('🎥 Abriendo video de YouTube:', url);
      
      const videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        Alert.alert('Error', 'No se pudo procesar la URL del video');
        return;
      }

      // Usar una URL de embed más compatible con parámetros adicionales para autoplay
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent('https://www.youtube.com')}&widget_referrer=${encodeURIComponent('https://www.youtube.com')}&mute=0&controls=1&showinfo=1`;
      const videoTitle = `Video - ${album?.albums.artist}`;
      
      console.log('🎥 URL de embed creada:', embedUrl);
      
      setCurrentVideoUrl(embedUrl);
      setCurrentVideoTitle(videoTitle);
      setShowVideoPlayer(true);
      
      console.log('🎥 Video modal abierto:', embedUrl);
    } catch (error) {
      console.error('🎥 Error al abrir video:', error);
      Alert.alert('Error', 'No se pudo abrir el video');
    }
  };

  const handleOpenInYouTube = async (url: string) => {
    try {
      console.log('🎥 Abriendo en YouTube app:', url);
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'No se pudo abrir YouTube');
      }
    } catch (error) {
      console.error('Error opening YouTube app:', error);
      Alert.alert('Error', 'No se pudo abrir YouTube');
    }
  };

  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handlePlayYouTubeAudio = async () => {
    if (!album?.albums.album_youtube_urls || album.albums.album_youtube_urls.length === 0) {
      Alert.alert('Sin video disponible', 'No hay videos de YouTube disponibles para este álbum.');
      return;
    }

    try {
      // Tomar el primer video de YouTube disponible
      const firstVideo = album.albums.album_youtube_urls[0];
      const videoId = extractYouTubeVideoId(firstVideo.url);
      
      if (!videoId) {
        Alert.alert('Error', 'No se pudo extraer el ID del video de YouTube.');
        return;
      }

      console.log('🎵 Abriendo video de YouTube en modal:', videoId);

      // Construir URL de YouTube embed simplificada
      const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent('https://www.youtube.com')}&widget_referrer=${encodeURIComponent('https://www.youtube.com')}&mute=0&controls=1&showinfo=1`;
      
      // Usar las variables existentes del modal
      setCurrentVideoUrl(embedUrl);
      setCurrentVideoTitle(`${album.albums.artist} - ${album.albums.title}`);
      setShowVideoPlayer(true);

    } catch (error) {
      console.error('Error opening YouTube video:', error);
      Alert.alert('Error', 'No se pudo abrir el video de YouTube.');
    }
  };

  const handleStopYouTubeAudio = async () => {
    // Cleanup si es necesario en el futuro
  };

  const handleToggleYouTubeAudio = () => {
    handlePlayYouTubeAudio();
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
    if (!price || price === 'null' || price === 'undefined' || price === '') {
      return 'Precio no disponible';
    }
    const numPrice = parseFloat(price);
    return isNaN(numPrice) || numPrice === 0 ? 'Precio no disponible' : `${numPrice.toFixed(2)} €`;
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
  console.log('🎥 Processed YouTube URLs:', youtubeUrls);
  console.log('🎥 YouTube URLs length:', youtubeUrls.length);
  console.log('🎥 Should show floating button:', youtubeUrls.length > 0);
  console.log('🎥 Is playing audio:', false); // isPlayingAudio removed

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

        {/* Estado de gem */}
        {album.is_gem && (
          <View style={styles.section}>
            <View style={styles.gemContainer}>
              <Ionicons name="star" size={24} color="#fbbf24" />
              <Text style={styles.gemText}>Este álbum está en tus gemas</Text>
            </View>
          </View>
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
        </View>

        {/* Sección de Estilos */}
        {stylesList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estilos</Text>
            <View style={styles.stylesContainer}>
              {stylesList.map((style, index) => (
                <View key={index} style={styles.styleTag}>
                  <Text style={styles.styleText}>{style}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

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

        {/* Sección de YouTube Videos */}
        {youtubeUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos</Text>
            {youtubeUrls.map((url, index) => (
              <TouchableOpacity
                key={index}
                style={styles.videoButton}
                onPress={() => handleOpenYouTubeVideo(url)}
              >
                <Text style={styles.videoButtonText}>Ver video {index + 1}</Text>
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
            <Text style={styles.sectionTitle}>Estanterías</Text>
            {album.user_list_items.map((item, index) => (
              <View key={index} style={styles.shelfItem}>
                <Ionicons name="library" size={16} color="#007AFF" />
                <View style={styles.shelfInfo}>
                  <Text style={styles.shelfTitle}>{item.title}</Text>
                  {item.description && (
                    <Text style={styles.shelfDescription}>{item.description}</Text>
                  )}
                </View>
              </View>
            ))}
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

      {/* Modal del reproductor de video */}
      <Modal
        visible={showVideoPlayer}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SafeAreaView style={styles.videoModalContainer}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity 
              onPress={() => setShowVideoPlayer(false)}
              style={styles.videoCloseButton}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.videoModalTitle}>{currentVideoTitle}</Text>
            <TouchableOpacity 
              onPress={() => {
                const videoId = extractYouTubeVideoId(currentVideoUrl);
                if (videoId) {
                  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                  Linking.openURL(youtubeUrl);
                }
              }}
              style={styles.videoYouTubeButton}
            >
              <Ionicons name="logo-youtube" size={24} color="#FF0000" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.videoContainer}>
            <WebView
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                  <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                      body { 
                        margin: 0; 
                        padding: 0; 
                        background: #000; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                      }
                      .video-container {
                        width: 100%; 
                        height: 100%; 
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                      }
                      iframe {
                        width: 100%; 
                        height: 100%; 
                        border: none; 
                      }
                    </style>
                  </head>
                  <body>
                    <div class="video-container">
                      <iframe 
                        src="${currentVideoUrl || ''}"
                        frameborder="0"
                        allowfullscreen
                        allow="autoplay; encrypted-media; picture-in-picture"
                      ></iframe>
                    </div>
                  </body>
                  </html>
                `
              }}
              style={styles.videoPlayer}
              originWhitelist={['*']}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              allowsFullscreenVideo={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1"
              onLoadStart={() => {
                console.log('🎥 WebView: Iniciando carga del video');
              }}
              onLoadEnd={() => {
                console.log('🎥 WebView: Video cargado correctamente');
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('🎥 WebView error:', nativeEvent);
                Alert.alert(
                  'Error de Reproducción',
                  'No se pudo reproducir el video. ¿Quieres abrirlo en YouTube?',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                      text: 'Abrir en YouTube', 
                      onPress: () => {
                        const videoId = extractYouTubeVideoId(currentVideoUrl);
                        if (videoId) {
                          const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
                          Linking.openURL(youtubeUrl);
                        }
                      }
                    }
                  ]
                );
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('🎥 WebView HTTP error:', nativeEvent);
              }}
              onMessage={(event) => {
                console.log('🎥 WebView message:', event.nativeEvent.data);
              }}
            />
            
            {/* Botón manual para reproducir */}
            <TouchableOpacity 
              style={styles.playButton}
              onPress={() => {
                // Recargar el WebView con autoplay forzado
                const videoId = extractYouTubeVideoId(currentVideoUrl);
                if (videoId) {
                  const newUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&origin=${encodeURIComponent('https://www.youtube.com')}&widget_referrer=${encodeURIComponent('https://www.youtube.com')}&mute=0&controls=1&showinfo=1&t=0`;
                  setCurrentVideoUrl(newUrl);
                }
              }}
            >
              <Ionicons name="play-circle" size={48} color="#fff" />
              <Text style={styles.playButtonText}>Reproducir</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
      
      {/* Botón flotante para reproducir audio de YouTube */}
      {youtubeUrls.length > 0 && (
        <>
          {console.log('🎥 Rendering floating button')}
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
      
      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>YouTube URLs: {youtubeUrls.length}</Text>
          <Text style={styles.debugText}>Is Playing: {false ? 'Yes' : 'No'}</Text> {/* isPlayingAudio removed */}
        </View>
      )}

      {/* Audio Recorder Modal */}
      <AudioRecorder
        visible={showAudioRecorder}
        onClose={() => setShowAudioRecorder(false)}
        onSave={handleSaveAudioNote}
        albumTitle={album?.albums.title || 'Álbum'}
      />
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
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  shelfInfo: {
    marginLeft: 12,
    flex: 1,
  },
  shelfTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  shelfDescription: {
    fontSize: 12,
    color: '#6c757d',
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
  headerInfo: {
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
  country: {
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
    bottom: 120, // Cambiado de 80 a 120 para que sea más visible
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
  debugInfo: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
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
}); 