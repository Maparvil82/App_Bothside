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
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
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
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { GeminiService } from '../services/gemini';

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
  const { colors } = useTheme();
  const searchInputRef = useRef<TextInput>(null);
  const cameraRef = useRef<CameraView>(null);
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [collectionLoading, setCollectionLoading] = useState(true);
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

  // Estados para la funcionalidad de cámara
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<any[]>([]);
  const [recognizedAlbum, setRecognizedAlbum] = useState<string>('');

  // Animaciones para el modal de carga
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;

  // Efecto para animaciones cuando se activa el loading
  useEffect(() => {
    if (aiLoading) {
      // Animación de pulso para el spinner
      const pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );

      // Animación de progreso
      const progressLoop = Animated.loop(
        Animated.timing(progressAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        })
      );

      pulseLoop.start();
      progressLoop.start();

      return () => {
        pulseLoop.stop();
        progressLoop.stop();
        progressAnimation.setValue(0);
        pulseAnimation.setValue(1);
      };
    }
  }, [aiLoading, progressAnimation, pulseAnimation]);

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

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  // Efecto para sincronizar el estado de gems cuando se navegue de vuelta
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('🔄 SearchScreen: Screen focused, syncing gem status');
      // Recargar la colección para sincronizar el estado de gems
      if (user) {
        loadCollection();
      }
    });

    return unsubscribe;
  }, [navigation, user]);

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

  const loadCollection = async () => {
    if (!user) return;
    try {
      setCollectionLoading(true);
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
      setCollectionLoading(false);
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
      Alert.alert('Error', 'No se pudieron cargar las estanterías');
    }
  };

  // Función para añadir álbum a una estantería
  const addAlbumToShelf = async (maletaId: string) => {
    if (!selectedAlbum || !user) return;

    try {
      // Verificar si el álbum ya está en la estantería
      const isAlreadyInList = await UserMaletaService.isAlbumInMaleta(maletaId, selectedAlbum.albums.id);

      if (isAlreadyInList) {
        Alert.alert('Aviso', 'Este álbum ya está en esta estantería');
        return;
      }

      await UserMaletaService.addAlbumToMaleta(maletaId, selectedAlbum.albums.id);
      Alert.alert('Éxito', 'Álbum añadido a la estantería');
      setShowAddToShelfModal(false);
      setSelectedAlbum(null);

      // Navegar a Mis Maletas
      navigation.navigate('MaletasTab');
    } catch (error) {
      console.error('Error adding album to list:', error);
      Alert.alert('Error', 'No se pudo añadir el álbum a la estantería');
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

      Alert.alert('Éxito', 'Maleta creada y álbum añadido');
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
      Alert.alert('Error', 'No se pudo crear la estantería');
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
      Alert.alert('Error', 'No se pudieron cargar las ubicaciones físicas');
    }
  };

  const handleLongPress = (item: any) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['Cancelar', 'Eliminar'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 0,
          title: item.albums?.title || 'Álbum',
          message: '¿Qué quieres hacer con este álbum?',
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            handleDeleteItem(item);
          }
        }
      );
    } else {
      Alert.alert(
        item.albums?.title || 'Álbum',
        '¿Qué quieres hacer con este álbum?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteItem(item) },
        ]
      );
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!user) return;
    try {
      await UserCollectionService.removeFromCollection(user.id, item.albums.id);
      await loadCollection();
      Alert.alert('Éxito', 'Disco eliminado de tu colección');
    } catch (error) {
      console.error('Error deleting item:', error);
      Alert.alert('Error', 'No se pudo eliminar el disco');
    }
  };

  const handleSwipeDelete = async (rowMap: any, rowKey: string) => {
    const item = filteredCollection.find(col => col.id === rowKey);
    if (item) {
      await handleDeleteItem(item);
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
        'Gem Status',
        newStatus
          ? `"${item.albums?.title}" añadido a tus Gems 💎`
          : `"${item.albums?.title}" removido de tus Gems`
      );
    } catch (error) {
      console.error('❌ handleToggleGem: Error toggling gem status:', error);
      Alert.alert('Error', 'No se pudo cambiar el estado del Gem');

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
      const gemAction = isItemGem ? 'Remover de Gems' : 'Añadir a Gems';

      console.log('🔍 handleSwipeOptions: Item gem status:', {
        itemId: item.id,
        albumId: item.albums?.id,
        albumTitle: item.albums?.title,
        isGem: isItemGem,
        localIsGem: item.is_gem
      });

      // Preparar opciones dinámicas
      const options = ['Cancelar', 'Asignar Ubicación', 'Añadir a Maleta', gemAction, 'Cambiar versión'];

      // Añadir opciones de audio
      if (item.audio_note) {
        options.push('Reproducir audio', 'Eliminar audio');
      } else {
        options.push('Grabar nota de audio');
      }

      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: options,
            cancelButtonIndex: 0,
            title: item.albums?.title || 'Álbum',
            message: '¿Qué quieres hacer con este álbum?',
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
          item.albums?.title || 'Álbum',
          '¿Qué quieres hacer con este álbum?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Asignar Ubicación', onPress: () => {
                setSelectedAlbumForLocation(item);
                loadPhysicalShelves();
                setShowLocationModal(true);
              }
            },
            {
              text: 'Añadir a Maleta', onPress: () => {
                setSelectedAlbum(item);
                loadUserMaletas();
                setShowAddToShelfModal(true);
              }
            },
            { text: gemAction, onPress: () => handleToggleGem(item) },
            { text: 'Cambiar versión', onPress: () => handleEditAlbum(item) },
            ...(item.audio_note ? [
              { text: 'Reproducir audio', onPress: () => handlePlayAudio(item) },
              { text: 'Eliminar audio', onPress: () => handleDeleteAudioNote(item) }
            ] : [
              { text: 'Grabar nota de audio', onPress: () => handleRecordAudio(item) }
            ])
          ]
        );
      }
    }
    rowMap[rowKey]?.closeRow();
  };

  const renderEmptyState = () => {
    if (collectionLoading) {
      return <BothsideLoader />;
    }

    if (collection.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="disc-outline" size={64} color={colors.text} />
          <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No tienes discos</Text>
          <Text style={[styles.emptyStateSubtitle, { color: colors.text }]}>
            Añade tu primer disco para empezar tu colección
          </Text>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('Main', { screen: 'AddDiscTab' })}>
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.createButtonText}>Añadir Disco</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.text }]}>No se encontraron resultados</Text>
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
        if (filterByLocation === 'Sin ubicación') {
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
        artist: release.artists?.[0]?.name || 'Unknown Artist',
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
          "Este disco ya está en tu colección",
          "Ya habías añadido esta misma edición."
        );
        return;
      }

      // 🔍 2) Comprobar si el usuario tiene OTRA edición
      // Solo si el álbum tiene discogs_id
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
            "Tienes otra edición",
            "Ya tienes otra edición de este álbum, pero puedes añadir esta también."
          );
        }
      }
      // 🟢 3) Si pasa las verificaciones → continuar

      await UserCollectionService.addToCollection(user.id, album.id);

      await loadCollection();

      // Mostrar opciones después de añadir el disco
      Alert.alert(
        'Disco añadido correctamente',
        '¿Qué quieres hacer ahora?',
        [
          {
            text: 'Añadir más discos',
            style: 'default',
            onPress: () => {
              // Mantener en la página actual
            }
          },
          {
            text: 'Ir a colección',
            style: 'default',
            onPress: () => {
              navigation.navigate('SearchTab');
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', 'No se pudo añadir el disco a la colección');
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
      locations.add('Sin ubicación');
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
          let extractedTitle = release.title || 'Sin título';

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
          'Sin resultados',
          `No se encontraron ediciones para "${albumTitle}" de "${artist}". Intenta con una búsqueda más específica.`
        );
      }
    } catch (error) {
      console.error('❌ Error searching editions:', error);
      Alert.alert(
        'Error de conexión',
        'No se pudieron cargar las ediciones. Verifica tu conexión a internet y el token de Discogs.'
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
        'Confirmar reemplazo',
        `¿Estás seguro de que quieres reemplazar "${selectedAlbumForEdit.albums.title}" con "${newEdition.title}"?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Reemplazar',
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

                Alert.alert('✅ Éxito', 'Edición reemplazada correctamente');
              } catch (error) {
                console.error('❌ Error replacing edition:', error);
                Alert.alert('❌ Error', 'No se pudo reemplazar la edición. Inténtalo de nuevo.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('❌ Error in handleReplaceEdition:', error);
      Alert.alert('❌ Error', 'No se pudo procesar la solicitud. Inténtalo de nuevo.');
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
    setFloatingAlbumTitle(item.albums?.title || 'Álbum');
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
      Alert.alert('Error', 'No se pudo guardar la nota de audio');
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

      Alert.alert('Éxito', 'Nota de audio eliminada correctamente');
    } catch (error) {
      console.error('❌ Error deleting audio note:', error);
      Alert.alert('Error', 'No se pudo eliminar la nota de audio');
    }
  };

  // ========== FUNCIONES DE CÁMARA Y RECONOCIMIENTO ==========

  const handleCameraPress = () => {
    // Abrir directamente la cámara sin mostrar opciones
    openCamera();
  };

  const [permission, requestPermission] = useCameraPermissions();

  const openCamera = async () => {
    try {
      if (!permission?.granted) {
        const result = await requestPermission();
        if (!result.granted) {
          Alert.alert('Permisos', 'Se necesitan permisos de cámara para esta función');
          return;
        }
      }
      setShowCamera(true);
    } catch (error) {
      console.error('Error opening camera:', error);
      Alert.alert('Error', 'No se pudo abrir la cámara');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de galería para esta función');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        await processImageWithAI(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const takePicture = async (cameraRef: any) => {
    try {
      if (cameraRef) {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        setCapturedImage(photo.uri);
        setShowCamera(false);
        await processImageWithAI(photo.uri);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const processImageWithAI = async (imageUri: string) => {
    setAiLoading(true);
    setAiResults([]);
    setRecognizedAlbum('');

    try {
      console.log('🤖 Iniciando reconocimiento de álbum con Gemini Vision...');

      // Convertir imagen a base64
      let base64Data = imageUri;

      if (imageUri.startsWith('file://') || imageUri.startsWith('http')) {
        console.log('📤 Convirtiendo URI a base64...');
        const response = await fetch(imageUri);
        const blob = await response.blob();
        base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            resolve(base64String);
          };
          reader.readAsDataURL(blob);
        });
      }

      // Usar Gemini Vision para reconocer el álbum
      const { artist, album } = await GeminiService.analyzeAlbumImage(base64Data);

      // 🔥 Consumir crédito por análisis de portada
      if (user) {
        try {
          await supabase.rpc("consume_ai_credit", {
            p_user_id: user.id,
            p_amount: 5
          });
        } catch (err) {
          console.error("Error consumiendo crédito IA (portada):", err);
        }
      }

      console.log('🎵 Álbum reconocido por IA:', { artist, album });
      setRecognizedAlbum(`${album} - ${artist}`);

      // Buscar en la colección del usuario
      if (artist && album) {
        await searchInUserCollection(`${artist} ${album}`);
      } else {
        Alert.alert('Sin resultados', 'No se pudo reconocer el álbum en la imagen');
      }
    } catch (error) {
      console.error('Error processing image with AI:', error);
      Alert.alert('Error', 'Error al procesar la imagen con IA');
    } finally {
      setAiLoading(false);
    }
  };

  const searchInUserCollection = async (searchText: string) => {
    try {
      // Limpiar y preparar el texto de búsqueda
      const cleanSearchText = searchText.trim();

      // Extraer palabras clave del texto reconocido
      const words = cleanSearchText.split(' ').filter(word => word.length > 2);
      console.log('🔍 Palabras clave extraídas:', words);

      // Si el texto contiene " - ", separar artista y álbum
      let artistSearch = '';
      let albumSearch = '';
      if (cleanSearchText.includes(' - ')) {
        const parts = cleanSearchText.split(' - ');
        artistSearch = parts[0]?.trim() || '';
        albumSearch = parts[1]?.trim() || '';
        console.log('🎵 Artista:', artistSearch, '| Álbum:', albumSearch);
      }

      // Crear array de consultas más inteligentes
      const searchQueries = [];

      // 1. Búsqueda exacta del texto completo SOLO si no tenemos artista y álbum separados
      if (!artistSearch || !albumSearch) {
        searchQueries.push(
          supabase
            .from('user_collection')
            .select(`
              *,
              albums (
                id,
                title,
                artist,
                label,
                cover_url,
                release_year
              )
            `)
            .eq('user_id', user!.id)
            .ilike('albums.title', `%${cleanSearchText}%`)
        );

        searchQueries.push(
          supabase
            .from('user_collection')
            .select(`
              *,
              albums (
                id,
                title,
                artist,
                label,
                cover_url,
                release_year
              )
            `)
            .eq('user_id', user!.id)
            .ilike('albums.artist', `%${cleanSearchText}%`)
        );
      }

      // 2. Si tenemos artista y álbum separados, buscar SOLO combinaciones exactas
      if (artistSearch && albumSearch) {
        // Buscar por artista Y título (coincidencia estricta)
        searchQueries.push(
          supabase
            .from('user_collection')
            .select(`
              *,
              albums (
                id,
                title,
                artist,
                label,
                cover_url,
                release_year
              )
            `)
            .eq('user_id', user!.id)
            .ilike('albums.artist', `%${artistSearch}%`)
            .ilike('albums.title', `%${albumSearch}%`)
        );

        // NO buscar variaciones del artista - solo coincidencia exacta
        // Esto evita mostrar discos de otros artistas que tengan palabras en común
      }

      // 3. Búsqueda por palabras individuales SOLO si no tenemos artista y álbum separados
      if (!artistSearch || !albumSearch) {
        for (const word of words) {
          // Solo buscar por palabras si no tenemos una búsqueda más específica
          searchQueries.push(
            supabase
              .from('user_collection')
              .select(`
                *,
                albums (
                  id,
                  title,
                  artist,
                  label,
                  cover_url,
                  release_year
                )
              `)
              .eq('user_id', user!.id)
              .ilike('albums.title', `%${word}%`)
          );

          searchQueries.push(
            supabase
              .from('user_collection')
              .select(`
                *,
                albums (
                  id,
                  title,
                  artist,
                  label,
                  cover_url,
                  release_year
                )
              `)
              .eq('user_id', user!.id)
              .ilike('albums.artist', `%${word}%`)
          );
        }
      }

      // Ejecutar todas las consultas en paralelo
      const results = await Promise.all(searchQueries);

      // Verificar errores y combinar resultados
      const allResults = [];
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.error) {
          console.error(`Error en consulta ${i}:`, result.error);
          continue;
        }
        if (result.data) {
          allResults.push(...result.data);
        }
      }

      console.log(`🔍 Total de resultados encontrados: ${allResults.length}`);

      // Eliminar duplicados basándose en el ID del álbum
      const uniqueResults = allResults.filter((item, index, self) =>
        item.albums && item.albums.id &&
        index === self.findIndex(t => t.albums && t.albums.id === item.albums.id)
      );

      console.log(`🎯 Resultados únicos después de eliminar duplicados: ${uniqueResults.length}`);

      // Log de los resultados encontrados para debug
      uniqueResults.forEach((item, index) => {
        console.log(`📀 ${index + 1}. ${item.albums?.artist} - ${item.albums?.title}`);
      });

      // Filtrar resultados para mostrar solo coincidencias EXACTAS
      let filteredResults = uniqueResults;

      if (artistSearch && albumSearch) {
        // Solo mostrar discos que coincidan EXACTAMENTE con el artista Y el álbum reconocidos
        filteredResults = uniqueResults.filter(item => {
          if (!item.albums) return false;

          const albumArtist = item.albums.artist?.toLowerCase().trim() || '';
          const albumTitle = item.albums.title?.toLowerCase().trim() || '';
          const searchArtist = artistSearch.toLowerCase().trim();
          const searchAlbum = albumSearch.toLowerCase().trim();

          // VALIDACIÓN DE EXPERTO: Análisis completo del disco

          // 1. Coincidencia exacta (máxima precisión)
          const artistExactMatch = albumArtist === searchArtist;
          const albumExactMatch = albumTitle === searchAlbum;

          // 2. Análisis de palabras clave
          const searchArtistWords = searchArtist.split(' ').filter(word => word.length > 2);
          const searchAlbumWords = searchAlbum.split(' ').filter(word => word.length > 2);

          const artistWordsMatch = searchArtistWords.every(word => albumArtist.includes(word));
          const albumWordsMatch = searchAlbumWords.every(word => albumTitle.includes(word));

          // 3. Verificar que no sea un artista diferente con nombre similar
          const isSimilarArtist = searchArtistWords.some(word => {
            // Lista de palabras que podrían confundirse
            const similarWords: { [key: string]: string[] } = {
              'bill': ['billy', 'william', 'will'],
              'john': ['johnny', 'jon', 'jonathan'],
              'mike': ['michael', 'mickey', 'mick'],
              'dave': ['david', 'davey'],
              'chris': ['christopher', 'christian'],
              'steve': ['steven', 'stephen'],
              'tom': ['thomas', 'tommy'],
              'jim': ['james', 'jimmy'],
              'bob': ['robert', 'bobby'],
              'dan': ['daniel', 'danny']
            };

            const similar = similarWords[word.toLowerCase()];
            if (similar) {
              return similar.some((sim: string) => albumArtist.includes(sim));
            }
            return false;
          });

          // 4. Verificar que no haya confusión con artistas famosos
          const famousArtists = ['beatles', 'stones', 'pink floyd', 'led zeppelin', 'queen', 'ac/dc', 'nirvana', 'radiohead'];
          const isConfusedWithFamous = famousArtists.some(famous =>
            (searchArtist.includes(famous) && !albumArtist.includes(famous)) ||
            (albumArtist.includes(famous) && !searchArtist.includes(famous))
          );

          // 5. Verificar que no sea un nombre parcial
          const isPartialName = searchArtistWords.some(word => {
            return albumArtist.includes(word) && albumArtist.length > word.length + 5;
          });

          // 6. Cálculo final de coincidencia
          const exactMatch = artistExactMatch && albumExactMatch;
          const wordsMatch = artistWordsMatch && albumWordsMatch &&
            !isSimilarArtist && !isConfusedWithFamous && !isPartialName;

          const isMatch = exactMatch || wordsMatch;
          console.log(`🎯 ${item.albums.artist} - ${item.albums.title}:`);
          console.log(`   Coincidencia exacta: ${exactMatch}`);
          console.log(`   Coincidencia palabras: ${wordsMatch}`);
          console.log(`   Es artista similar: ${isSimilarArtist}`);
          console.log(`   Confusión con famosos: ${isConfusedWithFamous}`);
          console.log(`   Es nombre parcial: ${isPartialName}`);
          console.log(`   ✅ MATCH FINAL: ${isMatch}`);

          return isMatch;
        });

        console.log(`🎯 Resultados filtrados (análisis de experto): ${filteredResults.length}`);
      }

      const collectionData = filteredResults;

      if (collectionData && collectionData.length > 0) {
        // Siempre abrir el primer resultado (mejor coincidencia) directamente
        const bestMatch = collectionData[0];
        if (bestMatch.albums && bestMatch.albums.id) {
          console.log(`🎯 Abriendo directamente el mejor match: ${bestMatch.albums.artist} - ${bestMatch.albums.title}`);
          navigation.navigate('AlbumDetail', { albumId: bestMatch.albums.id });
          setCapturedImage(null);
          setAiResults([]);
          return;
        }
      } else {
        Alert.alert(
          'No encontrado',
          'No se encontró este disco en tu colección. ¿Quieres buscarlo en Discogs para añadirlo?',
          [
            {
              text: 'No',
              style: 'cancel'
            },
            {
              text: 'Buscar en Discogs',
              onPress: () => {
                setQuery(searchText);
                setShowSearch(true);
                setCapturedImage(null);
                setAiResults([]);
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error searching in collection:', error);
    }
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
    setAiResults([]);
    setRecognizedAlbum('');
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
                  <Ionicons name="mic" size={12} color="#007AFF" />
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
        style={styles.addButton}
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
        style={[styles.swipeAction, styles.swipeOptions]}
        onPress={() => handleSwipeOptions(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="ellipsis-horizontal" size={18} color="white" />
        <Text style={styles.swipeActionText}>Opciones</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.swipeAction, styles.swipeDelete]}
        onPress={() => handleSwipeDelete(rowMap, rowData.item.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="trash" size={18} color="white" />
        <Text style={styles.swipeActionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toolbar con botones de búsqueda, vista y filtros */}
      <View style={[styles.toolbarContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {/* Contador de discos y porcentaje ubicados a la izquierda */}
        <Text style={[styles.collectionStats, { color: colors.text }]}>
          <Text style={[styles.collectionCount, { color: colors.text }]}>
            {filteredCollection.length} discos
          </Text>
          <Text style={[styles.locatedPercentage, { color: colors.text }]}>
            {' • '}{getLocatedPercentage()}% Ubicados
          </Text>
        </Text>

        {/* Botones de búsqueda, vista y filtros a la derecha */}
        <View style={styles.toolbarButtons}>
          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { backgroundColor: showSearch ? colors.border : 'transparent' }
            ]}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons
              name="search-outline"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>

          {/* Cámara eliminada: función de búsqueda por cámara desactivada */}

          <TouchableOpacity
            style={[
              styles.toolbarButton,
              { backgroundColor: showFilters ? colors.border : 'transparent' }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons
                name="filter-outline"
                size={24}
                color={hasActiveFilters ? '#34A853' : colors.text}
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
              placeholder="Buscar por artista, sello o álbum..."
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
            <Text style={[styles.filterSectionTitle, { color: colors.text }]}>Estilo</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByStyle && styles.filterChipActive
                ]}
                onPress={() => setFilterByStyle('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByStyle && styles.filterChipTextActive
                ]}>Todos</Text>
              </TouchableOpacity>
              {getUniqueStyles().map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[
                    styles.filterChip,
                    filterByStyle === style && styles.filterChipActive
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
            <Text style={styles.filterSectionTitle}>Año</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByYear && styles.filterChipActive
                ]}
                onPress={() => setFilterByYear('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByYear && styles.filterChipTextActive
                ]}>Todos</Text>
              </TouchableOpacity>
              {getUniqueYears().map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.filterChip,
                    filterByYear === year && styles.filterChipActive
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
            <Text style={styles.filterSectionTitle}>Sello</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByLabel && styles.filterChipActive
                ]}
                onPress={() => setFilterByLabel('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByLabel && styles.filterChipTextActive
                ]}>Todos</Text>
              </TouchableOpacity>
              {getUniqueLabels().map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.filterChip,
                    filterByLabel === label && styles.filterChipActive
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
            <Text style={styles.filterSectionTitle}>Ubicación</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByLocation && styles.filterChipActive
                ]}
                onPress={() => setFilterByLocation('')}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByLocation && styles.filterChipTextActive
                ]}>Todas</Text>
              </TouchableOpacity>
              {getUniqueLocations().map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.filterChip,
                    filterByLocation === location && styles.filterChipActive
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
            <Text style={styles.filterSectionTitle}>Audio</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  !filterByAudioNotes && styles.filterChipActive
                ]}
                onPress={() => setFilterByAudioNotes(false)}
              >
                <Text style={[
                  styles.filterChipText,
                  !filterByAudioNotes && styles.filterChipTextActive
                ]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterByAudioNotes && styles.filterChipActive
                ]}
                onPress={() => setFilterByAudioNotes(true)}
              >
                <Text style={[
                  styles.filterChipText,
                  filterByAudioNotes && styles.filterChipTextActive
                ]}>Con notas de audio</Text>
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
                <Text style={styles.clearFiltersText}>Limpiar filtros</Text>
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
                <Text style={[styles.footerText, { color: colors.text }]}>Resultados de búsqueda en Discogs</Text>
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
                <Text style={[styles.emptyText, { color: colors.text }]}>Cargando...</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Añadir "{selectedAlbum?.albums?.title}" a una estantería
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
                  <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
                  <Text style={styles.createNewShelfText}>Crear nueva estantería</Text>
                </TouchableOpacity>

                <Text style={styles.shelfListTitle}>Maletas existentes:</Text>

                {userLists.length === 0 ? (
                  <Text style={styles.noShelvesText}>No tienes estanterías creadas</Text>
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
                            {list.is_public ? 'Pública' : 'Privada'}
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
                <Text style={styles.formTitle}>Crear nueva estantería</Text>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Título *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newShelfTitle}
                    onChangeText={setNewShelfTitle}
                    placeholder="Nombre de la estantería"
                    autoFocus={true}
                  />
                </View>

                <View style={styles.formField}>
                  <Text style={styles.formLabel}>Descripción</Text>
                  <TextInput
                    style={[styles.formInput, styles.formTextArea]}
                    value={newShelfDescription}
                    onChangeText={setNewShelfDescription}
                    placeholder="Descripción opcional"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.formField}>
                  <View style={styles.publicToggleContainer}>
                    <Text style={styles.formLabel}>Maleta pública</Text>
                    <TouchableOpacity
                      style={styles.toggleButton}
                      onPress={() => setNewShelfIsPublic(!newShelfIsPublic)}
                    >
                      <View style={[
                        styles.toggleTrack,
                        { backgroundColor: newShelfIsPublic ? '#007AFF' : '#ccc' }
                      ]}>
                        <View style={[
                          styles.toggleThumb,
                          { transform: [{ translateX: newShelfIsPublic ? 20 : 0 }] }
                        ]} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.toggleDescription}>
                    Las estanterías públicas pueden ser vistas por otros usuarios
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
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.formCreateButton,
                      { opacity: newShelfTitle.trim() ? 1 : 0.5 }
                    ]}
                    onPress={createNewShelf}
                    disabled={!newShelfTitle.trim()}
                  >
                    <Text style={styles.formCreateButtonText}>Crear y añadir álbum</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Asignar Ubicación para "{selectedAlbumForLocation?.albums?.title}"
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
              <Text style={styles.selectShelfTitle}>Selecciona una ubicación física:</Text>

              {physicalShelves.length === 0 ? (
                <View style={styles.emptyShelvesContainer}>
                  <Ionicons name="grid-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyShelvesTitle}>Sin ubicaciones físicas</Text>
                  <Text style={styles.emptyShelvesSubtitle}>
                    Crea ubicaciones físicas para organizar tu colección
                  </Text>
                  <TouchableOpacity
                    style={styles.createShelfButton}
                    onPress={() => {
                      setShowLocationModal(false);
                      navigation.navigate('ShelvesList');
                    }}
                  >
                    <Text style={styles.createShelfButtonText}>Crear ubicación física</Text>
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
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Cambiar versión de "{selectedAlbumForEdit?.albums?.title}"
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
                Ediciones disponibles ({editions.length} encontradas):
              </Text>

              {editionsLoading ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>Buscando ediciones...</Text>
                  <Text style={styles.emptySubtext}>Esto puede tomar unos segundos</Text>
                </View>
              ) : editions.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="alert-circle" size={48} color="#ccc" />
                  <Text style={styles.emptyText}>No se encontraron ediciones</Text>
                  <Text style={styles.emptySubtext}>
                    Intenta con una búsqueda más específica o verifica el nombre del álbum
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.editionsSubtitle}>
                    Selecciona una edición para reemplazar la actual:
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
                          {edition.year && `Año: ${edition.year}`}
                          {edition.genres && edition.genres.length > 0 && ` | Género: ${edition.genres.join(', ')}`}
                          {edition.styles && edition.styles.length > 0 && ` | Estilo: ${edition.styles.join(', ')}`}
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

      {/* Botón flotante de IA */}
      <TouchableOpacity
        style={styles.floatingAIButton}
        onPress={() => navigation.navigate('AIChat')}
        activeOpacity={0.8}
      >
        <Ionicons name="sparkles" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Modal de Cámara */}
      <Modal
        visible={showCamera}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            ref={cameraRef}
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraCloseButton}
                onPress={closeCamera}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>

              <View style={styles.cameraBottomControls}>
                <TouchableOpacity
                  style={styles.cameraCaptureButton}
                  onPress={() => takePicture(cameraRef.current)}
                >
                  <View style={styles.cameraCaptureButtonInner} />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Modal de Resultados de IA */}
      <Modal
        visible={aiResults.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={closeCamera}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Discos Encontrados
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={closeCamera}
              >
                <Ionicons name="close" size={24} color="#6c757d" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {recognizedAlbum && (
                <View style={styles.extractedTextContainer}>
                  <Text style={[styles.extractedTextLabel, { color: colors.text }]}>
                    Álbum reconocido:
                  </Text>
                  <Text style={[styles.extractedText, { color: colors.text }]}>
                    {recognizedAlbum}
                  </Text>
                </View>
              )}

              <Text style={[styles.resultsTitle, { color: colors.text }]}>
                Resultados en tu colección:
              </Text>

              {aiResults.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.ocrResultItem}
                  onPress={() => {
                    if (item.albums && item.albums.id) {
                      navigation.navigate('AlbumDetail', { albumId: item.albums.id });
                      closeCamera();
                    }
                  }}
                >
                  <Image
                    source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
                    style={styles.ocrResultThumbnail}
                  />
                  <View style={styles.ocrResultInfo}>
                    <Text style={[styles.ocrResultTitle, { color: colors.text }]} numberOfLines={1}>
                      {item.albums?.title}
                    </Text>
                    <Text style={[styles.ocrResultArtist, { color: colors.text }]} numberOfLines={1}>
                      {item.albums?.artist}
                    </Text>
                    <Text style={[styles.ocrResultDetail, { color: colors.text }]} numberOfLines={1}>
                      {item.albums?.label && `${item.albums.label} • `}
                      {item.albums?.release_year}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Carga de IA Mejorado */}
      <Modal
        visible={aiLoading}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
      >
        <BothsideLoader />
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 160,
    flexWrap: 'nowrap',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
    flexShrink: 0,
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
    backgroundColor: '#007AFF',
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
    shadowColor: '#000',
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
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
    borderRadius: 50,
    padding: 15,
    shadowColor: '#000',
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
    borderLeftColor: '#007AFF',
  },
  extractedTextLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#007AFF',
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
    shadowColor: '#000',
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
    backgroundColor: '#007AFF',
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