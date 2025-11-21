import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { SwipeListView } from 'react-native-swipe-list-view';
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

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = shelves.find(shelf => shelf.id === rowKey);
    if (!item) return;

    Alert.alert(
      'Eliminar Estantería',
      `¿Estás seguro de que quieres eliminar "${item.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('shelves')
                .delete()
                .eq('id', item.id)
                .eq('user_id', user!.id);

              if (error) throw error;

              // Actualizar la lista local
              setShelves(prevShelves => prevShelves.filter(shelf => shelf.id !== item.id));

              Alert.alert('Éxito', 'Estantería eliminada correctamente.');
            } catch (error: any) {
              Alert.alert('Error', 'No se pudo eliminar la estantería.');
              console.error('Error deleting shelf:', error.message);
            }
          }
        }
      ]
    );
    rowMap[rowKey]?.closeRow();
  };

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

  if (loading) {
    return <BothsideLoader />;
  }

  return (
    <View style={styles.container}>
      <SwipeListView
        data={shelves}
        renderItem={renderItem}
        renderHiddenItem={renderSwipeActions}
        keyExtractor={(item) => item.id}
        rightOpenValue={-90}
        previewOpenValue={0}
        previewOpenDelay={0}
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