import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService, AlbumService } from '../services/database';
import { Album } from '../services/database';

interface CollectionItem {
  id: string;
  user_id: string;
  album_id: string;
  added_at: string;
  is_gem: boolean;
  albums: Album;
}

export const CollectionScreen: React.FC = () => {
  const { user } = useAuth();
  const [collection, setCollection] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCollection = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const data = await UserCollectionService.getUserCollection(user.id);
      setCollection(data);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar la colección');
      console.error('Error loading collection:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollection();
    setRefreshing(false);
  };

  const removeFromCollection = async (albumId: string) => {
    if (!user) return;

    Alert.alert(
      'Remover de colección',
      '¿Estás seguro de que quieres remover este álbum de tu colección?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await UserCollectionService.removeFromCollection(user.id, albumId);
              setCollection(prev => prev.filter(item => item.album_id !== albumId));
              Alert.alert('Éxito', 'Álbum removido de la colección');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo remover el álbum');
            }
          },
        },
      ]
    );
  };

  const toggleGem = async (albumId: string, isGem: boolean) => {
    if (!user) return;

    try {
      await UserCollectionService.removeFromCollection(user.id, albumId);
      await UserCollectionService.addToCollection(user.id, albumId, !isGem);
      setCollection(prev => 
        prev.map(item => 
          item.album_id === albumId 
            ? { ...item, is_gem: !isGem }
            : item
        )
      );
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo actualizar el estado');
    }
  };

  useEffect(() => {
    loadCollection();
  }, [user]);

  const renderAlbum = ({ item }: { item: CollectionItem }) => (
    <View style={styles.albumItem}>
      <Image
        source={{ 
          uri: item.albums.cover_url || 'https://via.placeholder.com/100'
        }}
        style={styles.albumCover}
        resizeMode="cover"
      />
      
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={2}>
          {item.albums.title}
        </Text>
        <Text style={styles.albumArtist} numberOfLines={1}>
          {item.albums.artist}
        </Text>
        {item.albums.year && (
          <Text style={styles.albumYear}>{item.albums.year}</Text>
        )}
        {item.albums.format && (
          <Text style={styles.albumFormat}>{item.albums.format}</Text>
        )}
        <Text style={styles.addedDate}>
          Agregado: {new Date(item.added_at).toLocaleDateString()}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.gemButton, item.is_gem && styles.gemButtonActive]}
          onPress={() => toggleGem(item.album_id, item.is_gem)}
        >
          <Text style={[styles.gemButtonText, item.is_gem && styles.gemButtonTextActive]}>
            {item.is_gem ? '💎' : '⭐'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFromCollection(item.album_id)}
        >
          <Text style={styles.removeButtonText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando colección...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mi Colección</Text>
        <Text style={styles.subtitle}>
          {collection.length} álbum{collection.length !== 1 ? 'es' : ''}
        </Text>
      </View>

      <FlatList
        data={collection}
        renderItem={renderAlbum}
        keyExtractor={(item) => item.id}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Tu colección está vacía
            </Text>
            <Text style={styles.emptySubtext}>
              Busca álbumes y agrégalos a tu colección
            </Text>
          </View>
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
  header: {
    backgroundColor: 'white',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
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
  albumItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  albumCover: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 15,
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
    marginBottom: 2,
  },
  albumYear: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  albumFormat: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  addedDate: {
    fontSize: 11,
    color: '#ccc',
  },
  actions: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  gemButton: {
    padding: 8,
    marginBottom: 5,
  },
  gemButtonActive: {
    backgroundColor: '#FFD700',
    borderRadius: 15,
  },
  gemButtonText: {
    fontSize: 20,
  },
  gemButtonTextActive: {
    color: '#333',
  },
  removeButton: {
    padding: 8,
  },
  removeButtonText: {
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
}); 