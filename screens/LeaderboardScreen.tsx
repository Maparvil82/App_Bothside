import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserRank, setCurrentUserRank] = useState<CollectorData | null>(null);

  const getRankInfo = (totalAlbums: number, collectionValue: number) => {
    if (totalAlbums >= 1000 || collectionValue >= 50000) {
      return { title: 'Maestro Coleccionista', color: '#FFD700' };
    } else if (totalAlbums >= 500 || collectionValue >= 25000) {
      return { title: 'Coleccionista Experto', color: '#C0C0C0' };
    } else if (totalAlbums >= 250 || collectionValue >= 10000) {
      return { title: 'Coleccionista Avanzado', color: '#CD7F32' };
    } else if (totalAlbums >= 100 || collectionValue >= 5000) {
      return { title: 'Coleccionista Intermedio', color: '#4CAF50' };
    } else if (totalAlbums >= 25 || collectionValue >= 1000) {
      return { title: 'Coleccionista Novato', color: '#2196F3' };
    } else {
      return { title: 'Principiante', color: '#9E9E9E' };
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name
        `)
        .not('username', 'is', null);

      if (error) throw error;

      const collectorsWithStats = await Promise.all(
        profiles.map(async (profile) => {
          // Get collection stats for each user
          const { data: collection, error: collectionError } = await supabase
            .from('user_collection')
            .select(`
              album_id,
              albums!inner (
                title,
                artist,
                album_stats (
                  avg_price
                )
              )
            `)
            .eq('user_id', profile.id);

          if (collectionError) {
            console.error(`Error fetching collection for ${profile.username}:`, collectionError);
            return null;
          }

          const totalAlbums = collection?.length || 0;
          const collectionValue = collection?.reduce((sum, item) => {
            const avgPrice = item.albums?.album_stats?.avg_price;
            return sum + (avgPrice || 0);
          }, 0) || 0;

          const rankInfo = getRankInfo(totalAlbums, collectionValue);

          return {
            id: profile.id,
            username: profile.username || 'Usuario',
            full_name: profile.full_name || profile.username || 'Usuario',
            total_albums: totalAlbums,
            collection_value: collectionValue,
            rank_title: rankInfo.title,
            rank_color: rankInfo.color,
            position: 0, // Will be set after sorting
          };
        })
      );

      // Filter out null results and sort by collection value, then by total albums
      const validCollectors = collectorsWithStats
        .filter((collector): collector is CollectorData => collector !== null)
        .sort((a, b) => {
          if (b.collection_value !== a.collection_value) {
            return b.collection_value - a.collection_value;
          }
          return b.total_albums - a.total_albums;
        })
        .map((collector, index) => ({
          ...collector,
          position: index + 1,
        }));

      setCollectors(validCollectors);

      // Find current user's rank
      const userRank = validCollectors.find(collector => collector.id === user?.id);
      setCurrentUserRank(userRank || null);

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
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
        return `#${position}`;
    }
  };

  const renderCollectorItem = ({ item }: { item: CollectorData }) => {
    const isCurrentUser = item.id === user?.id;
    
    return (
      <View style={[
        styles.collectorItem,
        isCurrentUser && styles.currentUserItem
      ]}>
        <View style={styles.rankContainer}>
          <Text style={[
            styles.rankPosition,
            item.position <= 3 && styles.topThreeRank
          ]}>
            {getRankIcon(item.position)}
          </Text>
        </View>
        
        <View style={styles.collectorInfo}>
          <Text style={[
            styles.collectorName,
            isCurrentUser && styles.currentUserText
          ]}>
            {item.full_name}
            {isCurrentUser && ' (Tú)'}
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
            <Text style={styles.statNumber}>{item.total_albums}</Text>
            <Text style={styles.statLabel}>Álbumes</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              ${item.collection_value.toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Valor</Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Clasificación</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Cargando clasificación...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Clasificación</Text>
        <View style={styles.backButton} />
      </View>

      {currentUserRank && (
        <View style={styles.currentUserCard}>
          <Text style={styles.currentUserCardTitle}>Tu Posición</Text>
          <View style={styles.currentUserStats}>
            <Text style={styles.currentUserPosition}>
              {getRankIcon(currentUserRank.position)}
            </Text>
            <View>
              <Text style={styles.currentUserName}>{currentUserRank.full_name}</Text>
              <Text style={[styles.currentUserRank, { color: currentUserRank.rank_color }]}>
                {currentUserRank.rank_title}
              </Text>
            </View>
          </View>
        </View>
      )}

      <FlatList
        data={collectors}
        keyExtractor={(item) => item.id}
        renderItem={renderCollectorItem}
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
    paddingHorizontal: 20,
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
  currentUserCard: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentUserCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  currentUserStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentUserPosition: {
    fontSize: 24,
    marginRight: 12,
  },
  currentUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  currentUserRank: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
  },
  collectorItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currentUserItem: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  rankContainer: {
    width: 50,
    alignItems: 'center',
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
  },
  collectorName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  currentUserText: {
    color: '#007AFF',
  },
  rankTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    alignItems: 'flex-end',
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
    color: '#666',
  },
}); 