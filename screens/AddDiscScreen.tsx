import React, { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  SafeAreaView,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { ImportDiscogsCard } from '../components/ImportDiscogsCard';
import { ImportDiscogsBottomSheet } from '../components/ImportDiscogsBottomSheet';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useNavigation, useTheme, useRoute } from '@react-navigation/native';
import { useThemeMode } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { AlbumService, UserCollectionService, StyleService } from '../services/database';
import { supabase } from '../lib/supabase';
import { DiscogsService } from '../services/discogs';
import { DiscogsStatsService } from '../services/discogs-stats';
import { useTranslation } from '../src/i18n/useTranslation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRecommendBothside } from '../contexts/RecommendBothsideContext';

interface Album {
  id: string;
  title: string;
  artist: string;
  release_year?: string;
  label?: string;
  genre?: string;
  styles?: string;
  cover_url?: string;
  discogs_id?: number;
}

// Función para normalizar cadenas (quitar acentos, paréntesis, etc.)
const normalize = (str: string) =>
  str
    ?.toLowerCase()
    ?.normalize("NFD")
    ?.replace(/[\u0300-\u036f]/g, "") // quitar acentos
    ?.replace(/\(.*?\)/g, "") // quitar info entre paréntesis tipo (Remastered), (2011)
    ?.replace(/[^a-z0-9]/g, "") // quitar símbolos
    ?.trim();
export const AddDiscScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const route = useRoute<any>(); // Add useRoute
  const { colors } = useTheme();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const { t } = useTranslation();
  const { checkRecommendationTrigger } = useRecommendBothside();

  const showSuccessAlert = useCallback(() => {
    // Check if user has exactly 4 vinyl records to recommend Bothside
    checkRecommendationTrigger();

    Alert.alert(
      t('add_disc_success_title'),
      t('add_disc_success_message'),
      [
        {
          text: t('add_disc_action_add_more'),
          style: 'default',
          onPress: () => {
            // Mantener en la página actual
          }
        },
        {
          text: t('add_disc_action_go_collection'),
          style: 'default',
          onPress: () => {
            navigation.navigate('SearchTab');
          }
        }
      ]
    );
  }, [navigation, t, checkRecommendationTrigger]);

  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  // Estados para la búsqueda manual y Discogs
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [manualLoading, setManualLoading] = useState(false);
  const [addingDisc, setAddingDisc] = useState(false);

  // Controladores de estado de búsqueda
  const [hasSearched, setHasSearched] = useState(false);
  const [showDiscogsResults, setShowDiscogsResults] = useState(false);
  const [activeSearchMode, setActiveSearchMode] = useState<'bothside' | 'discogs'>('bothside');
  const [artistQuery, setArtistQuery] = useState('');
  const [albumQuery, setAlbumQuery] = useState('');
  const [importBottomSheetVisible, setImportBottomSheetVisible] = useState(false);
  const [showImportCard, setShowImportCard] = useState(false);

  useEffect(() => {
    const checkImportCardStatus = async () => {
      try {
        const value = await AsyncStorage.getItem('@show_import_discogs_card');
        setShowImportCard(value !== 'false');
      } catch (e) {
        setShowImportCard(true);
      }
    };
    checkImportCardStatus();
  }, []);

  const handleDismissImportCard = async () => {
    try {
      await AsyncStorage.setItem('@show_import_discogs_card', 'false');
      setShowImportCard(false);
    } catch (e) {
      setShowImportCard(false);
    }
  };

  // Búsqueda en Comunidad/Bothside
  const searchAlbums = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setAlbums([]);
      setHasSearched(false);
      setShowDiscogsResults(false);
      return;
    }

    setLoading(true);
    setHasSearched(false);
    setShowDiscogsResults(false);
    setManualSearchResults([]);

    try {
      console.log('🔍 Buscando en Comunidad (Bothside):', searchQuery);
      const results = await AlbumService.searchAlbums(searchQuery);
      setAlbums(results || []);
      setHasSearched(true);
    } catch (error) {
      console.error('Error searching albums:', error);
      setAlbums([]);
      setHasSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Búsqueda en Discogs con un solo término
  const performDiscogsSearchSingle = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setManualLoading(true);
    setShowDiscogsResults(true);

    try {
      console.log('🧪 Probando conexión con Discogs antes de buscar...');
      const connectionTest = await DiscogsService.testConnection();
      if (!connectionTest) {
        Alert.alert(t('common_error_connection'), t('add_disc_error_discogs_connection'));
        setManualLoading(false);
        return;
      }

      console.log('🔍 Buscando en Discogs (Manual Single):', searchTerm);
      const response = await DiscogsService.searchReleases(searchTerm);

      // Filtrar solo versiones en vinilo
      const vinylReleases = response?.results?.filter((release: any) => {
        let format = '';
        if (typeof release.format === 'string') {
          format = release.format.toLowerCase();
        } else if (Array.isArray(release.format)) {
          format = release.format.join(' ').toLowerCase();
        } else if (release.format && typeof release.format === 'object') {
          format = JSON.stringify(release.format).toLowerCase();
        }
        return format.includes('vinyl') || format.includes('lp') || format.includes('12"') || format.includes('7"') || format.includes('10"');
      }) || [];

      console.log('💿 Versiones en vinilo encontradas en Discogs:', vinylReleases.length);
      setManualSearchResults(vinylReleases);
    } catch (error) {
      console.error('❌ Error searching Discogs:', error);
      Alert.alert(t('common_error'), t('add_disc_error_search'));
      setManualSearchResults([]);
    } finally {
      setManualLoading(false);
    }
  };

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setAlbums([]);
      setManualSearchResults([]);
      setHasSearched(false);
      setShowDiscogsResults(false);
    }
  }, []);

  const handleOpenDiscogsForm = () => {
    setActiveSearchMode('discogs');
    setManualSearchResults([]);

    const cleanQuery = query.trim();
    if (cleanQuery) {
      // Intentar dividir por separadores comunes si existen
      const separators = [' - ', ' – ', ' / ', ' | ', ' • '];
      let foundSeparator = false;
      for (const sep of separators) {
        if (cleanQuery.includes(sep)) {
          const parts = cleanQuery.split(sep);
          if (parts.length >= 2) {
            setArtistQuery(parts[0].trim());
            setAlbumQuery(parts[1].trim());
            foundSeparator = true;
            break;
          }
        }
      }

      // Si no se encontró separador, asumimos que es un término simple (solo artista)
      if (!foundSeparator) {
        setArtistQuery(cleanQuery);
        setAlbumQuery('');
      }
    } else {
      setArtistQuery('');
      setAlbumQuery('');
    }
  };

  const performManualSearch = async (artist: string, album: string) => {
    if (!artist.trim() || !album.trim()) {
      Alert.alert(t('common_error'), t('add_disc_error_manual_input'));
      return;
    }

    setManualLoading(true);
    // Asegurarse de estar en el modo discogs
    setActiveSearchMode('discogs');

    try {
      // Primero probar la conexión con Discogs
      console.log('🧪 Probando conexión con Discogs antes de buscar...');
      const connectionTest = await DiscogsService.testConnection();
      if (!connectionTest) {
        Alert.alert(t('common_error_connection'), t('add_disc_error_discogs_connection'));
        setManualLoading(false);
        return;
      }

      const searchTerm = `${artist} ${album}`;
      console.log('🔍 Buscando en Discogs (Manual):', searchTerm);

      const response = await DiscogsService.searchReleases(searchTerm);

      // Filtrar solo versiones en vinilo y con artista y álbum exactos
      const vinylReleases = response?.results?.filter((release: any) => {
        // Extraer artista y álbum del título (formato: "Artista - Álbum")
        const titleParts = release.title?.split(' - ');
        const releaseArtist = titleParts?.[0]?.toLowerCase().trim();
        const releaseAlbum = titleParts?.[1]?.toLowerCase().trim();

        const searchArtist = artist.toLowerCase().trim();
        const searchAlbum = album.toLowerCase().trim();

        // Verificar coincidencia del artista (más flexible)
        // Manejo especial para "Various" / "Varios"
        const isVarious = searchArtist.includes('various') || searchArtist.includes('varios') || searchArtist === 'v.a.';

        let artistMatches = releaseArtist && releaseArtist.includes(searchArtist);

        if (isVarious) {
          const releaseIsVarious = releaseArtist && (
            releaseArtist.includes('various') ||
            releaseArtist.includes('varios') ||
            releaseArtist.includes('v.a.')
          );

          if (releaseIsVarious) {
            artistMatches = true;
          } else {
            if (releaseAlbum === searchAlbum) {
              artistMatches = true;
            }
          }
        }

        // Verificar coincidencia del álbum (más flexible)
        const albumMatches = releaseAlbum && releaseAlbum.includes(searchAlbum);

        // Manejar format
        let format = '';
        if (typeof release.format === 'string') {
          format = release.format.toLowerCase();
        } else if (Array.isArray(release.format)) {
          format = release.format.join(' ').toLowerCase();
        } else if (release.format && typeof release.format === 'object') {
          format = JSON.stringify(release.format).toLowerCase();
        }

        const isVinyl = format.includes('vinyl') || format.includes('lp') || format.includes('12"') || format.includes('7"') || format.includes('10"');
        return artistMatches && albumMatches && isVinyl;
      }) || [];

      console.log('💿 Versiones en vinilo encontradas:', vinylReleases.length);
      setManualSearchResults(vinylReleases);
    } catch (error) {
      console.error('❌ Error searching Discogs:', error);
      Alert.alert(t('common_error'), t('add_disc_error_search'));
      setManualSearchResults([]);
    } finally {
      setManualLoading(false);
    }
  };

  const searchDiscogsManual = () => {
    performManualSearch(artistQuery, albumQuery);
  };

  // Controlar la visibilidad del tab bar inferior en el flujo de añadir disco
  useEffect(() => {
    const syncTabStyle = async () => {
      if (!user) return;
      const parent = navigation.getParent();
      if (!parent) return;

      try {
        const completed = await AsyncStorage.getItem(`onboarding_completed_${user.id}`);
        if (completed === 'true') {
          parent.setOptions({
            tabBarStyle: {
              height: 80,
              width: '100%',
            }
          });
        } else {
          // Si no está completado en caché, consultar el conteo en base de datos como respaldo
          const count = await UserCollectionService.getUserCollectionCount(user.id);
          if (count > 0) {
            await AsyncStorage.setItem(`onboarding_completed_${user.id}`, 'true');
            parent.setOptions({
              tabBarStyle: {
                height: 80,
                width: '100%',
              }
            });
          } else {
            parent.setOptions({
              tabBarStyle: { display: 'none' }
            });
          }
        }
      } catch (error) {
        console.error('Error syncing tab style in AddDiscScreen:', error);
      }
    };

    if (!addingDisc) {
      const unsubscribe = navigation.addListener('focus', syncTabStyle);
      syncTabStyle(); // Ejecutar inicialmente
      return unsubscribe;
    }
  }, [user, navigation, addingDisc]);

  // Efecto para buscar cuando cambia el query con debounce (previene bucle infinito)
  useEffect(() => {
    if (debouncedQuery.trim()) {
      searchAlbums(debouncedQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  // Handle params from CameraScan
  useEffect(() => {
    if (route.params?.initialArtist && route.params?.initialAlbum) {
      console.log('📸 Auto-filling Manual Search:', route.params.initialArtist, route.params.initialAlbum);
      setActiveSearchMode('discogs');
      setArtistQuery(route.params.initialArtist);
      setAlbumQuery(route.params.initialAlbum);
      performManualSearch(route.params.initialArtist, route.params.initialAlbum);

      // Clean params
      navigation.setParams({
        initialArtist: undefined,
        initialAlbum: undefined,
        autoManualSearch: undefined
      });
    } else if (route.params?.initialSearchQuery) {
      setQuery(route.params.initialSearchQuery);
      setActiveSearchMode('bothside');
      navigation.setParams({ initialSearchQuery: undefined });
    }
  }, [route.params?.initialArtist, route.params?.initialAlbum, route.params?.initialSearchQuery, navigation]);


  // Función para extraer artista del título
  const extractArtistFromTitle = (title: string): string | null => {
    if (!title) return null;

    // Intentar extraer artista del título (formato: "Artista - Título")
    const titleParts = title.split(' - ');
    if (titleParts.length >= 2) {
      return titleParts[0].trim();
    }

    // Si no hay separador, intentar con otros formatos comunes
    const otherSeparators = [' – ', ' / ', ' | ', ' • '];
    for (const separator of otherSeparators) {
      const parts = title.split(separator);
      if (parts.length >= 2) {
        return parts[0].trim();
      }
    }

    return null;
  };

  // Función para extraer solo el título del álbum
  const extractAlbumTitle = (title: string): string => {
    if (!title) return t('common_untitled');

    // Intentar extraer título del álbum (formato: "Artista - Título")
    const titleParts = title.split(' - ');
    if (titleParts.length >= 2) {
      return titleParts.slice(1).join(' - ').trim();
    }

    // Si no hay separador, intentar con otros formatos comunes
    const otherSeparators = [' – ', ' / ', ' | ', ' • '];
    for (const separator of otherSeparators) {
      const parts = title.split(separator);
      if (parts.length >= 2) {
        return parts.slice(1).join(separator).trim();
      }
    }

    // Si no se puede extraer, devolver el título completo
    return title;
  };


  // Función para añadir un release de Discogs a la colección
  const addDiscogsReleaseToCollection = async (release: any) => {
    if (!user) return;

    setAddingDisc(true);

    try {
      console.log('🎵 Llamando a Edge Function para guardar release:', release.id);

      // ------------------------------------------------------
      // 🔍 VERIFICACIÓN PREVIA (Antes de llamar a Edge Function)
      // ------------------------------------------------------

      // 1. Verificar si el álbum ya existe en la tabla global para comprobar duplicados exactos
      // Usamos !inner en el join para filtrar por discogs_id en la tabla relacionada si fuera necesario,
      // pero aquí buscamos primero el álbum localmente para obtener su ID.
      const { data: existingAlbum } = await supabase
        .from('albums')
        .select('id')
        .eq('discogs_id', release.id)
        .maybeSingle();

      if (existingAlbum) {
        // Si existe el álbum, comprobar si el usuario ya lo tiene
        const { data: existingExact } = await supabase
          .from("user_collection")
          .select("id, shelves(name)")
          .eq("user_id", user.id)
          .eq("album_id", existingAlbum.id)
          .maybeSingle();

        if (existingExact) {
          const locationName = (existingExact as any)?.shelves?.name;
          const message = locationName
            ? `${t('add_disc_alert_duplicate_message')}\n\n${t('add_disc_alert_duplicate_location', { 0: locationName })}`
            : t('add_disc_alert_duplicate_message');

          Alert.alert(
            t('add_disc_alert_duplicate_title'),
            message,
            [
              {
                text: t('common_cancel'),
                style: 'cancel',
                onPress: () => {
                  setAddingDisc(false);
                }
              },
              {
                text: t('add_disc_alert_duplicate_action_view'),
                style: 'default',
                onPress: () => {
                  setAddingDisc(false);
                  navigation.navigate('AlbumDetail', { albumId: existingAlbum.id });
                }
              }
            ]
          );
          return;
        }
      }

      // 2. Comprobar si el usuario tiene OTRA edición
      if (release.id) {
        const normArtist = normalize(release.artist || (release.artists && release.artists[0]?.name) || '');
        const normTitle = normalize(release.title);

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
          const differentDiscogs = alb.discogs_id !== release.id;

          return sameArtist && sameTitle && differentDiscogs;
        });

        if (otherEdition) {
          Alert.alert(
            t('add_disc_alert_other_edition_title'),
            t('add_disc_alert_other_edition_message')
          );
        }
      }

      // Llamar a la Edge Function de Supabase
      const { data, error } = await supabase.functions.invoke('save-discogs-release', {
        body: {
          discogsReleaseId: release.id,
          userId: user.id
        }
      });

      if (error) {
        console.error('❌ Error llamando a Edge Function:', error);
        // Fallback: intentar añadir directamente si el álbum ya existe en la tabla global
        try {
          console.log('🛟 Fallback: buscando álbum por discogs_id para inserción directa en user_collection...');
          const { data: albumRow, error: findErr } = await supabase
            .from('albums')
            .select('id')
            .eq('discogs_id', release.id)
            .maybeSingle();
          if (findErr) throw findErr;
          if (albumRow?.id) {
            await UserCollectionService.addToCollection(user.id, albumRow.id);
            showSuccessAlert();
            return;
          } else {
            // Crear álbum mínimo en catálogo y luego añadir a colección
            console.log('🧩 Creando álbum mínimo en albums (fallback)...');
            const titleParts = (release.title || '').split(' - ');
            const artistName = titleParts?.[0]?.trim() || release.artist || '';
            const albumTitle = titleParts?.[1]?.trim() || release.title || '';
            const newAlbum = await AlbumService.createAlbum({
              title: albumTitle,
              artist: artistName,
              label: Array.isArray(release.label) ? release.label[0] : (release.label || undefined),
              release_year: release.year ? String(release.year) : undefined,
              cover_url: release.cover_image || release.thumb,
              catalog_no: (release.catno || undefined) as any,
              country: (release.country || undefined) as any,
              discogs_id: release.id
            } as any);
            if (newAlbum?.id) {
              // Obtener estadísticas en segundo plano y guardarlas
              DiscogsStatsService.fetchAndSaveDiscogsStats(newAlbum.id, release.id).catch(() => { });
              // Importar vídeos de YouTube desde Discogs y guardarlos
              try {
                const fullRelease = await DiscogsService.getRelease(release.id);
                const videos = (fullRelease as any)?.videos || [];
                const youtubeVideos = videos.filter((v: any) => v?.uri && (v.uri.includes('youtube.com') || v.uri.includes('youtu.be')));
                if (youtubeVideos.length > 0) {
                  const payload = youtubeVideos.map((v: any) => ({
                    album_id: newAlbum.id,
                    url: v.uri,
                    title: v.title || '',
                    is_playlist: false,
                    imported_from_discogs: true,
                    discogs_video_id: v.id ? String(v.id) : null,
                  }));
                  await supabase.from('album_youtube_urls').insert(payload);
                }
                // Importar tracklist
                const tracklist = (fullRelease as any)?.tracklist || [];
                if (Array.isArray(tracklist) && tracklist.length > 0) {
                  const tracksPayload = tracklist
                    .filter((t: any) => t?.title)
                    .map((t: any) => ({
                      album_id: newAlbum.id,
                      position: t.position?.toString() || null,
                      title: t.title?.toString() || '',
                      duration: t.duration?.toString() || null,
                    }));
                  if (tracksPayload.length > 0) {
                    await supabase.from('tracks').insert(tracksPayload);
                  }
                }
              } catch { }
              await UserCollectionService.addToCollection(user.id, newAlbum.id);
              showSuccessAlert();
              return;
            }
          }
        } catch (fbErr) {
          console.error('❌ Fallback directo/creación mínima falló:', fbErr);
        }
        throw error;
      }

      if (data?.success) {
        console.log('✅ Disco guardado exitosamente con ID:', data.albumId);

        // Obtener estadísticas de Discogs en segundo plano (no bloquear la UI)
        if (data.albumId && release.id) {
          DiscogsStatsService.fetchAndSaveDiscogsStats(data.albumId, release.id)
            .then((success) => {
              if (success) {
                console.log('✅ Estadísticas de Discogs obtenidas y guardadas');
              } else {
                console.log('⚠️ No se pudieron obtener estadísticas de Discogs');
              }
            })
            .catch((error) => {
              console.error('❌ Error obteniendo estadísticas de Discogs:', error);
            });
        }

        showSuccessAlert();
      } else {
        // Si la función respondió 2xx pero con success false, intentar fallback
        try {
          console.log('🛟 Fallback: función respondió sin éxito; buscando álbum por discogs_id...');
          const { data: albumRow } = await supabase
            .from('albums')
            .select('id')
            .eq('discogs_id', release.id)
            .maybeSingle();
          if (albumRow?.id) {
            await UserCollectionService.addToCollection(user.id, albumRow.id);
            showSuccessAlert();
            return;
          }
        } catch { }
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('❌ Error adding Discogs release to collection:', error?.message || error);
      Alert.alert(t('common_error'), error?.message || t('add_disc_error_adding'));
    } finally {
      setAddingDisc(false);
    }
  };



  const addToCollection = async (album: Album) => {
    if (!user) return;

    setAddingDisc(true);

    try {
      // Usar siempre el flujo local robusto para todos los usuarios
      if (album.discogs_id) {
        console.log('🎵 Procesando álbum con discogs_id:', album.discogs_id);

        // Primero verificar si el álbum ya existe en el catálogo
        console.log('🔍 Buscando álbum existente por discogs_id...');
        const { data: albumRow, error: findErr } = await supabase
          .from('albums')
          .select('id')
          .eq('discogs_id', album.discogs_id)
          .maybeSingle();

        if (findErr) throw findErr;

        if (albumRow?.id) {
          // El álbum ya existe, solo añadirlo a la colección
          console.log('✅ Álbum encontrado en catálogo, añadiendo a colección...');

          // ------------------------------------------------------
          // 🔍 1) Comprobar si ya existe EXACTAMENTE este album_id
          // ------------------------------------------------------
          const { data: existingExact } = await supabase
            .from("user_collection")
            .select("id, shelves(name)")
            .eq("user_id", user.id)
            .eq("album_id", albumRow.id)
            .maybeSingle();

          if (existingExact) {
            const locationName = (existingExact as any)?.shelves?.name;
            const message = locationName
              ? `${t('add_disc_alert_duplicate_message')}\n\n${t('add_disc_alert_duplicate_location', { 0: locationName })}`
              : t('add_disc_alert_duplicate_message');

            Alert.alert(
              t('add_disc_alert_duplicate_title'),
              message,
              [
                {
                  text: t('common_cancel'),
                  style: 'cancel',
                  onPress: () => {
                    setAddingDisc(false);
                  }
                },
                {
                  text: t('add_disc_alert_duplicate_action_view'),
                  style: 'default',
                  onPress: () => {
                    setAddingDisc(false);
                    navigation.navigate('AlbumDetail', { albumId: albumRow.id });
                  }
                }
              ]
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
                t('add_disc_alert_other_edition_title'),
                t('add_disc_alert_other_edition_message')
              );
            }
          }
          // 🟢 3) Si pasa las verificaciones → continuar

          await UserCollectionService.addToCollection(user.id, albumRow.id);
          showSuccessAlert();
          return;
        } else {
          // El álbum no existe, crearlo con datos completos
          console.log('🧩 Creando álbum completo con datos de Discogs...');
          const newAlbum = await AlbumService.createAlbum({
            title: album.title,
            artist: album.artist,
            label: album.label,
            release_year: album.release_year,
            cover_url: album.cover_url,
            catalog_no: (album as any).catalog_no,
            country: (album as any).country,
            discogs_id: album.discogs_id
          } as any);

          if (newAlbum?.id) {
            // Obtener estadísticas en segundo plano
            DiscogsStatsService.fetchAndSaveDiscogsStats(newAlbum.id, album.discogs_id).catch(() => { });

            // Importar datos completos de Discogs
            console.log('📀 Importando datos completos de Discogs...');
            try {
              const fullRelease = await DiscogsService.getRelease(album.discogs_id);
              if (!fullRelease) {
                console.warn('⚠️ No se pudo obtener release de Discogs');
                throw new Error('Release no disponible');
              }

              console.log('✅ Release obtenido:', fullRelease.title);

              // Importar YouTube URLs
              const videos = (fullRelease as any)?.videos || [];
              console.log('🎬 Videos encontrados:', videos.length);

              const youtubeVideos = videos.filter((v: any) => v?.uri && (v.uri.includes('youtube.com') || v.uri.includes('youtu.be')));
              console.log('📺 Videos de YouTube filtrados:', youtubeVideos.length);

              if (youtubeVideos.length > 0) {
                const payload = youtubeVideos.map((v: any) => ({
                  album_id: newAlbum.id,
                  url: v.uri,
                  title: v.title || '',
                  is_playlist: false,
                  imported_from_discogs: true,
                  discogs_video_id: v.id ? String(v.id) : null,
                }));
                const { error: urlError } = await supabase.from('album_youtube_urls').insert(payload);
                if (urlError) {
                  console.error('❌ Error insertando URLs de YouTube:', urlError.message);
                } else {
                  console.log('✅ URLs de YouTube insertadas:', payload.length);
                }
              }

              // Importar tracklist
              const tracklist = (fullRelease as any)?.tracklist || [];
              console.log('🎵 Tracks encontrados:', tracklist.length);

              if (Array.isArray(tracklist) && tracklist.length > 0) {
                const tracksPayload = tracklist
                  .filter((t: any) => t?.title)
                  .map((t: any) => ({
                    album_id: newAlbum.id,
                    position: t.position?.toString() || null,
                    title: t.title?.toString() || '',
                    duration: t.duration?.toString() || null,
                  }));
                if (tracksPayload.length > 0) {
                  const { error: tracksError } = await supabase.from('tracks').insert(tracksPayload);
                  if (tracksError) {
                    console.error('❌ Error insertando tracks:', tracksError.message);
                  } else {
                    console.log('✅ Tracks insertados:', tracksPayload.length);
                  }
                }
              }

              console.log('🎉 Importación completa de Discogs finalizada exitosamente');

            } catch (importError) {
              console.error('❌ Error importando datos de Discogs:', importError);
              // No fallar toda la operación, el álbum básico ya está creado
            }

            // Añadir a la colección del usuario

            // ------------------------------------------------------
            // 🔍 1) Comprobar si ya existe EXACTAMENTE este album_id
            // ------------------------------------------------------
            const { data: existingExact } = await supabase
              .from("user_collection")
              .select("id, shelves(name)")
              .eq("user_id", user.id)
              .eq("album_id", newAlbum.id)
              .maybeSingle();

            if (existingExact) {
              const locationName = (existingExact as any)?.shelves?.name;
              const message = locationName
                ? `${t('add_disc_alert_duplicate_message')}\n\n${t('add_disc_alert_duplicate_location', { 0: locationName })}`
                : t('add_disc_alert_duplicate_message');

              Alert.alert(
                t('add_disc_alert_duplicate_title'),
                message,
                [
                  {
                    text: t('common_cancel'),
                    style: 'cancel',
                    onPress: () => {
                      setAddingDisc(false);
                    }
                  },
                  {
                    text: t('add_disc_alert_duplicate_action_view'),
                    style: 'default',
                    onPress: () => {
                      setAddingDisc(false);
                      navigation.navigate('AlbumDetail', { albumId: newAlbum.id });
                    }
                  }
                ]
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
                  t('add_disc_alert_other_edition_title'),
                  t('add_disc_alert_other_edition_message')
                );
              }
            }
            // 🟢 3) Si pasa las verificaciones → continuar

            await UserCollectionService.addToCollection(user.id, newAlbum.id);
            showSuccessAlert();
            return;
          }
        }
      } else {
        // Para álbumes sin discogs_id (casos raros)
        await UserCollectionService.addToCollection(user.id, album.id);
        showSuccessAlert();
      }
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      Alert.alert(t('common_error'), t('add_disc_error_adding'));
    } finally {
      setAddingDisc(false);
    }
  };


  const renderAlbum = ({ item }: { item: Album }) => (
    <View style={styles.albumItem}>
      <Image
        source={{ uri: item.cover_url || 'https://via.placeholder.com/80' }}
        style={styles.albumThumbnail}
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1} ellipsizeMode="tail">
          {item.title}
        </Text>
        <Text style={styles.albumArtist}>
          {item.artist}
        </Text>
        <Text style={styles.albumDetails}>
          {item.release_year && `${item.release_year} • `}
          {item.label && `${item.label} • `}
          {item.genre || item.styles}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: primaryColor }, addingDisc && styles.addButtonDisabled]}
        onPress={() => addToCollection(item)}
        disabled={addingDisc}
      >
        {addingDisc ? (
          <BothsideLoader size="small" fullscreen={false} />
        ) : (
          <Ionicons name="add" size={24} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );

  const renderDiscogsRelease = ({ item }: { item: any }) => (
    <View style={styles.albumItem}>
      <Image
        source={{ uri: item.cover_image || item.thumb || 'https://via.placeholder.com/80' }}
        style={styles.albumThumbnail}
      />
      <View style={styles.albumInfo}>
        <Text style={styles.albumTitle} numberOfLines={1} ellipsizeMode="tail">
          {extractAlbumTitle(item.title)}
        </Text>
        <Text style={styles.albumArtist}>
          {item.artists?.[0]?.name || item.artist || extractArtistFromTitle(item.title) || 'Unknown Artist'}
        </Text>
        <Text style={styles.albumDetails}>
          {item.year && `${item.year} • `}
          {item.label && `${Array.isArray(item.label) ? item.label[0] : item.label} • `}
          {item.catno && `${item.catno}`}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: primaryColor }, addingDisc && styles.addButtonDisabled]}
        onPress={() => addDiscogsReleaseToCollection(item)}
        disabled={addingDisc}
      >
        {addingDisc ? (
          <BothsideLoader size="small" fullscreen={false} />
        ) : (
          <Ionicons name="add" size={24} color="white" />
        )}
      </TouchableOpacity>
    </View>
  );

  interface UnifiedSearchResult {
    id: string;
    type: 'community_album' | 'empty_community_cta' | 'cta_more_results';
    data?: any;
  }

  const getListData = (): UnifiedSearchResult[] => {
    const list: UnifiedSearchResult[] = [];

    if (!query.trim()) {
      return [];
    }

    // 1. Mostrar resultados locales si existen
    if (albums.length > 0) {
      albums.forEach(album => {
        list.push({
          id: `local_${album.id}`,
          type: 'community_album',
          data: album
        });
      });

      // 2. Si hay resultados locales: agregar CTA secundario
      list.push({
        id: 'cta_more_results',
        type: 'cta_more_results'
      });
    }
    // 3. Si no hay resultados locales y se ha buscado: agregar CTA principal (estado vacío)
    else if (hasSearched) {
      list.push({
        id: 'empty_community_cta',
        type: 'empty_community_cta'
      });
    }

    return list;
  };

  const renderUnifiedItem = ({ item }: { item: UnifiedSearchResult }) => {
    switch (item.type) {
      case 'community_album':
        return renderAlbum({ item: item.data });
      case 'empty_community_cta':
        return (
          <View style={styles.emptyCommunityContainer}>
            <Ionicons name="search-outline" size={48} color="#ccc" style={{ marginBottom: 16 }} />
            <Text style={styles.emptyCommunityTitle}>
              No hemos encontrado este disco en la comunidad de Bothside
            </Text>
            <Text style={styles.emptyCommunityDescription}>
              Sé el primero en añadirlo a la colección compartida.
            </Text>
            <TouchableOpacity
              style={[styles.searchDiscogsCTA, { backgroundColor: primaryColor }]}
              onPress={handleOpenDiscogsForm}
            >
              <Text style={styles.searchDiscogsCTAText}>Buscar en Discogs</Text>
            </TouchableOpacity>
          </View>
        );
      case 'cta_more_results':
        return (
          <View style={styles.moreResultsContainer}>
            <Text style={styles.moreResultsText}>
              ¿No encuentras el disco o la edición que buscas?
            </Text>
            <TouchableOpacity
              style={[styles.moreResultsButton, { borderColor: primaryColor }]}
              onPress={handleOpenDiscogsForm}
            >
              <Text style={[styles.moreResultsButtonText, { color: primaryColor }]}>
                Buscar en Discogs
              </Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: mode === 'dark' ? '#121212' : 'white' }]}>
      {/* Header Estático con Selector de 3 Opciones */}
      <View style={[styles.headerSelectorContainer, { backgroundColor: mode === 'dark' ? '#121212' : 'white', borderBottomColor: mode === 'dark' ? '#2c2c2c' : '#eee' }]}>
        {activeSearchMode === 'discogs' && (
          <TouchableOpacity
            style={styles.absoluteBackButton}
            onPress={() => {
              setActiveSearchMode('bothside');
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.selectorRow}>
          <TouchableOpacity
            style={[styles.selectorButton, styles.selectorButtonActive]}
            onPress={() => {
              if (activeSearchMode === 'discogs') {
                setActiveSearchMode('bothside');
              }
            }}
          >
            <Ionicons
              name={activeSearchMode !== 'discogs' ? "search" : "search-outline"}
              size={22}
              color={primaryColor}
            />
            <Text style={[styles.selectorText, { color: primaryColor, fontWeight: '600' }]}>
              {t('add_disc_tab_manual_new')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => navigation.navigate('BarcodeScan')}
          >
            <Ionicons
              name="barcode-outline"
              size={22}
              color={mode === 'dark' ? '#a0a0a0' : '#8e8e93'}
            />
            <Text style={[styles.selectorText, { color: mode === 'dark' ? '#a0a0a0' : '#8e8e93' }]}>
              {t('add_disc_tab_barcode_new')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.selectorButton}
            onPress={() => navigation.navigate('CameraScan')}
          >
            <Ionicons
              name="camera-outline"
              size={22}
              color={mode === 'dark' ? '#a0a0a0' : '#8e8e93'}
            />
            <Text style={[styles.selectorText, { color: mode === 'dark' ? '#a0a0a0' : '#8e8e93' }]}>
              {t('add_disc_tab_cover_new')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar (Only for bothside mode) */}
      {activeSearchMode === 'bothside' && (
        <View style={styles.searchContainer}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder={t('add_disc_placeholder_search_input')}
              value={query}
              onChangeText={handleSearchChange}
              returnKeyType="search"
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => handleSearchChange('')}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Content based on activeSearchMode */}
      {activeSearchMode === 'bothside' ? (
        loading && query.trim() ? (
          <View style={styles.loadingContainer}>
            <BothsideLoader size="small" fullscreen={false} />
            <Text style={styles.loadingText}>{t('common_searching')}</Text>
          </View>
        ) : (
          <FlatList
            data={getListData()}
            renderItem={renderUnifiedItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={getListData().length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
            ListEmptyComponent={
              <View style={[styles.emptyContainer, !query ? { justifyContent: 'space-between', paddingVertical: 20 } : null]}>
                {!query ? (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                    <Image
                      source={require('../assets/empty_collection.png')}
                      style={styles.emptyStateImage}
                    />
                    <Text style={styles.emptyStateTitle}>
                      {t('add_disc_empty_state_title')}
                    </Text>
                    <Text style={styles.emptyStateSubtitle}>
                      {t('add_disc_empty_state_subtitle')}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={styles.emptyText}>
                      {`${t('add_disc_empty_search_query')} "${query}"`}
                    </Text>
                  </View>
                )}
                {!query && showImportCard && (
                  <ImportDiscogsCard
                    onPressInfo={() => setImportBottomSheetVisible(true)}
                    onDismiss={handleDismissImportCard}
                  />
                )}
              </View>
            }
          />
        )
      ) : (
        // Discogs Advanced Search Form and Results
        <View style={{ flex: 1 }}>
          {/* Overlay de carga cuando se está añadiendo un disco */}
          {addingDisc && (
            <View style={styles.addingOverlay}>
              <View style={styles.addingOverlayContent}>
                <BothsideLoader size="large" fullscreen={false} />
                <Text style={styles.addingOverlayText}>{t('common_saving')}</Text>
              </View>
            </View>
          )}

          {/* Formulario de búsqueda manual */}
          <View style={styles.manualSearchContainer}>
            <View style={styles.manualInputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#999"
                style={styles.manualInputIcon}
              />
              <TextInput
                style={styles.manualInput}
                placeholder={t('add_disc_placeholder_artist')}
                value={artistQuery}
                onChangeText={setArtistQuery}
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {artistQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearInputButton}
                  onPress={() => setArtistQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.manualInputContainer}>
              <Ionicons
                name="disc-outline"
                size={20}
                color="#999"
                style={styles.manualInputIcon}
              />
              <TextInput
                style={styles.manualInput}
                placeholder={t('add_disc_placeholder_album')}
                value={albumQuery}
                onChangeText={setAlbumQuery}
                placeholderTextColor="#999"
                autoCapitalize="words"
                autoCorrect={false}
              />
              {albumQuery.length > 0 && (
                <TouchableOpacity
                  style={styles.clearInputButton}
                  onPress={() => setAlbumQuery('')}
                >
                  <Ionicons name="close-circle" size={20} color="#999" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.manualButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.manualSearchButton,
                  { backgroundColor: primaryColor },
                  (!artistQuery.trim() || !albumQuery.trim()) && styles.manualSearchButtonDisabled
                ]}
                onPress={searchDiscogsManual}
                disabled={manualLoading || !artistQuery.trim() || !albumQuery.trim()}
              >
                {manualLoading ? (
                  <BothsideLoader size="small" fullscreen={false} />
                ) : (
                  <Text style={styles.manualSearchButtonText}>{t('add_disc_button_search_manual')}</Text>
                )}
              </TouchableOpacity>

              {(artistQuery.length > 0 || albumQuery.length > 0) && (
                <TouchableOpacity
                  style={styles.clearAllButton}
                  onPress={() => {
                    setArtistQuery('');
                    setAlbumQuery('');
                    setManualSearchResults([]);
                  }}
                >
                  <Text style={styles.clearAllButtonText}>{t('common_clear')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Resultados de búsqueda de Discogs */}
          {manualLoading ? (
            <View style={styles.loadingContainer}>
              <BothsideLoader size="small" fullscreen={false} />
              <Text style={styles.loadingText}>{t('add_disc_searching_vinyl')}</Text>
            </View>
          ) : (
            <FlatList
              data={manualSearchResults}
              renderItem={renderDiscogsRelease}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={manualSearchResults.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : undefined}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {artistQuery && albumQuery
                      ? t('add_disc_empty_manual_query')
                      : t('add_disc_empty_manual_default')
                    }
                  </Text>
                  {artistQuery && albumQuery && (
                    <Text style={styles.emptySubtext}>
                      {t('add_disc_empty_manual_hint')}
                    </Text>
                  )}
                </View>
              }
            />
          )}
        </View>
      )}
      <ImportDiscogsBottomSheet
        visible={importBottomSheetVisible}
        onClose={() => setImportBottomSheetVisible(false)}
      />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerSelectorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 12,
    paddingBottom: 8,
  },
  absoluteBackButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    padding: 4,
  },
  selectorRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  selectorButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  selectorButtonActive: {
    // Relying on active theme coloring of text and icon
  },
  selectorText: {
    fontSize: 12,
    color: '#8e8e93',
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 5,
  },
  manualSearchContainer: {
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  manualInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  manualInputIcon: {
    marginRight: 10,
  },
  manualInput: {
    flex: 1,
    height: 44,
    fontSize: 16,
    paddingVertical: 0,
  },
  manualSearchButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    flex: 2,
  },
  manualSearchButtonDisabled: {
    backgroundColor: '#ccc',
  },
  manualSearchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  searchButton: {
    backgroundColor: AppColors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  albumItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 0,
    marginVertical: 0,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 10,
  },
  albumInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  albumDetails: {
    fontSize: 12,
    color: '#999',
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: AppColors.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#ccc',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
    marginBottom: 16,
    opacity: 0.8,
    alignSelf: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    opacity: 0.8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },

  debugText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  clearInputButton: {
    padding: 5,
  },
  manualButtonContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  clearAllButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    flex: 1,
  },
  clearAllButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  // Estilos para la cámara
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  cameraButtonContainer: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingBottom: 50,
  },
  cameraButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 35,
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
  },
  closeCameraButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capturedImageContainer: {
    flex: 1,
    padding: 15,
  },
  capturedImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    marginBottom: 15,
  },
  capturedImageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  capturedImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  capturedImageButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: AppColors.primary,
    fontWeight: '600',
  },
  permissionText: {
    color: '#ff3b30',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  cameraOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  cameraOpenButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Estilos para OCR
  capturedImageButtonDisabled: {
    backgroundColor: '#f0f0f0',
  },
  capturedImageButtonTextDisabled: {
    color: '#ccc',
  },
  extractedTextContainer: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    marginTop: 15,
    borderRadius: 8,
  },
  extractedTextTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  extractedText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  ocrResultsContainer: {
    marginTop: 15,
  },
  ocrResultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    paddingHorizontal: 15,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  addingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  addingOverlayContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addingOverlayText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
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
  emptyCommunityContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyCommunityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyCommunityDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  searchDiscogsCTA: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  searchDiscogsCTAText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  moreResultsContainer: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginTop: 12,
  },
  moreResultsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
  },
  moreResultsButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  moreResultsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 