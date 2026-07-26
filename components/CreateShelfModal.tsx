import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BothsideLoader } from './BothsideLoader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors, ShelfColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateShelfModalProps {
  visible: boolean;
  onClose: () => void;
  onShelfCreated: (shelf?: any) => void;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export const CreateShelfModal: React.FC<CreateShelfModalProps> = ({
  visible,
  onClose,
  onShelfCreated,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

  const [name, setName] = useState('');
  const [rows, setRows] = useState('');
  const [columns, setColumns] = useState('');
  const [selectedColor, setSelectedColor] = useState('green');
  const [saving, setSaving] = useState(false);

  // Reset form each time the modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setRows('');
      setColumns('');
      setSelectedColor('green');
      setSaving(false);
    }
  }, [visible]);

  const numRows = parseInt(rows, 10);
  const numCols = parseInt(columns, 10);

  const handleSave = async () => {
    if (!user) {
      Alert.alert(t('common_error'), t('shelf_edit_error_login'));
      return;
    }

    if (!name.trim()) {
      Alert.alert(
        t('shelf_edit_error_name_required_title'),
        t('shelf_edit_error_name_required_message'),
      );
      return;
    }

    if (isNaN(numRows) || isNaN(numCols) || numRows <= 0 || numCols <= 0) {
      Alert.alert(t('common_invalid_values'), t('shelf_config_error_invalid_dimensions'));
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('shelves')
        .insert({
          user_id: user.id,
          name: name.trim(),
          shelf_rows: numRows,
          shelf_columns: numCols,
          color: selectedColor,
        })
        .select()
        .single();

      if (error) throw error;

      // Mark onboarding state so first-disc modal won't re-appear
      try {
        const key = `has_seen_first_disc_location_modal_${user.id}`;
        await AsyncStorage.setItem(key, 'true');
      } catch (err) {
        console.error('Error saving onboarding state:', err);
      }

      onShelfCreated(data);
      onClose();
    } catch (error: any) {
      Alert.alert(t('common_error'), t('shelf_edit_error_save'));
      console.error('Error saving shelf:', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.kvAvoid}
            >
              <View style={styles.sheet}>
                <View style={styles.sheetInner}>
                  {/* Drag indicator */}
                  <View style={styles.dragIndicator} />

                  {/* Title */}
                  <Text style={styles.title}>{t('shelf_edit_title_create')}</Text>

                  <View>
                    {/* Name */}
                    <Text style={styles.label}>{t('shelf_edit_label_name')}</Text>
                    <TextInput
                      style={styles.input}
                      value={name}
                      onChangeText={setName}
                      placeholder={t('shelf_edit_placeholder_name')}
                      placeholderTextColor="#9EA0A4"
                      returnKeyType="next"
                      autoFocus={false}
                    />

                    {/* Rows / Columns */}
                    <View style={styles.rowContainer}>
                      <View style={styles.halfField}>
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
                      <View style={styles.spacer} />
                      <View style={styles.halfField}>
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

                    {/* Color Selector */}
                    <Text style={[styles.label, { marginTop: 20 }]}>{t('shelf_edit_label_color')}</Text>
                    <View style={styles.colorSelectorContainer}>
                      {Object.keys(ShelfColors).map((colorKey) => {
                        const colorscheme = ShelfColors[colorKey as keyof typeof ShelfColors];
                        const isSelected = selectedColor === colorKey;
                        return (
                          <TouchableOpacity
                            key={colorKey}
                            style={[
                              styles.colorCircle,
                              { backgroundColor: colorscheme.bg, borderColor: colorscheme.text },
                              isSelected && styles.colorCircleSelected
                            ]}
                            onPress={() => setSelectedColor(colorKey)}
                          >
                            {isSelected && (
                              <View style={[styles.colorCircleInner, { backgroundColor: colorscheme.text }]} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Save button */}
                    <TouchableOpacity
                      style={[
                        styles.button,
                        { backgroundColor: primaryColor },
                        saving && styles.buttonDisabled,
                      ]}
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
                </View>
              </View>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  kvAvoid: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
  },
  sheetInner: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
    color: '#1C1C1E',
    marginBottom: 20,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  halfField: {
    flex: 1,
  },
  spacer: {
    width: 16,
  },
  button: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
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
    letterSpacing: 0.4,
  },
  colorSelectorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    transform: [{ scale: 1.15 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  colorCircleInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
});
