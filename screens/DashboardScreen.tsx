import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Image,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useStats } from '../contexts/StatsContext';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { AudioNotesSection } from '../components/AudioNotesSection';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { TopItemsLineChart } from '../components/TopItemsLineChart';
import ShelfGrid from '../components/ShelfGrid';
import { CollectorRankCard } from '../components/CollectorRankCard';
import { SessionEarningsSection } from '../components/SessionEarningsSection';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENABLE_AUDIO_SCAN } from '../config/features';
import { BothsideLoader } from '../components/BothsideLoader';
import { useTranslation } from '../src/i18n/useTranslation';

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
  oldestAlbum: number | null;
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

const extractAlbumStats = (album: any) => {
  if (!album) return null;
  const stats = album.album_stats;
  if (Array.isArray(stats) && stats.length > 0) {
    return stats[0];
  }
  return stats || null;
};

export default function DashboardScreen() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [albumsWithAudio, setAlbumsWithAudio] = useState<AudioNoteAlbum[]>([]);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');
  const [userPosition, setUserPosition] = useState<number | null>(null);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const [showSessionEarnings, setShowSessionEarnings] = useState<boolean>(false);
  const { t } = useTranslation();

  const handleAudioScan = () => {
    (navigation as any).navigate('AudioScan');
  };

  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [activeChartIndex, setActiveChartIndex] = useState(0);

  const handleScroll = (event: any) => {
    // Usamos width - 16 porque es el tamaño del item (width - 32) + el gap (16)
    const slideSize = width - 16;
    const index = event.nativeEvent.contentOffset.x / slideSize;
    const roundIndex = Math.round(index);
    setActiveChartIndex(roundIndex);
  };

  // Si la autenticación aún está cargando, mostrar loading
  if (authLoading) {
    return <BothsideLoader />;
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
          oldestAlbum: null,
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
          if (year > 0) {
            years.push(year);
            const decade = Math.floor(year / 10) * 10;
            const decadeLabel = `${decade}s`;
            decades.set(decadeLabel, (decades.get(decadeLabel) || 0) + 1);
          }
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
      const oldestAlbum = years.length > 0 ? Math.min(...years) : null;
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
            title: album.title || t('common_untitled'),
            artist: album.artist || t('common_unknown_artist'),
            year: album.release_year || t('common_unknown_year'),
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
          const stats = extractAlbumStats(album);
          if (!album || !stats || !stats.avg_price) return null;

          return {
            id: item.album_id, // Assuming album_id is the ID for navigation
            title: album.title || t('common_untitled'),
            artist: album.artist || t('common_unknown_artist'),
            price: stats.avg_price,
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
          const stats = extractAlbumStats(album);
          if (album && stats && stats.avg_price) {
            return total + stats.avg_price;
          }
          return total;
        }, 0);

      console.log('💰 Valor total de la colección:', collectionValue.toFixed(2), '€');

      // Función para calcular el ratio de venta
      const calculateSalesRatio = (want: number, have: number): { ratio: number; level: string; color: string } => {
        if (!want || !have || have === 0) {
          return { ratio: 0, level: t('dashboard_ratio_level_no_data'), color: '#6c757d' };
        }

        const ratio = want / have;

        // Ratio alto = más demanda que disponibilidad = MEJOR
        if (ratio >= 25) {
          return { ratio, level: t('dashboard_ratio_level_exceptional'), color: '#6f42c1' };
        } else if (ratio >= 8 && ratio < 25) {
          return { ratio, level: t('dashboard_ratio_level_high'), color: '#28a745' };
        } else if (ratio >= 2 && ratio < 8) {
          return { ratio, level: t('dashboard_ratio_level_medium'), color: '#ffc107' };
        } else {
          return { ratio, level: t('dashboard_ratio_level_low'), color: '#dc3545' };
        }
      };

      // Top 5 discos con mayor ratio de venta
      const highestRatioAlbums = collectionData
        .map((item: any) => {
          const album = item.albums;
          const stats = extractAlbumStats(album);
          if (!album || !stats || !stats.want || !stats.have) return null;

          const { ratio, level, color } = calculateSalesRatio(stats.want, stats.have);

          if (ratio === 0) return null; // Excluir los que no tienen datos

          return {
            id: item.album_id,
            title: album.title || t('common_untitled'),
            artist: album.artist || t('common_unknown_artist'),
            ratio,
            level,
            color,
            want: stats.want,
            have: stats.have,
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

      // Fetch user position after stats are loaded
      fetchUserPosition();

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
        title: item.albums?.title || t('common_untitled'),
        artist: item.albums?.artist || t('common_unknown_artist'),
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

  const fetchUserPosition = useCallback(async () => {
    if (!user?.id || !stats) return;

    try {
      // Get all users with their collection stats
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, username')
        .not('username', 'is', null);

      if (error) throw error;

      const usersWithStats = await Promise.all(
        profiles.map(async (profile) => {
          const { data: collection } = await supabase
            .from('user_collection')
            .select(`
              album_id,
              albums!inner (
                album_stats (
                  avg_price
                )
              )
            `)
            .eq('user_id', profile.id);

          const totalAlbums = collection?.length || 0;
          const collectionValue = collection?.reduce((sum, item) => {
            const stats = extractAlbumStats(item.albums);
            const avgPrice = stats?.avg_price;
            return sum + (avgPrice || 0);
          }, 0) || 0;

          return {
            id: profile.id,
            totalAlbums,
            collectionValue,
          };
        })
      );

      // Sort by collection value, then by total albums
      const sortedUsers = usersWithStats
        .sort((a, b) => {
          if (b.collectionValue !== a.collectionValue) {
            return b.collectionValue - a.collectionValue;
          }
          return b.totalAlbums - a.totalAlbums;
        });

      // Find current user's position
      const position = sortedUsers.findIndex(u => u.id === user.id) + 1;
      setUserPosition(position > 0 ? position : null);

    } catch (error) {
      console.error('Error fetching user position:', error);
      setUserPosition(null);
    }
  }, [user?.id, stats]);

  // Cargar preferencia de mostrar ganancias de sesiones
  useEffect(() => {
    (async () => {
      try {
        const earningsPref = await AsyncStorage.getItem('settings:showSessionEarnings');
        setShowSessionEarnings(earningsPref === 'true'); // Default false
      } catch (error) {
        console.error('Error loading session earnings setting:', error);
      }
    })();
  }, []);

  useEffect(() => {
    fetchCollectionStats();
    fetchShelves();
    loadAlbumsWithAudio();
  }, [user, fetchCollectionStats, fetchShelves, loadAlbumsWithAudio]);

  useFocusEffect(
    useCallback(() => {
      fetchShelves();
      // Recargar preferencia de mostrar ganancias cuando se vuelve a la pantalla
      (async () => {
        try {
          const earningsPref = await AsyncStorage.getItem('settings:showSessionEarnings');
          setShowSessionEarnings(earningsPref === 'true');
        } catch (error) {
          console.error('Error loading session earnings setting:', error);
        }
      })();
    }, [fetchShelves])
  );

  if (loading) {
    return <BothsideLoader />;
  }

  if (!stats) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{t('dashboard_error_loading_stats')}</Text>
      </View>
    );
  }

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <View style={[styles.statCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.statValue, { color: colors.primary }]}>{value}</Text>
      <Text style={[styles.statTitle, { color: colors.text }]}>{title}</Text>
      {subtitle && <Text style={[styles.statSubtitle, { color: colors.text }]}>{subtitle}</Text>}
    </View>
  );

  const TopList = ({ title, data, keyName }: { title: string; data: any[]; keyName: string }) => (
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {data.map((item, index) => (
        <View key={index} style={[styles.listItem, { borderBottomColor: colors.border }]}>
          <Text style={[styles.listItemText, { color: colors.text }]}>{item[keyName]}</Text>
          <Text style={[styles.listItemCount, { color: colors.primary }]}>{item.count}</Text>
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Ganancias de sesiones (primera card) */}
        {showSessionEarnings && <SessionEarningsSection />}

        {/* Valor de la colección */}
        {/* Valor de la colección */}
        {stats.collectionValue > 0 && (
          <View style={[styles.valueCard, { backgroundColor: '#0A84FF' }]}>
            <Text style={styles.valueCardTitle}>{t('dashboard_collection_value_title')}</Text>
            <Text style={styles.valueCardAmount}>
              {stats.collectionValue.toFixed(2)} €
            </Text>
            <Text style={styles.valueCardSubtitle}>
              {t('dashboard_collection_value_subtitle')}
            </Text>
          </View>
        )}

        {/* Estadísticas Básicas */}
        <View style={styles.statsGrid}>
          <StatCard title={t('dashboard_stat_total_albums')} value={stats.totalAlbums} />
          <StatCard title={t('dashboard_stat_unique_artists')} value={stats.totalArtists} />
          <StatCard title={t('dashboard_stat_unique_labels')} value={stats.totalLabels} />
          <StatCard title={t('dashboard_stat_unique_styles')} value={stats.totalStyles} />
          <StatCard title={t('dashboard_stat_oldest_album')} value={stats.oldestAlbum ?? '—'} />
          <StatCard title={t('dashboard_stat_newest_album')} value={stats.newestAlbum} />
        </View>

        {/* Rango de Coleccionista */}
        <CollectorRankCard
          totalAlbums={stats.totalAlbums}
          collectionValue={stats.collectionValue}
          onPress={() => (navigation as any).navigate('Leaderboard')}
          userPosition={userPosition || undefined}
        />

        {/* Sección de Ubicaciones */}
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard_shelves_title')}</Text>
          <View style={styles.shelfStatContainer}>
            <Text style={[styles.shelfStatNumber, { color: colors.primary }]}>{shelves.length}</Text>
            <Text style={[styles.shelfStatText, { color: colors.text }]}>{t('dashboard_shelves_created')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.configButton, { backgroundColor: primaryColor }]}
            onPress={() => (navigation as any).navigate('ShelvesList')}
          >
            <Ionicons name="grid-outline" size={20} color="#fff" />
            <Text style={styles.configButtonText}>
              {t('dashboard_shelves_manage')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Álbumes más caros */}
        {stats.mostExpensiveAlbums.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard_most_expensive_title')}</Text>
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
                      <Text style={styles.albumImagePlaceholderText}>{t('common_no_image')}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle}>{album.title}</Text>
                  <Text style={styles.albumArtist}>{album.artist}</Text>
                  <Text style={styles.albumPrice}>
                    {album.price ? `${album.price.toFixed(2)} €` : t('dashboard_price_unavailable')}
                  </Text>
                </View>
                <View style={[styles.albumRank, { backgroundColor: primaryColor }]}>
                  <Text style={styles.albumRankText}>#{index + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Álbumes con mayor ratio de venta */}
        {stats.highestRatioAlbums.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard_highest_ratio_title')}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.text }]}>
              {t('dashboard_highest_ratio_subtitle')}
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
                      <Text style={styles.albumImagePlaceholderText}>{t('common_no_image')}</Text>
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
                      {t('dashboard_ratio_label')} {album.ratio.toFixed(1)}
                    </Text>
                  </View>
                  <Text style={styles.ratioStats}>
                    {t('dashboard_ratio_want')} {album.want} • {t('dashboard_ratio_have')} {album.have}
                  </Text>
                </View>
                <View style={[styles.albumRank, { backgroundColor: primaryColor }]}>
                  <Text style={styles.albumRankText}>#{index + 1}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Sección de Notas de Audio */}
        {albumsWithAudio.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard_audio_notes_title')}</Text>
            {albumsWithAudio.slice(0, 5).map((album, index) => (
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
                      <Text style={styles.albumImagePlaceholderText}>{t('common_no_image')}</Text>
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

        {/* Gráficas en scroll horizontal */}
        {(stats.topArtists.length > 0 || stats.topLabels.length > 0 || stats.topStyles.length > 0 || stats.albumsByDecade.length > 0) && (
          <View style={styles.chartsSection}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartsScrollContainer}
              decelerationRate="fast"
              snapToInterval={width - 16} // Ancho del item (width-32) + margen derecho (16)
              pagingEnabled={false} // Desactivamos paging estricto para permitir gaps
              onScroll={handleScroll}
              scrollEventThrottle={16}
            >
              {stats.topArtists.length > 0 && (
                <View style={styles.chartItem}>
                  <TopItemsLineChart
                    data={stats.topArtists}
                    title={t('dashboard_chart_top_artists')}
                    keyName="artist"
                    icon="people"
                  />
                </View>
              )}

              {stats.topLabels.length > 0 && (
                <View style={styles.chartItem}>
                  <TopItemsLineChart
                    data={stats.topLabels}
                    title={t('dashboard_chart_top_labels')}
                    keyName="label"
                    icon="business"
                  />
                </View>
              )}

              {stats.topStyles.length > 0 && (
                <View style={styles.chartItem}>
                  <TopItemsLineChart
                    data={stats.topStyles}
                    title={t('dashboard_chart_top_styles')}
                    keyName="style"
                    icon="musical-notes"
                  />
                </View>
              )}

              {stats.albumsByDecade.length > 0 && (
                <View style={styles.chartItem}>
                  <TopItemsLineChart
                    data={stats.albumsByDecade}
                    title={t('dashboard_chart_albums_by_decade')}
                    keyName="decade"
                    icon="calendar"
                  />
                </View>
              )}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {[0, 1, 2, 3].map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeChartIndex ? styles.paginationDotActive : styles.paginationDotInactive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Últimos Álbumes Añadidos */}
        {stats.latestAlbums.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.card }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('dashboard_latest_albums_title')}</Text>
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
                      <Text style={styles.albumImagePlaceholderText}>{t('common_no_image')}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.albumInfo}>
                  <Text style={styles.albumTitle}>{album.title}</Text>
                  <Text style={styles.albumArtist}>{album.artist}</Text>
                  <Text style={styles.albumYear}>{album.year}</Text>
                </View>
                <Text style={[styles.albumDate, { color: primaryColor }]}>{album.addedAt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Botón ¿Qué está sonando? */}
        {ENABLE_AUDIO_SCAN && (
          <View style={styles.audioScanContainer}>
            <TouchableOpacity
              style={styles.audioScanButton}
              onPress={handleAudioScan}
              activeOpacity={0.7}
            >
              <View style={styles.audioScanContent}>
                <Ionicons name="musical-notes" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                <View>
                  <Text style={[styles.audioScanTitle, { color: colors.text }]}>{t('dashboard_audio_scan_title')}</Text>
                  <Text style={styles.audioScanSubtitle}>{t('dashboard_audio_scan_subtitle')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Mensaje si no hay datos */}
        {stats.totalAlbums === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{t('dashboard_empty_title')}</Text>
            <Text style={styles.emptySubtext}>{t('dashboard_empty_subtitle')}</Text>
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

      {/* Botón flotante de IA */}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statCard: {
    width: '50%',
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5E5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  statSubtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.7,
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 18,
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
    fontSize: 15,
    flex: 1,
  },
  listItemCount: {
    fontSize: 15,
    fontWeight: 'bold',
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  albumInfo: {
    flex: 1,
    marginRight: 10,
  },
  albumTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: 13,
    color: '#495057',
    marginBottom: 2,
  },
  albumYear: {
    fontSize: 11,
    color: '#6c757d',
  },
  albumDate: {
    fontSize: 11,
    color: AppColors.primary,
    fontWeight: '500',
  },
  albumImageContainer: {
    width: 70,
    height: 70,
    marginRight: 10,
    borderRadius: 4,
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
    fontSize: 9,
    color: '#6c757d',
    textAlign: 'center',
  },
  albumPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#28a745',
  },
  albumRank: {
    backgroundColor: AppColors.primary,
    borderRadius: 12,
    width: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumRankText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  valueCard: {
    backgroundColor: AppColors.primary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  valueCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: 'white',
    marginBottom: 6,
  },
  valueCardAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  valueCardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  emptyShelfText: {
    fontSize: 13,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    lineHeight: 18,
  },
  configButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 12,
    gap: 6,
  },
  configButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  shelfStatContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  shelfStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  shelfStatText: {
    fontSize: 13,
    color: '#6c757d',
    marginTop: 4,
  },
  ratioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  ratioLevelBadge: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 10,
    marginRight: 6,
  },
  ratioLevelText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: 'white',
  },
  ratioText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#212529',
  },
  ratioStats: {
    fontSize: 11,
    color: '#6c757d',
    marginTop: 3,
  },
  // Styles update:
  chartsSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  chartsScrollContainer: {
    paddingHorizontal: 16, // Margen lateral para alinear con el resto
  },
  chartItem: {
    width: width - 32, // Ancho total menos márgenes (16*2)
    marginRight: 16, // Gap entre gráficas
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paginationDotActive: {
    backgroundColor: '#ffffffff',
    width: 24, // Alargado para indicar activo
  },
  paginationDotInactive: {
    backgroundColor: '#E5E5E5',
  },

  audioScanContainer: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24,
  },
  audioScanButton: {
    backgroundColor: '#F3F4F6', // Fondo suave
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  audioScanContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 12,
  },
  audioScanTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  audioScanSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
}); 