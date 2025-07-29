import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserListService, UserCollectionService } from '../services/database';

interface AddAlbumToListScreenProps {
  navigation: any;
  route: any;
}

const AddAlbumToListScreen: React.FC<AddAlbumToListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { listId, listTitle } = route.params;
  
  const [collection, setCollection] = useState<any[]>([]);
  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const loadCollection = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userCollection = await UserCollectionService.getUserCollection(user.id);
      setCollection(userCollection);
      setFilteredCollection(userCollection);
    } catch (error) {
      console.error('Error loading collection:', error);
      Alert.alert('Error', 'No se pudo cargar tu colección');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollection();
    setRefreshing(false);
  };

  useEffect(() => {
    loadCollection();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = collection.filter(item => 
        item.albums?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.albums?.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.albums?.label?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCollection(filtered);
    } else {
      setFilteredCollection(collection);
    }
  }, [searchQuery, collection]);

  const handleToggleAlbum = (albumId: string) => {
    const newSelected = new Set(selectedAlbums);
    if (newSelected.has(albumId)) {
      newSelected.delete(albumId);
    } else {
      newSelected.add(albumId);
    }
    setSelectedAlbums(newSelected);
  };

  const handleAddSelectedAlbums = async () => {
    if (selectedAlbums.size === 0) {
      Alert.alert('Error', 'Selecciona al menos un álbum');
      return;
    }

    try {
      setAdding(true);
      const promises = Array.from(selectedAlbums).map(albumId =>
        UserListService.addAlbumToList(listId, albumId)
      );
      await Promise.all(promises);
      
      Alert.alert(
        'Álbumes Añadidos',
        `Se añadieron ${selectedAlbums.size} álbum(es) a la lista`,
        [
          {
            text: 'Ver Lista',
            onPress: () => {
              navigation.navigate('ViewList', { listId, listTitle });
            },
          },
          {
            text: 'Continuar',
            onPress: () => {
              setSelectedAlbums(new Set());
              setSearchQuery('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error adding albums to list:', error);
      Alert.alert('Error', 'No se pudieron añadir los álbumes a la lista');
    } finally {
      setAdding(false);
    }
  };

  const renderAlbumItem = ({ item }: { item: any }) => {
    const isSelected = selectedAlbums.has(item.album_id);
    
    return (
      <TouchableOpacity
        style={[styles.albumItem, isSelected && styles.albumItemSelected]}
        onPress={() => handleToggleAlbum(item.album_id)}
        activeOpacity={0.7}
      >
        <View style={styles.albumItemContent}>
          <View style={styles.albumItemLeft}>
            <Image
              source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
              style={styles.albumCover}
            />
            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {item.albums?.title}
              </Text>
              <Text style={styles.albumArtist}>{item.albums?.artist}</Text>
              <View style={styles.albumDetails}>
                <Text style={styles.albumDetail}>
                  {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
                    ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
                    : item.albums?.label && item.albums.label !== ''
                      ? `Sello: ${item.albums.label}`
                      : item.albums?.release_year
                        ? `Año: ${item.albums.release_year}`
                        : ''
                  }
                </Text>
                <Text style={styles.albumDetail}>
                  {item.albums?.album_styles && item.albums.album_styles.length > 0 &&
                    `Estilo: ${item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}`
                  }
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.selectionIndicator}>
            <Ionicons
              name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={isSelected ? '#007AFF' : '#CCC'}
            />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>Colección Vacía</Text>
      <Text style={styles.emptyStateSubtitle}>
        No tienes álbumes en tu colección para añadir a la lista
      </Text>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Debes iniciar sesión para añadir álbumes</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Añadir a "{listTitle}"</Text>
        <TouchableOpacity
          onPress={handleAddSelectedAlbums}
          disabled={selectedAlbums.size === 0 || adding}
          style={[styles.addButton, (selectedAlbums.size === 0 || adding) && styles.addButtonDisabled]}
        >
          <Text style={[styles.addButtonText, (selectedAlbums.size === 0 || adding) && styles.addButtonTextDisabled]}>
            {adding ? 'Añadiendo...' : `Añadir (${selectedAlbums.size})`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar en tu colección..."
            placeholderTextColor="#999"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando colección...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredCollection}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.albumsContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  addButtonTextDisabled: {
    color: '#999',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  albumsContainer: {
    padding: 20,
  },
  albumItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  albumItemSelected: {
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  albumItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  albumItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  albumDetails: {
    gap: 4,
  },
  albumDetail: {
    fontSize: 12,
    color: '#999',
  },
  selectionIndicator: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default AddAlbumToListScreen; 