import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function ShelfEditScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { shelf } = (route.params as { shelf?: any }) || {};

  const [name, setName] = useState(shelf?.name || '');
  const [rows, setRows] = useState(shelf?.shelf_rows?.toString() || '');
  const [columns, setColumns] = useState(shelf?.shelf_columns?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!shelf);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? 'Editar Estantería' : 'Crear Estantería',
    });
  }, [navigation, isEditMode]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Nombre requerido', 'Por favor, dale un nombre a tu estantería.');
      return;
    }

    const numRows = parseInt(rows, 10);
    const numCols = parseInt(columns, 10);

    if (isNaN(numRows) || isNaN(numCols) || numRows <= 0 || numCols <= 0) {
      Alert.alert('Valores inválidos', 'Por favor, introduce un número válido de filas y columnas.');
      return;
    }

    setSaving(true);

    const shelfData = {
      user_id: user.id,
      name: name.trim(),
      shelf_rows: numRows,
      shelf_columns: numCols,
    };

    try {
      let error;
      if (isEditMode) {
        const { error: updateError } = await supabase
          .from('shelves')
          .update(shelfData)
          .eq('id', shelf.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('shelves')
          .insert(shelfData);
        error = insertError;
      }

      if (error) throw error;

      Alert.alert('¡Guardado!', 'Tu estantería se ha guardado correctamente.');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo guardar la estantería.');
      console.error('Error saving shelf:', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Nombre de la Estantería</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Ej: Kallax Principal"
      />

      <Text style={styles.label}>Filas</Text>
      <TextInput
        style={styles.input}
        value={rows}
        onChangeText={setRows}
        keyboardType="number-pad"
        placeholder="Ej: 4"
      />

      <Text style={styles.label}>Columnas</Text>
      <TextInput
        style={styles.input}
        value={columns}
        onChangeText={setColumns}
        keyboardType="number-pad"
        placeholder="Ej: 4"
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Guardar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#495057',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#A0C7FF',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 