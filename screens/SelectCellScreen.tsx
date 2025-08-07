import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ShelfGridSelectable from '../components/ShelfGridSelectable';

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function SelectCellScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user_collection_id, shelf } = route.params as { user_collection_id: string, shelf: Shelf };
  
  const [saving, setSaving] = useState(false);

  const handleSelectLocation = async (row: number, column: number) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_collection')
        .update({
          shelf_id: shelf.id,
          location_row: row + 1, // Guardar como 1-indexed
          location_column: column + 1, // Guardar como 1-indexed
        })
        .eq('id', user_collection_id);

      if (error) throw error;
      Alert.alert('¡Ubicación Guardada!', `${shelf.name} (Fila ${row + 1}, Columna ${column + 1})`);
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo guardar la ubicación.');
      console.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
        <Text style={styles.savingText}>Guardando ubicación...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Selecciona la Ubicación</Text>
      <Text style={styles.subtitle}>Estás ubicando en: {shelf.name}</Text>
      <ShelfGridSelectable
        rows={shelf.shelf_rows}
        columns={shelf.shelf_columns}
        onSelectCell={handleSelectLocation}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: {
    padding: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 20 },
  savingText: { marginTop: 10, fontSize: 16, color: 'gray' },
}); 