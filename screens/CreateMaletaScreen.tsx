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

interface CreateListScreenProps {
  navigation: any;
}

const CreateListScreen: React.FC<CreateListScreenProps> = ({ navigation }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCreateList = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear una maleta');
      return;
    }

    console.log('🔍 Debug - Usuario actual:', user);
    console.log('🔍 Debug - Datos de la lista a crear:', {
      title: title.trim(),
      description: description.trim() || undefined,
      is_public: isPublic,
      user_id: user.id,
    });

    try {
      setLoading(true);
      const newList = await UserMaletaService.createMaleta({
        title: title.trim(),
        description: description.trim() || undefined,
        is_public: isPublic,
        user_id: user.id,
      });

      console.log('✅ Debug - Maleta creada exitosamente:', newList);

      // Simplificar el flujo: solo ir a la pantalla de listas
      console.log('✅ CreateListScreen: Maleta creada exitosamente:', newList);
      
      Alert.alert(
        'Maleta Creada',
        'Tu maleta se ha creado correctamente',
        [
          {
            text: 'Ver Maleta',
            onPress: () => {
              console.log('🔍 CreateListScreen: Navigating to ViewList');
              try {
                navigation.navigate('ViewMaleta', { 
                  maletaId: newList.id, 
                  listTitle: newList.title 
                });
              } catch (error) {
                console.error('❌ CreateListScreen: Navigation error:', error);
                // Fallback: ir a listas
                navigation.goBack();
              }
            },
          },
          {
            text: 'Volver a Maletas',
            onPress: () => {
              console.log('🔍 CreateListScreen: Going back to ListsScreen');
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('❌ Debug - Error creating list:', error);
      console.error('❌ Debug - Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      Alert.alert('Error', `No se pudo crear la maleta: ${error?.message || 'Error desconocido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (title.trim() || description.trim()) {
      Alert.alert(
        'Cancelar',
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
        <Text style={styles.headerTitle}>Crear Maleta</Text>
        <TouchableOpacity
          onPress={handleCreateList}
          disabled={loading || !title.trim()}
          style={[styles.createButton, (!title.trim() || loading) && styles.createButtonDisabled]}
        >
          <Text style={[styles.createButtonText, (!title.trim() || loading) && styles.createButtonTextDisabled]}>
            Crear
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
              placeholder="Nombre de tu maleta"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe tu maleta (opcional)"
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
                {isPublic ? 'Maleta Pública' : 'Maleta Privada'}
              </Text>
              <Text style={styles.privacyDescription}>
                {isPublic 
                  ? 'Cualquier usuario puede ver esta maleta'
                  : 'Solo tú puedes ver esta maleta'
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
          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoCard}>
            <Ionicons name="information-circle-outline" size={20} color="#007AFF" />
            <Text style={styles.infoText}>
              Puedes añadir álbumes a tu maleta después de crearla. Las maletas te ayudan a organizar tu colección de diferentes maneras.
            </Text>
          </View>
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
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonTextDisabled: {
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
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    padding: 16,
    borderRadius: 8,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    marginLeft: 12,
    lineHeight: 20,
  },
});

export default CreateListScreen; 