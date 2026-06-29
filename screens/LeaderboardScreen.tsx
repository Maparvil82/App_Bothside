import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { CollectorRankCard } from '../components/CollectorRankCard';
import { GamificationService } from '../services/gamification';

interface CollectorData {
  id: string;
  username: string;
  full_name: string;
  total_albums: number;
  collection_value: number;
  rank_title: string;
  rank_color: string;
  position: number;
}

export default function LeaderboardScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserStats, setCurrentUserStats] = useState<{
    totalAlbums: number;
    collectionValue: number;
    position?: number;
  } | null>(null);

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const getRankInfo = (totalAlbums: number, collectionValue: number) => {
    if (totalAlbums >= 1000 || collectionValue >= 50000) {
      return { title: t('rank_master'), color: '#FFD700' };
    } else if (totalAlbums >= 500 || collectionValue >= 25000) {
      return { title: t('rank_expert'), color: '#C0C0C0' };
    } else if (totalAlbums >= 250 || collectionValue >= 10000) {
      return { title: t('rank_advanced'), color: '#CD7F32' };
    } else if (totalAlbums >= 100 || collectionValue >= 5000) {
      return { title: t('rank_intermediate'), color: '#4CAF50' };
    } else if (totalAlbums >= 25 || collectionValue >= 1000) {
      return { title: t('rank_novice'), color: '#2196F3' };
    } else {
      return { title: t('rank_beginner'), color: '#9E9E9E' };
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      console.log('🏆 Iniciando fetch del leaderboard...');
      console.log('👤 Usuario actual ID:', user?.id);
      console.log('👤 Usuario actual email:', user?.email);

      // Use Edge Function to bypass RLS restrictions
      const { data, error } = await supabase.functions.invoke('get-leaderboard', {
        method: 'POST',
        body: {}
      });

      if (error) {
        console.error('❌ Error calling leaderboard function:', error);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      if (!data || !data.success) {
        console.error('❌ Invalid response from leaderboard function:', data);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('✅ Leaderboard data received:', data.data);
      setCollectors(data.data);

      if (user?.id) {
        try {
          const { totalAlbums, collectionValue } = await GamificationService.getUserCollectionSummary(user.id);
          const matchingCollector = data.data.find((c: any) => c.id === user.id);
          const position = matchingCollector?.position || undefined;
          setCurrentUserStats({
            totalAlbums,
            collectionValue,
            position
          });
        } catch (err) {
          console.error('Error fetching current user stats for leaderboard:', err);
        }
      }

      setLoading(false);
      setRefreshing(false);

    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return position.toString();
    }
  };

  const renderCollectorItem = ({ item }: { item: CollectorData }) => {
    const isCurrentUser = item.id === user?.id;

    return (
      <View style={[
        styles.collectorItem,
        { backgroundColor: colors.card, borderBottomColor: colors.border },
        isCurrentUser && [styles.currentUserItem, { borderLeftColor: primaryColor, backgroundColor: mode === 'dark' ? '#1A1829' : '#f8f9ff' }]
      ]}>
        <View style={styles.rankContainer}>
          <Text style={[
            styles.rankPosition,
            { color: mode === 'dark' ? '#aaa' : '#666' },
            item.position <= 3 && styles.topThreeRank
          ]}>
            {getRankIcon(item.position)}
          </Text>
        </View>

        <View style={styles.collectorInfo}>
          <Text style={[
            styles.collectorName,
            { color: colors.text },
            isCurrentUser && [styles.currentUserText, { color: primaryColor }]
          ]}>
            {item.full_name}
            {isCurrentUser && ` ${t('leaderboard_you_suffix')}`}
          </Text>
          <Text style={[
            styles.rankTitle,
            { color: item.rank_color }
          ]}>
            {item.rank_title}
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{item.total_albums}</Text>
            <Text style={styles.statLabel}>{t('common_albums')}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              ${item.collection_value.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>{t('common_value')}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!currentUserStats) return null;

    return (
      <View style={styles.headerCardContainer}>
        <CollectorRankCard
          totalAlbums={currentUserStats.totalAlbums}
          collectionValue={currentUserStats.collectionValue}
          userPosition={currentUserStats.position}
        />
        <View style={[
          styles.rankingHeaderSeparator, 
          { 
            backgroundColor: mode === 'dark' ? '#1E1E1E' : '#fff', 
            borderBottomColor: colors.border 
          }
        ]}>
          <Text style={[styles.rankingHeaderTitle, { color: colors.text }]}>
            {t('leaderboard_classification') || 'Clasificación General'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <BothsideLoader />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={collectors}
        keyExtractor={(item) => item.id}
        renderItem={renderCollectorItem}
        ListHeaderComponent={renderHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
    width: 34,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
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
  listContainer: {
    paddingBottom: 20,
  },
  collectorItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  currentUserItem: {
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
    backgroundColor: '#f8f9ff',
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankPosition: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
  },
  topThreeRank: {
    fontSize: 20,
  },
  collectorInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'flex-start',
  },
  collectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  currentUserText: {
    color: AppColors.primary,
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  statsContainer: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  statItem: {
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  statNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
  },
  headerCardContainer: {
    paddingTop: 16,
    paddingBottom: 4,
  },
  rankingHeaderSeparator: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginTop: 8,
  },
  rankingHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 