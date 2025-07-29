import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService } from '../services/database';

export default function GemsScreen() {
  const { user } = useAuth();
  const [gems, setGems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadGems = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const gemsData = await UserCollectionService.getUserGems(user.id);
      setGems(gemsData);
    } catch (error) {
      console.error('Error loading gems:', error);
      Alert.alert('Error', 'No se pudieron cargar tus Gems');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadGems();
    } catch (error) {
      console.error('Error refreshing gems:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRemoveGem = async (item: any) => {
    if (!user) return;
    
    try {
      await UserCollectionService.toggleGemStatus(user.id, item.album_id);
      
      // Actualizar la lista local
      await loadGems();
      
      Alert.alert(
        'Gem Removido',
        `"${item.albums?.title}" removido de tus Gems`
      );
    } catch (error) {
      console.error('Error removing gem:', error);
      Alert.alert('Error', 'No se pudo remover el Gem');
    }
  };

  useEffect(() => {
    loadGems();
  }, [user]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando tus Gems...</Text>
      </View>
    );
  }

    const renderGemItem = ({ item }: { item: any }) => (
    <View style={styles.gemItem}>
      <Image
        source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
        style={styles.gemThumbnail}
      />
      <View style={styles.gemInfo}>
        <Text style={styles.gemTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.albums?.title}
        </Text>
        <Text style={styles.gemArtist}>{item.albums?.artist}</Text>
        <View style={styles.gemDetails}>
          <Text style={styles.gemDetail}>
            {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
              ? `${item.albums.label} • ${item.albums.release_year}`
              : item.albums?.label && item.albums.label !== ''
                ? item.albums.label
                : item.albums?.release_year
                  ? item.albums.release_year
                  : ''
            }
          </Text>
          {item.albums?.album_styles && item.albums.album_styles.length > 0 && (
            <Text style={styles.gemDetail}>
              {item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.removeGemButton}
        onPress={() => handleRemoveGem(item)}
      >
        <Ionicons name="diamond" size={20} color="#FFD700" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis Gems</Text>
        <Text style={styles.subtitle}>
          {gems.length} {gems.length === 1 ? 'álbum favorito' : 'álbumes favoritos'}
        </Text>
      </View>

      {gems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="diamond-outline" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No tienes Gems aún</Text>
          <Text style={styles.emptyText}>
            Marca tus álbumes favoritos como Gems desde la colección
          </Text>
        </View>
      ) : (
        <FlatList
          data={gems}
          renderItem={renderGemItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 24,
  },
  listContainer: {
    padding: 16,
  },
  gemItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  gemThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  gemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  gemArtist: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  gemDetails: {
    marginTop: 4,
  },
  gemDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  removeGemButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 