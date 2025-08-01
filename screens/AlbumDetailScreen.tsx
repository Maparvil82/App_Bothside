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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';

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

  const { albumId } = route.params as { albumId: string };

  useEffect(() => {
    loadAlbumDetail();
  }, [albumId]);

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
      console.log('📀 Album detail loaded:', combinedData.albums?.title);
      console.log('📀 Catalog number:', combinedData.albums?.catalog_no);
      console.log('📀 Country:', combinedData.albums?.country);
      console.log('📀 Album stats:', combinedData.albums?.album_stats);
      console.log('📀 Avg price:', combinedData.albums?.album_stats?.avg_price);
      console.log('📀 User collection:', combinedData);
      console.log('📀 Audio note:', combinedData.audio_note);
      console.log('📀 Audio note exists:', !!combinedData.audio_note);
      console.log('📀 Shelves:', combinedData.user_list_items);
      console.log('📀 All album fields:', Object.keys(combinedData));
      console.log('📀 Full album data:', JSON.stringify(combinedData, null, 2));

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
    // Navegar a la pantalla de grabación o abrir modal
    Alert.alert(
      'Grabar Nota de Audio',
      '¿Quieres grabar una nota de audio para este álbum?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Grabar',
          onPress: () => {
            // Aquí se implementaría la lógica de grabación
            console.log('🎤 Iniciando grabación de audio para:', album?.albums.title);
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
        {/* Información del álbum */}
        <View style={styles.albumHeader}>
          <View style={styles.coverContainer}>
            {album.albums?.cover_url ? (
              <Image 
                source={{ uri: album.albums.cover_url }} 
                style={styles.coverImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="musical-note" size={48} color="#6c757d" />
                <Text style={styles.coverPlaceholderText}>Sin imagen</Text>
              </View>
            )}
          </View>
          
          <View style={styles.headerInfo}>
            <Text style={styles.artist}>{album.albums.artist}</Text>
            <Text style={styles.year}>{album.albums.release_year}</Text>
            <Text style={styles.label}>{album.albums.label}</Text>
            {album.albums.catalog_no && (
              <Text style={styles.catalogNumber}>{album.albums.catalog_no}</Text>
            )}
            {album.albums.country && (
              <Text style={styles.country}>{album.albums.country}</Text>
            )}
            <Text style={styles.estimatedValue}>
              {formatPrice(album.albums.album_stats?.avg_price?.toString())}
            </Text>
            <Text style={styles.addedDate}>
              Añadido: {formatDate(album.added_at)}
            </Text>
            {album.audio_note && (
              <TouchableOpacity 
                style={styles.audioNoteContainer}
                onPress={() => handlePlayAudio(album.audio_note!)}
              >
                <Ionicons name="mic" size={14} color="#007AFF" />
                <Text style={styles.audioNoteText}>Nota de audio disponible</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Estilos */}
        {stylesList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Estilos</Text>
            <View style={styles.tagsContainer}>
              {stylesList.map((style, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{style}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Tracklist */}
        {album.albums.tracks && album.albums.tracks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracklist</Text>
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

        {/* Videos de YouTube */}
        {youtubeUrls.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Videos de YouTube</Text>
            {youtubeUrls.map((url, index) => (
              <View key={index} style={styles.youtubeItem}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <Text style={styles.youtubeText} numberOfLines={1}>
                  Video {index + 1}
                </Text>
                <TouchableOpacity style={styles.youtubeButton}>
                  <Ionicons name="play" size={16} color="#007AFF" />
                </TouchableOpacity>
              </View>
            ))}
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
      </ScrollView>

      {/* Reproductor flotante */}
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
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
    color: '#495057',
    marginBottom: 4,
  },
  year: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: '#6c757d',
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginLeft: 8,
    marginRight: 8,
    minWidth: 100,
  },
  infoValue: {
    fontSize: 14,
    color: '#212529',
    flex: 1,
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
  youtubeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  youtubeText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#495057',
  },
  youtubeButton: {
    padding: 8,
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
}); 