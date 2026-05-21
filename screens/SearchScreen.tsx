import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Animated,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Modal,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { useGems } from '../contexts/GemsContext';
import { useStats } from '../contexts/StatsContext';
import { DiscogsService } from '../services/discogs';
import { AlbumService, UserCollectionService, UserMaletaService } from '../services/database';
import { DiscogsRelease } from '../types';
import { supabase } from '../lib/supabase';
import { MaletaCoverCollage } from '../components/MaletaCoverCollage';
import { AudioRecorder } from '../components/AudioRecorder';
import { AudioPlayer } from '../components/AudioPlayer';
import { FloatingAudioPlayer } from '../components/FloatingAudioPlayer';
import { ENV } from '../config/env';
import { Audio } from 'expo-av';
import { useTranslation } from '../src/i18n/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CreateMaletaModalContext } from '../contexts/CreateMaletaModalContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Función para normalizar cadenas (quitar acentos, paréntesis, etc.)
const normalize = (str: string) =>
  str
    ?.toLowerCase()
    ?.normalize("NFD")
    ?.replace(/[\u0300-\u036f]/g, "") // quitar acentos
    ?.replace(/\(.*?\)/g, "") // quitar info entre paréntesis tipo (Remastered), (2011)
    ?.replace(/[^a-z0-9]/g, "") // quitar símbolos
    ?.trim();

export const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const { addGem, removeGem, isGem, updateGemStatus } = useGems();
  const { refreshStats } = useStats();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const { t } = useTranslation();
  const searchInputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCollectionLoading, setIsCollectionLoading] = useState(true);
  const [collection, setCollection] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'year' | 'artist' | 'label'>('date');
  const [filterByStyle, setFilterByStyle] = useState<string>('');
  const [filterByYear, setFilterByYear] = useState<string>('');
  const [filterByLabel, setFilterByLabel] = useState<string>('');
  const [filterByLocation, setFilterByLocation] = useState<string>('');
  const [filterByAudioNotes, setFilterByAudioNotes] = useState<boolean>(false);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);

  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Estados para el modal de añadir a maleta
  const [showAddToShelfModal, setShowAddToShelfModal] = useState(false);
  const [userLists, setUserMaletas] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [showCreateShelfForm, setShowCreateShelfForm] = useState(false);
  const [newShelfTitle, setNewShelfTitle] = useState('');
  const [newShelfDescription, setNewShelfDescription] = useState('');
  const [newShelfIsPublic, setNewShelfIsPublic] = useState(false);

  // Estados para el modal de asignar Ubicación física
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [physicalShelves, setPhysicalShelves] = useState<any[]>([]);
  const [selectedAlbumForLocation, setSelectedAlbumForLocation] = useState<any>(null);

  const [showEditionsModal, setShowEditionsModal] = useState(false);
  const [editions, setEditions] = useState<any[]>([]);
  const [editionsLoading, setEditionsLoading] = useState(false);
  const [selectedAlbumForEdit, setSelectedAlbumForEdit] = useState<any>(null);

  // Estados para audio
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [selectedAlbumForAudio, setSelectedAlbumForAudio] = useState<any>(null);

  // Estados para reproductor flotante
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');

  // --- DELETE MODAL STATE ---
  const [showDeleteRecordModal, setShowDeleteRecordModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<any>(null);
  const [isDeletingRecord, setIsDeletingRecord] = useState(false);

  // --- FIRST DISC SHELF SUGGESTION MODAL ---
  const [showFirstDiscModal, setShowFirstDiscModal] = useState(false);
  const { openCreateMaletaModal } = React.useContext(CreateMaletaModalContext);
  // --------------------------

  // Helper to truncate title
  const truncate = (text: string, maxLen = 30) =>
    text && text.length > maxLen ? text.slice(0, maxLen) + "…" : text;

  // Controlar visualmente la visibilidad del tab bar inferior según collection.length y estado de carga
  useEffect(() => {
    const parent = navigation.getParent();
    if (!parent) return;

    const hideTabBar = isCollectionLoading || collection.length === 0;

    if (hideTabBar) {
      parent.setOptions({
        tabBarStyle: { display: 'none' }
      });
    } else {
      parent.setOptions({
        tabBarStyle: {
          height: 80,
          paddingTop: 14,
          justifyContent: 'center',
          alignItems: 'center',
        }
      });
    }
  }, [collection.length, isCollectionLoading, navigation]);

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  // Efecto para sincronizar el estado de gems cuando se navegue de vuelta
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 SearchScreen: Screen focused, syncing gem status');
      
      // Aplicar visibilidad del tab bar inmediatamente al enfocar la pantalla para evitar parpadeos
      const parent = navigation.getParent();
      if (parent) {
        const hideTabBar = isCollectionLoading || collection.length === 0;
        if (hideTabBar) {
          parent.setOptions({
            tabBarStyle: { display: 'none' }
          });
        }
      }

      // Recargar la colección para sincronizar el estado de gems
      if (user) {
        loadCollection();
      }
    });

    return unsubscribe;
  }, [navigation, user, collection.length, isCollectionLoading]);

  useEffect(() => {
    sortCollection();
  }, [collection, sortBy, filterByStyle, filterByYear, filterByLabel, filterByLocation, filterByAudioNotes, query]);

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  useEffect(() => {
    const checkFirstDiscModal = async () => {
      if (!user) return;
      const key = `has_seen_first_disc_location_modal_${user.id}`;

      // Si no tiene discos en su colección, reseteamos el estado visto en AsyncStorage
      if (collection.length === 0) {
        try {
          await AsyncStorage.removeItem(key);
        } catch (error) {
          console.error('Error resetting first disc modal seen status:', error);
        }
        return;
      }

      if (collection.length !== 1) {
        return;
      }

      try {
        const hasSeen = await AsyncStorage.getItem(key);
        if (hasSeen === 'true') {
          return;
        }

        // Comprobar si todavía no tiene ninguna ubicación/estantería creada
        const maletas = await UserMaletaService.getUserMaletas(user.id);
        if (!maletas || maletas.length === 0) {
          setShowFirstDiscModal(true);
        }
      } catch (error) {
        console.error('Error checking first disc shelf suggestion:', error);
      }
    };

    checkFirstDiscModal();
  }, [collection, user]);

  const loadCollection = async () => {
    if (!user) return;
    try {
      setIsCollectionLoading(true);
      // Obtener colección
      const { data: userCollection, error } = await supabase
        .from('user_collection')
        .select(`
          *,
          albums (
            *,
            album_styles (
              styles (*)
            )
          ),
          shelves ( name )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading collection:', error);
        return;
      }

      // Procesar la colección con información de ubicación física
      const collectionWithShelfInfo = (userCollection || []).map((item) => {
        const hasLocation = item.shelves && item.shelves.name;
        const shelfName = hasLocation ? (item.shelves as any).name : null;

        return {
          ...item,
          in_shelf: hasLocation,
          shelf_name: shelfName
        };
      });

      setCollection(collectionWithShelfInfo);

      // Actualizar estadísticas
      await refreshStats();
    } catch (error) {
      console.error('Error loading collection:', error);
    } finally {
      setIsCollectionLoading(false);
    }
  };

  // Función temporal para verificar y asignar estilos a álbumes que no los tienen
  const checkAndAssignStyles = async (collectionData: any[]) => {
    console.log('🔍 Checking albums for missing styles...');

    const albumsWithoutStyles = collectionData.filter(item =>
      !item.albums?.album_styles || item.albums.album_styles.length === 0
    );

    console.log(`📊 Found ${albumsWithoutStyles.length} albums without styles`);

    if (albumsWithoutStyles.length > 0) {
      console.log('⚠️ Albums without styles:');
      albumsWithoutStyles.forEach((item, index) => {
        console.log(`  ${index + 1}. "${item.albums?.title}" by ${item.albums?.artist}`);
      });

      // Por ahora, solo mostrar un mensaje informativo
      console.log('💡 To fix this, you need to:');
      console.log('   1. Ensure albums have styles assigned in the database');
      console.log('   2. Or implement a style assignment system');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCollection();
    } catch (error) {
      console.error('Error refreshing collection:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Función para limpiar todos los filtros
  const clearFilters = () => {
    setFilterByStyle('');
    setFilterByYear('');
    setFilterByLabel('');
    setFilterByLocation('');
    setFilterByAudioNotes(false);
    setQuery('');
  };

  // Verificar si hay algún filtro activo
  const hasActiveFilters = filterByStyle || filterByYear || filterByLabel || filterByLocation || filterByAudioNotes || query.trim();

  // Función para cargar las estanterías del usuario
  const loadUserMaletas = async () => {
    if (!user) return;
    try {
      const lists = await UserMaletaService.getUserMaletasWithAlbums(user.id);
      setUserMaletas(lists || []);
    } catch (error) {

      console.error('Error loading user lists:', error);
      Alert.alert(t('common_error'), t('search_error_loading_shelves'));
    }
  };

  // Función para añadir álbum a una estantería
  const addAlbumToShelf = async (maletaId: string) => {
    if (!selectedAlbum || !user) return;

    try {
      // Verificar si el álbum ya está en la estantería
      const isAlreadyInList = await UserMaletaService.isAlbumInMaleta(maletaId, selectedAlbum.albums.id);

      if (isAlreadyInList) {
        Alert.alert(t('common_warning'), t('search_alert_album_in_shelf'));
        return;
      }

      await UserMaletaService.addAlbumToMaleta(maletaId, selectedAlbum.albums.id);
      Alert.alert(t('common_success'), t('search_success_added_to_shelf'));
      setShowAddToShelfModal(false);
      setSelectedAlbum(null);

      // Navegar a Mis Maletas
      navigation.navigate('MaletasTab');
    } catch (error) {
      console.error('Error adding album to list:', error);
      Alert.alert(t('common_error'), t('search_error_adding_to_shelf'));
    }
  };

  // Función para crear nueva estantería
  const createNewShelf = async () => {
    if (!user || !newShelfTitle.trim()) return;

    try {
      const newList = await UserMaletaService.createMaleta({
        title: newShelfTitle.trim(),
        description: newShelfDescription.trim(),
        is_public: newShelfIsPublic,
        user_id: user.id
      });

      // Añadir el álbum a la nueva estantería
      await UserMaletaService.addAlbumToMaleta(newList.id, selectedAlbum.albums.id);

      Alert.alert(t('common_success'), t('search_success_shelf_created'));
      setShowAddToShelfModal(false);
      setShowCreateShelfForm(false);
      setSelectedAlbum(null);
      setNewShelfTitle('');
      setNewShelfDescription('');
      setNewShelfIsPublic(false);

      // Navegar a Mis Maletas
      navigation.navigate('MaletasTab');
    } catch (error) {
      console.error('Error creating list:', error);
      Alert.alert(t('common_error'), t('search_error_creating_shelf'));
    }
  };

  // Función para cargar las estanterías físicas (shelves)
  const loadPhysicalShelves = async () => {
    if (!user) return;

    try {
      const { data: shelvesData, error: shelvesError } = await supabase
        .from('shelves')
        .select('id, name, shelf_rows, shelf_columns')
        .eq('user_id', user.id);

      if (shelvesError) throw shelvesError;

      setPhysicalShelves(shelvesData || []);
    } catch (error) {
      console.error('Error loading physical shelves:', error);
      Alert.alert(t('common_error'), t('search_error_loading_locations'));
    }
  };

  const confirmDeleteRecord = (item: any) => {
    const truncatedTitle = truncate(item.albums?.title || '');

    Alert.alert(
      t("collection_delete_title", { title: truncatedTitle }),
      t("collection_delete_message"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("delete"),
          style: "destructive",
          onPress: () => handleDeleteRecordConfirmed(item.albums.id)
        }
      ],
      { cancelable: true }
    );
  };

  const handleDeleteRecordConfirmed = async (albumId: string) => {
    if (!user) return;

    try {
      setIsDeletingRecord(true);

      // Execute deletion
      await UserCollectionService.removeFromCollection(user.id, albumId);

      // Refresh collection
      await loadCollection();

      // Show success message (optional, but good UX)
      // toast.success(t('search_success_deleted')); // User requested toast but I don't see toast import. 
      // Existing code used Alert for success, but user mentioned toast in prompt. 
      // I will stick to existing Alert for success or just refresh, as user said "toast.success" in prompt but might be pseudo-code.
      // Actually, user said "toast.success" in the prompt example. 
      // I'll check if toast is available, otherwise I'll use Alert or nothing if it auto-refreshes.
      // The previous code had Alert.alert(t('common_success'), t('search_success_deleted'));
      // I will keep the Alert for consistency if toast is not obvious.
      // Wait, user said "toast.success" in the requested code block. 
      // I'll check imports for toast. If not found, I'll use Alert.

      Alert.alert(t('common_success'), t('search_success_deleted'));

    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert(t('common_error'), t('search_error_deleting'));
    } finally {
      setIsDeletingRecord(false);
    }
  };

  const handleLongPress = (item: any) => {
    // Determinar el texto de la opción de ubicación
    const locationOptionText = item.shelf_name
      ? t('search_action_change_location')
      : t('search_action_assign_location');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [t('common_cancel'), locationOptionText, t('common_delete')],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 0,
          title: item.albums?.title || t('common_album'),
          message: t('search_action_sheet_title'),
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Ubicar
            setSelectedAlbumForLocation(item);
            loadPhysicalShelves();
            setShowLocationModal(true);
          } else if (buttonIndex === 2) {
            // Eliminar
            confirmDeleteRecord(item);
          }
        }
      );
    } else {
      Alert.alert(
        item.albums?.title || t('common_album'),
        t('search_action_sheet_title'),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: locationOptionText,
            onPress: () => {
              setSelectedAlbumForLocation(item);
              loadPhysicalShelves();
              setShowLocationModal(true);
            }
          },
          { text: t('common_delete'), style: 'destructive', onPress: () => confirmDeleteRecord(item) },
        ]
      );
    }
  };

  // Legacy direct delete function - kept for reference but unused in UI now
  const handleDeleteItem = async (item: any) => {
    confirmDeleteRecord(item);
  };

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = filteredCollection.find(col => col.id === rowKey);
    if (item) {
      confirmDeleteRecord(item);
    }
    rowMap[rowKey]?.closeRow();
  };

  const handleToggleGem = async (item: any) => {
    if (!user) return;

    try {
      console.log('🔍 handleToggleGem: Toggling gem for item:', {
        itemId: item.id,
        albumId: item.albums?.id,
        albumTitle: item.albums?.title,
        currentGemStatus: item.is_gem
      });

      // Actualizar inmediatamente en la UI local
      const newStatus = !item.is_gem;
      console.log('🔄 handleToggleGem: Updating local UI to:', newStatus);

      setCollection(prev => {
        const updated = prev.map(col =>
          col.id === item.id
            ? { ...col, is_gem: newStatus }
            : col
        );
        console.log('📊 handleToggleGem: Collection updated, new count:', updated.length);
        return updated;
      });

      console.log('📞 handleToggleGem: Calling UserCollectionService.toggleGemStatus');
      const result = await UserCollectionService.toggleGemStatus(user.id, item.albums.id);
      console.log('✅ handleToggleGem: Service call successful:', result);

      // Actualizar el contexto de gems inmediatamente
      console.log('📢 handleToggleGem: Updating gem status in context');
      updateGemStatus(item.albums.id, newStatus);

      if (newStatus) {
        // Si se añadió un gem, añadirlo al contexto
        console.log('📢 handleToggleGem: Adding gem to context');
        addGem(item);
      } else {
        // Si se removió un gem, removerlo del contexto
        console.log('📢 handleToggleGem: Removing gem from context');
        removeGem(item.id);
      }

      Alert.alert(
        t('search_gem_status_title'),
        newStatus
          ? `"${item.albums?.title}" ${t('search_gem_added')}`
          : `"${item.albums?.title}" ${t('search_gem_removed')}`
      );
    } catch (error) {
      console.error('❌ handleToggleGem: Error toggling gem status:', error);
      Alert.alert(t('common_error'), t('search_error_toggling_gem'));

      // Revertir el cambio local si hay error
      console.log('🔄 handleToggleGem: Reverting local change due to error');
      setCollection(prev =>
        prev.map(col =>
          col.id === item.id
            ? { ...col, is_gem: !item.is_gem }
            : col
        )
      );
    }
  };

  const handleSwipeOptions = async (rowMap: any, rowKey: string) => {
    const item = filteredCollection.find(col => col.id === rowKey);
    if (item) {
      // Usar el contexto para determinar si es gem
      const isItemGem = isGem(item.albums?.id);
      const gemAction = isItemGem ? t('search_action_remove_gem') : t('search_action_add_gem');

      console.log('🔍 handleSwipeOptions: Item gem status:', {
        itemId: item.id,
        albumId: item.albums?.id,
        albumTitle: item.albums?.title,
        isGem: isItemGem,
        localIsGem: item.is_gem
      });

      // Preparar opciones dinámicas
      const options = [t('common_cancel'), t('search_action_assign_location'), t('search_action_add_to_shelf'), gemAction, t('search_action_change_version')];

      // Añadir opciones de audio
      if (item.audio_note) {
        options.push(t('search_action_play_audio'), t('search_action_delete_audio'));
      } else {
        options.push(t('search_action_record_audio'));
      }

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: options,
            cancelButtonIndex: 0,

            title: item.albums?.title || t('common_album'),
            message: t('search_action_sheet_title'),
          },
          (buttonIndex) => {
            switch (buttonIndex) {
              case 1: // Asignar Ubicación
                setSelectedAlbumForLocation(item);
                loadPhysicalShelves();
                setShowLocationModal(true);
                break;
              case 2: // Añadir a Maleta
                setSelectedAlbum(item);
                loadUserMaletas();
                setShowAddToShelfModal(true);
                break;
              case 3: // Gem action
                handleToggleGem(item);
                break;
              case 4: // Cambiar versión
                handleEditAlbum(item);
                break;
              case 5: // Audio options
                if (item.audio_note) {
                  handlePlayAudio(item);
                } else {
                  handleRecordAudio(item);
                }
                break;
              case 6: // Delete audio (if exists)
                if (item.audio_note) {
                  handleDeleteAudioNote(item);
                }
                break;
            }
          }
        );
      } else {
        Alert.alert(
          item.albums?.title || t('common_album'),
          t('search_action_sheet_title'),
          [
            { text: t('common_cancel'), style: 'cancel' },
            {
              text: t('search_action_assign_location'), onPress: () => {
                setSelectedAlbumForLocation(item);
                loadPhysicalShelves();
                setShowLocationModal(true);
              }
            },
            {
              text: t('search_action_add_to_shelf'), onPress: () => {
                setSelectedAlbum(item);
                loadUserMaletas();
                setShowAddToShelfModal(true);
              }
            },
            { text: gemAction, onPress: () => handleToggleGem(item) },
            { text: t('search_action_change_version'), onPress: () => handleEditAlbum(item) },
            ...(item.audio_note ? [
              { text: t('search_action_play_audio'), onPress: () => handlePlayAudio(item) },
              { text: t('search_action_delete_audio'), onPress: () => handleDeleteAudioNote(item) }
            ] : [
              { text: t('search_action_record_audio'), onPress: () => handleRecordAudio(item) }
            ])
          ]
        );
      }
    }
    rowMap[rowKey]?.closeRow();
  };

  const renderEmptyState = () => {
    if (isCollectionLoading) {
      return <BothsideLoader />;
    }

    if (collection.length === 0) {
      return (
        <View style={[styles.emptyState, { backgroundColor: '#FFF' }]}>
          <Image source={require('../assets/empty.png')} style={styles.emptyStateImage} />
          <Text style={[styles.emptyStateTitle, { color: '#1A2530' }]}>{t('search_empty_title')}</Text>
          <Text style={[styles.emptyStateSubtitle, { color: '#6B7280' }]}>
            {t('search_empty_subtitle')}
          </Text>
          <TouchableOpacity
            style={[
              styles.createButtonFixed,
              {
                bottom: Math.max(insets.bottom, 20),
                backgroundColor: '#000',
              }
            ]}
            onPress={() => navigation.navigate('Main', { screen: 'AddDiscTab' })}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>{t('search_empty_button')}</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text }]}>{t('search_no_results')}</Text>
      </View>
    );
  };

  const sortCollection = () => {
    let filtered = [...collection];

    // Filtrar por búsqueda
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      filtered = filtered.filter(item =>
        item.albums?.title?.toLowerCase().includes(searchTerm) ||
        item.albums?.artist?.toLowerCase().includes(searchTerm) ||
        item.albums?.label?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por estilo
    if (filterByStyle) {
      filtered = filtered.filter(item => {
        // Primero verificar si el álbum tiene estilos en la base de datos
        if (item.albums?.album_styles?.some((as: any) => as.styles?.name === filterByStyle)) {
          return true;
        }

        // Si no tiene estilos en la base de datos, usar lógica de respaldo
        // Por ahora, mostrar todos los álbumes cuando se selecciona un estilo de respaldo
        // ya que no podemos determinar el estilo real sin datos
        return true;
      });
    }

    // Filtrar por año
    if (filterByYear) {
      filtered = filtered.filter(item => item.albums?.release_year === filterByYear);
    }

    // Filtrar por sello
    if (filterByLabel) {
      filtered = filtered.filter(item => item.albums?.label === filterByLabel);
    }

    // Filtrar por ubicación
    if (filterByLocation) {
      filtered = filtered.filter(item => {
        if (filterByLocation === t('search_filter_no_location')) {
          return !item.shelf_name;
        }
        return item.shelf_name === filterByLocation;
      });
    }

    // Filtrar por notas de audio
    if (filterByAudioNotes) {
      filtered = filtered.filter(item => item.audio_note);
    }

    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'year':
          return (b.albums?.release_year || '') > (a.albums?.release_year || '') ? 1 : -1;
        case 'artist':
          return (a.albums?.artist || '') > (b.albums?.artist || '') ? 1 : -1;
        case 'label':
          return (a.albums?.label || '') > (b.albums?.label || '') ? 1 : -1;
        default:
          return new Date(b.added_at || 0) > new Date(a.added_at || 0) ? 1 : -1;
      }
    });

    setFilteredCollection(filtered);
  };

  const addToCollection = async (release: DiscogsRelease) => {
    if (!user) return;

    try {
      const albumData = {
        title: release.title,
        artist: release.artists?.[0]?.name || t('common_unknown_artist'),
        release_year: release.year?.toString() || '',
        label: release.labels?.[0]?.name || '',
        cover_url: release.cover_image || release.thumb,
        discogs_id: release.id,
      };

      const album = await AlbumService.createAlbum(albumData);

      // ------------------------------------------------------
      // 🔍 1) Comprobar si ya existe EXACTAMENTE este album_id
      // ------------------------------------------------------
      const { data: existingExact } = await supabase
        .from("user_collection")
        .select("id")
        .eq("user_id", user.id)
        .eq("album_id", album.id)
        .maybeSingle();

      if (existingExact) {
        Alert.alert(
          t('search_alert_duplicate_title'),
          t('search_alert_duplicate_message')
        );
        return;
      }

      // ------------------------------------------------------
      // 🔍 2) Comprobar si el usuario tiene OTRA edición
      // ------------------------------------------------------
      if (album.discogs_id) {
        const normArtist = normalize(album.artist);
        const normTitle = normalize(album.title);

        const { data: userAlbums } = await supabase
          .from("user_collection")
          .select(`
            id,
            albums (
              title,
              artist,
              discogs_id
            )
          `)
          .eq("user_id", user.id);

        const otherEdition = userAlbums?.find((item) => {
          const alb = Array.isArray(item.albums) ? item.albums[0] : item.albums;
          if (!alb) return false;

          const sameArtist = normalize(alb.artist) === normArtist;
          const sameTitle = normalize(alb.title) === normTitle;
          const differentDiscogs = alb.discogs_id !== album.discogs_id;

          return sameArtist && sameTitle && differentDiscogs;
        });

        if (otherEdition) {
          Alert.alert(
            t('search_alert_other_edition_title'),
            t('search_alert_other_edition_message')
          );
        }
      }
      // 🟢 3) Si pasa las verificaciones → continuar

      await UserCollectionService.addToCollection(user.id, album.id);

      await loadCollection();

      // Mostrar opciones después de añadir el disco
      Alert.alert(
        t('search_success_added_title'),
        t('search_success_added_message'),
        [
          {
            text: t('search_action_add_more'),
            style: 'default',
            onPress: () => {
              // Mantener en la página actual
            }
          },
          {
            text: t('search_action_go_to_collection'),
            style: 'default',
            onPress: () => {
              navigation.navigate('SearchTab');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert(t('common_error'), t('search_error_adding_to_collection'));
    }
  };

  const getUniqueStyles = () => {
    const styles = new Set<string>();

    // Primero intentar obtener estilos de la base de datos
    collection.forEach(item => {
      if (item.albums?.album_styles && Array.isArray(item.albums.album_styles)) {
        item.albums.album_styles.forEach((as: any) => {
          if (as.styles?.name) {
            styles.add(as.styles.name);
          }
        });
      }
    });

    const result = Array.from(styles).sort();

    // Si no hay estilos en la base de datos, proporcionar estilos comunes
    if (result.length === 0) {
      const fallbackStyles = [
        'Rock',
        'Pop',
        'Jazz',
        'Blues',
        'Folk',
        'Electronic',
        'Hip Hop',
        'Classical',
        'Country',
        'Reggae',
        'Punk',
        'Metal',
        'Soul',
        'Funk',
        'Disco',
        'Alternative',
        'Indie',
        'R&B',
        'Gospel',
        'World Music'
      ];

      fallbackStyles.forEach(style => styles.add(style));
      return Array.from(styles).sort();
    }

    return result;
  };

  const getUniqueYears = () => {
    const years = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.release_year) {
        years.add(item.albums.release_year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  };

  const getUniqueLabels = () => {
    const labels = new Set<string>();
    collection.forEach(item => {
      if (item.albums?.label) {
        labels.add(item.albums.label);
      }
    });
    return Array.from(labels).sort();
  };

  const getUniqueLocations = () => {
    const locations = new Set<string>();
    collection.forEach(item => {
      if (item.shelf_name) {
        locations.add(item.shelf_name);
      }
    });
    // Añadir "Sin ubicación" si hay álbumes sin ubicación
    const hasUnlocatedAlbums = collection.some(item => !item.shelf_name);
    if (hasUnlocatedAlbums) {
      locations.add(t('search_filter_no_location'));
    }
    return Array.from(locations).sort();
  };

  const getLocatedPercentage = () => {
    if (collection.length === 0) return 0;

    const locatedAlbums = collection.filter(item => item.shelf_name);
    const percentage = (locatedAlbums.length / collection.length) * 100;
    return Math.round(percentage);
  };

  const searchAlbumEditions = async (albumTitle: string, artist: string) => {
    setEditionsLoading(true);
    try {
      console.log(`🔍 Buscando ediciones para: "${albumTitle}" - "${artist}"`);

      // Construir la consulta de búsqueda
      const searchQuery = `${albumTitle} ${artist}`.trim();
      const encodedQuery = encodeURIComponent(searchQuery);

      const response = await fetch(
        `https://api.discogs.com/database/search?q=${encodedQuery}&type=release&format=vinyl&per_page=50`,
        {
          headers: {
            'User-Agent': 'Bothside/1.0',
            'Authorization': `Discogs token=${ENV.DISCOGS_TOKEN}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Error de API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`📊 Respuesta de Discogs:`, data);

      const releases = data.results || [];
      console.log(`📋 Total de resultados: ${releases.length}`);

      // Filtrar y formatear las ediciones con criterios más flexibles
      const formattedEditions = releases
        .filter((release: any) => {
          // Verificar que las propiedades existan antes de usar toLowerCase()
          const title = release.title || '';
          const artist = release.artist || '';

          const titleMatch = title.toLowerCase().includes(albumTitle.toLowerCase());
          const artistMatch = artist.toLowerCase().includes(artist.toLowerCase());

          // Ser más flexible con la coincidencia
          return titleMatch || artistMatch;
        })
        .map((release: any) => {
          // Extraer artista del título si no está disponible directamente
          let extractedArtist = release.artist;
          let extractedTitle = release.title || t('common_untitled');

          if (!extractedArtist && release.title) {
            // Intentar extraer artista del título (formato: "Artista - Título")
            const titleParts = release.title.split(' - ');
            if (titleParts.length >= 2) {
              extractedArtist = titleParts[0].trim();
              extractedTitle = titleParts.slice(1).join(' - ').trim();
            } else {
              // Si no hay separador, usar el artista original del álbum que se está editando
              extractedArtist = artist; // Usar el artista del álbum original
            }
          }

          return {
            id: release.id,
            title: extractedTitle,
            artist: extractedArtist || artist, // Fallback al artista original
            year: release.year,
            format: release.format?.join(', ') || 'Vinyl',
            country: release.country,
            label: release.label?.join(', ') || 'Unknown',
            genres: release.genre || [],
            styles: release.style || [],
            thumb: release.thumb,
            cover_image: release.cover_image
          };
        })
        .slice(0, 15); // Aumentar el límite a 15 ediciones

      console.log(`✅ Ediciones filtradas: ${formattedEditions.length}`);
      setEditions(formattedEditions);

      if (formattedEditions.length === 0) {
        Alert.alert(
          t('search_alert_no_results_title'),
          t('search_alert_no_editions_message').replace('{0}', albumTitle).replace('{1}', artist)
        );
      }
    } catch (error) {
      console.error('❌ Error searching editions:', error);
      Alert.alert(
        t('common_connection_error'),
        t('search_error_loading_editions')
      );
    } finally {
      setEditionsLoading(false);
    }
  };

  const handleEditAlbum = async (item: any) => {
    setSelectedAlbumForEdit(item);
    await searchAlbumEditions(item.albums.title, item.albums.artist);
    setShowEditionsModal(true);
  };

  const handleReplaceEdition = async (newEdition: any) => {
    if (!user || !selectedAlbumForEdit) return;

    try {
      console.log(`🔄 Reemplazando edición:`, {
        currentAlbum: selectedAlbumForEdit.albums,
        newEdition: newEdition
      });

      // Mostrar confirmación antes de reemplazar
      Alert.alert(
        t('search_alert_replace_title'),
        t('search_alert_replace_message').replace('{0}', selectedAlbumForEdit.albums.title).replace('{1}', newEdition.title),
        [
          { text: t('common_cancel'), style: 'cancel' },
          {
            text: t('search_action_replace'),
            style: 'destructive',
            onPress: async () => {
              try {
                // Primero eliminar la edición actual
                console.log('🗑️ Eliminando edición actual...');
                await UserCollectionService.removeFromCollection(user.id, selectedAlbumForEdit.albums.id);

                // Luego añadir la nueva edición
                console.log('➕ Añadiendo nueva edición...');
                const releaseData = {
                  id: newEdition.id,
                  title: newEdition.title,
                  artists: [{ name: newEdition.artist, id: 0 }],
                  year: newEdition.year,
                  labels: [{ name: newEdition.label }],
                  cover_image: newEdition.cover_image,
                  thumb: newEdition.thumb
                } as any;

                await addToCollection(releaseData);

                setShowEditionsModal(false);
                setSelectedAlbumForEdit(null);
                setEditions([]);

                // Recargar la colección
                await loadCollection();

                Alert.alert(t('common_success'), t('search_success_replaced'));
              } catch (error) {
                console.error('❌ Error replacing edition:', error);
                Alert.alert(t('common_error'), t('search_error_replacing'));
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error in handleReplaceEdition:', error);
      Alert.alert(t('common_error'), t('search_error_processing'));
    }
  };

  // Funciones para manejar audio
  const handlePlayAudio = async (item: any) => {
    console.log('🔍 handlePlayAudio called with item:', item);
    console.log('🔍 item.audio_note:', item.audio_note);

    if (!item.audio_note) {
      console.log('❌ No audio note found');
      return;
    }

    console.log('🔍 Setting up floating player with URI:', item.audio_note);
    console.log('🔍 Album title:', item.albums?.title || 'Álbum');

    // Configurar el reproductor flotante
    setFloatingAudioUri(item.audio_note);
    setFloatingAlbumTitle(item.albums?.title || t('common_album'));
    setShowFloatingPlayer(true);

    console.log('🔍 Floating player should now be visible');
  };

  const handleRecordAudio = async (item: any) => {
    setSelectedAlbumForAudio(item);
    setShowAudioRecorder(true);
  };

  const handleSaveAudioNote = async (audioUri: string) => {
    if (!selectedAlbumForAudio) return;

    try {
      console.log('🔍 handleSaveAudioNote: Saving audio note...');
      console.log('🔍 handleSaveAudioNote: Audio URI:', audioUri);
      console.log('🔍 handleSaveAudioNote: Selected album:', selectedAlbumForAudio);
      console.log('🔍 handleSaveAudioNote: Album ID:', selectedAlbumForAudio.albums?.id);

      await UserCollectionService.saveAudioNote(
        user!.id,
        selectedAlbumForAudio.albums.id,
        audioUri
      );

      console.log('🔍 handleSaveAudioNote: Audio note saved successfully');

      // Recargar la colección para mostrar el tag de audio
      await loadCollection();

      setShowAudioRecorder(false);
      setSelectedAlbumForAudio(null);
    } catch (error) {
      console.error('❌ Error saving audio note:', error);
      Alert.alert(t('common_error'), t('search_error_saving_audio'));
    }
  };

  const handleDeleteAudioNote = async (item: any) => {
    if (!user) return;

    try {
      console.log('🔍 handleDeleteAudioNote: Deleting audio note for item:', item);
      console.log('🔍 handleDeleteAudioNote: Album ID:', item.albums?.id);

      await UserCollectionService.deleteAudioNote(
        user.id,
        item.albums.id
      );

      console.log('🔍 handleDeleteAudioNote: Audio note deleted successfully');

      // Recargar la colección
      await loadCollection();

      Alert.alert(t('common_success'), t('search_success_audio_deleted'));
    } catch (error) {
      console.error('❌ Error deleting audio note:', error);
      Alert.alert(t('common_error'), t('search_error_deleting_audio'));
    }
  };

  // ========== FIN FUNCIONES DE CÁMARA ==========

  const renderCollectionItem = ({ item }: { item: any }) => (
    <View style={[styles.collectionItemContainer, { backgroundColor: colors.card }]}>
      <TouchableOpacity
        style={[styles.collectionItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
        onLongPress={() => handleLongPress(item)}
        onPress={() => navigation.navigate('AlbumDetail', { albumId: item.albums.id })}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.collectionThumbnail}
        />
        <View style={styles.collectionInfo}>
          <Text style={[styles.collectionTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
            {item.albums?.title}
          </Text>
          <Text style={[styles.collectionArtist, { color: colors.text }]}>{item.albums?.artist}</Text>
          <View style={styles.collectionDetails}>
            <Text style={[styles.collectionDetail, { color: colors.text }]}>
              {item.albums?.label} • {item.albums?.release_year}
            </Text>

            {/* Tags reordenados */}
            <View style={styles.tagsContainer}>
              {/* Tag de ubicación física - PRIMERO */}
              {item.in_shelf && (
                <View style={styles.shelfTag}>
                  <Ionicons name="location" size={12} color="#28a745" />
                  <Text style={styles.shelfTagText}>{item.shelf_name || 'Ubicación física'}</Text>
                </View>
              )}

              {/* Tag de audio - SEGUNDO (solo icono) */}
              {item.audio_note && (
                <View style={styles.audioTagIconOnly}>
                  <Ionicons name="mic" size={12} color="#000" />
                </View>
              )}

              {/* Tag de gem - TERCERO (solo icono) */}
              {item.is_gem && (
                <View style={styles.gemTagIconOnly}>
                  <Ionicons name="diamond" size={12} color="#d97706" />
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderRelease = ({ item }: { item: DiscogsRelease }) => (
    <View style={[styles.releaseItem, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <Image
        source={{ uri: item.cover_image || item.thumb || 'https://via.placeholder.com/60' }}
        style={styles.releaseThumbnail}
      />
      <View style={styles.releaseInfo}>
        <Text style={[styles.releaseTitle, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={[styles.releaseArtist, { color: colors.text }]}>{item.artists?.[0]?.name || 'Unknown Artist'}</Text>
        <Text style={[styles.releaseDetail, { color: colors.text }]}>
          {item.year && `${item.year} • `}
          {item.labels && item.labels.length > 0 && `${item.labels[0].name} • `}
          {(item as any).catno && `${(item as any).catno}`}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: primaryColor }]}
        onPress={() => addToCollection(item)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );

  // Componente para las acciones de swipe (fondo)
  const renderSwipeActions = (rowData: any, rowMap: any) => (
    <View style={styles.swipeActionsContainer}>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeOptions, { backgroundColor: primaryColor }]}
        onPress={() => handleSwipeOptions(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color="white" />
        <Text style={styles.swipeActionText}>{t('common_options')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="white" />
        <Text style={styles.swipeActionText}>{t('common_delete')}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: collection.length === 0 ? '#FFF' : colors.background }]}>

      {/* Toolbar con botones de búsqueda, vista y filtros */}
      <View style={[styles.toolbarContainer, { backgroundColor: collection.length === 0 ? '#FFF' : colors.card, borderBottomColor: collection.length === 0 ? '#EAEAEA' : colors.border }]}>
        {/* Contador de discos y porcentaje ubicados a la izquierda */}
        <Text style={[styles.collectionStats, { color: collection.length === 0 ? '#1A2530' : colors.text }]}>
          <Text style={[styles.collectionCount, { color: collection.length === 0 ? '#1A2530' : colors.text }]}>
            {filteredCollection.length} {t('search_stats_discs')}
          </Text>
          <Text style={[styles.locatedPercentage, { color: collection.length === 0 ? '#6B7280' : colors.text }]}>
            {' • '}{getLocatedPercentage()}% {t('search_stats_located')}
          </Text>
        </Text>

        {/* Botones de búsqueda, vista y filtros a la derecha */}
        <View style={styles.toolbarButtons}>
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { backgroundColor: showSearch ? (collection.length === 0 ? '#EAEAEA' : colors.border) : 'transparent' }
            ]}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={collection.length === 0 ? '#1A2530' : colors.text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { backgroundColor: showFilters ? (collection.length === 0 ? '#EAEAEA' : colors.border) : 'transparent' }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name="filter-outline"
                size={24}
                color={hasActiveFilters ? '#34A853' : (collection.length === 0 ? '#1A2530' : colors.text)}
              />
              {hasActiveFilters && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -2,
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: '#34A853',
                  }}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Campo de búsqueda */}
      {showSearch && (
        <View style={[styles.searchContainer, { backgroundColor: colors.card }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text, backgroundColor: colors.background }]}
              placeholder={t('search_placeholder')}
              value={query}
              onChangeText={setQuery}
              placeholderTextColor={colors.text}
            />
            <TouchableOpacity
              style={styles.closeSearchButton}
              onPress={() => {
                setShowSearch(false);
                setQuery('');
              }}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filtros */}
      {showFilters && (
        <View style={[styles.filterDropdownContent, { backgroundColor: colors.card }]}>
          {/* Filtro por Estilo */}
          <View style={styles.filterSection}>
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>{t('search_filter_style')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByStyle && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByStyle('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByStyle && styles.filterChipTextActive
                ]}>{t('search_filter_all')}</Text>
              </TouchableOpacity>
              {getUniqueStyles().map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.filterChip,
                    filterByStyle === style && [styles.filterChipActive, { backgroundColor: primaryColor }]
                  ]}
                  onPress={() => setFilterByStyle(style)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterByStyle === style && styles.filterChipTextActive
                  ]}>{style}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filtro por Año */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>{t('search_filter_year')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByYear && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByYear('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByYear && styles.filterChipTextActive
                ]}>{t('search_filter_all')}</Text>
              </TouchableOpacity>
              {getUniqueYears().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    filterByYear === year && [styles.filterChipActive, { backgroundColor: primaryColor }]
                  ]}
                  onPress={() => setFilterByYear(year)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterByYear === year && styles.filterChipTextActive
                  ]}>{year}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filtro por Sello */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>{t('search_filter_label')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByLabel && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByLabel('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByLabel && styles.filterChipTextActive
                ]}>{t('search_filter_all')}</Text>
              </TouchableOpacity>
              {getUniqueLabels().map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.filterChip,
                    filterByLabel === label && [styles.filterChipActive, { backgroundColor: primaryColor }]
                  ]}
                  onPress={() => setFilterByLabel(label)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterByLabel === label && styles.filterChipTextActive
                  ]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filtro por Ubicación */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>{t('search_filter_location')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByLocation && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByLocation('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByLocation && styles.filterChipTextActive
                ]}>{t('search_filter_all_locations')}</Text>
              </TouchableOpacity>
              {getUniqueLocations().map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.filterChip,
                    filterByLocation === location && [styles.filterChipActive, { backgroundColor: primaryColor }]
                  ]}
                  onPress={() => setFilterByLocation(location)}
                >
                  <Text style={[
                    styles.filterChipText,
                    filterByLocation === location && styles.filterChipTextActive
                  ]}>{location}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Filtro por Audio */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>{t('search_filter_audio')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByAudioNotes && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByAudioNotes(false)}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByAudioNotes && styles.filterChipTextActive
                ]}>{t('search_filter_all')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterByAudioNotes && [styles.filterChipActive, { backgroundColor: primaryColor }]
                ]}
                onPress={() => setFilterByAudioNotes(true)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterByAudioNotes && styles.filterChipTextActive
                ]}>{t('search_filter_with_audio')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Botón Limpiar filtros */}
          {hasActiveFilters && (
            <View style={styles.clearFiltersContainer}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={16} color="#888" style={{ marginRight: 4 }} />
                <Text style={styles.clearFiltersText}>{t('search_action_clear_filters')}</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>
      )}

      {/* Lista combinada */}
      {user ? (
        <SwipeListView
          data={filteredCollection}
          renderItem={renderCollectionItem}
          renderHiddenItem={renderSwipeActions}
          rightOpenValue={-180}
          disableRightSwipe
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          previewOpenValue={0}
          previewOpenDelay={0}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={filteredCollection.length === 0 ? { flexGrow: 1 } : undefined}
          ListFooterComponent={
            releases.length > 0 ? (
              <View style={styles.footerContainer}>
                <Text style={[styles.footerText, { color: colors.text }]}>{t('search_results_discogs')}</Text>
                <FlatList
                  data={releases}
                  renderItem={renderRelease}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : null
          }
        />
      ) : (
        <FlatList
          data={releases}
          renderItem={renderRelease}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>{t('common_loading')}</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyText, { color: colors.text }]}>No se encontraron resultados</Text>
              </View>
            )
          }
        />
      )}

      {/* Modal para añadir álbum a estantería */}
      <Modal
        visible={showAddToShelfModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddToShelfModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: primaryColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('search_modal_add_to_shelf_title').replace('{0}', selectedAlbum?.albums?.title || '')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddToShelfModal(false);
                  setShowCreateShelfForm(false);
                  setSelectedAlbum(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {!showCreateShelfForm ? (
              // Lista de estanterías existentes
              <ScrollView style={styles.modalBody}>
                <TouchableOpacity
                  style={styles.createNewShelfButton}
                  onPress={() => setShowCreateShelfForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={24} color="#000" />
                  <Text style={[styles.createNewShelfText, { color: primaryColor }]}>{t('search_action_create_shelf')}</Text>
                </TouchableOpacity>

                <Text style={styles.shelfListTitle}>{t('search_subtitle_existing_shelves')}</Text>

                {userLists.length === 0 ? (
                  <Text style={styles.noShelvesText}>{t('search_empty_shelves')}</Text>
                ) : (
                  userLists.map((list) => (
                    <TouchableOpacity
                      key={list.id}
                      style={styles.shelfItem}
                      onPress={() => addAlbumToShelf(list.id)}
                    >
                      <View style={styles.shelfItemImage}>
                        <MaletaCoverCollage albums={list.albums || []} size={50} />
                      </View>
                      <View style={styles.shelfItemInfo}>
                        <Text style={styles.shelfItemTitle}>{list.title}</Text>
                        {list.description && (
                          <Text style={styles.shelfItemDescription}>{list.description}</Text>
                        )}
                        <View style={styles.shelfItemMeta}>
                          <Text style={styles.shelfItemMetaText}>
                            {list.is_public ? t('common_public') : t('common_private')}
                          </Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : (
              // Formulario para crear nueva estantería
              <ScrollView style={styles.modalBody}>
                <Text style={styles.formTitle}>{t('search_modal_create_shelf_title')}</Text>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>{t('common_title_required')}</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newShelfTitle}
                    onChangeText={setNewShelfTitle}
                    placeholder={t('search_placeholder_shelf_name')}
                    autoFocus={true}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>{t('common_description')}</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={newShelfDescription}
                    onChangeText={setNewShelfDescription}
                    placeholder={t('common_description_optional')}
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formField}>
                  <View style={styles.publicToggleContainer}>
                    <Text style={styles.formLabel}>{t('search_label_public_shelf')}</Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setNewShelfIsPublic(!newShelfIsPublic)}
                    >
                      <View style={[
                        styles.toggleTrack,
                        { backgroundColor: newShelfIsPublic ? primaryColor : '#ccc' }
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          { transform: [{ translateX: newShelfIsPublic ? 20 : 0 }] }
                        ]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.toggleDescription}>
                    {t('search_help_public_shelf')}
                  </Text>
                </View>

                <View style={styles.formActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowCreateShelfForm(false);
                      setNewShelfTitle('');
                      setNewShelfDescription('');
                      setNewShelfIsPublic(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>{t('common_cancel')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.formCreateButton,
                      { opacity: newShelfTitle.trim() ? 1 : 0.5, backgroundColor: primaryColor }
                    ]}
                    onPress={createNewShelf}
                    disabled={!newShelfTitle.trim()}
                  >
                    <Text style={styles.formCreateButtonText}>{t('search_action_create_and_add')}</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para asignar Ubicación física */}
      <Modal
        visible={showLocationModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: primaryColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('search_modal_assign_location_title').replace('{0}', selectedAlbumForLocation?.albums?.title || '')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLocationModal(false);
                  setSelectedAlbumForLocation(null);
                }}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.selectShelfTitle}>{t('search_subtitle_select_location')}</Text>

              {physicalShelves.length === 0 ? (
                <View style={styles.emptyShelvesContainer}>
                  <Ionicons name="grid-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyShelvesTitle}>{t('search_empty_locations')}</Text>
                  <Text style={styles.emptyShelvesSubtitle}>
                    {t('search_empty_locations_subtitle')}
                  </Text>
                  <TouchableOpacity
                    style={[styles.createShelfButton, { backgroundColor: primaryColor }]}
                    onPress={() => {
                      setShowLocationModal(false);
                      navigation.navigate('ShelvesList');
                    }}
                  >
                    <Text style={styles.createShelfButtonText}>{t('search_action_create_location')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                physicalShelves.map((shelf) => (
                  <TouchableOpacity
                    key={shelf.id}
                    style={styles.shelfSelectItem}
                    onPress={() => {
                      setShowLocationModal(false);
                      navigation.navigate('SelectCell', {
                        user_collection_id: selectedAlbumForLocation?.id,
                        shelf: shelf,
                        current_row: undefined,
                        current_column: undefined,
                      });
                    }}
                  >
                    <View style={styles.shelfSelectInfo}>
                      <Text style={styles.shelfSelectItemText}>{shelf.name}</Text>
                      <Text style={styles.shelfDimensions}>
                        {shelf.shelf_rows}x{shelf.shelf_columns}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para editar edición */}
      <Modal
        visible={showEditionsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, shadowColor: primaryColor }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t('search_modal_change_version_title').replace('{0}', selectedAlbumForEdit?.albums?.title || '')}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditionsModal(false);
                  setSelectedAlbumForEdit(null);
                  setEditions([]);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.formTitle}>
                {t('search_subtitle_editions_found').replace('{0}', editions.length.toString())}
              </Text>

              {editionsLoading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>{t('search_status_searching_editions')}</Text>
                  <Text style={styles.emptySubtext}>{t('common_wait_seconds')}</Text>
                </View>
              ) : editions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>{t('search_empty_editions')}</Text>
                  <Text style={styles.emptySubtext}>
                    {t('search_empty_editions_subtitle')}
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.editionsSubtitle}>
                    {t('search_subtitle_select_edition')}
                  </Text>
                  {editions.map((edition, index) => (
                    <TouchableOpacity
                      key={edition.id}
                      style={styles.editionItem}
                      onPress={() => handleReplaceEdition(edition)}
                    >
                      <Image
                        source={{ uri: edition.thumb || 'https://via.placeholder.com/60' }}
                        style={styles.editionThumbnail}
                      />
                      <View style={styles.editionInfo}>
                        <Text style={styles.editionTitle}>{edition.title}</Text>
                        <Text style={styles.editionArtist}>{edition.artist}</Text>
                        <Text style={styles.editionDetail}>
                          {edition.year && t('common_year_format').replace('{0}', edition.year.toString())}
                          {edition.genres && edition.genres.length > 0 && t('common_genre_format').replace('{0}', edition.genres.join(', '))}
                          {edition.styles && edition.styles.length > 0 && t('common_style_format').replace('{0}', edition.styles.join(', '))}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="#666" />
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para grabar nota de audio */}
      <AudioRecorder
        visible={showAudioRecorder}
        onClose={() => {
          setShowAudioRecorder(false);
          setSelectedAlbumForAudio(null);
        }}
        onSave={handleSaveAudioNote}
        albumTitle={selectedAlbumForAudio?.albums?.title || ''}
      />

      {/* Reproductor flotante */}
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
      />

      {/* Bottom Sheet para sugerencia de primera ubicación */}
      <Modal
        visible={showFirstDiscModal}
        animationType="slide"
        transparent={true}
        onRequestClose={async () => {
          if (user) {
            const key = `has_seen_first_disc_location_modal_${user.id}`;
            await AsyncStorage.setItem(key, 'true');
          }
          setShowFirstDiscModal(false);
        }}
      >
        <View style={styles.bottomSheetOverlay}>
          <View style={[styles.bottomSheetContent, { backgroundColor: '#FFF' }]}>
            {/* Drag Indicator */}
            <View style={styles.dragIndicator} />

            <View style={styles.bottomSheetBody}>
              {/* Decorative Icon */}
              <View style={styles.iconContainer}>
                <Ionicons name="sparkles" size={32} color="#000" />
              </View>

              <Text style={styles.bottomSheetTitle}>
                {t('first_disc_modal_title')}
              </Text>

              <Text style={styles.bottomSheetSubtitle}>
                {t('first_disc_modal_subtitle')}
              </Text>

              {/* Botón principal */}
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: '#000' }]}
                onPress={async () => {
                  setShowFirstDiscModal(false);
                  if (user) {
                    const key = `has_seen_first_disc_location_modal_${user.id}`;
                    await AsyncStorage.setItem(key, 'true');
                  }

                  // Navegar directamente a la pantalla de creación de estanterías físicas
                  navigation.navigate('DashboardTab', { screen: 'ShelfEdit' });
                }}
              >
                <Text style={styles.btnPrimaryText}>
                  {t('first_disc_modal_btn_primary')}
                </Text>
              </TouchableOpacity>

              {/* Botón secundario */}
              <TouchableOpacity
                style={styles.btnSecondary}
                onPress={async () => {
                  setShowFirstDiscModal(false);
                  if (user) {
                    const key = `has_seen_first_disc_location_modal_${user.id}`;
                    await AsyncStorage.setItem(key, 'true');
                  }
                }}
              >
                <Text style={styles.btnSecondaryText}>
                  {t('first_disc_modal_btn_secondary')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  bottomSheetBody: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'normal',
  },
  bottomSheetSubtitle: {
    fontSize: 15,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  btnPrimary: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  btnSecondary: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  container: {
    flex: 1,
  },
  toolbarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  toolbarButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  toolbarButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  collectionCount: {
    fontSize: 18,
    fontWeight: '700',
  },
  collectionStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locatedPercentage: {
    fontSize: 16,
    fontWeight: '400',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  closeSearchButton: {
    padding: 12,
    marginRight: 5,
  },
  filterDropdownContent: {
    borderBottomWidth: 1,
  },
  filterSection: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  filterChips: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  filterChipActive: {
    backgroundColor: AppColors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearFiltersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 8,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#888',
    textDecorationLine: 'underline',
  },
  collectionItemContainer: {
    marginBottom: 0,
  },
  collectionItem: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  collectionThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 4,
    marginRight: 10,
  },
  collectionInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  collectionArtist: {
    fontSize: 14,
    marginBottom: 4,
  },
  collectionDetails: {
    marginTop: 4,
  },
  collectionDetail: {
    fontSize: 12,
    marginBottom: 2,
  },
  releaseItem: {
    flexDirection: 'row',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  releaseThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  releaseInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  releaseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  releaseArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  releaseDetail: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    backgroundColor: AppColors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: '100%',
    maxWidth: 300,
    height: 180,
    resizeMode: 'contain',
    marginBottom: 4,
    opacity: 0.8,
    alignSelf: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',

    marginBottom: 8,


    opacity: 0.8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 36,

    width: '75%',

  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 160,
    flexWrap: 'nowrap',
    opacity: 0.9
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flexShrink: 0,
  },
  createButtonFixed: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  footerContainer: {
    padding: 15,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  // Estilos para swipe actions
  swipeActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',



    gap: 0, // Sin espacio entre botones para que se vean como una barra continua
  },
  swipeAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 90, // Botones más anchos
    height: '100%',
    borderRadius: 0, // Sin bordes redondeados
  },
  swipeOptions: {
    backgroundColor: AppColors.primary,
    borderRightWidth: 2,
    borderRightColor: 'rgba(255,255,255,0.5)', // Separador más visible
  },
  swipeDelete: {
    backgroundColor: '#FF3B30',
  },
  swipeActionText: {
    color: 'white',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Estilos para el modal de añadir a maleta
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  modalBody: {
    padding: 20,
  },
  createNewShelfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 20,
  },
  createNewShelfText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.primary,
    marginLeft: 10,
  },
  shelfListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  noShelvesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 20,
  },
  shelfItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shelfItemImage: {
    marginRight: 15,
  },
  shelfItemInfo: {
    flex: 1,
  },
  shelfItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  shelfItemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  shelfItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shelfItemMetaText: {
    fontSize: 12,
    color: '#999',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  formField: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  formTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  publicToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleButton: {
    padding: 5,
  },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    marginHorizontal: 2,
  },
  toggleDescription: {
    fontSize: 12,
    color: '#666',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  formCreateButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: AppColors.primary,
    alignItems: 'center',
  },
  formCreateButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },

  // Estilos para la edición de ediciones
  editionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  editionThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  editionInfo: {
    flex: 1,
  },
  editionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  editionArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  editionDetail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  editionsSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },

  // Estilos para el tag de nota de audio
  audioTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  audioTagText: {
    fontSize: 12,
    color: AppColors.primary,
    marginLeft: 5,
  },

  // Estilos para el tag de gem
  gemTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  gemTagText: {
    fontSize: 12,
    color: '#d97706',
    marginLeft: 5,
  },

  // Estilos para el tag de estantería
  shelfTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9', // Un color más suave para la estantería
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,

    alignSelf: 'flex-start',
  },
  shelfTagText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 5,
  },

  // Contenedor para tags en vista de lista
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
  },


  // Estilos para la selección de ubicación física
  selectShelfTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    marginTop: 10,
  },
  emptyShelvesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyShelvesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyShelvesSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createShelfButton: {
    backgroundColor: AppColors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  createShelfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  shelfSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  shelfSelectInfo: {
    flex: 1,
  },
  shelfSelectItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  shelfDimensions: {
    fontSize: 14,
    color: '#666',
  },
  audioTagIconOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  gemTagIconOnly: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginTop: 8,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },



  floatingAIButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: AppColors.primary,
    borderRadius: 50,
    padding: 15,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },

  // Estilos para la cámara
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 50,
    paddingHorizontal: 20,
  },
  cameraCloseButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraBottomControls: {
    alignItems: 'center',
  },
  cameraCaptureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  cameraCaptureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'white',
  },

  // Estilos para IA
  extractedTextContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: AppColors.primary,
  },
  extractedTextLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: AppColors.primary,
  },
  extractedText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  ocrResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  ocrResultThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  ocrResultInfo: {
    flex: 1,
  },
  ocrResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  ocrResultArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  ocrResultDetail: {
    fontSize: 12,
    color: '#999',
  },
  loadingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    padding: 30,
    borderRadius: 20,
    alignItems: 'center',
    minWidth: 280,
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  loadingIconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  loadingIconBackground: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 50,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  loadingProgressContainer: {
    width: '100%',
    marginBottom: 15,
  },
  loadingProgressBar: {
    height: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingProgressFill: {
    height: '100%',
    backgroundColor: AppColors.primary,
    borderRadius: 2,
    width: '70%',
    // Animación de progreso
    transform: [{ translateX: -100 }],
  },
  loadingTimeText: {
    fontSize: 12,
    textAlign: 'center',
    opacity: 0.6,
  },
}); 