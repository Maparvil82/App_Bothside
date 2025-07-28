import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AlbumService, UserCollectionService } from '../services/database';

interface Album {
  id: string;
  title: string;
  artist: string;
  release_year?: string;
  label?: string;
  genre?: string;
  styles?: string;
  cover_url?: string;
  discogs_id?: number;
}

export const AddDiscScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'manual' | 'camera'>('search');
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const searchAlbums = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setAlbums([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await AlbumService.searchAlbums(searchQuery);
      setAlbums(results || []);
    } catch (error) {
      console.error('Error searching albums:', error);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    
    // Limpiar el timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Si el texto está vacío, limpiar resultados inmediatamente
    if (!text.trim()) {
      setAlbums([]);
      return;
    }
    
    // Crear un nuevo timeout para la búsqueda
    const timeout = setTimeout(() => {
      searchAlbums(text);
    }, 300); // 300ms de delay
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Limpiar timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);



  const addToCollection = async (album: Album) => {
    if (!user) return;

    try {
      await UserCollectionService.addToCollection(user.id, album.id);
      Alert.alert('Éxito', 'Disco añadido a tu colección');
      
      // Limpiar búsqueda
      setQuery('');
      setAlbums([]);
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', 'No se pudo añadir el disco a la colección');
    }
  };

  const renderAlbum = ({ item }: { item: Album }) => (
    <View style={styles.albumItem}>
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/80' }}
        style={styles.albumThumbnail}
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.albumArtist}>
          {item.artist}
        </Text>
        <Text style={styles.albumDetails}>
          {item.release_year && `${item.release_year} • `}
          {item.label && `${item.label} • `}
          {item.genre || item.styles}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addToCollection(item)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
                                                <TextInput
                      style={styles.searchInput}
                      placeholder="Buscar en toda la base de datos..."
                      value={query}
                      onChangeText={handleSearchChange}
                      returnKeyType="search"
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                                        <TouchableOpacity
                      style={styles.searchButton}
                      onPress={() => searchAlbums(query)}
                      disabled={loading}
                    >
                      <Ionicons
                        name="search-outline"
                        size={24}
                        color="#666"
                      />
                    </TouchableOpacity>
      </View>



      {/* Results */}
      {loading && query.trim() ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {query ? `No se encontraron resultados para "${query}"` : 'Escribe para buscar discos en toda la base de datos'}
              </Text>
              {query && (
                <Text style={styles.emptySubtext}>
                  Prueba con otros términos o verifica la ortografía
                </Text>
              )}
              <Text style={styles.debugText}>
                {albums.length > 0 ? `${albums.length} resultados encontrados` : 'No se encontraron resultados'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  const renderManualTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyContainer}>
        <Ionicons name="create-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>
          Añadir disco manualmente
        </Text>
        <Text style={styles.emptySubtext}>
          Esta funcionalidad estará disponible próximamente
        </Text>
      </View>
    </View>
  );

  const renderCameraTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.emptyContainer}>
        <Ionicons name="camera-outline" size={48} color="#ccc" />
        <Text style={styles.emptyText}>
          Escanear con cámara
        </Text>
        <Text style={styles.emptySubtext}>
          Esta funcionalidad estará disponible próximamente
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={20}
            color={activeTab === 'search' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Buscar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
          onPress={() => setActiveTab('manual')}
        >
          <Ionicons
            name={activeTab === 'manual' ? 'create' : 'create-outline'}
            size={20}
            color={activeTab === 'manual' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
            Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'camera' && styles.activeTab]}
          onPress={() => setActiveTab('camera')}
        >
          <Ionicons
            name={activeTab === 'camera' ? 'camera' : 'camera-outline'}
            size={20}
            color={activeTab === 'camera' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'camera' && styles.activeTabText]}>
            Cámara
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'search' && renderSearchTab()}
      {activeTab === 'manual' && renderManualTab()}
      {activeTab === 'camera' && renderCameraTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    width: 44,
    height: 44,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumThumbnail: {
    width: 80,
    height: '100%',
    borderRadius: 4,
    marginRight: 10,
  },
  albumInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  albumDetails: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },

  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
}); 