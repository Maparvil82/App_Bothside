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

interface EditListScreenProps {
  navigation: any;
  route: any;
}

const EditListScreen: React.FC<EditListScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { list } = route.params;

  const [title, setTitle] = useState(list.title || '');
  const [description, setDescription] = useState(list.description || '');
  const [isPublic, setIsPublic] = useState(list.is_public || false);
  const [loading, setLoading] = useState(false);

  const handleSaveChanges = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para editar la lista');
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
        'Lista Actualizada',
        'Los cambios se han guardado correctamente',
        [
          {
            text: 'Ver Maleta',
            onPress: () => navigation.navigate('ViewMaleta', {
              maletaId: list.id,
              listTitle: title.trim()
            }),
          },
          {
            text: 'Continuar Editando',
            onPress: () => { },
          },
        ]
      );
    } catch (error) {
      console.error('Error updating list:', error);
      Alert.alert('Error', 'No se pudo actualizar la lista');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteList = () => {
    Alert.alert(
      'Eliminar Maleta',
      `¿Estás seguro de que quieres eliminar "${list.title}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await UserMaletaService.deleteMaleta(list.id);
              Alert.alert('Lista Eliminada', 'La lista se ha eliminado correctamente', [
                {
                  text: 'OK',
                  onPress: () => navigation.navigate('Maletas'),
                },
              ]);
            } catch (error) {
              console.error('Error deleting list:', error);
              Alert.alert('Error', 'No se pudo eliminar la lista');
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
        'Cancelar Cambios',
        '¿Estás seguro de que quieres cancelar? Se perderán los cambios.',
        [
          { text: 'Continuar Editando', style: 'cancel' },
          { text: 'Cancelar', style: 'destructive', onPress: () => navigation.goBack() },
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
        <Text style={styles.headerTitle}>Editar Maleta</Text>
        <TouchableOpacity
          onPress={handleSaveChanges}
          disabled={loading || !title.trim()}
          style={[styles.saveButton, (!title.trim() || loading) && styles.saveButtonDisabled]}
        >
          <Text style={[styles.saveButtonText, (!title.trim() || loading) && styles.saveButtonTextDisabled]}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Título *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nombre de tu lista"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu lista (opcional)"
              multiline
              numberOfLines={4}
              maxLength={500}
            />
          </View>
        </View>



        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacidad</Text>

          <View style={styles.privacyRow}>
            <View style={styles.privacyInfo}>
              <Text style={styles.privacyTitle}>
                {isPublic ? 'Lista Pública' : 'Lista Privada'}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic
                  ? 'Cualquier usuario puede ver esta lista'
                  : 'Solo tú puedes ver esta lista'
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
          <Text style={styles.sectionTitle}>Acciones Peligrosas</Text>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteList}
            disabled={loading}
          >
            <Ionicons name="trash-outline" size={20} color="white" />
            <Text style={styles.deleteButtonText}>Eliminar Maleta</Text>
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