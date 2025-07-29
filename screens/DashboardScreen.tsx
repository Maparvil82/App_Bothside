import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface CollectionStats {
  totalAlbums: number;
  totalArtists: number;
  totalLabels: number;
  totalStyles: number;
  oldestAlbum: number;
  newestAlbum: number;
  topArtists: Array<{ artist: string; count: number }>;
  topLabels: Array<{ label: string; count: number }>;
  topStyles: Array<{ style: string; count: number }>;
  albumsByDecade: Array<{ decade: string; count: number }>;
  latestAlbums: Array<{ title: string; artist: string; year: string; addedAt: string; imageUrl?: string }>;
  mostExpensiveAlbums: Array<{ title: string; artist: string; price: number; imageUrl?: string }>;
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCollectionStats = async () => {
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
              high_price
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
          topArtists: [],
          topLabels: [],
          topStyles: [],
          albumsByDecade: [],
          latestAlbums: [],
          mostExpensiveAlbums: [],
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
                    .filter(Boolean) as Array<{ title: string; artist: string; year: string; addedAt: string; imageUrl?: string }>;

                  // Top 5 discos más caros (por precio medio)
                  const mostExpensiveAlbums = collectionData
                    .map((item: any) => {
                      const album = item.albums;
                      if (!album || !album.album_stats || !album.album_stats.avg_price) return null;
                      
                      return {
                        title: album.title || 'Sin título',
                        artist: album.artist || 'Artista desconocido',
                        price: album.album_stats.avg_price,
                        imageUrl: album.cover_url
                      };
                    })
                    .filter(Boolean)
                    .sort((a: any, b: any) => b.price - a.price)
                    .slice(0, 5) as Array<{ title: string; artist: string; price: number; imageUrl?: string }>;

                  setStats({
                    totalAlbums,
                    totalArtists,
                    totalLabels,
                    totalStyles,
                    oldestAlbum,
                    newestAlbum,
                    topArtists,
                    topLabels,
                    topStyles,
                    albumsByDecade,
                    latestAlbums,
                    mostExpensiveAlbums,
                  });

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCollectionStats();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchCollectionStats();
  }, [user]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Estadísticas de tu colección</Text>
      </View>

      {/* Estadísticas principales */}
      <View style={styles.statsGrid}>
        <StatCard title="Total Álbumes" value={stats.totalAlbums} />
        <StatCard title="Artistas Únicos" value={stats.totalArtists} />
        <StatCard title="Sellos Únicos" value={stats.totalLabels} />
        <StatCard title="Estilos Únicos" value={stats.totalStyles} />
      </View>

                        {/* Años */}
                  <View style={styles.statsGrid}>
                    <StatCard 
                      title="Álbum Más Antiguo" 
                      value={stats.oldestAlbum} 
                      subtitle={stats.oldestAlbum > 0 ? "Año más antiguo" : "Sin datos"}
                    />
                    <StatCard 
                      title="Álbum Más Nuevo" 
                      value={stats.newestAlbum} 
                      subtitle={stats.newestAlbum > 0 ? "Año más reciente" : "Sin datos"}
                    />
                  </View>

      {/* Top Artistas */}
      {stats.topArtists.length > 0 && (
        <TopList title="Top 5 Artistas" data={stats.topArtists} keyName="artist" />
      )}

      {/* Top Sellos */}
      {stats.topLabels.length > 0 && (
        <TopList title="Top 5 Sellos" data={stats.topLabels} keyName="label" />
      )}

      {/* Top Estilos */}
      {stats.topStyles.length > 0 && (
        <TopList title="Top 5 Estilos" data={stats.topStyles} keyName="style" />
      )}

                        {/* Últimos Álbumes Añadidos */}
                  {stats.latestAlbums.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Últimos 5 Álbumes Añadidos</Text>
                      {stats.latestAlbums.map((album, index) => (
                        <View key={index} style={styles.albumItem}>
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
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Top 5 Discos Más Caros */}
                  {stats.mostExpensiveAlbums.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Top 5 Discos Más Caros</Text>
                      {stats.mostExpensiveAlbums.map((album, index) => (
                        <View key={index} style={styles.albumItem}>
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
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Álbumes por Década */}
                  {stats.albumsByDecade.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>Álbumes por Década</Text>
                      {stats.albumsByDecade.map((item, index) => (
                        <View key={index} style={styles.listItem}>
                          <Text style={styles.listItemText}>{item.decade}</Text>
                          <Text style={styles.listItemCount}>{item.count}</Text>
                        </View>
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
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
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
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 12,
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
            }); 