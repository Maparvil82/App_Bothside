import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';

export default function ShelfEditScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { shelf } = (route.params as { shelf?: any }) || {};

  const [name, setName] = useState(shelf?.name || '');
  const [rows, setRows] = useState(shelf?.shelf_rows?.toString() || '');
  const [columns, setColumns] = useState(shelf?.shelf_columns?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!shelf);

  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? t('shelf_edit_title_edit') : t('shelf_edit_title_create'),
    });
  }, [navigation, isEditMode]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert(t('common_error'), t('shelf_edit_error_login'));
      setSaving(false);
      return;
    }

    if (!name.trim()) {
      Alert.alert(t('shelf_edit_error_name_required_title'), t('shelf_edit_error_name_required_message'));
      return;
    }

    const numRows = parseInt(rows, 10);
    const numCols = parseInt(columns, 10);

    if (isNaN(numRows) || isNaN(numCols) || numRows <= 0 || numCols <= 0) {
      Alert.alert(t('common_invalid_values'), t('shelf_config_error_invalid_dimensions'));
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

      Alert.alert(t('common_saved'), t('shelf_edit_success_save'));
      navigation.goBack();
    } catch (error: any) {
      Alert.alert(t('common_error'), t('shelf_edit_error_save'));
      console.error('Error saving shelf:', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('shelf_edit_label_name')}</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={t('shelf_edit_placeholder_name')}
      />

      <Text style={styles.label}>{t('common_rows')}</Text>
      <TextInput
        style={styles.input}
        value={rows}
        onChangeText={setRows}
        keyboardType="number-pad"
        placeholder={t('shelf_config_placeholder_dimension')}
      />

      <Text style={styles.label}>{t('common_columns')}</Text>
      <TextInput
        style={styles.input}
        value={columns}
        onChangeText={setColumns}
        keyboardType="number-pad"
        placeholder={t('shelf_config_placeholder_dimension')}
      />

      <TouchableOpacity
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <BothsideLoader size="small" fullscreen={false} />
        ) : (
          <Text style={styles.buttonText}>{t('common_save')}</Text>
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