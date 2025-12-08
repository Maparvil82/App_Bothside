import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  Alert,
  FlatList,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { UserCollectionService } from '../services/database';
import { useGems } from '../contexts/GemsContext';
import { useTheme, useNavigation } from '@react-navigation/native';
import { useTranslation } from '../src/i18n/useTranslation';

export default function GemsScreen() {
  const { user } = useAuth();
  const { gems, loading, refreshGems, removeGem, updateGemStatus } = useGems();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();



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
        t('gems_removed_title'),
        `"${item.albums?.title}" ${t('gems_removed_message_suffix')}`
      );
    } catch (error) {
      console.error('❌ GemsScreen: Error removing gem:', error);
      Alert.alert(t('common_error'), t('search_error_toggling_gem'));
    }
  };

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = gems.find(gem => gem.id === rowKey);
    if (!item) return;

    Alert.alert(
      t('gems_remove_confirm_title'),
      `${t('gems_remove_confirm_message')} "${item.albums?.title}"?`,
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('search_action_remove_gem'),
          style: 'destructive',
          onPress: () => handleRemoveGem(item)
        },
      ]
    );
    rowMap[rowKey]?.closeRow();
  };

  if (loading) {
    return <BothsideLoader />;
  }

  const renderGemItem = ({ item }: { item: any }) => (
    <View style={[styles.gemItemContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={styles.gemItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.id })}
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
                ? t('common_label_year_format').replace('{0}', item.albums.label).replace('{1}', item.albums.release_year)
                : item.albums?.label && item.albums.label !== ''
                  ? t('common_label_format').replace('{0}', item.albums.label)
                  : item.albums?.release_year
                    ? t('common_year_format').replace('{0}', item.albums.release_year)
                    : ''
              }
            </Text>
            <Text style={[styles.gemDetail, { color: colors.text }]}>
              {item.albums?.album_styles && item.albums.album_styles.length > 0 &&
                t('common_style_label').replace('{0}', item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', '))
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
        <Text style={styles.swipeActionText}>{t('common_delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{t('gems_header')}</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {gems.length} {gems.length === 1 ? t('gems_count_singular') : t('gems_count_plural')}
        </Text>
      </View>

      {gems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="diamond-outline" size={64} color={colors.text} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('gems_empty_title')}</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>
            {t('gems_empty_text')}
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

      {/* Botón flotante de IA */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={() => (navigation as any).navigate('AIChat')}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>
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
    marginBottom: 0,
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
}); 