import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  Alert,
  StyleSheet,
  ScrollView,
  ActionSheetIOS,
  Platform,
  Modal,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SwipeListView } from 'react-native-swipe-list-view';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { DiscogsService } from '../services/discogs';
import { AlbumService, UserCollectionService, UserListService } from '../services/database';
import { DiscogsRelease } from '../types';
import { supabase } from '../lib/supabase';
import { useGems } from '../contexts/GemsContext';
import { ListCoverCollage } from '../components/ListCoverCollage';

export const SearchScreen: React.FC = () => {
  const { user } = useAuth();
  const { addGem, removeGem, isGem } = useGems();
  const navigation = useNavigation<any>();
  const searchInputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState('');
  const [releases, setReleases] = useState<DiscogsRelease[]>([]);
  const [loading, setLoading] = useState(false);
  const [collection, setCollection] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'year' | 'artist' | 'label'>('date');
  const [filterByStyle, setFilterByStyle] = useState<string>('');
  const [filterByYear, setFilterByYear] = useState<string>('');
  const [filterByLabel, setFilterByLabel] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [filteredCollection, setFilteredCollection] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Estados para el modal de añadir a estantería
  const [showAddToShelfModal, setShowAddToShelfModal] = useState(false);
  const [userLists, setUserLists] = useState<any[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null);
  const [showCreateShelfForm, setShowCreateShelfForm] = useState(false);
  const [newShelfTitle, setNewShelfTitle] = useState('');
  const [newShelfDescription, setNewShelfDescription] = useState('');
  const [newShelfIsPublic, setNewShelfIsPublic] = useState(false);

  useEffect(() => {
    if (user) {
      loadCollection();
    }
  }, [user]);

  useEffect(() => {
    sortCollection();
  }, [collection, sortBy, filterByStyle, filterByYear, filterByLabel, query]);

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
          )
        `)
        .eq('user_id', user.id)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading collection:', error);
        return;
      }

      console.log('📊 Colección cargada:', userCollection?.length, 'álbumes');

      setCollection(userCollection || []);
    } catch (error) {
      console.error('Error loading collection:', error);
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

  // Función para cargar las estanterías del usuario
  const loadUserLists = async () => {
    if (!user) return;
    try {
      const lists = await UserListService.getUserListsWithAlbums(user.id);
      setUserLists(lists || []);
    } catch (error) {
      console.error('Error loading user lists:', error);
      Alert.alert('Error', 'No se pudieron cargar las estanterías');
    }
  };

  // Función para añadir álbum a una estantería
  const addAlbumToShelf = async (listId: string) => {
    if (!selectedAlbum || !user) return;
    
    try {
      // Verificar si el álbum ya está en la estantería
      const isAlreadyInList = await UserListService.isAlbumInList(listId, selectedAlbum.albums.id);
      
      if (isAlreadyInList) {
        Alert.alert('Aviso', 'Este álbum ya está en esta estantería');
        return;
      }
      
      await UserListService.addAlbumToList(listId, selectedAlbum.albums.id);
      Alert.alert('Éxito', 'Álbum añadido a la estantería');
      setShowAddToShelfModal(false);
      setSelectedAlbum(null);
    } catch (error) {
      console.error('Error adding album to list:', error);
      Alert.alert('Error', 'No se pudo añadir el álbum a la estantería');
    }
  };

  // Función para crear nueva estantería
  const createNewShelf = async () => {
    if (!user || !newShelfTitle.trim()) return;
    
    try {
      const newList = await UserListService.createList({
        title: newShelfTitle.trim(),
        description: newShelfDescription.trim(),
        is_public: newShelfIsPublic,
        user_id: user.id
      });
      
      // Añadir el álbum a la nueva estantería
      await UserListService.addAlbumToList(newList.id, selectedAlbum.albums.id);
      
      Alert.alert('Éxito', 'Estantería creada y álbum añadido');
      setShowAddToShelfModal(false);
      setShowCreateShelfForm(false);
      setSelectedAlbum(null);
      setNewShelfTitle('');
      setNewShelfDescription('');
      setNewShelfIsPublic(false);
    } catch (error) {
      console.error('Error creating list:', error);
      Alert.alert('Error', 'No se pudo crear la estantería');
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
      
      if (Platform.OS === 'ios') {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ['Cancelar', gemAction, 'Añadir a Estantería', 'Editar', 'Compartir'],
            cancelButtonIndex: 0,
            title: item.albums?.title || 'Álbum',
            message: '¿Qué quieres hacer con este álbum?',
          },
          (buttonIndex) => {
            switch (buttonIndex) {
              case 1: // Gem action
                handleToggleGem(item);
                break;
              case 2: // Añadir a Estantería
                setSelectedAlbum(item);
                loadUserLists();
                setShowAddToShelfModal(true);
                break;
              case 3: // Editar
                Alert.alert('Editar', 'Función de editar próximamente');
                break;
              case 4: // Compartir
                Alert.alert('Compartir', 'Función de compartir próximamente');
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
            { text: gemAction, onPress: () => handleToggleGem(item) },
            { text: 'Añadir a Estantería', onPress: () => {
              setSelectedAlbum(item);
              loadUserLists();
              setShowAddToShelfModal(true);
            }},
            { text: 'Editar', onPress: () => Alert.alert('Editar', 'Función de editar próximamente') },
            { text: 'Compartir', onPress: () => Alert.alert('Compartir', 'Función de compartir próximamente') },
          ]
        );
      }
    }
    rowMap[rowKey]?.closeRow();
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
      filtered = filtered.filter(item =>
        item.albums?.album_styles?.some((as: any) => as.styles?.name === filterByStyle)
      );
    }

    // Filtrar por año
    if (filterByYear) {
      filtered = filtered.filter(item => item.albums?.release_year === filterByYear);
    }

    // Filtrar por sello
    if (filterByLabel) {
      filtered = filtered.filter(item => item.albums?.label === filterByLabel);
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
        genre: release.genres?.join(', ') || '',
        styles: release.styles?.join(', ') || '',
        cover_url: release.cover_image || release.thumb,
        discogs_id: release.id,
      };
      
      const album = await AlbumService.createAlbum(albumData);
      await UserCollectionService.addToCollection(user.id, album.id);
      
      Alert.alert('Éxito', 'Disco añadido a tu colección');
      await loadCollection();
    } catch (error) {
      console.error('Error adding to collection:', error);
      Alert.alert('Error', 'No se pudo añadir el disco a la colección');
    }
  };

  const getUniqueStyles = () => {
    const styles = new Set<string>();
    collection.forEach(item => {
      item.albums?.album_styles?.forEach((as: any) => {
        if (as.styles?.name) {
          styles.add(as.styles.name);
        }
      });
    });
    return Array.from(styles).sort();
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



  const renderCollectionItem = ({ item }: { item: any }) => (
    <View style={styles.collectionItemContainer}>
      <TouchableOpacity 
        style={styles.collectionItem}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.7}
      >
        <Image
          source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
          style={styles.collectionThumbnail}
        />
        <View style={styles.collectionInfo}>
          <Text style={styles.collectionTitle} numberOfLines={1} ellipsizeMode="tail">
            {item.albums?.title}
          </Text>
          <Text style={styles.collectionArtist}>{item.albums?.artist}</Text>
          <View style={styles.collectionDetails}>
            <Text style={styles.collectionDetail}>
              {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
                ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
                : item.albums?.label && item.albums.label !== ''
                  ? `Sello: ${item.albums.label}`
                  : item.albums?.release_year
                    ? `Año: ${item.albums.release_year}`
                    : ''
              }
            </Text>
            <Text style={styles.collectionDetail}>
              {item.albums?.album_styles && item.albums.album_styles.length > 0 &&
                `Estilo: ${item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}`
              }
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderGridItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.collectionItemGrid}
      onLongPress={() => handleLongPress(item)}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: item.albums?.cover_url || 'https://via.placeholder.com/60' }}
        style={styles.collectionThumbnailGrid}
      />
      <View style={styles.collectionInfoGrid}>
        <Text style={styles.collectionTitleGrid} numberOfLines={1} ellipsizeMode="tail">
          {item.albums?.title}
        </Text>
        <Text style={styles.collectionArtistGrid}>{item.albums?.artist}</Text>
        <View style={styles.collectionDetailsGrid}>
          <Text style={styles.collectionDetailGrid}>
            {item.albums?.label && item.albums.label !== '' && item.albums?.release_year
              ? `Sello: ${item.albums.label} | Año: ${item.albums.release_year}`
              : item.albums?.label && item.albums.label !== ''
                ? `Sello: ${item.albums.label}`
                : item.albums?.release_year
                  ? `Año: ${item.albums.release_year}`
                  : ''
            }
          </Text>
          <Text style={styles.collectionDetailGrid}>
            {item.albums?.album_styles && item.albums.album_styles.length > 0 &&
              `Estilo: ${item.albums.album_styles.map((as: any) => as.styles?.name).filter(Boolean).join(', ')}`
            }
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRelease = ({ item }: { item: DiscogsRelease }) => (
    <View style={styles.releaseItem}>
      <Image
        source={{ uri: item.cover_image || item.thumb || 'https://via.placeholder.com/60' }}
        style={styles.releaseThumbnail}
      />
      <View style={styles.releaseInfo}>
        <Text style={styles.releaseTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.releaseArtist}>{item.artists?.[0]?.name || 'Unknown Artist'}</Text>
        <Text style={styles.releaseDetail}>
          {item.year && `Año: ${item.year}`}
          {item.genres && item.genres.length > 0 && ` | Género: ${item.genres.join(', ')}`}
          {item.styles && item.styles.length > 0 && ` | Estilo: ${item.styles.join(', ')}`}
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
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.collectionCountContainer}>
          <Text style={styles.collectionCountText}>
            {filteredCollection.length} discos
          </Text>
        </View>
        
        <View style={styles.headerButtons}>
                    <TouchableOpacity
            style={[
              styles.searchButton,
              { backgroundColor: showSearch ? '#f0f0f0' : 'transparent' }
            ]}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons 
              name="search-outline" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.viewButton}
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          >
            <Ionicons 
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterButton,
              { backgroundColor: showFilters ? '#f0f0f0' : 'transparent' }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons 
              name="filter-outline" 
              size={24} 
              color="#666" 
            />
          </TouchableOpacity>
          

        </View>
      </View>
      
      {/* Campo de búsqueda */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <TextInput
              ref={searchInputRef}
              style={styles.searchInput}
              placeholder="Buscar por artista, sello o álbum..."
              value={query}
              onChangeText={setQuery}
              placeholderTextColor="#999"
            />
            <TouchableOpacity
              style={styles.closeSearchButton}
              onPress={() => {
                setShowSearch(false);
                setQuery('');
              }}
            >
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Filtros */}
      {showFilters && (
        <View style={styles.filterDropdownContent}>
          <ScrollView>
            {/* Filtro por Estilo */}
            <View style={styles.filterSection}>
              <Text style={styles.filterSectionTitle}>Estilo</Text>
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


          </ScrollView>
        </View>
      )}

      {/* Lista combinada */}
      {user ? (
        viewMode === 'list' ? (
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
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Cargando...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No se encontraron resultados</Text>
                </View>
              )
            }
            ListFooterComponent={
              releases.length > 0 ? (
                <View style={styles.footerContainer}>
                  <Text style={styles.footerText}>Resultados de búsqueda en Discogs</Text>
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
            data={filteredCollection}
            renderItem={renderGridItem}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.gridRow}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Cargando...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No se encontraron resultados</Text>
                </View>
              )
            }
            ListFooterComponent={
              releases.length > 0 ? (
                <View style={styles.footerContainer}>
                  <Text style={styles.footerText}>Resultados de búsqueda en Discogs</Text>
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
        )
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
                <Text style={styles.emptyText}>Cargando...</Text>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No se encontraron resultados</Text>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
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

                <Text style={styles.shelfListTitle}>Estanterías existentes:</Text>
                
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
                        <ListCoverCollage albums={list.albums || []} size={50} />
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
                    <Text style={styles.formLabel}>Estantería pública</Text>
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
                      styles.createButton,
                      { opacity: newShelfTitle.trim() ? 1 : 0.5 }
                    ]}
                    onPress={createNewShelf}
                    disabled={!newShelfTitle.trim()}
                  >
                    <Text style={styles.createButtonText}>Crear y añadir álbum</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  collectionCountContainer: {
    flex: 1,
  },
  collectionCountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  viewButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
  },
  filterButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'transparent',
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
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
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
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    maxHeight: 300,
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
    color: '#333',
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
  collectionItemContainer: {
    marginBottom: 8,
    backgroundColor: 'white',
  },
  collectionItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    minHeight: 80,
  },
  collectionThumbnail: {
    width: 80,
    height: '100%',
    borderRadius: 4,
    marginRight: 10,
  },
  collectionInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  collectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  collectionArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  collectionDetails: {
    marginTop: 4,
  },
  collectionDetail: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  collectionItemGrid: {
    flex: 1,
    backgroundColor: 'white',
    margin: 5,
    padding: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  collectionThumbnailGrid: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 4,
    marginBottom: 8,
  },
  collectionInfoGrid: {
    alignItems: 'flex-start',
  },
  collectionTitleGrid: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    textAlign: 'left',
  },
  collectionArtistGrid: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    textAlign: 'left',
  },
  collectionDetailsGrid: {
    marginTop: 4,
  },
  collectionDetailGrid: {
    fontSize: 10,
    color: '#999',
    marginBottom: 2,
  },

  gridRow: {
    justifyContent: 'space-between',
  },
  releaseItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  releaseThumbnail: {
    width: 80,
    height: '100%',
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

  // Estilos para el modal de añadir a estantería
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 20,
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
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
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
  createButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },

}); 