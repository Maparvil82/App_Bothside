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

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return str;
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

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
        return;
      }

      if (!data || !data.success) {
        console.error('❌ Invalid response from leaderboard function:', data);
        setLoading(false);
        return;
      }

      console.log('✅ Leaderboard data received:', data.data);
      setCollectors(data.data);
      setLoading(false);

    } catch (error) {
      console.error('❌ Error fetching leaderboard:', error);
      setLoading(false);
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
    return <BothsideLoader />;
  }

  return (
    <SafeAreaView style={styles.container}>


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
    borderLeftColor: '#007AFF',
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
    color: '#007AFF',
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
}); 