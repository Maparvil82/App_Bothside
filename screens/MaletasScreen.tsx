import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { UserMaletaService } from '../services/database';
import { UserMaleta } from '../services/database';
import { useHybridMaletas } from '../hooks/useHybridMaletas';
import { MaletaCoverCollage } from '../components/MaletaCoverCollage';
import { useTheme } from '@react-navigation/native';
import { CreateMaletaModalContext } from '../contexts/CreateMaletaModalContext';
import { CreateMaletaModal } from '../components/CreateMaletaModal';
import { useTranslation } from '../src/i18n/useTranslation';

const { width } = Dimensions.get('window');
const MALETA_SIZE = width * 0.25;

interface ListsScreenProps {
  navigation: any;
  route?: any;
}

const ListsScreen: React.FC<ListsScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { lists, loading, refreshLists, refreshAfterChange, addListLocally, removeListLocally } = useHybridMaletas();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Nuevo estado de filtro: 'all' | 'mine' | 'collab'
  const [filterType, setFilterType] = useState<'all' | 'mine' | 'collab'>('all');

  // Global modal context
  const { setIsCreateMaletaVisible } = React.useContext(CreateMaletaModalContext);

  // Manejar nueva lista cuando se navega de vuelta desde CreateListScreen
  useEffect(() => {
    if (route.params?.newList && route.params?.action === 'add') {
      console.log('➕ ListsScreen: Adding new list from navigation params:', route.params.newList);
      addListLocally(route.params.newList);
      // Limpiar los parámetros para evitar duplicados
      navigation.setParams({ newList: undefined, action: undefined });
    }
  }, [route.params, addListLocally, navigation]);

  // Recargar listas cuando se enfoca la pantalla (después de crear)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔍 ListsScreen: Screen focused, checking for updates...');
      // Recargar listas cuando volvemos a la pantalla
      refreshLists();
    });

    return unsubscribe;
  }, [navigation, refreshLists]);

  // Filtrado de listas
  const filteredLists = useMemo(() => {
    if (!user) return [];

    let filtered = [...lists];

    if (filterType === 'mine') {
      // Propias: owner_id === user.id AND NOT collaborative
      filtered = filtered.filter(list => list.user_id === user.id && !list.is_collaborative);
    } else if (filterType === 'collab') {
      // Colaborativas: is_collaborative === true OR owner_id !== user.id (shared with me)
      filtered = filtered.filter(list => list.is_collaborative === true || list.user_id !== user.id);
    }
    // 'all' no filtra nada, muestra todas

    // Ordenar por fecha de creación (más recientes primero)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
  }, [lists, filterType, user]);



  const onRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('🔄 ListsScreen: Manual refresh triggered');
      await refreshLists();
      console.log('✅ ListsScreen: Manual refresh completed');
    } catch (error) {
      console.error('❌ ListsScreen: Manual refresh failed:', error);
    } finally {
      setTimeout(() => setRefreshing(false), 1000);
    }
  };

  const handleOpenCreateModal = () => {
    setIsCreateMaletaVisible(true);
  };

  // Edit Modal State
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [selectedMaletaForEdit, setSelectedMaletaForEdit] = useState<UserMaleta | null>(null);
  const [updatingMaleta, setUpdatingMaleta] = useState(false);

  const handleViewList = (list: UserMaleta) => {
    navigation.navigate('ViewMaleta', { maletaId: list.id, listTitle: list.title });
  };

  const handleEditList = (list: UserMaleta) => {
    setSelectedMaletaForEdit(list);
    setIsEditModalVisible(true);
  };

  const handleUpdateMaleta = async (data: { title: string; description?: string; is_public: boolean; is_collaborative?: boolean }) => {
    if (!selectedMaletaForEdit) return;

    try {
      setUpdatingMaleta(true);
      await UserMaletaService.updateMaleta(selectedMaletaForEdit.id, data);

      // Update list locally
      refreshLists();

      Alert.alert(t('common_success'), t('maletas_success_updated'));
      setIsEditModalVisible(false);
      setSelectedMaletaForEdit(null);
    } catch (error) {
      console.error('Error updating maleta:', error);
      Alert.alert(t('common_error'), t('maletas_error_updating'));
    } finally {
      setUpdatingMaleta(false);
    }
  };

  const handleDeleteList = async (list: UserMaleta) => {
    console.log('🔍 ListsScreen: Attempting to delete list:', list);

    Alert.alert(
      t('maletas_alert_delete_title'),
      t('maletas_alert_delete_message').replace('{0}', list.title),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ ListsScreen: Calling deleteMaleta service...');
              await UserMaletaService.deleteMaleta(list.id);
              console.log('✅ ListsScreen: List deleted successfully');

              // Eliminar la lista localmente inmediatamente
              console.log('🗑️ ListsScreen: Removing list locally');
              removeListLocally(list.id);

              Alert.alert(t('common_success'), t('maletas_success_deleted'));
            } catch (error: any) {
              console.error('❌ ListsScreen: Error deleting list:', error);
              console.error('❌ ListsScreen: Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
              });
              Alert.alert(t('common_error'), t('maletas_error_deleting').replace('{0}', error?.message || 'Error desconocido'));
            }
          },
        },
      ]
    );
  };

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = filteredLists.find(list => list.id === rowKey);
    if (!item) return;

    Alert.alert(
      t('maletas_alert_delete_title'),
      t('maletas_alert_delete_message').replace('{0}', item.title),
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await UserMaletaService.deleteMaleta(item.id);
              removeListLocally(item.id);
              Alert.alert(t('common_success'), t('maletas_success_deleted'));
            } catch (error: any) {
              console.error('❌ ListsScreen: Error deleting list:', error);
              Alert.alert(t('common_error'), t('maletas_error_deleting').replace('{0}', error?.message || 'Error desconocido'));
            }
          },
        },
      ]
    );
    rowMap[rowKey]?.closeRow();
  };

  const handleSwipeEdit = (rowMap: any, rowKey: string) => {
    const item = filteredLists.find(list => list.id === rowKey);
    if (item) {
      handleEditList(item);
    }
    rowMap[rowKey]?.closeRow();
  };

  const renderSwipeActions = (rowData: any, rowMap: any) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeEdit]}
        onPress={() => handleSwipeEdit(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="create-outline" size={18} color="white" />
        <Text style={styles.swipeActionText}>{t('common_edit')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="white" />
        <Text style={styles.swipeActionText}>{t('common_delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderListItem = ({ item }: { item: UserMaleta }) => (
    <View style={styles.listItemContainer}>
      <TouchableOpacity
        style={styles.listItem}
        onPress={() => handleViewList(item)}
        activeOpacity={0.7}
      >
        <MaletaCoverCollage
          albums={item.albums || []}
          size={MALETA_SIZE}
        />
        <View style={styles.listInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={[styles.listTitle, { color: colors.text }]}>{item.title}</Text>

          </View>
          {item.description && (
            <Text style={[styles.listDescription, { color: colors.text, opacity: 0.7 }]} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.listMeta}>
            {item.is_collaborative && (
              <View style={[styles.collabBadge, { backgroundColor: '#E8EAF6', marginLeft: 0, marginRight: 8 }]}>
                <Ionicons name="people" size={12} color="#3F51B5" />
                <Text style={[styles.collabBadgeText, { color: '#3F51B5' }]}>Collab</Text>
              </View>
            )}
            <View style={styles.avatarsRow}>
              {/* Owner Avatar (if not me) */}
              {item.owner && (
                <View style={[styles.collaboratorAvatarContainer, { zIndex: 20 }]}>
                  {item.owner.avatar_url ? (
                    <Image
                      source={{ uri: item.owner.avatar_url }}
                      style={[styles.collaboratorAvatar, { borderWidth: 1, borderColor: '#000' }]}
                    />
                  ) : (
                    <View style={[styles.collaboratorAvatar, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
                      <Ionicons name="person" size={10} color="#fff" />
                    </View>
                  )}
                </View>
              )}

              {/* Collaborator Avatars */}
              {item.collaborators && item.collaborators.length > 0 && (
                <View style={styles.collaboratorAvatars}>
                  {item.collaborators.map((collab, index) => (
                    <View key={collab.user_id} style={[styles.collaboratorAvatarContainer, { marginLeft: index > 0 ? -8 : 0, zIndex: 10 - index }]}>
                      {collab.profile?.avatar_url ? (
                        <Image
                          source={{ uri: collab.profile.avatar_url }}
                          style={styles.collaboratorAvatar}
                        />
                      ) : (
                        <View style={[styles.collaboratorAvatar, { backgroundColor: '#ccc', justifyContent: 'center', alignItems: 'center' }]}>
                          <Ionicons name="person" size={10} color="#fff" />
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>{t('maletas_empty_title')}</Text>
      <Text style={styles.emptyStateSubtitle}>
        {t('maletas_empty_subtitle')}
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleOpenCreateModal}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>{t('maletas_action_create')}</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>{t('maletas_login_required')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('maletas_title')}</Text>
          <Text style={[styles.listCount, { color: colors.text }]}>{t('maletas_count_text').replace('{0}', filteredLists.length.toString())}</Text>
        </View>
        <View style={styles.headerActions}>

          <TouchableOpacity style={styles.createMaletaButton} onPress={handleOpenCreateModal}>
            <Ionicons name="add" size={24} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.headerButton, { marginRight: 8 }]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="filter-outline"
              size={24}
              color={filterType !== 'all' ? '#34A853' : colors.text}
            />
            {filterType !== 'all' && (
              <View style={styles.activeFilterBadge} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros Dropdown */}
      {showFilters && (
        <View style={[styles.filterDropdownContent, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={[styles.filterSection, { borderBottomColor: colors.border }]}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('maletas_filter_type')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
                onPress={() => setFilterType('all')}
              >
                <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
                  {t('maletas_filter_all')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'mine' && styles.filterChipActive]}
                onPress={() => setFilterType('mine')}
              >
                <Text style={[styles.filterChipText, filterType === 'mine' && styles.filterChipTextActive]}>
                  {t('maletas_filter_mine')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, filterType === 'collab' && styles.filterChipActive]}
                onPress={() => setFilterType('collab')}
              >
                <Text style={[styles.filterChipText, filterType === 'collab' && styles.filterChipTextActive]}>
                  {t('maletas_filter_collab')}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Clear Filters Button */}
          {filterType !== 'all' && (
            <View style={[styles.clearFiltersContainer, { borderTopColor: colors.border }]}>
              <TouchableOpacity onPress={() => setFilterType('all')} style={styles.clearFiltersButton}>
                <Ionicons name="close-circle-outline" size={16} color="#888" style={{ marginRight: 4 }} />
                <Text style={styles.clearFiltersText}>{t('search_action_clear_filters')}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}



      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>{t('maletas_loading')}</Text>
        </View>
      ) : filteredLists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color={colors.text} />
          <Text style={styles.emptyStateTitle}>{t('maletas_empty_title')}</Text>
          <Text style={styles.emptyStateSubtitle}>
            {t('maletas_empty_subtitle')}
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={handleOpenCreateModal}>
            <Ionicons name="bag-remove-outline" size={20} color="white" />
            <Text style={styles.createButtonText}>{t('maletas_action_create')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SwipeListView
          data={filteredLists}
          renderItem={renderListItem}
          renderHiddenItem={renderSwipeActions}
          keyExtractor={(item) => item.id}
          rightOpenValue={-180}
          previewOpenValue={0}
          previewOpenDelay={0}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Botón flotante de IA */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={() => (navigation as any).navigate('AIChat')}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>
      {/* Edit Maleta Modal */}
      <CreateMaletaModal
        visible={isEditModalVisible}
        onClose={() => {
          setIsEditModalVisible(false);
          setSelectedMaletaForEdit(null);
        }}
        onSubmit={handleUpdateMaleta}
        loading={updatingMaleta}
        initialValues={selectedMaletaForEdit ? {
          title: selectedMaletaForEdit.title,
          description: selectedMaletaForEdit.description || '',
          is_public: selectedMaletaForEdit.is_public,
          is_collaborative: selectedMaletaForEdit.is_collaborative ?? false,
        } : undefined}
        isEditing={true}
        maletaId={selectedMaletaForEdit?.id}
        navigation={navigation}
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
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  createMaletaButton: {
    padding: 8,
  },
  headerButton: {
    padding: 8,
    position: 'relative',
  },
  activeFilterBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34A853',
  },
  // Filter Dropdown
  filterDropdownContent: {
    borderBottomWidth: 1,
  },
  filterSection: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    opacity: 0.8,
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
    backgroundColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    marginTop: 0,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 0,
  },
  swipeAction: {
    width: 90,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0,
  },
  swipeEdit: {
    backgroundColor: AppColors.primary,
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
  listContainer: {

  },
  listItemContainer: {
    backgroundColor: 'white',
  },
  listItem: {
    flexDirection: 'row',
    // backgroundColor: 'white', // Removed to allow override
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  listThumbnail: {
    width: MALETA_SIZE,
    height: MALETA_SIZE,
    borderRadius: 0,
    marginRight: 15,

  },
  listThumbnailPlaceholder: {
    width: MALETA_SIZE,
    height: MALETA_SIZE,
    borderRadius: 0,
    // backgroundColor: '#F0F0F0', // Removed to allow override
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  listInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    marginLeft: 14,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    // color: '#333', // Removed to allow override
    marginBottom: 4,

  },
  listDescription: {
    fontSize: 14,
    // color: '#666', // Removed to allow override
    marginBottom: 4,
  },
  listMeta: {
    marginTop: 'auto', // Push to bottom
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 2,
  },
  collabBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  collabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  publicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  publicBadgePublic: {
    backgroundColor: '#E8F5E8',
  },
  publicBadgePrivate: {
    backgroundColor: '#FFF3E0',
  },
  publicBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  collaborativeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E5F5', // Light purple background (matching tag style)
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  collaborativeBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7B1FA2', // Purple text
  },
  collaboratorAvatars: {
    flexDirection: 'row',
    marginLeft: 8,
    alignItems: 'center',
  },
  collaboratorAvatarContainer: {
    width: 25,
    height: 25,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  collaboratorAvatar: {
    width: '100%',
    height: '100%',
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  listCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  floatingAIButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 50,
    padding: 15,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
  },
});

export default ListsScreen; 