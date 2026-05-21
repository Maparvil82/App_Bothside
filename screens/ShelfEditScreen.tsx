import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, TouchableWithoutFeedback, Keyboard, SafeAreaView } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';

export default function ShelfEditScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const { shelf } = (route.params as { shelf?: any }) || {};

  const [name, setName] = useState(shelf?.name || '');
  const [rows, setRows] = useState(shelf?.shelf_rows?.toString() || '');
  const [columns, setColumns] = useState(shelf?.shelf_columns?.toString() || '');
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!shelf);

  // Configurar título del encabezado
  useEffect(() => {
    navigation.setOptions({
      title: isEditMode ? t('shelf_edit_title_edit') : t('shelf_edit_title_create'),
    });
  }, [navigation, isEditMode]);

  // Ocultar la barra de pestañas visualmente durante el flujo de creación/edición
  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    }
  }, [navigation]);

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
        <View style={styles.formContainer}>
          <Text style={styles.label}>{t('shelf_edit_label_name')}</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('shelf_edit_placeholder_name')}
            placeholderTextColor="#9EA0A4"
          />

          <View style={styles.rowContainer}>
            <View style={styles.columnField}>
              <Text style={styles.label}>{t('common_rows')}</Text>
              <TextInput
                style={styles.input}
                value={rows}
                onChangeText={setRows}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                placeholderTextColor="#9EA0A4"
              />
            </View>
            <View style={styles.spacingWidth} />
            <View style={styles.columnField}>
              <Text style={styles.label}>{t('common_columns')}</Text>
              <TextInput
                style={styles.input}
                value={columns}
                onChangeText={setColumns}
                keyboardType="number-pad"
                placeholder="e.g. 5"
                placeholderTextColor="#9EA0A4"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, saving && styles.buttonDisabled, { backgroundColor: primaryColor }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <BothsideLoader size="small" fullscreen={false} />
            ) : (
              <Text style={styles.buttonText}>{t('common_save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 36,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    color: '#1C1C1E',
    marginBottom: 28,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  columnField: {
    flex: 1,
  },
  spacingWidth: {
    width: 20,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});