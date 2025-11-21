import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, ScrollView } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import ShelfGridSelectable from '../components/ShelfGridSelectable';
import { supabase } from '../lib/supabase';

interface Shelf {
  id: string;
  name: string;
  shelf_rows: number;
  shelf_columns: number;
}

export default function SelectCellScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { user_collection_id, shelf, current_row, current_column } = route.params as {
    user_collection_id: string,
    shelf: Shelf,
    current_row?: number,
    current_column?: number
  };

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
    return <BothsideLoader />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>Selecciona la Ubicación</Text>
      <Text style={styles.subtitle}>Estás ubicando en: {shelf.name}</Text>
      <ShelfGridSelectable
        rows={shelf.shelf_rows}
        columns={shelf.shelf_columns}
        onSelectCell={handleSelectLocation}
        selectedRow={current_row ? current_row - 1 : undefined} // Convertir a 0-indexed
        selectedColumn={current_column ? current_column - 1 : undefined} // Convertir a 0-indexed
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