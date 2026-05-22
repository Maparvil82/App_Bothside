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
import Svg, { Line, Rect } from 'react-native-svg';
import { BothsideLoader } from './BothsideLoader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';

// ─── Props ───────────────────────────────────────────────────────────────────

interface CreateShelfModalProps {
  visible: boolean;
  onClose: () => void;
  onShelfCreated: () => void;
}

// ─── Grid Preview ─────────────────────────────────────────────────────────────

const MAX_PREVIEW_ROWS = 6;
const MAX_PREVIEW_COLS = 8;
const PREVIEW_HEIGHT = 80;

interface ShelfGridPreviewProps {
  rows: number;
  cols: number;
}

const ShelfGridPreview: React.FC<ShelfGridPreviewProps> = ({ rows, cols }) => {
  const clampedRows = Math.min(Math.max(rows, 1), MAX_PREVIEW_ROWS);
  const clampedCols = Math.min(Math.max(cols, 1), MAX_PREVIEW_COLS);

  const containerWidth = 260; // fixed logical width for the preview SVG
  const cellW = containerWidth / clampedCols;
  const cellH = PREVIEW_HEIGHT / clampedRows;

  const horizontalLines = Array.from({ length: clampedRows + 1 }, (_, i) => i * cellH);
  const verticalLines = Array.from({ length: clampedCols + 1 }, (_, i) => i * cellW);

  return (
    <View style={previewStyles.container}>
      <Svg
        width={containerWidth}
        height={PREVIEW_HEIGHT}
        viewBox={`0 0 ${containerWidth} ${PREVIEW_HEIGHT}`}
      >
        {/* Background rect */}
        <Rect
          x={0}
          y={0}
          width={containerWidth}
          height={PREVIEW_HEIGHT}
          fill="#F9F9F9"
          rx={6}
        />
        {/* Outer border */}
        <Rect
          x={0.5}
          y={0.5}
          width={containerWidth - 1}
          height={PREVIEW_HEIGHT - 1}
          fill="none"
          stroke="#D1D5DB"
          strokeWidth={1}
          rx={6}
        />
        {/* Horizontal inner lines */}
        {horizontalLines.slice(1, -1).map((y, i) => (
          <Line
            key={`h-${i}`}
            x1={0}
            y1={y}
            x2={containerWidth}
            y2={y}
            stroke="#E5E7EB"
            strokeWidth={0.8}
          />
        ))}
        {/* Vertical inner lines */}
        {verticalLines.slice(1, -1).map((x, i) => (
          <Line
            key={`v-${i}`}
            x1={x}
            y1={0}
            x2={x}
            y2={PREVIEW_HEIGHT}
            stroke="#E5E7EB"
            strokeWidth={0.8}
          />
        ))}
      </Svg>
      <Text style={previewStyles.label}>
        {clampedRows} × {clampedCols}
      </Text>
    </View>
  );
};

const previewStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  label: {
    marginTop: 6,
    fontSize: 11,
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
});

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
  const [saving, setSaving] = useState(false);

  // Reset form each time the modal opens
  useEffect(() => {
    if (visible) {
      setName('');
      setRows('');
      setColumns('');
      setSaving(false);
    }
  }, [visible]);

  const numRows = parseInt(rows, 10);
  const numCols = parseInt(columns, 10);
  const previewRows = isNaN(numRows) || numRows <= 0 ? 1 : numRows;
  const previewCols = isNaN(numCols) || numCols <= 0 ? 1 : numCols;

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
      const { error } = await supabase.from('shelves').insert({
        user_id: user.id,
        name: name.trim(),
        shelf_rows: numRows,
        shelf_columns: numCols,
      });

      if (error) throw error;

      // Mark onboarding state so first-disc modal won't re-appear
      try {
        const key = `has_seen_first_disc_location_modal_${user.id}`;
        await AsyncStorage.setItem(key, 'true');
        await AsyncStorage.setItem(`onboarding_completed_${user.id}`, 'true');
      } catch (err) {
        console.error('Error saving onboarding state:', err);
      }

      onShelfCreated();
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
                {/* iPad/large screen safety: constrain width */}
                <View style={styles.sheetInner}>
                  {/* Drag indicator */}
                  <View style={styles.dragIndicator} />

                  {/* Title */}
                  <Text style={styles.title}>{t('shelf_edit_title_create')}</Text>

                  <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
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

                    {/* Live grid preview */}
                    <ShelfGridPreview rows={previewRows} cols={previewCols} />

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
                  </ScrollView>
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
    // iPad centering safety — sheet never stretches wider than 560pt
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
});
