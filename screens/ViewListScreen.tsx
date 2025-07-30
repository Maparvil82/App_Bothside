import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
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
    <View style={styles.albumItemContainer}>
      <View style={styles.albumItem}>
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
    </View>
  );

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = albums.find(album => album.album_id === rowKey);
    if (item) {
      await handleRemoveAlbum(item.album_id);
    }
    rowMap[rowKey]?.closeRow();
  };

  const renderSwipeActions = (rowData: any, rowMap: any) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.album_id)}
      >
        <Ionicons name="trash-outline" size={20} color="white" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>Lista Vacía</Text>
      <Text style={styles.emptyStateSubtitle}>
        Añade álbumes de tu colección a esta estantería
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
          <Text style={styles.loadingText}>Cargando estanterias...</Text>
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
          <Text style={styles.headerTitle}>{list.title} - {albums.length} álbumes</Text>
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

      <View style={styles.albumsHeader}>
        <Text style={styles.albumsTitle}>Álbumes en la Estantería</Text>
        <TouchableOpacity onPress={handleAddAlbum} style={styles.addAlbumButton}>
          <Ionicons name="add" size={20} color="#007AFF" />
          <Text style={styles.addAlbumButtonText}>Añadir</Text>
        </TouchableOpacity>
      </View>

      <SwipeListView
        data={albums}
        renderItem={renderAlbumItem}
        renderHiddenItem={renderSwipeActions}
        keyExtractor={(item) => item.album_id}
        contentContainerStyle={styles.albumsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        rightOpenValue={-90}
        previewOpenValue={0}
        previewOpenDelay={0}
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
    
  },
  albumItemContainer: {
    backgroundColor: 'white',
  },
  albumItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  albumCover: {
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
    marginBottom: 4,
  },
  albumDetails: {
    marginTop: 4,
  },
  albumDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
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
  // Estilos para swipe actions
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 0,
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    height: '100%',
    borderRadius: 0,
  },
  swipeDelete: {
    backgroundColor: '#FF3B30',
  },
  swipeActionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
});

export default ViewListScreen; 