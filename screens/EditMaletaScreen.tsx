import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { UserMaletaService } from '../services/database';
import { useTranslation } from '../src/i18n/useTranslation';

interface EditListScreenProps {
  navigation: any;
  route: any;
}

const EditListScreen: React.FC<EditListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { list } = route.params;

  const [title, setTitle] = useState(list.title || '');
  const [description, setDescription] = useState(list.description || '');
  const [isPublic, setIsPublic] = useState(list.is_public || false);
  const [loading, setLoading] = useState(false);

  const handleSaveChanges = async () => {
    if (!title.trim()) {
      Alert.alert(t('common_error'), t('edit_maleta_error_title_required'));
      return;
    }

    if (!user) {
      Alert.alert(t('common_error'), t('edit_maleta_error_login_required'));
      return;
    }

    try {
      setLoading(true);
      await UserMaletaService.updateMaleta(list.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
      });

      Alert.alert(
        t('edit_maleta_success_update_title'),
        t('edit_maleta_success_update_message'),
        [
          {
            text: t('edit_maleta_action_view'),
            onPress: () => navigation.navigate('ViewMaleta', {
              maletaId: list.id,
              listTitle: title.trim()
            }),
          },
          {
            text: t('edit_maleta_action_continue'),
            onPress: () => { },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating list:', error);
      Alert.alert(t('common_error'), t('edit_maleta_error_update'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      t('edit_maleta_delete_title'),
      `${t('edit_maleta_delete_confirm_message')} "${list.title}"?`,
      [
        { text: t('common_cancel'), style: 'cancel' },
        {
          text: t('common_delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await UserMaletaService.deleteMaleta(list.id);
              Alert.alert(t('edit_maleta_success_delete_title'), t('edit_maleta_success_delete_message'), [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Maletas'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert(t('common_error'), t('edit_maleta_error_delete'));
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCancel = () => {
    const hasChanges =
      title !== list.title ||
      description !== list.description ||
      isPublic !== list.is_public;

    if (hasChanges) {
      Alert.alert(
        t('edit_maleta_cancel_changes_title'),
        t('edit_maleta_cancel_changes_message'),
        [
          { text: t('edit_maleta_action_continue'), style: 'cancel' },
          { text: t('common_cancel'), style: 'destructive', onPress: () => navigation.goBack() },
        ]
      );
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('edit_maleta_header')}</Text>
        <TouchableOpacity
          onPress={handleSaveChanges}
          disabled={loading || !title.trim()}
          style={[styles.saveButton, (!title.trim() || loading) && styles.saveButtonDisabled]}
        >
          <Text style={[styles.saveButtonText, (!title.trim() || loading) && styles.saveButtonTextDisabled]}>
            {loading ? t('common_saving') : t('common_save')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('edit_maleta_section_basic')}</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('edit_maleta_label_title')}</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder={t('edit_maleta_placeholder_title')}
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('edit_maleta_label_description')}</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('edit_maleta_placeholder_description')}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('edit_maleta_section_privacy')}</Text>

          <View style={styles.privacyRow}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>
                {isPublic ? t('edit_maleta_privacy_public') : t('edit_maleta_privacy_private')}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic
                  ? t('edit_maleta_privacy_public_desc')
                  : t('edit_maleta_privacy_private_desc')
                }
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{ false: '#E5E5E5', true: '#007AFF' }}
              thumbColor={isPublic ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('edit_maleta_section_danger')}</Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteList}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>{t('edit_maleta_delete_title')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  cancelButton: {
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1A1A1A',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  privacyInfo: {
    flex: 1,
    marginRight: 16,
  },
  privacyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  privacyDescription: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 16,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default EditListScreen; 