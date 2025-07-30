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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserListService } from '../services/database';
import { useRealtimeListAlbums } from '../hooks/useRealtimeListAlbums';

interface ViewListScreenProps {
  navigation: any;
  route: any;
}

const ViewListScreen: React.FC<ViewListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { listId, listTitle } = route.params;
  
  const [list, setList] = useState<any>(null);
  const { albums, loading: albumsLoading } = useRealtimeListAlbums(listId);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadListData = async () => {
    try {
      setLoading(true);
      const listData = await UserListService.getListById(listId);
      setList(listData);
    } catch (error) {
      console.error('Error loading list data:', error);
      Alert.alert('Error', 'No se pudo cargar la lista');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadListData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  useEffect(() => {
    loadListData();
  }, [listId]);

  const handleEditList = () => {
    console.log('🔍 ViewListScreen: Navigating to EditList with:', { list });
    navigation.navigate('EditList', { list });
  };

  const handleAddAlbum = () => {
    console.log('🔍 ViewListScreen: Navigating to AddAlbumToList with:', { listId, listTitle });
    navigation.navigate('AddAlbumToList', { listId, listTitle });
  };

  const handleRemoveAlbum = async (albumId: string) => {
    Alert.alert(
      'Remover Álbum',
      '¿Estás seguro de que quieres remover este álbum de la lista?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserListService.removeAlbumFromList(listId, albumId);
              await loadListData();
              Alert.alert('Éxito', 'Álbum removido de la lista');
            } catch (error) {
              console.error('Error removing album from list:', error);
              Alert.alert('Error', 'No se pudo remover el álbum');
            }
          },
        },
      ]
    );
  };

  const renderAlbumItem = ({ item }: { item: any }) => (
    <View style={styles.albumItem}>
      <View style={styles.albumItemContent}>
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
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveAlbum(item.album_id)}
        >
          <Ionicons name="close-circle" size={24} color="#FF3B30" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>Lista Vacía</Text>
      <Text style={styles.emptyStateSubtitle}>
        Añade álbumes de tu colección a esta lista
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddAlbum}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>Añadir Álbumes</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading || albumsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando lista...</Text>
        </View>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>No se pudo cargar la lista</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
            <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Lists')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{list.title}</Text>
          {list.is_public && (
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>Público</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={handleEditList} style={styles.editButton}>
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {list.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{list.description}</Text>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{albums.length}</Text>
          <Text style={styles.statLabel}>Álbumes</Text>
        </View>
        
      </View>

      <View style={styles.albumsHeader}>
        <Text style={styles.albumsTitle}>Álbumes en la Lista</Text>
        <TouchableOpacity onPress={handleAddAlbum} style={styles.addAlbumButton}>
          <Ionicons name="add" size={20} color="#007AFF" />
          <Text style={styles.addAlbumButtonText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={albums}
        renderItem={renderAlbumItem}
        keyExtractor={(item) => item.album_id}
        contentContainerStyle={styles.albumsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    justifyContent: 'space-between',
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

  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginRight: 8,
  },
  publicBadge: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2E7D32',
  },
  editButton: {
    padding: 8,
  },
  descriptionContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
    marginTop: 4,
  },
  albumsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  albumsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  addAlbumButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addAlbumButtonText: {
    fontSize: 16,
    color: '#007AFF',
    marginLeft: 4,
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
  albumItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  removeButton: {
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default ViewListScreen; 