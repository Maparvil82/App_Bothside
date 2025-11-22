import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { useAuth } from '../contexts/AuthContext';
import { UserMaletaService, UserCollectionService } from '../services/database';
import { useRealtimeMaletaAlbums } from '../hooks/useRealtimeMaletaAlbums';
import { CreateMaletaModal } from '../components/CreateMaletaModal';

interface ViewListScreenProps {
  navigation: any;
  route: any;
}

const ViewListScreen: React.FC<ViewListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { maletaId, listTitle } = route.params;

  const [list, setList] = useState<any>(null);
  const { albums, loading: albumsLoading, addAlbumLocally, removeAlbumLocally } = useRealtimeMaletaAlbums(maletaId);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [isAddAlbumModalVisible, setIsAddAlbumModalVisible] = useState(false);
  const [userCollection, setUserCollection] = useState<any[]>([]);
  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAlbums, setSelectedAlbums] = useState<Set<string>>(new Set());
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [addingAlbums, setAddingAlbums] = useState(false);

  const loadListData = async () => {
    try {
      setLoading(true);
      const listData = await UserMaletaService.getMaletaById(maletaId);
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
  }, [maletaId]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = userCollection.filter(item =>
        item.albums?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.albums?.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.albums?.label?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCollection(filtered);
    } else {
      setFilteredCollection(userCollection);
    }
  }, [searchQuery, userCollection]);

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [updatingMaleta, setUpdatingMaleta] = useState(false);

  const handleEditList = () => {
    setIsEditModalVisible(true);
  };

  const handleUpdateMaleta = async (data: { title: string; description?: string; is_public: boolean }) => {
    try {
      setUpdatingMaleta(true);
      await UserMaletaService.updateMaleta(maletaId, data);

      // Update local state
      setList((prev: any) => ({ ...prev, ...data }));

      Alert.alert('Éxito', 'Maleta actualizada correctamente');
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Error updating maleta:', error);
      Alert.alert('Error', 'No se pudo actualizar la maleta');
    } finally {
      setUpdatingMaleta(false);
    }
  };

  const handleAddAlbum = async () => {
    setIsAddAlbumModalVisible(true);
    await loadUserCollection();
  };

  const loadUserCollection = async () => {
    if (!user) return;

    try {
      setLoadingCollection(true);
      const collection = await UserCollectionService.getUserCollection(user.id);
      setUserCollection(collection);
      setFilteredCollection(collection);
    } catch (error) {
      console.error('Error loading collection:', error);
      Alert.alert('Error', 'No se pudo cargar tu colección');
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleCloseAddModal = () => {
    setIsAddAlbumModalVisible(false);
    setSearchQuery('');
    setSelectedAlbums(new Set());
    setUserCollection([]);
    setFilteredCollection([]);
  };

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
      setAddingAlbums(true);

      // Actualización local instantánea ANTES de la llamada a la API
      const albumsToAdd = Array.from(selectedAlbums);
      for (const albumId of albumsToAdd) {
        // Buscar el álbum en la colección del usuario
        const albumFromCollection = userCollection.find(item => item.albums?.id === albumId);
        if (albumFromCollection && addAlbumLocally) {
          // Crear objeto con la estructura esperada
          const albumData = {
            album_id: albumId,
            maleta_id: maletaId,
            albums: albumFromCollection.albums
          };
          addAlbumLocally(albumData);
        }
      }

      // Luego hacer la llamada a la API
      const promises = albumsToAdd.map(albumId =>
        UserMaletaService.addAlbumToMaleta(maletaId, albumId)
      );
      await Promise.all(promises);

      Alert.alert(
        'Álbumes Añadidos',
        `Se añadieron ${selectedAlbums.size} álbum(es) a la maleta`
      );

      handleCloseAddModal();
    } catch (error) {
      console.error('Error adding albums to maleta:', error);
      Alert.alert('Error', 'No se pudieron añadir los álbumes');
      // Recargar en caso de error para sincronizar
      await loadListData();
    } finally {
      setAddingAlbums(false);
    }
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
              // Actualización local instantánea ANTES de la llamada a la API
              if (removeAlbumLocally) {
                removeAlbumLocally(albumId);
              }

              // Luego hacer la llamada a la API
              await UserMaletaService.removeAlbumFromMaleta(maletaId, albumId);
              Alert.alert('Éxito', 'Álbum removido de la lista');
            } catch (error) {
              console.error('Error removing album from maleta:', error);
              Alert.alert('Error', 'No se pudo remover el álbum');
              // Recargar en caso de error para sincronizar
              await loadListData();
            }
          },
        },
      ]
    );
  };

  const renderAlbumItem = ({ item }: { item: any }) => (
    <View style={styles.albumItemContainer}>
      <TouchableOpacity
        style={styles.albumItem}
        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.album_id })}
        activeOpacity={0.7}
      >
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
                ? `${item.albums.label} - ${item.albums.release_year}`
                : item.albums?.label && item.albums.label !== ''
                  ? `Sello: ${item.albums.label}`
                  : item.albums?.release_year
                    ? `Año: ${item.albums.release_year}`
                    : ''
              }
            </Text>

          </View>
        </View>
      </TouchableOpacity>
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
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{list.title} - {albums.length} álbumes</Text>
          {list.is_public && (
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>Público</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleAddAlbum} style={styles.addHeaderButton}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleEditList} style={styles.editButton}>
            <Ionicons name="create-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {list.description && (
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{list.description}</Text>
        </View>
      )}



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

      {/* Modal para añadir álbumes */}
      <Modal
        visible={isAddAlbumModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseAddModal}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContentWrapper}
            pointerEvents="box-none"
          >
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeaderNew}>
                <Text style={styles.modalTitleNew}>Añadir Álbumes</Text>
                <TouchableOpacity onPress={handleCloseAddModal} style={styles.modalCloseButtonNew}>
                  <Ionicons name="close" size={28} color="#000" />
                </TouchableOpacity>
              </View>

              {/* Search */}
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

              {/* Album List */}
              <ScrollView
                style={styles.modalBodyNew}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {loadingCollection ? (
                  <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Cargando colección...</Text>
                  </View>
                ) : (
                  <FlatList
                    data={filteredCollection}
                    renderItem={({ item }) => {
                      const isSelected = selectedAlbums.has(item.album_id);
                      return (
                        <TouchableOpacity
                          style={[styles.modalAlbumItem, isSelected && styles.modalAlbumItemSelected]}
                          onPress={() => handleToggleAlbum(item.album_id)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.modalAlbumItemContent}>
                            <View style={styles.modalAlbumItemLeft}>
                              <Image
                                source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
                                style={styles.modalAlbumCover}
                              />
                              <View style={styles.modalAlbumInfo}>
                                <Text style={styles.modalAlbumTitle} numberOfLines={1}>
                                  {item.albums?.title}
                                </Text>
                                <Text style={styles.modalAlbumArtist}>{item.albums?.artist}</Text>
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
                    }}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.modalAlbumsContainer}
                    ListEmptyComponent={() => (
                      <View style={styles.emptyState}>
                        <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
                        <Text style={styles.emptyStateTitle}>Sin resultados</Text>
                        <Text style={styles.emptyStateSubtitle}>
                          No se encontraron álbumes
                        </Text>
                      </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                  />
                )}
              </ScrollView>

              {/* Footer Button */}
              <View style={styles.modalButtonsNew}>
                <TouchableOpacity
                  style={[
                    styles.buttonPrimaryNew,
                    (selectedAlbums.size === 0 || addingAlbums) && styles.buttonDisabledNew,
                  ]}
                  onPress={handleAddSelectedAlbums}
                  disabled={selectedAlbums.size === 0 || addingAlbums}
                >
                  <Text style={styles.buttonTextPrimaryNew}>
                    {addingAlbums ? 'Añadiendo...' : `Añadir (${selectedAlbums.size})`}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {/* Edit Maleta Modal */}
      <CreateMaletaModal
        visible={isEditModalVisible}
        onClose={() => setIsEditModalVisible(false)}
        onSubmit={handleUpdateMaleta}
        loading={updatingMaleta}
        initialValues={{
          title: list?.title || '',
          description: list?.description || '',
          is_public: list?.is_public || false,
        }}
        isEditing={true}
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addHeaderButton: {
    padding: 8,
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
    aspectRatio: 1,
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
  // Modal styles (from CalendarScreen)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
    flex: 1,
    flexDirection: 'column',
  },
  modalHeaderNew: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitleNew: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  modalCloseButtonNew: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  modalBodyNew: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
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
  modalAlbumsContainer: {
    paddingBottom: 20,
  },
  modalAlbumItem: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalAlbumItemSelected: {
    backgroundColor: '#F0F8FF',
  },
  modalAlbumItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  modalAlbumItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalAlbumCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  modalAlbumInfo: {
    flex: 1,
  },
  modalAlbumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  modalAlbumArtist: {
    fontSize: 14,
    color: '#666',
  },
  selectionIndicator: {
    padding: 8,
  },
  modalButtonsNew: {
    flexDirection: 'column',
    gap: 12,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 8,
  },
  buttonPrimaryNew: {
    paddingVertical: 16,
    backgroundColor: '#000',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  buttonDisabledNew: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  buttonTextPrimaryNew: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ViewListScreen; 