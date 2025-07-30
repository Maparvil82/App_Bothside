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
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserListService } from '../services/database';
import { UserList } from '../services/database';
import { useHybridLists } from '../hooks/useHybridLists';
import { ListCoverCollage } from '../components/ListCoverCollage';

interface ListsScreenProps {
  navigation: any;
  route?: any;
}

const ListsScreen: React.FC<ListsScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { lists, loading, refreshLists, refreshAfterChange, addListLocally, removeListLocally } = useHybridLists();
  const [filteredLists, setFilteredLists] = useState<UserList[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  console.log('🔍 ListsScreen: Initial showFilters state:', false);
  const [filterByPrivacy, setFilterByPrivacy] = useState<'all' | 'public' | 'private'>('all');

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

  // Aplicar filtros cuando cambien las listas o el filtro
  useEffect(() => {
    let filtered = [...lists];
    
    // Filtrar por privacidad
    if (filterByPrivacy === 'public') {
      filtered = filtered.filter(list => list.is_public);
    } else if (filterByPrivacy === 'private') {
      filtered = filtered.filter(list => !list.is_public);
    }
    
    // Ordenar por fecha de creación (más recientes primero)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });
    
    setFilteredLists(filtered);
  }, [lists, filterByPrivacy]);

  // Debug para el filtro
  useEffect(() => {
    console.log('🔍 ListsScreen: showFilters changed to:', showFilters);
  }, [showFilters]);

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

  const handleCreateList = () => {
    navigation.navigate('CreateList');
  };

  const handleViewList = (list: UserList) => {
    navigation.navigate('ViewList', { listId: list.id, listTitle: list.title });
  };

  const handleEditList = (list: UserList) => {
    navigation.navigate('EditList', { list });
  };

  const handleDeleteList = async (list: UserList) => {
    console.log('🔍 ListsScreen: Attempting to delete list:', list);
    
    Alert.alert(
      'Eliminar Estantería',
      `¿Estás seguro de que quieres eliminar "${list.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ ListsScreen: Calling deleteList service...');
              await UserListService.deleteList(list.id);
              console.log('✅ ListsScreen: List deleted successfully');
              
              // Eliminar la lista localmente inmediatamente
              console.log('🗑️ ListsScreen: Removing list locally');
              removeListLocally(list.id);
              
              Alert.alert('Éxito', 'Lista eliminada correctamente');
            } catch (error: any) {
              console.error('❌ ListsScreen: Error deleting list:', error);
              console.error('❌ ListsScreen: Error details:', {
                message: error?.message,
                code: error?.code,
                details: error?.details,
                hint: error?.hint
              });
              Alert.alert('Error', `No se pudo eliminar la lista: ${error?.message || 'Error desconocido'}`);
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
      'Eliminar Estantería',
      `¿Estás seguro de que quieres eliminar "${item.title}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserListService.deleteList(item.id);
              removeListLocally(item.id);
              Alert.alert('Éxito', 'Lista eliminada correctamente');
            } catch (error: any) {
              console.error('❌ ListsScreen: Error deleting list:', error);
              Alert.alert('Error', `No se pudo eliminar la lista: ${error?.message || 'Error desconocido'}`);
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
        <Text style={styles.swipeActionText}>Editar</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="white" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  const renderListItem = ({ item }: { item: UserList }) => (
    <View style={styles.listItemContainer}>
      <TouchableOpacity 
        style={styles.listItem}
        onPress={() => handleViewList(item)}
        activeOpacity={0.7}
      >
        <ListCoverCollage 
          albums={item.albums || []} 
          size={80} 
        />
        <View style={styles.listInfo}>
          <Text style={styles.listTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.title}
          </Text>
          {item.description && (
            <Text style={styles.listDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.listMeta}>
            <View style={[styles.publicBadge, item.is_public ? styles.publicBadgePublic : styles.publicBadgePrivate]}>
              <Text style={styles.publicBadgeText}>
                {item.is_public ? 'Público' : 'Privado'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>No tienes estanterías</Text>
      <Text style={styles.emptyStateSubtitle}>
        Crea tu primera estantería para organizar tu colección
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Crear Estantería</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Debes iniciar sesión para ver tus estanterías</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Estanterías</Text>
          <Text style={styles.listCount}>{filteredLists.length} estantería{filteredLists.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.createListButton} onPress={handleCreateList}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: showFilters ? '#f0f0f0' : 'transparent' }
            ]}
            onPress={() => {
              console.log('🔍 ListsScreen: Filter button pressed, current showFilters:', showFilters);
              setShowFilters(!showFilters);
              console.log('🔍 ListsScreen: showFilters will be set to:', !showFilters);
            }}
          >
            <Ionicons 
              name="filter-outline" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filtros */}
      {showFilters && (
        <View style={styles.filterDropdownContent}>
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Privacidad</Text>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterByPrivacy === 'all' && styles.filterChipActive
                ]}
                onPress={() => setFilterByPrivacy('all')}
              >
                <Text style={[
                  styles.filterChipText,
                  filterByPrivacy === 'all' && styles.filterChipTextActive
                ]}>Todas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterByPrivacy === 'public' && styles.filterChipActive
                ]}
                onPress={() => setFilterByPrivacy('public')}
              >
                <Text style={[
                  styles.filterChipText,
                  filterByPrivacy === 'public' && styles.filterChipTextActive
                ]}>Públicas</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterByPrivacy === 'private' && styles.filterChipActive
                ]}
                onPress={() => setFilterByPrivacy('private')}
              >
                <Text style={[
                  styles.filterChipText,
                  filterByPrivacy === 'private' && styles.filterChipTextActive
                ]}>Privadas</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando estanterías...</Text>
        </View>
      ) : filteredLists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color="#CCC" />
                <Text style={styles.emptyStateTitle}>No tienes estanterías</Text>
      <Text style={styles.emptyStateSubtitle}>
        Crea tu primera estantería para organizar tu colección
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
        <Ionicons name="20" color="white" />
        <Text style={styles.createButtonText}>Crear Estantería</Text>
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
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  createListButton: {
    padding: 8,
  },
  filterButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 8,
  },
  filterDropdownContent: {
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    paddingHorizontal: 20,
    paddingVertical: 15,
    zIndex: 1000,
    elevation: 5,
    borderWidth: 2,
    borderColor: 'white',
  },
  filterSection: {
    marginBottom: 10,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  listThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 0,
    marginRight: 15,
    
  },
  listThumbnailPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 0,
    backgroundColor: '#F0F0F0',
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
    color: '#333',
    marginBottom: 4,
    
  },
  listDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  listMeta: {
    marginTop: 4,
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
    backgroundColor: '#007AFF',
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
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 100,
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
});

export default ListsScreen; 