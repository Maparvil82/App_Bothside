import React, { useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ShelfGrid from '../components/ShelfGrid';

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function ShelfViewScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { shelfId, shelfName } = route.params as { shelfId: string, shelfName: string };

  const [shelf, setShelf] = useState<Shelf | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchShelfDetails = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('id', shelfId)
        .single();
      
      if (error) throw error;
      setShelf(data);
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar la estantería.');
      console.error('Error fetching shelf details:', error.message);
    } finally {
      setLoading(false);
    }
  }, [shelfId]);

  useFocusEffect(
    useCallback(() => {
      fetchShelfDetails();
    }, [fetchShelfDetails])
  );
  
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          onPress={() => navigation.navigate('ShelfEdit', { shelf: shelf })}
          style={{ marginRight: 15 }}
        >
          <Ionicons name="create-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, shelf]);


  if (loading) {
    return <ActivityIndicator style={styles.centered} size="large" />;
  }

  if (!shelf) {
    return <Text style={styles.centered}>Estantería no encontrada.</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{shelf.name}</Text>
      <ShelfGrid rows={shelf.shelf_rows} columns={shelf.shelf_columns} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
}); 