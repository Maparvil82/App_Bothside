import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { DiscogsService } from '../services/discogs';
import { DiscogsRelease } from '../types';
import { AlbumService, UserCollectionService } from '../services/database';
import { Ionicons } from '@expo/vector-icons';

export const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [collection, setCollection] = useState<any[]>([]);
  const [collectionLoading, setCollectionLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'year' | 'artist' | 'label'>('date');
  const [filterByStyle, setFilterByStyle] = useState<string>('');
  const [filterByYear, setFilterByYear] = useState<string>('');
  const [filterByLabel, setFilterByLabel] = useState<string>('');
  const [filterByArtist, setFilterByArtist] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  useEffect(() => {
    sortCollection();
  }, [collection, sortBy, filterByStyle, filterByYear, filterByLabel, filterByArtist]);

  const loadCollection = async () => {
    if (!user) return;
    
    setCollectionLoading(true);
    try {
      const userCollection = await UserCollectionService.getUserCollection(user.id);
      setCollection(userCollection || []);
    } catch (error) {
      console.error('Error loading collection:', error);
      Alert.alert('Error', 'No se pudo cargar la colección');
    } finally {
      setCollectionLoading(false);
    }
  };

  const sortCollection = () => {
    let sorted = [...collection];
    
    // Filtrar por estilo si hay filtro activo
    if (filterByStyle) {
      sorted = sorted.filter(item => 
        item.albums?.album_styles && 
        item.albums.album_styles.some((as: any) => 
          as.styles?.name === filterByStyle
        )
      );
    }

    // Filtrar por año si hay filtro activo
    if (filterByYear) {
      sorted = sorted.filter(item => 
        item.albums?.release_year === filterByYear
      );
    }

    // Filtrar por sello si hay filtro activo
    if (filterByLabel) {
      sorted = sorted.filter(item => 
        item.albums?.label === filterByLabel
      );
    }

    // Filtrar por artista si hay filtro activo
    if (filterByArtist) {
      sorted = sorted.filter(item => 
        item.albums?.artist === filterByArtist
      );
    }
    
    // Ordenar
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
        break;
      case 'year':
        sorted.sort((a, b) => {
          const yearA = parseInt(a.albums?.release_year || '0');
          const yearB = parseInt(b.albums?.release_year || '0');
          return yearB - yearA;
        });
        break;
      case 'artist':
        sorted.sort((a, b) => (a.albums?.artist || '').localeCompare(b.albums?.artist || ''));
        break;
      case 'label':
        sorted.sort((a, b) => (a.albums?.label || '').localeCompare(b.albums?.label || ''));
        break;
    }
    
    setFilteredCollection(sorted);
  };

  const handleSortChange = (newSortBy: 'date' | 'year' | 'artist' | 'label') => {
    setSortBy(newSortBy);
  };

  const handleStyleFilterChange = (style: string) => {
    setFilterByStyle(style === filterByStyle ? '' : style);
  };

  const handleYearFilterChange = (year: string) => {
    setFilterByYear(year === filterByYear ? '' : year);
  };

  const handleLabelFilterChange = (label: string) => {
    setFilterByLabel(label === filterByLabel ? '' : label);
  };

  const handleArtistFilterChange = (artist: string) => {
    setFilterByArtist(artist === filterByArtist ? '' : artist);
  };

  const searchReleases = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const response = await DiscogsService.searchReleases(query);
      setReleases(response.results || []);
    } catch (error) {
      console.error('Error searching releases:', error);
      Alert.alert('Error', 'No se pudo buscar álbumes');
    } finally {
      setLoading(false);
    }
  };

  const addToCollection = async (release: DiscogsRelease) => {
    if (!user) return;
    try {
      const albumData = {
        title: release.title,
        artist: release.artists?.[0]?.name || 'Unknown Artist',
        release_year: release.year?.toString() || '',
        label: '',
        genre: release.genres?.join(', ') || '',
        styles: release.styles?.join(', ') || '',
        cover_url: release.cover_image || release.thumb,
        discogs_id: release.id,
      };
      const album = await AlbumService.createAlbum(albumData);
      await UserCollectionService.addToCollection(user.id, album.id);
      Alert.alert('Éxito', 'Álbum añadido a tu colección');
      loadCollection();
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', 'No se pudo añadir a la colección');
    }
  };

  const removeFromCollection = async (collectionItem: any) => {
    if (!user) return;
    try {
      await UserCollectionService.removeFromCollection(user.id, collectionItem.album_id);
      Alert.alert('Éxito', 'Álbum eliminado de tu colección');
      loadCollection();
    } catch (error) {
      console.error('Error removing from collection:', error);
      Alert.alert('Error', 'No se pudo eliminar de la colección');
    }
  };

  const toggleGem = async (collectionItem: any) => {
    if (!user) return;
    try {
      await UserCollectionService.removeFromCollection(user.id, collectionItem.album_id);
      await UserCollectionService.addToCollection(user.id, collectionItem.album_id, !collectionItem.is_gem);
      loadCollection();
    } catch (error) {
      console.error('Error toggling gem:', error);
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  const renderCollectionItem = ({ item }: { item: any }) => (
    <View style={viewMode === 'list' ? styles.collectionItem : styles.collectionItemGrid}>
      <Image
        source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
        style={viewMode === 'list' ? styles.collectionThumbnail : styles.collectionThumbnailGrid}
      />
      <View style={viewMode === 'list' ? styles.collectionInfo : styles.collectionInfoGrid}>
        <Text style={viewMode === 'list' ? styles.collectionTitle : styles.collectionTitleGrid} numberOfLines={1} ellipsizeMode="tail">
          {item.albums?.title}
        </Text>
        <Text style={viewMode === 'list' ? styles.collectionArtist : styles.collectionArtistGrid}>{item.albums?.artist}</Text>
        {viewMode === 'list' && (
          <View style={styles.collectionDetails}>
            <Text style={styles.collectionDetail}>
              {item.albums?.label && item.albums.label !== '' && item.albums?.release_year 
                ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
                : item.albums?.label && item.albums.label !== '' 
                  ? `Sello: ${item.albums.label}`
                  : item.albums?.release_year 
                    ? `Año: ${item.albums.release_year}`
                    : ''
              }
            </Text>
            <Text style={styles.collectionDetail}>
              {item.albums?.album_styles && item.albums.album_styles.length > 0 && 
                `Estilo: ${item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}`
              }
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderRelease = ({ item }: { item: DiscogsRelease }) => (
    <View style={styles.releaseItem}>
      <Image
        source={{ uri: item.cover_image || 'https://via.placeholder.com/60' }}
        style={styles.thumbnail}
      />
      <View style={styles.releaseInfo}>
        <Text style={styles.releaseTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.releaseArtist}>{item.artists?.[0]?.name || 'Unknown Artist'}</Text>
        <View style={styles.releaseDetails}>
          <Text style={styles.releaseDetail}>
            {item.year && `Año: ${item.year}`}
          </Text>
          <Text style={styles.releaseDetail}>
            {item.genres && item.genres.length > 0 &&
              `Género: ${item.genres.join(', ')}`
            }
          </Text>
          <Text style={styles.releaseDetail}>
            {item.styles && item.styles.length > 0 &&
              `Estilo: ${item.styles.join(', ')}`
            }
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={() => addToCollection(item)}>
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // Obtener estilos únicos de la colección para el filtro
  const getUniqueStyles = () => {
    const styles = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.album_styles && item.albums.album_styles.length > 0) {
        item.albums.album_styles.forEach((as: any) => {
          if (as.styles?.name) {
            styles.add(as.styles.name);
          }
        });
      }
    });
    return Array.from(styles).sort();
  };

  // Obtener años únicos de la colección para el filtro
  const getUniqueYears = () => {
    const years = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.release_year && item.albums.release_year !== '') {
        years.add(item.albums.release_year);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  };

  // Obtener sellos únicos de la colección para el filtro
  const getUniqueLabels = () => {
    const labels = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.label && item.albums.label !== '') {
        labels.add(item.albums.label);
      }
    });
    return Array.from(labels).sort();
  };

  // Obtener artistas únicos de la colección para el filtro
  const getUniqueArtists = () => {
    const artists = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.artist && item.albums.artist !== '') {
        artists.add(item.albums.artist);
      }
    });
    return Array.from(artists).sort();
  };

  const uniqueStyles = getUniqueStyles();
  const uniqueYears = getUniqueYears();
  const uniqueLabels = getUniqueLabels();
  const uniqueArtists = getUniqueArtists();

  return (
    <View style={styles.container}>
      {/* Header con contador y filtros */}
      <View style={styles.headerContainer}>
        <View style={styles.collectionCountContainer}>
          <Text style={styles.collectionCountText}>
            {filteredCollection.length} discos
          </Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Ionicons 
              name={viewMode === 'list' ? 'grid' : 'list'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="filter" 
              size={24} 
              color={showFilters ? '#007AFF' : '#666'} 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Desplegable de filtros */}
      {showFilters && (
        <View style={styles.filterDropdownContent}>
          {/* Filtro por Estilo */}
          {uniqueStyles.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Estilo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterByStyle && styles.filterChipActive]}
                  onPress={() => setFilterByStyle('')}
                >
                  <Text style={[styles.filterChipText, !filterByStyle && styles.filterChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {uniqueStyles.map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[styles.filterChip, filterByStyle === style && styles.filterChipActive]}
                    onPress={() => handleStyleFilterChange(style)}
                  >
                    <Text style={[styles.filterChipText, filterByStyle === style && styles.filterChipTextActive]}>
                      {style}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Filtro por Año */}
          {uniqueYears.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Año</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterByYear && styles.filterChipActive]}
                  onPress={() => setFilterByYear('')}
                >
                  <Text style={[styles.filterChipText, !filterByYear && styles.filterChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {uniqueYears.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[styles.filterChip, filterByYear === year && styles.filterChipActive]}
                    onPress={() => handleYearFilterChange(year)}
                  >
                    <Text style={[styles.filterChipText, filterByYear === year && styles.filterChipTextActive]}>
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Filtro por Sello */}
          {uniqueLabels.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sello</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterByLabel && styles.filterChipActive]}
                  onPress={() => setFilterByLabel('')}
                >
                  <Text style={[styles.filterChipText, !filterByLabel && styles.filterChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {uniqueLabels.map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[styles.filterChip, filterByLabel === label && styles.filterChipActive]}
                    onPress={() => handleLabelFilterChange(label)}
                  >
                    <Text style={[styles.filterChipText, filterByLabel === label && styles.filterChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Filtro por Artista */}
          {uniqueArtists.length > 0 && (
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Artista</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <TouchableOpacity
                  style={[styles.filterChip, !filterByArtist && styles.filterChipActive]}
                  onPress={() => setFilterByArtist('')}
                >
                  <Text style={[styles.filterChipText, !filterByArtist && styles.filterChipTextActive]}>
                    Todos
                  </Text>
                </TouchableOpacity>
                {uniqueArtists.map((artist) => (
                  <TouchableOpacity
                    key={artist}
                    style={[styles.filterChip, filterByArtist === artist && styles.filterChipActive]}
                    onPress={() => handleArtistFilterChange(artist)}
                  >
                    <Text style={[styles.filterChipText, filterByArtist === artist && styles.filterChipTextActive]}>
                      {artist}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>
      )}

      {/* Lista combinada */}
      <FlatList
        key={viewMode} // Forzar re-render cuando cambie el modo de vista
        data={user ? [...filteredCollection, ...releases] : releases}
        renderItem={({ item, index }) => {
          if (item.albums) {
            return renderCollectionItem({ item });
          }
          return renderRelease({ item });
        }}
        keyExtractor={(item, index) => 
          item.albums ? `collection-${item.id}` : `search-${item.id}`
        }
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        ListEmptyComponent={
          !user ? (
            <Text style={styles.emptyText}>
              Busca álbumes para comenzar
            </Text>
          ) : null
        }
        ListFooterComponent={
          loading ? (
            <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Estilos para el nuevo header con contador y filtros
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collectionCountContainer: {
    flex: 1,
  },
  collectionCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  filterButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  // Estilos para el desplegable de filtros
  filterDropdownContent: {
    padding: 15,
    backgroundColor: '#f9f9f9',
  },
  filterSection: {
    marginBottom: 15,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  // Estilos para las tarjetas de colección
  collectionItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collectionThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  collectionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#333',
  },
  collectionArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  collectionDetails: {
    marginTop: 4,
  },
  collectionDetail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 1,
  },
  // Estilos para el modo grid
  collectionItemGrid: {
    flex: 1,
    margin: 5,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  collectionThumbnailGrid: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  collectionInfoGrid: {
    alignItems: 'flex-start',
  },
  collectionTitleGrid: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    color: '#333',
    textAlign: 'left',
  },
  collectionArtistGrid: {
    fontSize: 12,
    color: '#666',
    textAlign: 'left',
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  // Estilos para las tarjetas de búsqueda
  releaseItem: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 15,
  },
  releaseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
    color: '#333',
  },
  releaseArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  releaseDetails: {
    marginTop: 4,
  },
  releaseDetail: {
    fontSize: 12,
    color: '#888',
    marginBottom: 1,
  },
  addButton: {
    backgroundColor: '#34C759',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#666',
  },
  loading: {
    marginVertical: 20,
  },
}); 