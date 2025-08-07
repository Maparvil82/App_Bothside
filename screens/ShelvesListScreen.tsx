import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  ShelfView: { shelfId: string, shelfName: string };
  ShelfEdit: undefined; // No se necesitan parámetros para la creación
};

type ShelvesListNavigationProp = StackNavigationProp<RootStackParamList, 'ShelfView', 'ShelfEdit'>;

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function ShelvesListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation<ShelvesListNavigationProp>();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchShelves = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShelves(data || []);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudieron cargar las estanterías.');
      console.error('Error fetching shelves:', error.message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchShelves();
    }, [fetchShelves])
  );

  const renderItem = ({ item }: { item: Shelf }) => (
    <TouchableOpacity 
      style={styles.itemContainer}
      onPress={() => navigation.navigate('ShelfView', { shelfId: item.id, shelfName: item.name })}
    >
      <View style={styles.itemTextContainer}>
        <Ionicons name="grid-outline" size={24} color="#007AFF" />
        <Text style={styles.itemText}>{item.name}</Text>
      </View>
      <View style={styles.itemDetailsContainer}>
        <Text style={styles.itemDetails}>{`${item.shelf_rows}x${item.shelf_columns}`}</Text>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={shelves}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes ninguna estantería.</Text>
            <Text style={styles.emptySubText}>¡Crea una para empezar a organizar tus vinilos!</Text>
          </View>
        }
        contentContainerStyle={{ flexGrow: 1 }}
      />
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('ShelfEdit')}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemText: {
    fontSize: 17,
  },
  itemDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDetails: {
    fontSize: 15,
    color: '#8E8E93',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3C3C43',
  },
  emptySubText: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 