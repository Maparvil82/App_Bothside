import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';

interface AddSessionNoteModalProps {
  visible: boolean;
  sessionId: string | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddSessionNoteModal: React.FC<AddSessionNoteModalProps> = ({
  visible,
  sessionId,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!noteText.trim()) {
      Alert.alert(t('common_error'), t('session_note_error_empty'));
      return;
    }

    if (!sessionId || !user?.id) {
      Alert.alert(t('common_error'), t('session_note_error_session_user'));
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from('session_notes').insert({
        session_id: sessionId,
        user_id: user.id,
        note_text: noteText,
        created_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      Alert.alert(t('common_success'), t('session_note_success_save'));
      setNoteText('');
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error al guardar la nota:', error);
      Alert.alert(t('common_error'), t('session_note_error_save'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNoteText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
        <View style={[styles.modalContent, { backgroundColor: '#fff' }]}>
          <Text style={[styles.title, { color: '#000' }]}>{t('session_note_title')}</Text>
          <Text style={[styles.subtitle, { color: '#000' }]}>
            {t('session_note_subtitle')}
          </Text>

          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: '#f5f5f5',
                borderColor: '#ddd',
                color: '#000',
              },
            ]}
            placeholder={t('session_note_placeholder')}
            placeholderTextColor="#99999980"
            multiline
            numberOfLines={6}
            maxLength={500}
            value={noteText}
            onChangeText={setNoteText}
            editable={!isSaving}
          />

          <Text style={[styles.charCount, { color: '#000' }]}>
            {noteText.length}/500
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: '#ddd' }]}
              onPress={handleCancel}
              disabled={isSaving}
            >
              <Text style={[styles.buttonText, { color: '#000' }]}>{t('common_cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: '#000' }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <BothsideLoader size="small" fullscreen={false} />
              ) : (
                <Text style={styles.saveButtonText}>{t('common_save')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 8,
    fontSize: 14,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
    opacity: 0.6,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  saveButton: {
    minHeight: 44,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
