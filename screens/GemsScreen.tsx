import React, { useEffect } from 'react';
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
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService } from '../services/database';
import { useGems } from '../contexts/GemsContext';
import { useTheme } from '@react-navigation/native';

export default function GemsScreen() {
  const { user } = useAuth();
  const { gems, loading, refreshGems, removeGem, updateGemStatus } = useGems();
  const { colors } = useTheme();

  // Debug: Log cuando cambian los gems
  useEffect(() => {
    console.log('🔍 GemsScreen: Gems state changed:', {
      gemsCount: gems?.length || 0,
      gems: gems?.map(g => ({
        id: g.id,
        albumId: g.album_id,
        albumTitle: g.albums?.title,
        albumArtist: g.albums?.artist
      }))
    });
  }, [gems]);

  const handleRemoveGem = async (item: any) => {
    if (!user) return;
    
    try {
      console.log('🔍 GemsScreen: Removing gem for item:', {
        itemId: item.id,
        albumId: item.albums?.id,
        albumTitle: item.albums?.title
      });
      
      await UserCollectionService.toggleGemStatus(user.id, item.albums.id);
      
      // Actualizar el estado de gem en el contexto
      console.log('📢 GemsScreen: Updating gem status in context');
      updateGemStatus(item.albums.id, false);
      
      // También remover del contexto inmediatamente
      console.log('📢 GemsScreen: Removing gem from context');
      removeGem(item.id);
      
      Alert.alert(
        'Gem Removido',
        `"${item.albums?.title}" removido de tus Gems`
      );
    } catch (error) {
      console.error('❌ GemsScreen: Error removing gem:', error);
      Alert.alert('Error', 'No se pudo remover el Gem');
    }
  };

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = gems.find(gem => gem.id === rowKey);
    if (!item) return;

    Alert.alert(
      'Remover Gem',
      `¿Estás seguro de que quieres remover "${item.albums?.title}" de tus Gems?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Remover', 
          style: 'destructive', 
          onPress: () => handleRemoveGem(item) 
        },
      ]
    );
    rowMap[rowKey]?.closeRow();
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>Cargando tus Gems...</Text>
      </View>
    );
  }

    const renderGemItem = ({ item }: { item: any }) => (
    <View style={[styles.gemItemContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity 
        style={styles.gemItem}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.gemThumbnail}
        />
        <View style={styles.gemInfo}>
          <Text style={[styles.gemTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {item.albums?.title}
          </Text>
          <Text style={[styles.gemArtist, { color: colors.text }]}>{item.albums?.artist}</Text>
          <View style={styles.gemDetails}>
            <Text style={[styles.gemDetail, { color: colors.text }]}>
              {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
                ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
                : item.albums?.label && item.albums.label !== ''
                  ? `Sello: ${item.albums.label}`
                  : item.albums?.release_year
                    ? `Año: ${item.albums.release_year}`
                    : ''
              }
            </Text>
            <Text style={[styles.gemDetail, { color: colors.text }]}>
              {item.albums?.album_styles && item.albums.album_styles.length > 0 &&
                `Estilo: ${item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}`
              }
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderSwipeActions = (rowData: any, rowMap: any) => (
    <View style={styles.swipeActionsContainer}>
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Gems</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {gems.length} {gems.length === 1 ? 'álbum favorito' : 'álbumes favoritos'}
        </Text>
        <TouchableOpacity 
          style={styles.debugButton} 
          onPress={() => {
            console.log('🔍 GemsScreen: Manual refresh triggered');
            refreshGems();
          }}
        >
          <Text style={styles.debugButtonText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {gems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="diamond-outline" size={64} color={colors.text} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No tienes Gems aún</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            Marca tus álbumes favoritos como Gems desde la colección
          </Text>
        </View>
      ) : (
        <SwipeListView
          data={gems}
          renderItem={renderGemItem}
          renderHiddenItem={renderSwipeActions}
          keyExtractor={(item) => item.id}
          rightOpenValue={-90}
          previewOpenValue={0}
          previewOpenDelay={0}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refreshGems} />
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
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
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
    padding: 0,
  },
  gemItemContainer: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  gemItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  gemThumbnail: {
    width: 80,
    height: '100%',
    borderRadius: 4,
    marginRight: 10,
  },
  gemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  gemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  gemArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
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
  debugButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    padding: 8,
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 