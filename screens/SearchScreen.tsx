import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { DiscogsService } from '../services/discogs';
import { AlbumService, UserCollectionService } from '../services/database';
import { DiscogsRelease } from '../types';

export const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const searchInputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [collection, setCollection] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'year' | 'artist' | 'label'>('date');
  const [filterByStyle, setFilterByStyle] = useState<string>('');
  const [filterByYear, setFilterByYear] = useState<string>('');
  const [filterByLabel, setFilterByLabel] = useState<string>('');
  const [filterByArtist, setFilterByArtist] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  useEffect(() => {
    sortCollection();
  }, [collection, sortBy, filterByStyle, filterByYear, filterByLabel, filterByArtist, query]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      // Pequeño delay para asegurar que el input esté renderizado
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  const loadCollection = async () => {
    if (!user) return;
    try {
      const userCollection = await UserCollectionService.getUserCollection(user.id);
      setCollection(userCollection);
    } catch (error) {
      console.error('Error loading collection:', error);
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

    // Filtrar por búsqueda si hay query
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      sorted = sorted.filter(item => 
        item.albums?.title?.toLowerCase().includes(searchTerm) ||
        item.albums?.artist?.toLowerCase().includes(searchTerm) ||
        item.albums?.label?.toLowerCase().includes(searchTerm)
      );
    }

    // Ordenar
    switch (sortBy) {
      case 'date':
        sorted.sort((a, b) => new Date(b.added_at).getTime() - new Date(a.added_at).getTime());
        break;
      case 'year':
        sorted.sort((a, b) => (b.albums?.release_year || 0) - (a.albums?.release_year || 0));
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

  const addToCollection = async (release: DiscogsRelease) => {
    if (!user) return;
    try {
      const albumData = {
        title: release.title,
        artist: release.artists?.[0]?.name || 'Unknown Artist',
        release_year: release.year?.toString() || '',
        label: release.labels?.[0]?.name || '',
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

  const getUniqueStyles = () => {
    const styles = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.album_styles) {
        item.albums.album_styles.forEach((as: any) => {
          if (as.styles?.name) {
            styles.add(as.styles.name);
          }
        });
      }
    });
    return Array.from(styles).sort();
  };

  const getUniqueYears = () => {
    const years = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.release_year) {
        years.add(item.albums.release_year);
      }
    });
    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
  };

  const getUniqueLabels = () => {
    const labels = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.label && item.albums.label.trim() !== '') {
        labels.add(item.albums.label);
      }
    });
    return Array.from(labels).sort();
  };

  const getUniqueArtists = () => {
    const artists = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.artist) {
        artists.add(item.albums.artist);
      }
    });
    return Array.from(artists).sort();
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
        {viewMode === 'list' ? (
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
        ) : (
          <View style={styles.collectionDetailsGrid}>
            <Text style={styles.collectionDetailGrid}>
              {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
                ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
                : item.albums?.label && item.albums.label !== ''
                  ? `Sello: ${item.albums.label}`
                  : item.albums?.release_year
                    ? `Año: ${item.albums.release_year}`
                    : ''
              }
            </Text>
            <Text style={styles.collectionDetailGrid}>
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
        source={{ uri: item.cover_image || item.thumb || 'https://via.placeholder.com/60' }}
        style={styles.releaseThumbnail}
      />
      <View style={styles.releaseInfo}>
        <Text style={styles.releaseTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.releaseArtist}>{item.artists?.[0]?.name || 'Unknown Artist'}</Text>
        <Text style={styles.releaseDetail}>
          {item.year && `Año: ${item.year}`}
          {item.genres && item.genres.length > 0 && ` | Género: ${item.genres.join(', ')}`}
          {item.styles && item.styles.length > 0 && ` | Estilo: ${item.styles.join(', ')}`}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCollection(item)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.collectionCountContainer}>
          <Text style={styles.collectionCountText}>
            {filteredCollection.length} discos
          </Text>
        </View>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: showSearch ? '#f0f0f0' : 'transparent' }
            ]}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons 
              name="search-outline" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Ionicons 
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: showFilters ? '#f0f0f0' : 'transparent' }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="filter-outline" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Campo de búsqueda */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Buscar por artista, sello o álbum..."
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.closeSearchButton}
              onPress={() => {
                setShowSearch(false);
                setQuery('');
              }}
            >
              <Ionicons name="close" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Desplegable de filtros */}
      {showFilters && (
        <View style={styles.filterDropdownContent}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Filtro por Estilo */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Estilo</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !filterByStyle && styles.filterChipActive
                  ]}
                  onPress={() => setFilterByStyle('')}
                >
                  <Text style={[
                    styles.filterChipText,
                    !filterByStyle && styles.filterChipTextActive
                  ]}>Todos</Text>
                </TouchableOpacity>
                {getUniqueStyles().map((style) => (
                  <TouchableOpacity
                    key={style}
                    style={[
                      styles.filterChip,
                      filterByStyle === style && styles.filterChipActive
                    ]}
                    onPress={() => setFilterByStyle(style)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterByStyle === style && styles.filterChipTextActive
                    ]}>{style}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtro por Año */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Año</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !filterByYear && styles.filterChipActive
                  ]}
                  onPress={() => setFilterByYear('')}
                >
                  <Text style={[
                    styles.filterChipText,
                    !filterByYear && styles.filterChipTextActive
                  ]}>Todos</Text>
                </TouchableOpacity>
                {getUniqueYears().map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.filterChip,
                      filterByYear === year && styles.filterChipActive
                    ]}
                    onPress={() => setFilterByYear(year)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterByYear === year && styles.filterChipTextActive
                    ]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtro por Sello */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Sello</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !filterByLabel && styles.filterChipActive
                  ]}
                  onPress={() => setFilterByLabel('')}
                >
                  <Text style={[
                    styles.filterChipText,
                    !filterByLabel && styles.filterChipTextActive
                  ]}>Todos</Text>
                </TouchableOpacity>
                {getUniqueLabels().map((label) => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.filterChip,
                      filterByLabel === label && styles.filterChipActive
                    ]}
                    onPress={() => setFilterByLabel(label)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterByLabel === label && styles.filterChipTextActive
                    ]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filtro por Artista */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Artista</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    !filterByArtist && styles.filterChipActive
                  ]}
                  onPress={() => setFilterByArtist('')}
                >
                  <Text style={[
                    styles.filterChipText,
                    !filterByArtist && styles.filterChipTextActive
                  ]}>Todos</Text>
                </TouchableOpacity>
                {getUniqueArtists().map((artist) => (
                  <TouchableOpacity
                    key={artist}
                    style={[
                      styles.filterChip,
                      filterByArtist === artist && styles.filterChipActive
                    ]}
                    onPress={() => setFilterByArtist(artist)}
                  >
                    <Text style={[
                      styles.filterChipText,
                      filterByArtist === artist && styles.filterChipTextActive
                    ]}>{artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      )}

      {/* Lista combinada */}
      <FlatList
        data={user ? [...filteredCollection, ...releases] : releases}
        renderItem={({ item, index }) => {
          if (user && index < filteredCollection.length) {
            return renderCollectionItem({ item });
          } else {
            return renderRelease({ item });
          }
        }}
        keyExtractor={(item, index) => `${item.id || item.albums?.id}-${index}`}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
        key={viewMode}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Cargando...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No se encontraron resultados</Text>
            </View>
          )
        }
        ListFooterComponent={
          releases.length > 0 ? (
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>Resultados de búsqueda en Discogs</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
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
  },
  searchButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  viewButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  filterButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  // Estilos para el campo de búsqueda
  searchContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  closeSearchButton: {
    padding: 12,
    marginRight: 5,
  },
  // Estilos para el desplegable de filtros
  filterDropdownContent: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 300,
  },
  filterSection: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  // Estilos para elementos de colección
  collectionItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collectionThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
  },
  collectionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
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
    color: '#999',
    marginBottom: 2,
  },
  // Estilos para vista grid
  collectionItemGrid: {
    flex: 1,
    backgroundColor: 'white',
    margin: 5,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  collectionThumbnailGrid: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    marginBottom: 8,
  },
  collectionInfoGrid: {
    alignItems: 'flex-start',
  },
  collectionTitleGrid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'left',
  },
  collectionArtistGrid: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'left',
  },
  collectionDetailsGrid: {
    marginTop: 4,
  },
  collectionDetailGrid: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  // Estilos para elementos de búsqueda
  releaseItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  releaseThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 10,
  },
  releaseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  releaseArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  releaseDetail: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    backgroundColor: '#007AFF',
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
  // Estilos para estados vacíos
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footerContainer: {
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
}); 