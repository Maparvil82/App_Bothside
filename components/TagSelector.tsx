import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getColorForTag } from '../src/utils/getColorForTag';
import { useTranslation } from '../src/i18n/useTranslation';

interface TagSelectorProps {
  visible: boolean;
  currentTag?: string;
  onClose: () => void;
  onSelectTag: (tag: string) => void;
}

export default function TagSelector({
  visible,
  currentTag,
  onClose,
  onSelectTag,
}: TagSelectorProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [existingTags, setExistingTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Cargar tags existentes desde Supabase
  useEffect(() => {
    if (visible && user?.id) {
      loadExistingTags();
    }
  }, [visible, user?.id]);

  const loadExistingTags = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('tag')
        .eq('user_id', user.id)
        .not('tag', 'is', null);

      if (error) {
        console.error('Error al cargar tags:', error);
        setExistingTags([]);
        return;
      }

      // Limpiar, normalizar y eliminar duplicados
      const tagsSet = new Set<string>();
      if (data) {
        data.forEach((item) => {
          if (item.tag) {
            const normalizedTag = item.tag.trim();
            if (normalizedTag) {
              tagsSet.add(normalizedTag);
            }
          }
        });
      }

      // Convertir a array y ordenar alfabéticamente
      const sortedTags = Array.from(tagsSet).sort((a, b) =>
        a.localeCompare(b, 'es', { sensitivity: 'base' })
      );

      setExistingTags(sortedTags);
    } catch (error) {
      console.error('Error al cargar tags:', error);
      setExistingTags([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar tags según el texto de búsqueda
  const filteredTags = useMemo(() => {
    if (!searchText.trim()) {
      return existingTags;
    }

    const searchLower = searchText.trim().toLowerCase();
    return existingTags.filter((tag) =>
      tag.toLowerCase().includes(searchLower)
    );
  }, [existingTags, searchText]);

  // Verificar si el texto de búsqueda es un tag nuevo
  const isNewTag = useMemo(() => {
    if (!searchText.trim()) return false;
    const searchLower = searchText.trim().toLowerCase();
    return !existingTags.some(
      (tag) => tag.toLowerCase() === searchLower
    );
  }, [searchText, existingTags]);

  const handleSelectTag = (tag: string) => {
    onSelectTag(tag);
    setSearchText('');
    onClose();
  };

  const handleCreateNewTag = () => {
    if (searchText.trim()) {
      handleSelectTag(searchText.trim());
    }
  };

  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  const renderTagItem = ({ item }: { item: string }) => {
    const tagColor = getColorForTag(item);

    return (
      <TouchableOpacity
        style={[styles.tagItem, { backgroundColor: tagColor }]}
        onPress={() => handleSelectTag(item)}
        activeOpacity={0.7}
      >
        <View style={styles.tagItemContent}>
          <View style={[styles.tagColorDot, { backgroundColor: tagColor }]} />
          <Text style={styles.tagItemText}>{item}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <SafeAreaView style={styles.modalOverlay} edges={['bottom']}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>{t('tag_selector_title')}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {/* Campo de búsqueda/creación */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={t('tag_selector_placeholder')}
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.trim() && (
                <TouchableOpacity onPress={() => setSearchText('')}>
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            {/* Opción "Crear nuevo tag" */}
            {isNewTag && (
              <TouchableOpacity
                style={styles.createNewTagButton}
                onPress={handleCreateNewTag}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={24} color="#000" />
                <Text style={styles.createNewTagText}>
                  {t('tag_selector_create_new')} <Text style={styles.createNewTagValue}>{searchText.trim()}</Text>
                </Text>
              </TouchableOpacity>
            )}

            {/* Lista de tags */}
            {loading ? (
              <View style={styles.loadingContainer}>
                <BothsideLoader size="small" fullscreen={false} />
              </View>
            ) : (
              <FlatList
                data={filteredTags}
                renderItem={renderTagItem}
                keyExtractor={(item) => item}
                style={styles.tagsList}
                contentContainerStyle={styles.tagsListContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Ionicons name="pricetag-outline" size={48} color="#CCC" />
                    <Text style={styles.emptyText}>
                      {searchText.trim()
                        ? t('tag_selector_no_results')
                        : t('tag_selector_empty')}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    padding: 0,
  },
  createNewTagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000',
  },
  createNewTagText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 8,
    fontWeight: '500',
  },
  createNewTagValue: {
    fontWeight: '700',
  },
  tagsList: {
    flex: 1,
  },
  tagsListContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  tagItemText: {
    fontSize: 16,
    color: '#1B1B1B',
    fontWeight: '500',
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
    fontWeight: '500',
  },
});

