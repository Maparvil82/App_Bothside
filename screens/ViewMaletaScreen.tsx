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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwipeListView } from 'react-native-swipe-list-view';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { UserMaletaService, UserCollectionService } from '../services/database';
import { useRealtimeMaletaAlbums } from '../hooks/useRealtimeMaletaAlbums';
import { CreateMaletaModal } from '../components/CreateMaletaModal';
import { useTranslation } from '../src/i18n/useTranslation';
import { useIsCollaborator, useMaletaCollaborators } from '../hooks/useCollaboration';
import { addAlbumToMaletaAsCollaborator, removeAlbumFromMaletaAsCollaborator } from '../lib/supabase/collaboration';
import { supabase } from '../lib/supabase';

interface ViewListScreenProps {
  navigation: any;
  route: any;
}

const AlbumItem = ({ item, navigation, t, isCollaborative }: { item: any, navigation: any, t: any, isCollaborative: boolean }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Animated.View style={[styles.albumItemContainer, { opacity: fadeAnim }]}>
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
                ? t('common_label_year_format').replace('{0}', item.albums.label).replace('{1}', item.albums.release_year)
                : item.albums?.label && item.albums.label !== ''
                  ? t('common_label_format').replace('{0}', item.albums.label)
                  : item.albums?.release_year
                    ? t('common_year_format').replace('{0}', item.albums.release_year)
                    : ''
              }
            </Text>
          </View>
          {/* Added by Avatar */}
          {isCollaborative && item.added_by_user && (
            <View style={styles.addedByRow}>
              {item.added_by_user.avatar_url ? (
                <Image
                  source={{ uri: item.added_by_user.avatar_url }}
                  style={styles.avatarSmall}
                />
              ) : (
                <View style={[styles.avatarSmall, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={10} color="#666" />
                </View>
              )}
              <Text style={styles.addedByText}>
                {t('maletas_collaborative_addedBy')} {item.added_by_user.username}
              </Text>
            </View>
          )}
        </View>

        {/* Added by Avatar */}

      </TouchableOpacity>
    </Animated.View>
  );
};

const ViewListScreen: React.FC<ViewListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { maletaId, listTitle } = route.params;
  const { isCollaborator, status: collaboratorStatus } = useIsCollaborator(maletaId);
  const { collaborators, refresh: refreshCollaborators } = useMaletaCollaborators(maletaId);

  const [list, setList] = useState<any>(null);
  const { albums, loading: albumsLoading, addAlbumLocally, removeAlbumLocally } = useRealtimeMaletaAlbums(maletaId);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<any>(null);

  React.useEffect(() => {
    const fetchOwner = async () => {
      if (!list?.user_id) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', list.user_id)
        .single();

      if (profile) {
        setOwnerProfile(profile);
      }
    };

    fetchOwner();
  }, [list?.user_id]);

  // Refresh collaborators when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      refreshCollaborators();
      loadListData();
    }, [maletaId])
  );

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
      Alert.alert(t('common_error'), t('view_maleta_error_load'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadListData(),
      // refresh() from useRealtimeMaletaAlbums is not exposed but loadInitialAlbums runs on mount.
      // Ideally we should expose a refresh method from the hook.
      // For now, we rely on loadListData which fetches the maleta details.
      // The albums are realtime so they should be up to date, but we can force a re-fetch if needed.
    ]);
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

  const handleUpdateMaleta = async (data: { title: string; description?: string; is_public: boolean; is_collaborative?: boolean }) => {
    try {
      setUpdatingMaleta(true);
      await UserMaletaService.updateMaleta(maletaId, data);

      // Update local state
      setList((prev: any) => ({ ...prev, ...data }));

      Alert.alert(t('common_success'), t('view_maleta_success_update'));
      setIsEditModalVisible(false);
    } catch (error) {
      console.error('Error updating maleta:', error);
      Alert.alert(t('common_error'), t('view_maleta_error_update'));
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
      Alert.alert(t('common_error'), t('view_maleta_error_load_collection'));
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
      Alert.alert(t('common_error'), t('view_maleta_error_select_album'));
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
            albums: albumFromCollection.albums,
            added_by: user?.id, // Optimistic update
            added_by_user: { // Optimistic update
              username: user?.user_metadata?.username || 'Me',
              avatar_url: user?.user_metadata?.avatar_url
            }
          };
          addAlbumLocally(albumData);
        }
      }

      // Luego hacer la llamada a la API
      const promises = albumsToAdd.map(albumId => {
        if (isCollaborator && collaboratorStatus === 'accepted') {
          return addAlbumToMaletaAsCollaborator(maletaId, albumId);
        } else {
          return UserMaletaService.addAlbumToMaleta(maletaId, albumId);
        }
      });
      await Promise.all(promises);

      Alert.alert(
        t('view_maleta_success_add_title'),
        t('view_maleta_success_add_message').replace('{0}', selectedAlbums.size.toString())
      );

      handleCloseAddModal();
    } catch (error) {
      console.error('Error adding albums to maleta:', error);
      Alert.alert(t('common_error'), t('view_maleta_error_add'));
      // Recargar en caso de error para sincronizar
      await loadListData();
    } finally {
      setAddingAlbums(false);
    }
  };

  const handleRemoveAlbum = async (albumId: string) => {
    Alert.alert(
      t('view_maleta_remove_title'),
      t('view_maleta_remove_message'),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_remove'),
          style: 'destructive',
          onPress: async () => {
            try {
              // Actualización local instantánea ANTES de la llamada a la API
              if (removeAlbumLocally) {
                removeAlbumLocally(albumId);
              }

              // Luego hacer la llamada a la API
              if (isCollaborator && collaboratorStatus === 'accepted') {
                await removeAlbumFromMaletaAsCollaborator(maletaId, albumId);
              } else {
                await UserMaletaService.removeAlbumFromMaleta(maletaId, albumId);
              }
              Alert.alert(t('common_success'), t('view_maleta_success_remove'));
            } catch (error) {
              console.error('Error removing album from maleta:', error);
              Alert.alert(t('common_error'), t('view_maleta_error_remove'));
              // Recargar en caso de error para sincronizar
              await loadListData();
            }
          },
        },
      ]
    );
  };



  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = albums.find(album => album.album_id === rowKey);
    if (item) {
      await handleRemoveAlbum(item.album_id);
    }
    rowMap[rowKey]?.closeRow();
  };

  const renderSwipeActions = (rowData: any, rowMap: any) => {
    const item = rowData.item;
    const isOwner = list?.user_id === user?.id;
    const canDelete = isOwner || (isCollaborator && collaboratorStatus === 'accepted' && item.added_by === user?.id);

    if (!canDelete) return <View />;

    return (
      <View style={styles.swipeActionsContainer}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.swipeDelete]}
          onPress={() => handleSwipeDelete(rowMap, rowData.item.album_id)}
        >
          <Ionicons name="trash-outline" size={20} color="white" />
          <Text style={styles.swipeActionText}>{t('common_delete')}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="musical-notes-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>{t('view_maleta_empty_title')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('view_maleta_empty_text')}
      </Text>
      <TouchableOpacity style={styles.addButton} onPress={handleAddAlbum}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.addButtonText}>{t('view_maleta_action_add')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading || albumsLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerInfo}>
            <View style={{ width: 150, height: 24, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
          </View>
        </View>
        <ScrollView style={{ flex: 1 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.albumItem}>
              <View style={[styles.albumCover, { backgroundColor: '#E0E0E0' }]} />
              <View style={styles.albumInfo}>
                <View style={{ width: '70%', height: 16, backgroundColor: '#E0E0E0', marginBottom: 8, borderRadius: 4 }} />
                <View style={{ width: '50%', height: 14, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{t('view_maleta_error_load')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>

          <View style={styles.headerTitleRow}>

            <Text style={styles.headerTitle}>{list.title} - {albums.length} álbumes</Text>
            {list.user_id === user?.id && (
              <View style={styles.ownerTagHeader}>
                <Text style={styles.ownerTagHeaderText}>OWNER</Text>
              </View>
            )}
          </View>
          {list.is_public && (
            <View style={styles.publicBadge}>
              <Text style={styles.publicBadgeText}>{t('common_public')}</Text>
            </View>
          )}
          {ownerProfile && list.user_id !== user?.id && (
            <View style={styles.headerOwnerRow}>
              {ownerProfile.avatar_url ? (
                <Image source={{ uri: ownerProfile.avatar_url }} style={styles.headerOwnerAvatar} />
              ) : (
                <View style={[styles.headerOwnerAvatar, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                  <Ionicons name="person" size={16} color="#666" />
                </View>
              )}
              <Text style={styles.headerOwnerUsername}>@{ownerProfile.username}</Text>

            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          {(list.user_id === user?.id || (isCollaborator && collaboratorStatus === 'accepted')) && (
            <TouchableOpacity onPress={handleAddAlbum} style={styles.addHeaderButton}>
              <Ionicons name="add" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
          {list.user_id === user?.id && (
            <TouchableOpacity onPress={handleEditList} style={styles.editButton}>
              <Ionicons name="create-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {list.is_collaborative && (
        <View style={styles.collaborationSection}>
          <View style={styles.collaborationHeader}>


            <Text style={styles.collaborationText}>{t('maletas_collaborative_badgeLabel')}</Text>
          </View>





          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.collaboratorsRow}>
            {collaborators.filter(c => c.status === 'accepted').map(item => (
              <View style={styles.collaboratorPill} key={item.id}>
                {item.profile?.avatar_url ? (
                  <Image source={{ uri: item.profile.avatar_url }} style={styles.avatarSmall} />
                ) : (
                  <View style={[styles.avatarSmall, { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="person" size={10} color="#666" />
                  </View>
                )}
                <Text style={styles.collaboratorName}>{item.profile?.username}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <SwipeListView
        data={albums}
        renderItem={({ item }) => (
          <AlbumItem
            item={item}
            navigation={navigation}
            t={t}
            isCollaborative={!!list?.is_collaborative}
          />
        )}
        renderHiddenItem={renderSwipeActions}
        keyExtractor={(item) => item.album_id}
        contentContainerStyle={[
          styles.albumsContainer,
          list.is_collaborative && list.user_id === user?.id && { paddingBottom: 100 }
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListHeaderComponent={
          <View>
            {list.description && (
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionText}>{list.description}</Text>
              </View>
            )}

          </View>
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        rightOpenValue={-90}
        previewOpenValue={0}
        previewOpenDelay={0}
      />

      {/* Fixed Invite Button Footer */}
      {list.is_collaborative && list.user_id === user?.id && (
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.inviteButton}
            onPress={() => navigation.navigate('InviteCollaborators', { maletaId })}
          >

            <Text style={styles.inviteButtonText}>{t('maletas_collaborative_inviteButton')}</Text>
          </TouchableOpacity>
        </View>
      )}

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
                <Text style={styles.modalTitleNew}>{t('view_maleta_modal_title')}</Text>
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
                    placeholder={t('view_maleta_placeholder_search')}
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
                    <Text style={styles.loadingText}>{t('view_maleta_loading_collection')}</Text>
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
                        <Text style={styles.emptyStateTitle}>{t('common_no_results')}</Text>
                        <Text style={styles.emptyStateSubtitle}>
                          {t('view_maleta_no_albums_found')}
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
                    {addingAlbums ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      t('view_maleta_button_add_count').replace('{0}', selectedAlbums.size.toString())
                    )}
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
          is_collaborative: list?.is_collaborative ?? false,
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
    marginBottom: 20,
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

  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  ownerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  ownerUsername: {
    fontSize: 15,
    fontWeight: '500',
  },
  ownerBadge: {
    backgroundColor: '#E6B800',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginLeft: 8,
  },
  ownerBadgeText: {
    fontSize: 11,
    color: '#FFF',
    fontWeight: '700',
  },
  ownerBadgeTextSelf: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  emptyState: {
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
  footerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 34, // Safe area for iPhone X+
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    zIndex: 100,
  },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarSmall: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  addedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  addedByText: {
    fontSize: 12,
    color: '#666',
  },
  collaborationSection: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  collaborationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  collaborationIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  collaborationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  collaboratorsRow: {
    flexDirection: 'row',
  },
  collaboratorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 8,
  },
  collaboratorName: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  headerOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  headerOwnerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 8,
  },
  headerOwnerUsername: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerOwnerBadge: {
    backgroundColor: '#E6B800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  headerOwnerBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  ownerTag: {
    backgroundColor: '#FFD700', // Yellow
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ownerTagText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ownerTagHeader: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  ownerTagHeaderText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '700',
  },
});

export default ViewListScreen; 