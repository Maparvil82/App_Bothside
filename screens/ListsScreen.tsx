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
import { UserList } from '../services/database';
import { useHybridLists } from '../hooks/useHybridLists';

interface ListsScreenProps {
  navigation: any;
  route?: any;
}

const ListsScreen: React.FC<ListsScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { lists, loading, refreshLists, refreshAfterChange, addListLocally, removeListLocally } = useHybridLists();
  const [refreshing, setRefreshing] = useState(false);

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
      'Eliminar Lista',
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

  const renderListItem = ({ item }: { item: UserList }) => (
    <TouchableOpacity
      style={styles.listItem}
      onPress={() => handleViewList(item)}
      activeOpacity={0.7}
    >
      <View style={styles.listItemContent}>
        <View style={styles.listItemLeft}>
          {item.cover_url ? (
            <Image source={{ uri: item.cover_url }} style={styles.listCover} />
          ) : (
            <View style={styles.listCoverPlaceholder}>
              <Ionicons name="list" size={24} color="#666" />
            </View>
          )}
          <View style={styles.listInfo}>
            <Text style={styles.listTitle} numberOfLines={1}>
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
        </View>
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditList(item)}
          >
            <Ionicons name="create-outline" size={20} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteList(item)}
          >
            <Ionicons name="trash-outline" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="list-outline" size={64} color="#CCC" />
      <Text style={styles.emptyStateTitle}>No tienes listas</Text>
      <Text style={styles.emptyStateSubtitle}>
        Crea tu primera lista para organizar tu colección
      </Text>
      <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
        <Ionicons name="add" size={20} color="white" />
        <Text style={styles.createButtonText}>Crear Lista</Text>
      </TouchableOpacity>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Debes iniciar sesión para ver tus listas</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Mis Listas</Text>
          <Text style={styles.listCount}>{lists.length} lista{lists.length !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.createListButton} onPress={handleCreateList}>
            <Ionicons name="add" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando listas...</Text>
        </View>
      ) : lists.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="list-outline" size={64} color="#CCC" />
          <Text style={styles.emptyStateTitle}>No tienes listas</Text>
          <Text style={styles.emptyStateSubtitle}>
            Crea tu primera lista para organizar tu colección
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={handleCreateList}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Crear Lista</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={lists}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
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
  listContainer: {
    padding: 20,
  },
  listItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  listItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  listCover: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  listCoverPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  listDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publicBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  publicBadgePublic: {
    backgroundColor: '#E8F5E8',
  },
  publicBadgePrivate: {
    backgroundColor: '#FFF3E0',
  },
  publicBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listStyle: {
    fontSize: 12,
    color: '#666',
  },
  listActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
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