import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AudioNotesSection } from '../components/AudioNotesSection';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { TopItemsLineChart } from '../components/TopItemsLineChart';
import ShelfGrid from '../components/ShelfGrid';
import { CollectorRankCard } from '../components/CollectorRankCard';

const { width } = Dimensions.get('window');

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

interface CollectionStats {
  totalAlbums: number;
  totalArtists: number;
  totalLabels: number;
  totalStyles: number;
  oldestAlbum: number;
  newestAlbum: number;
  collectionValue: number;
  topArtists: Array<{ artist: string; count: number }>;
  topLabels: Array<{ label: string; count: number }>;
  topStyles: Array<{ style: string; count: number }>;
  albumsByDecade: Array<{ decade: string; count: number }>;
  latestAlbums: Array<{ id: string; title: string; artist: string; year: string; addedAt: string; imageUrl?: string }>;
  mostExpensiveAlbums: Array<{ id: string; title: string; artist: string; price: number; imageUrl?: string }>;
  highestRatioAlbums: Array<{ id: string; title: string; artist: string; ratio: number; level: string; color: string; want: number; have: number; imageUrl?: string }>;
}

interface AudioNoteAlbum {
  id: string;
  title: string;
  artist: string;
  cover_url?: string;
  audio_note: string;
  added_at: string;
}

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [albumsWithAudio, setAlbumsWithAudio] = useState<AudioNoteAlbum[]>([]);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');
  const navigation = useNavigation();

  const [shelves, setShelves] = useState<Shelf[]>([]);

  // Si la autenticación aún está cargando, mostrar loading
  if (authLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const fetchShelves = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('user_id', user.id);

      if (error) throw error;
      setShelves(data || []);
    } catch (error) {
      console.error('Error fetching shelves:', error);
    }
  }, [user]);

  const fetchCollectionStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

                              // Obtener datos básicos de la colección con estadísticas de precios
      const { data: collectionData, error: collectionError } = await supabase
        .from('user_collection')
        .select(`
          album_id,
          added_at,
          albums (
            title,
            release_year,
            artist,
            label,
            cover_url,
            album_styles (styles (name)),
            album_stats (
              avg_price,
              low_price,
              high_price,
              want,
              have
            )
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      console.log('📊 Error de consulta:', collectionError);

      if (collectionError) {
        console.error('Error fetching collection:', collectionError);
        return;
      }

      if (!collectionData || collectionData.length === 0) {
        setStats({
          totalAlbums: 0,
          totalArtists: 0,
          totalLabels: 0,
          totalStyles: 0,
          oldestAlbum: 0,
          newestAlbum: 0,
          collectionValue: 0,
          topArtists: [],
          topLabels: [],
          topStyles: [],
          albumsByDecade: [],
          latestAlbums: [],
          mostExpensiveAlbums: [],
          highestRatioAlbums: [],
        });
        return;
      }

      console.log('📊 Datos de colección recibidos:', collectionData.length, 'álbumes');
      console.log('📊 Ejemplo de datos:', JSON.stringify(collectionData[0], null, 2));
      
      // Debug: Verificar estructura de datos
      if (collectionData.length > 0) {
        const firstAlbum = (collectionData[0] as any).albums;
        console.log('📊 Primer álbum completo:', firstAlbum);
        console.log('📊 Primer álbum - artist (directo):', firstAlbum?.artist);
        console.log('📊 Primer álbum - label (directo):', firstAlbum?.label);
        console.log('📊 Primer álbum - album_styles:', firstAlbum?.album_styles);
        
        // Verificar si hay datos en los campos directos
        if (firstAlbum?.artist) {
          console.log('📊 Primer artista (directo):', firstAlbum.artist);
        }
        if (firstAlbum?.label) {
          console.log('📊 Primer sello (directo):', firstAlbum.label);
        }
        if (firstAlbum?.album_styles) {
          console.log('📊 Primer estilo:', firstAlbum.album_styles[0]);
        }
      }

      // Procesar datos para estadísticas
      const artists = new Map<string, number>();
      const labels = new Map<string, number>();
      const styles = new Map<string, number>();
      const years: number[] = [];
      const decades = new Map<string, number>();

      collectionData.forEach((item: any) => {
        const album = item.albums;
        if (!album) return;

                          // Contar artistas (campo directo)
                  if (album.artist && album.artist.trim() !== '') {
                    const artistName = album.artist.trim();
                    artists.set(artistName, (artists.get(artistName) || 0) + 1);
                  }

                  // Contar sellos (campo directo)
                  if (album.label && album.label.trim() !== '') {
                    const labelName = album.label.trim();
                    labels.set(labelName, (labels.get(labelName) || 0) + 1);
                  }

                  // Contar estilos
                  if (album.album_styles && Array.isArray(album.album_styles) && album.album_styles.length > 0) {
                    album.album_styles.forEach((styleItem: any) => {
                      if (styleItem && styleItem.styles && styleItem.styles.name) {
                        const styleName = styleItem.styles.name;
                        styles.set(styleName, (styles.get(styleName) || 0) + 1);
                      }
                    });
                  }

                            // Años
                    if (album.release_year && !isNaN(Number(album.release_year))) {
                      const year = Number(album.release_year);
                      years.push(year);
                      const decade = Math.floor(year / 10) * 10;
                      const decadeLabel = `${decade}s`;
                      decades.set(decadeLabel, (decades.get(decadeLabel) || 0) + 1);
                    }
      });

      // Calcular estadísticas
      const totalAlbums = collectionData.length;
      const totalArtists = artists.size;
      const totalLabels = labels.size;
      const totalStyles = styles.size;

                        console.log('📊 Estadísticas calculadas:');
                  console.log('📊 Total álbumes:', totalAlbums);
                  console.log('📊 Total artistas únicos:', totalArtists);
                  console.log('📊 Total sellos únicos:', totalLabels);
                  console.log('📊 Total estilos únicos:', totalStyles);
                  console.log('📊 Artistas encontrados:', Array.from(artists.keys()));
                  console.log('📊 Sellos encontrados:', Array.from(labels.keys()));
                  console.log('📊 Estilos encontrados:', Array.from(styles.keys()));
                  console.log('📊 Años encontrados:', years);
                  console.log('📊 Décadas encontradas:', Array.from(decades.entries()));
                  
                  // Debug: Verificar algunos álbumes específicos
                  console.log('📊 Verificando álbumes con artistas...');
                  collectionData.slice(0, 5).forEach((item: any, index: number) => {
                    const album = item.albums;
                    if (album && album.artist && album.artist.trim() !== '') {
                      console.log(`📊 Álbum ${index + 1} con artista:`, album.title, album.artist);
                    }
                  });
                  
                  console.log('📊 Verificando álbumes con sellos...');
                  collectionData.slice(0, 5).forEach((item: any, index: number) => {
                    const album = item.albums;
                    if (album && album.label && album.label.trim() !== '') {
                      console.log(`📊 Álbum ${index + 1} con sello:`, album.title, album.label);
                    }
                  });
                        const oldestAlbum = years.length > 0 ? Math.min(...years) : 0;
                  const newestAlbum = years.length > 0 ? Math.max(...years) : 0;

      // Top 5 artistas
      const topArtists = Array.from(artists.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([artist, count]) => ({ artist, count }));

      // Top 5 sellos
      const topLabels = Array.from(labels.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([label, count]) => ({ label, count }));

      // Top 5 estilos
      const topStyles = Array.from(styles.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([style, count]) => ({ style, count }));

                        // Álbumes por década
                  const albumsByDecade = Array.from(decades.entries())
                    .sort((a, b) => {
                      const decadeA = parseInt(a[0].replace('s', ''));
                      const decadeB = parseInt(b[0].replace('s', ''));
                      return decadeA - decadeB;
                    })
                    .map(([decade, count]) => ({ decade, count }));

                  // Últimos 5 álbumes añadidos
                  const latestAlbums = collectionData
                    .slice(0, 5)
                    .map((item: any) => {
                      const album = item.albums;
                      if (!album) return null;
                      
                      return {
                        id: item.album_id, // Assuming album_id is the ID for navigation
                        title: album.title || 'Sin título',
                        artist: album.artist || 'Artista desconocido',
                        year: album.release_year || 'Año desconocido',
                        imageUrl: album.cover_url,
                        addedAt: new Date(item.added_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })
                      };
                    })
                    .filter(Boolean) as Array<{ id: string; title: string; artist: string; year: string; addedAt: string; imageUrl?: string }>;

                  // Top 5 discos más caros (por precio medio)
                  const mostExpensiveAlbums = collectionData
                    .map((item: any) => {
                      const album = item.albums;
                      if (!album || !album.album_stats || !album.album_stats.avg_price) return null;
                      
                      return {
                        id: item.album_id, // Assuming album_id is the ID for navigation
                        title: album.title || 'Sin título',
                        artist: album.artist || 'Artista desconocido',
                        price: album.album_stats.avg_price,
                        imageUrl: album.cover_url,
                      };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => b.price - a.price)
                    .slice(0, 5) as Array<{ id: string; title: string; artist: string; price: number; imageUrl?: string }>;

                  // Calcular valor total de la colección
                  const collectionValue = collectionData
                    .reduce((total: number, item: any) => {
                      const album = item.albums;
                      if (album && album.album_stats && album.album_stats.avg_price) {
                        return total + album.album_stats.avg_price;
                      }
                      return total;
                    }, 0);

                  console.log('💰 Valor total de la colección:', collectionValue.toFixed(2), '€');

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

                  // Top 5 discos con mayor ratio de venta
                  const highestRatioAlbums = collectionData
                    .map((item: any) => {
                      const album = item.albums;
                      if (!album || !album.album_stats || !album.album_stats.want || !album.album_stats.have) return null;
                      
                      const { ratio, level, color } = calculateSalesRatio(album.album_stats.want, album.album_stats.have);
                      
                      if (ratio === 0) return null; // Excluir los que no tienen datos
                      
                      return {
                        id: item.album_id,
                        title: album.title || 'Sin título',
                        artist: album.artist || 'Artista desconocido',
                        ratio,
                        level,
                        color,
                        want: album.album_stats.want,
                        have: album.album_stats.have,
                        imageUrl: album.cover_url,
                      };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => b.ratio - a.ratio)
                    .slice(0, 5) as Array<{ id: string; title: string; artist: string; ratio: number; level: string; color: string; want: number; have: number; imageUrl?: string }>;

                  console.log('📈 Álbumes con mayor ratio de venta:', highestRatioAlbums.length);

                  setStats({
                    totalAlbums,
                    totalArtists,
                    totalLabels,
                    totalStyles,
                    oldestAlbum,
                    newestAlbum,
                    collectionValue,
                    topArtists,
                    topLabels,
                    topStyles,
                    albumsByDecade,
                    latestAlbums,
                    mostExpensiveAlbums,
                    highestRatioAlbums,
                  });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadAlbumsWithAudio = useCallback(async () => {
    if (!user) return;

    try {
      const { data: collection, error } = await supabase
        .from('user_collection')
        .select(`
          id,
          audio_note,
          added_at,
          albums (
            title,
            artist,
            cover_url
          )
        `)
        .eq('user_id', user.id)
        .not('audio_note', 'is', null)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading albums with audio:', error);
        return;
      }

      const albumsData: AudioNoteAlbum[] = (collection || []).map((item: any) => ({
        id: item.id,
        title: item.albums?.title || 'Sin título',
        artist: item.albums?.artist || 'Artista desconocido',
        cover_url: item.albums?.cover_url,
        audio_note: item.audio_note,
        added_at: item.added_at,
      }));

      setAlbumsWithAudio(albumsData);
      console.log('🎤 Albums with audio loaded:', albumsData.length);

    } catch (error) {
      console.error('Error processing audio albums:', error);
    }
  }, [user]);

  const handlePlayAudio = async (audioUri: string, albumTitle: string) => {
    try {
      setFloatingAudioUri(audioUri);
      setFloatingAlbumTitle(albumTitle);
      setShowFloatingPlayer(true);
    } catch (error) {
      console.error('Error playing audio:', error);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollectionStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCollectionStats();
    fetchShelves();
    loadAlbumsWithAudio();
  }, [user, fetchCollectionStats, fetchShelves, loadAlbumsWithAudio]);

  useFocusEffect(
    useCallback(() => {
      fetchShelves();
    }, [fetchShelves])
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error al cargar las estadísticas</Text>
      </View>
    );
  }

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const TopList = ({ title, data, keyName }: { title: string; data: any[]; keyName: string }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listItemText}>{item[keyName]}</Text>
          <Text style={styles.listItemCount}>{item.count}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Rango de Coleccionista */}
      <CollectorRankCard totalAlbums={stats.totalAlbums} collectionValue={stats.collectionValue} />
      
      {/* Valor de la colección */}
      {stats.collectionValue > 0 && (
        <View style={styles.valueCard}>
          <Text style={styles.valueCardTitle}>Valor de tu Colección</Text>
          <Text style={styles.valueCardAmount}>
            {stats.collectionValue.toFixed(2)} €
          </Text>
          <Text style={styles.valueCardSubtitle}>
            Basado en precios medios de Discogs
          </Text>
        </View>
      )}

      {/* Estadísticas Básicas */}
      <View style={styles.statsGrid}>
        <StatCard title="Total Álbumes" value={stats.totalAlbums} />
        <StatCard title="Artistas Únicos" value={stats.totalArtists} />
        <StatCard title="Sellos Únicos" value={stats.totalLabels} />
        <StatCard title="Estilos Únicos" value={stats.totalStyles} />
        <StatCard title="Álbum Más Antiguo" value={stats.oldestAlbum} />
        <StatCard title="Álbum Más Nuevo" value={stats.newestAlbum} />
      </View>

      {/* Sección de IA */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Asistente IA</Text>
        <TouchableOpacity 
          style={styles.aiCard}
          onPress={() => (navigation as any).navigate('AIChat')}
        >
          <View style={styles.aiCardContent}>
            <View style={styles.aiIconContainer}>
              <Ionicons name="chatbubble-ellipses" size={24} color="#007AFF" />
            </View>
            <View style={styles.aiTextContainer}>
              <Text style={styles.aiTitle}>Analiza tu Colección</Text>
              <Text style={styles.aiSubtitle}>Haz preguntas sobre tus discos y obtén insights inteligentes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Sección de Estantería */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mis Estanterías</Text>
        <View style={styles.shelfStatContainer}>
          <Text style={styles.shelfStatNumber}>{shelves.length}</Text>
          <Text style={styles.shelfStatText}>Estanterías Creadas</Text>
        </View>
        <TouchableOpacity 
          style={styles.configButton}
          onPress={() => (navigation as any).navigate('ShelvesList')}
        >
          <Ionicons name="grid-outline" size={20} color="#fff" />
          <Text style={styles.configButtonText}>
            Gestionar Estanterías
          </Text>
        </TouchableOpacity>
      </View>

      {/* Álbumes más caros */}
      {stats.mostExpensiveAlbums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Álbumes Más Caros</Text>
          {stats.mostExpensiveAlbums.map((album, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.albumItem}
              onPress={() => (navigation as any).navigate('AlbumDetail', { albumId: album.id })}
            >
              <View style={styles.albumImageContainer}>
                {album.imageUrl ? (
                  <Image 
                    source={{ uri: album.imageUrl }} 
                    style={styles.albumImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumImagePlaceholder}>
                    <Text style={styles.albumImagePlaceholderText}>Sin imagen</Text>
                  </View>
                )}
              </View>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumArtist}>{album.artist}</Text>
                <Text style={styles.albumPrice}>
                  {album.price ? `${album.price.toFixed(2)} €` : 'Precio no disponible'}
                </Text>
              </View>
              <View style={styles.albumRank}>
                <Text style={styles.albumRankText}>#{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Álbumes con mayor ratio de venta */}
      {stats.highestRatioAlbums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Discos con Mayor Ratio de Venta</Text>
          <Text style={styles.sectionSubtitle}>
            Basado en la relación entre demanda (want) y disponibilidad (have) en Discogs
          </Text>
          {stats.highestRatioAlbums.map((album, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.albumItem}
              onPress={() => (navigation as any).navigate('AlbumDetail', { albumId: album.id })}
            >
              <View style={styles.albumImageContainer}>
                {album.imageUrl ? (
                  <Image 
                    source={{ uri: album.imageUrl }} 
                    style={styles.albumImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumImagePlaceholder}>
                    <Text style={styles.albumImagePlaceholderText}>Sin imagen</Text>
                  </View>
                )}
              </View>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumArtist}>{album.artist}</Text>
                <View style={styles.ratioContainer}>
                  <View style={[styles.ratioLevelBadge, { backgroundColor: album.color }]}>
                    <Text style={styles.ratioLevelText}>{album.level}</Text>
                  </View>
                  <Text style={styles.ratioText}>
                    Ratio: {album.ratio.toFixed(1)}
                  </Text>
                </View>
                <Text style={styles.ratioStats}>
                  Want: {album.want} • Have: {album.have}
                </Text>
              </View>
              <View style={styles.albumRank}>
                <Text style={styles.albumRankText}>#{index + 1}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Sección de Notas de Audio */}
      {albumsWithAudio.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notas de Audio ({albumsWithAudio.length})</Text>
          {albumsWithAudio.map((album, index) => (
            <TouchableOpacity 
              key={album.id} 
              style={styles.albumItem}
              onPress={() => handlePlayAudio(album.audio_note, album.title)}
            >
              <View style={styles.albumImageContainer}>
                {album.cover_url ? (
                  <Image 
                    source={{ uri: album.cover_url }} 
                    style={styles.albumImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumImagePlaceholder}>
                    <Text style={styles.albumImagePlaceholderText}>Sin imagen</Text>
                  </View>
                )}
              </View>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumArtist}>{album.artist}</Text>
                <Text style={styles.albumDate}>
                  {formatDate(album.added_at)}
                </Text>
              </View>
              <View style={styles.albumRank}>
                <Ionicons name="play" size={16} color="white" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Top Artistas */}
      {stats.topArtists.length > 0 && (
        <TopItemsLineChart 
          data={stats.topArtists} 
          title="Top 5 Artistas" 
          keyName="artist" 
          icon="people" 
        />
      )}

      {/* Top Sellos */}
      {stats.topLabels.length > 0 && (
        <TopItemsLineChart 
          data={stats.topLabels} 
          title="Top 5 Sellos" 
          keyName="label" 
          icon="business" 
        />
      )}

      {/* Top Estilos */}
      {stats.topStyles.length > 0 && (
        <TopItemsLineChart 
          data={stats.topStyles} 
          title="Top 5 Estilos" 
          keyName="style" 
          icon="musical-notes" 
        />
      )}

      {/* Álbumes por Década */}
      {stats.albumsByDecade.length > 0 && (
        <TopItemsLineChart 
          data={stats.albumsByDecade} 
          title="Álbumes por Década" 
          keyName="decade" 
          icon="calendar" 
        />
      )}

      {/* Últimos Álbumes Añadidos */}
      {stats.latestAlbums.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Últimos 5 Álbumes Añadidos</Text>
          {stats.latestAlbums.map((album, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.albumItem}
              onPress={() => (navigation as any).navigate('AlbumDetail', { albumId: album.id })}
            >
              <View style={styles.albumImageContainer}>
                {album.imageUrl ? (
                  <Image 
                    source={{ uri: album.imageUrl }} 
                    style={styles.albumImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.albumImagePlaceholder}>
                    <Text style={styles.albumImagePlaceholderText}>Sin imagen</Text>
                  </View>
                )}
              </View>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumArtist}>{album.artist}</Text>
                <Text style={styles.albumYear}>{album.year}</Text>
              </View>
              <Text style={styles.albumDate}>{album.addedAt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mensaje si no hay datos */}
      {stats.totalAlbums === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No tienes álbumes en tu colección</Text>
          <Text style={styles.emptySubtext}>Añade algunos álbumes para ver estadísticas</Text>
        </View>
      )}

      {/* Reproductor flotante */}
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
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
    fontSize: 16,
    color: '#dc3545',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    gap: 10,
  },
  statCard: {
    flex: 1,
    minWidth: (width - 40) / 2,
    backgroundColor: '#fff',
    borderRadius: 4,
    padding: 16,
    alignItems: 'center',
    
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
   
   
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  listItemText: {
    fontSize: 16,
    color: '#495057',
    flex: 1,
  },
  listItemCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 8,
  },
                emptySubtext: {
                fontSize: 14,
                color: '#adb5bd',
                textAlign: 'center',
              },
              albumItem: {
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#f1f3f4',
              },
              albumInfo: {
                flex: 1,
                marginRight: 12,
              },
              albumTitle: {
                fontSize: 16,
                fontWeight: '600',
                color: '#212529',
                marginBottom: 2,
              },
              albumArtist: {
                fontSize: 14,
                color: '#495057',
                marginBottom: 2,
              },
              albumYear: {
                fontSize: 12,
                color: '#6c757d',
              },
              albumDate: {
                fontSize: 12,
                color: '#007AFF',
                fontWeight: '500',
              },
              albumImageContainer: {
                width: 80,
                height: 80,
                marginRight: 12,
                borderRadius: 6,
                overflow: 'hidden',
              },
              albumImage: {
                width: '100%',
                height: '100%',
              },
              albumImagePlaceholder: {
                width: '100%',
                height: '100%',
                backgroundColor: '#e9ecef',
                justifyContent: 'center',
                alignItems: 'center',
              },
              albumImagePlaceholderText: {
                fontSize: 10,
                color: '#6c757d',
                textAlign: 'center',
              },
              albumPrice: {
                fontSize: 14,
                fontWeight: 'bold',
                color: '#28a745',
              },
              albumRank: {
                backgroundColor: '#007AFF',
                borderRadius: 12,
                width: 24,
                height: 24,
                justifyContent: 'center',
                alignItems: 'center',
              },
              albumRankText: {
                fontSize: 12,
                fontWeight: 'bold',
                color: 'white',
              },
              valueCard: {
                backgroundColor: '#007AFF',
                borderRadius: 12,
                padding: 20,
                margin: 16,
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
                fontSize: 16,
                fontWeight: '600',
                color: 'white',
                marginBottom: 8,
              },
              valueCardAmount: {
                fontSize: 32,
                fontWeight: 'bold',
                color: 'white',
                marginBottom: 4,
              },
              valueCardSubtitle: {
                fontSize: 12,
                color: 'rgba(255, 255, 255, 0.8)',
                textAlign: 'center',
              },
              aiCard: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: '#f0f7ff',
                borderRadius: 12,
                padding: 16,
                margin: 16,
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 3,
              },
              aiCardContent: {
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
              },
              aiIconContainer: {
                marginRight: 12,
                padding: 8,
                backgroundColor: '#e0f2fe',
                borderRadius: 10,
              },
              aiTextContainer: {
                flex: 1,
              },
              aiTitle: {
                fontSize: 16,
                fontWeight: '600',
                color: '#212529',
                marginBottom: 4,
              },
              aiSubtitle: {
                fontSize: 12,
                color: '#6c757d',
              },
              emptyShelfText: {
                fontSize: 14,
                color: '#6c757d',
                textAlign: 'center',
                marginTop: 8,
                marginBottom: 16,
                lineHeight: 20,
              },
              configButton: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#007AFF',
                borderRadius: 8,
                paddingVertical: 12,
                marginTop: 16,
                gap: 8,
              },
              configButtonText: {
                color: '#fff',
                fontSize: 16,
                fontWeight: '600',
              },
  shelfStatContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  shelfStatNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  shelfStatText: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratioLevelBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    marginRight: 8,
  },
  ratioLevelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  ratioText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212529',
  },
  ratioStats: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
}); 