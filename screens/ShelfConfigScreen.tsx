import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function ShelfConfigScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [rows, setRows] = useState('');
  const [columns, setColumns] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  useEffect(() => {
    fetchShelfConfig();
  }, [user]);

  const fetchShelfConfig = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('shelf_rows, shelf_columns')
        .eq('id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116: no rows found
        throw error;
      }

      if (data) {
        setRows(data.shelf_rows.toString());
        setColumns(data.shelf_columns.toString());
        setProfileExists(true);
      }
    } catch (error) {
      console.error('Error fetching shelf config:', error);
      Alert.alert('Error', 'No se pudo cargar la configuración de la estantería.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    const numRows = parseInt(rows, 10);
    const numCols = parseInt(columns, 10);

    if (isNaN(numRows) || isNaN(numCols) || numRows <= 0 || numCols <= 0) {
      Alert.alert('Valores inválidos', 'Por favor, introduce un número válido de filas y columnas.');
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc('create_or_update_shelf', {
        user_id: user.id,
        shelf_rows: numRows,
        shelf_columns: numCols,
      });

      if (error) {
        throw error;
      }

      Alert.alert('Guardado', 'La configuración de tu estantería se ha guardado correctamente.');
      navigation.goBack();
    } catch (error: any) {
      console.error('Error detallado al guardar config de estantería:', JSON.stringify(error, null, 2));
      const errorMessage = error.message || 'Ocurrió un error desconocido.';
      Alert.alert('Error', `No se pudo guardar la configuración: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <BothsideLoader />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurar Estantería</Text>
      <Text style={styles.subtitle}>Define la estructura de tu estantería física (ej. tipo Kallax).</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Filas</Text>
        <TextInput
          style={styles.input}
          value={rows}
          onChangeText={setRows}
          keyboardType="number-pad"
          placeholder="Ej: 4"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Columnas</Text>
        <TextInput
          style={styles.input}
          value={columns}
          onChangeText={setColumns}
          keyboardType="number-pad"
          placeholder="Ej: 4"
        />
      </View>

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <BothsideLoader size="small" fullscreen={false} />
        ) : (
          <Text style={styles.buttonText}>Guardar Configuración</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    color: '#495057',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    backgroundColor: '#a0c7ff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 