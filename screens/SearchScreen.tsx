import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { DiscogsService } from '../services/discogs';
import { DiscogsRelease } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService, AlbumService } from '../services/database';

export const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [addingToCollection, setAddingToCollection] = useState<string | null>(null);

  const searchReleases = async (searchQuery: string, pageNum: number = 1) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    try {
      const response = await DiscogsService.searchReleases(searchQuery, pageNum);
      
      if (pageNum === 1) {
        setReleases(response.results);
      } else {
        setReleases(prev => [...prev, ...response.results]);
      }
      
      setHasMore(response.pagination.page < response.pagination.pages);
      setPage(pageNum);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo buscar. Verifica tu conexión a internet.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      setPage(1);
      searchReleases(query, 1);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore && query.trim()) {
      searchReleases(query, page + 1);
    }
  };

  const addToCollection = async (release: DiscogsRelease) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para agregar álbumes a tu colección');
      return;
    }

    setAddingToCollection(release.id.toString());
    try {
      // Primero crear el álbum en la base de datos
      const albumData = {
        title: release.title,
        artist: release.artists?.[0]?.name || 'Unknown Artist',
        year: release.year,
        cover_url: release.cover_image || release.thumb,
        discogs_id: release.id,
        user_id: user.id,
      };

      const album = await AlbumService.createAlbum(albumData);
      
      // Luego agregarlo a la colección del usuario
      await UserCollectionService.addToCollection(user.id, album.id);
      
      Alert.alert('Éxito', 'Álbum agregado a tu colección');
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo agregar el álbum a la colección');
      console.error('Error adding to collection:', error);
    } finally {
      setAddingToCollection(null);
    }
  };

  const renderRelease = ({ item }: { item: DiscogsRelease }) => (
    <View style={styles.releaseItem}>
      <Image
        source={{ uri: item.thumb || 'https://via.placeholder.com/100' }}
        style={styles.thumbnail}
        resizeMode="cover"
      />
      <View style={styles.releaseInfo}>
        <Text style={styles.releaseTitle} numberOfLines={2}>
          {item.title}
        </Text>
        {item.artists && item.artists.length > 0 && (
          <Text style={styles.artistName} numberOfLines={1}>
            {item.artists[0].name}
          </Text>
        )}
        {item.year && (
          <Text style={styles.year}>{item.year}</Text>
        )}
        {item.genres && item.genres.length > 0 && (
          <Text style={styles.genre} numberOfLines={1}>
            {item.genres.join(', ')}
          </Text>
        )}
      </View>
      
      {user && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => addToCollection(item)}
          disabled={addingToCollection === item.id.toString()}
        >
          {addingToCollection === item.id.toString() ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.addButtonText}>+</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar discos..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading && releases.length === 0 && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      )}

      <FlatList
        data={releases}
        renderItem={renderRelease}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Busca tu música favorita
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          loading && releases.length > 0 ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.footerLoadingText}>Cargando más...</Text>
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
    backgroundColor: '#f5f5f5',
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
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 10,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  releaseItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
  },
  releaseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
  },
  artistName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  year: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  genre: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  footerLoading: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  footerLoadingText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 