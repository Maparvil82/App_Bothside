import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCameraPermissions } from 'expo-camera';
import { CameraComponent } from '../components/CameraComponent';
import { useAuth } from '../contexts/AuthContext';
import { AlbumService, UserCollectionService, StyleService } from '../services/database';
import { supabase } from '../lib/supabase';
import { DiscogsService } from '../services/discogs';

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

export const AddDiscScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'search' | 'manual' | 'camera'>('search');
  const [query, setQuery] = useState('');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Estados para la pestaña manual
  const [artistQuery, setArtistQuery] = useState('');
  const [albumQuery, setAlbumQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [manualLoading, setManualLoading] = useState(false);

  // Estados para la pestaña cámara
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraType, setCameraType] = useState<string>('back');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  // Estados para OCR
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrResults, setOcrResults] = useState<any[]>([]);
  const [extractedText, setExtractedText] = useState<string>('');

  const searchAlbums = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setAlbums([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await AlbumService.searchAlbums(searchQuery);
      setAlbums(results || []);
    } catch (error) {
      console.error('Error searching albums:', error);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = useCallback((text: string) => {
    setQuery(text);
    
    // Limpiar el timeout anterior si existe
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Si el texto está vacío, limpiar resultados inmediatamente
    if (!text.trim()) {
      setAlbums([]);
      return;
    }
    
    // Crear un nuevo timeout para la búsqueda
    const timeout = setTimeout(() => {
      searchAlbums(text);
    }, 300); // 300ms de delay
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Limpiar timeout cuando el componente se desmonte
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  // Solicitar permisos de cámara
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Función para buscar en Discogs manualmente
  const searchDiscogsManual = async () => {
    if (!artistQuery.trim() || !albumQuery.trim()) {
      Alert.alert('Error', 'Por favor ingresa tanto el artista como el álbum');
      return;
    }

    setManualLoading(true);
    try {
      const searchTerm = `${artistQuery} ${albumQuery}`;
      console.log('🔍 Buscando en Discogs:', searchTerm);
      
      const response = await DiscogsService.searchReleases(searchTerm);
      console.log('📦 Respuesta completa de Discogs:', response);
      console.log('📊 Total de resultados:', response.results?.length || 0);
      
      // Mostrar todos los formatos disponibles para debugging
      if (response.results && response.results.length > 0) {
        console.log('🎵 Formatos disponibles:');
        response.results.forEach((release: any, index: number) => {
          console.log(`${index + 1}. "${release.title}" - Formato: "${release.format}" - Año: ${release.year}`);
        });
      }
      
      // Filtrar solo versiones en vinilo y con artista y álbum exactos
      const vinylReleases = response.results?.filter((release: any) => {
        // Extraer artista y álbum del título (formato: "Artista - Álbum")
        const titleParts = release.title?.split(' - ');
        const releaseArtist = titleParts?.[0]?.toLowerCase().trim();
        const releaseAlbum = titleParts?.[1]?.toLowerCase().trim();
        
        const searchArtist = artistQuery.toLowerCase().trim();
        const searchAlbum = albumQuery.toLowerCase().trim();
        
        // Verificar coincidencia del artista (más flexible)
        const artistMatches = releaseArtist && releaseArtist.includes(searchArtist);
        
        // Verificar coincidencia del álbum (más flexible)
        const albumMatches = releaseAlbum && releaseAlbum.includes(searchAlbum);
        
        // Manejar diferentes tipos de format
        let format = '';
        if (typeof release.format === 'string') {
          format = release.format.toLowerCase();
        } else if (Array.isArray(release.format)) {
          format = release.format.join(' ').toLowerCase();
        } else if (release.format && typeof release.format === 'object') {
          format = JSON.stringify(release.format).toLowerCase();
        }
        
        const isVinyl = format.includes('vinyl') || format.includes('lp') || format.includes('12"') || format.includes('7"') || format.includes('10"');
        console.log(`🎵 "${release.title}" - Artista extraído: "${releaseArtist || 'N/A'}" - Álbum extraído: "${releaseAlbum || 'N/A'}" - Coincide artista: ${artistMatches} - Coincide álbum: ${albumMatches} - Formato: "${release.format}" - Es vinilo: ${isVinyl}`);
        return artistMatches && albumMatches && isVinyl;
      }) || [];
      
      console.log('💿 Versiones en vinilo encontradas:', vinylReleases.length);
      setManualSearchResults(vinylReleases);
    } catch (error) {
      console.error('❌ Error searching Discogs:', error);
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
      setManualSearchResults([]);
    } finally {
      setManualLoading(false);
    }
  };

  // Función para añadir un release de Discogs a la colección
  const addDiscogsReleaseToCollection = async (release: any) => {
    if (!user) return;
    
    try {
      console.log('🎵 Llamando a Edge Function para guardar release:', release.id);
      
      // Llamar a la Edge Function de Supabase
      const { data, error } = await supabase.functions.invoke('save-discogs-release', {
        body: {
          discogsReleaseId: release.id,
          userId: user.id
        }
      });
      
      if (error) {
        console.error('❌ Error llamando a Edge Function:', error);
        throw error;
      }
      
      if (data?.success) {
        console.log('✅ Disco guardado exitosamente con ID:', data.albumId);
        Alert.alert('Éxito', 'Disco añadido a tu colección');
        
        // Limpiar búsqueda manual
        setArtistQuery('');
        setAlbumQuery('');
        setManualSearchResults([]);
      } else {
        throw new Error(data?.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('❌ Error adding Discogs release to collection:', error);
      Alert.alert('Error', 'No se pudo añadir el disco a la colección');
    }
  };



  const addToCollection = async (album: Album) => {
    if (!user) return;

    try {
      // Si el álbum ya tiene discogs_id, usar la Edge Function
      if (album.discogs_id) {
        console.log('🎵 Llamando a Edge Function para álbum existente:', album.discogs_id);
        
        const { data, error } = await supabase.functions.invoke('save-discogs-release', {
          body: {
            discogsReleaseId: album.discogs_id,
            userId: user.id
          }
        });
        
        if (error) {
          console.error('❌ Error llamando a Edge Function:', error);
          throw error;
        }
        
        if (data?.success) {
          console.log('✅ Disco añadido exitosamente a la colección');
          Alert.alert('Éxito', 'Disco añadido a tu colección');
          
          // Limpiar búsqueda
          setQuery('');
          setAlbums([]);
        } else {
          throw new Error(data?.error || 'Error desconocido');
        }
      } else {
        // Para álbumes sin discogs_id, usar el método directo
        await UserCollectionService.addToCollection(user.id, album.id);
        Alert.alert('Éxito', 'Disco añadido a tu colección');
        
        // Limpiar búsqueda
        setQuery('');
        setAlbums([]);
      }
    } catch (error) {
      console.error('❌ Error adding to collection:', error);
      Alert.alert('Error', 'No se pudo añadir el disco a la colección');
    }
  };

  // Funciones para la cámara
  const openCamera = () => {
    setShowCamera(true);
  };

  const closeCamera = () => {
    setShowCamera(false);
    setCapturedImage(null);
  };

  const takePicture = async (cameraRef: any) => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync();
        setCapturedImage(photo.uri);
        setShowCamera(false);
        console.log('📸 Foto capturada:', photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'No se pudo capturar la foto');
      }
    }
  };

  // Función para realizar OCR en la imagen
  const performOCR = async (imageUri: string) => {
    if (!imageUri) return;
    
    setOcrLoading(true);
    setExtractedText('');
    setOcrResults([]);
    
    try {
      console.log('🔍 Iniciando OCR simulado en imagen:', imageUri);
      
      // Simular procesamiento de OCR
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Texto simulado extraído de una imagen de álbum
      const simulatedText = `The Dark Side of the Moon
Pink Floyd
1973
Harvest Records
Progressive Rock`;
      
      setExtractedText(simulatedText);
      console.log('📝 Texto extraído (simulado):', simulatedText);
      
      // Extraer artista y álbum del texto
      const { artist, album } = extractArtistAndAlbum(simulatedText);
      
      if (artist && album) {
        console.log('🎵 Artista extraído:', artist);
        console.log('💿 Álbum extraído:', album);
        
        // Buscar en Discogs API
        await searchDiscogsFromOCR(artist, album);
      } else {
        Alert.alert('OCR', 'No se pudo extraer artista y álbum del texto reconocido');
      }
      
    } catch (error) {
      console.error('❌ Error en OCR:', error);
      Alert.alert('Error', 'No se pudo procesar la imagen con OCR');
    } finally {
      setOcrLoading(false);
    }
  };

  // Función para extraer artista y álbum del texto OCR
  const extractArtistAndAlbum = (text: string): { artist: string | null; album: string | null } => {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Buscar patrones comunes en portadas de álbumes
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Patrón: "Artista - Álbum"
      const dashPattern = line.match(/^(.+?)\s*-\s*(.+)$/);
      if (dashPattern) {
        return {
          artist: dashPattern[1].trim(),
          album: dashPattern[2].trim()
        };
      }
      
      // Patrón: "Artista" en una línea, "Álbum" en la siguiente
      if (i < lines.length - 1) {
        const nextLine = lines[i + 1].trim();
        if (line.length > 0 && nextLine.length > 0 && !line.includes('-')) {
          return {
            artist: line,
            album: nextLine
          };
        }
      }
    }
    
    // Si no encontramos patrones específicos, tomar las primeras dos líneas
    if (lines.length >= 2) {
      return {
        artist: lines[0].trim(),
        album: lines[1].trim()
      };
    }
    
    return { artist: null, album: null };
  };

  // Función para buscar en Discogs API usando datos del OCR
  const searchDiscogsFromOCR = async (artist: string, album: string) => {
    try {
      console.log('🔍 Buscando en Discogs:', artist, '-', album);
      
      const results = await DiscogsService.searchReleases(`${artist} ${album}`);
      
      if (results && results.results && results.results.length > 0) {
        // Filtrar solo versiones en vinilo
        const vinylResults = results.results.filter((release: any) => {
          const formats = release.format || '';
          return formats.toLowerCase().includes('vinyl') || 
                 formats.toLowerCase().includes('lp') ||
                 formats.toLowerCase().includes('12"') ||
                 formats.toLowerCase().includes('12"') ||
                 formats.toLowerCase().includes('7"');
        });
        
        console.log('💿 Versiones en vinilo encontradas:', vinylResults.length);
        return vinylResults;
      } else {
        Alert.alert('Búsqueda', 'No se encontraron resultados en Discogs');
        return [];
      }
    } catch (error) {
      console.error('❌ Error buscando en Discogs:', error);
      Alert.alert('Error', 'No se pudo buscar en Discogs');
      return [];
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
        style={styles.addButton}
        onPress={() => addToCollection(item)}
      >
        <Ionicons name="add" size={24} color="white" />
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
          {item.title}
        </Text>
        <Text style={styles.albumArtist}>
          {item.artists?.[0]?.name || 'Unknown Artist'}
        </Text>
        <Text style={styles.albumDetails}>
          {item.year && `${item.year} • `}
          {item.format && `${item.format} • `}
          {item.label && `${item.label}`}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addDiscogsReleaseToCollection(item)}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderSearchTab = () => (
    <View style={styles.tabContent}>
      {/* Search Bar */}
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
            placeholder="Buscar en toda la base de datos..."
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



      {/* Results */}
      {loading && query.trim() ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando...</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          renderItem={renderAlbum}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {query ? `No se encontraron resultados para "${query}"` : 'Escribe para buscar discos en toda la base de datos'}
              </Text>
              {query && (
                <Text style={styles.emptySubtext}>
                  Prueba con otros términos o verifica la ortografía
                </Text>
              )}
              <Text style={styles.debugText}>
                {albums.length > 0 ? `${albums.length} resultados encontrados` : 'No se encontraron resultados'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );

  const renderManualTab = () => (
    <View style={styles.tabContent}>
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
            placeholder="Nombre del artista..."
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
            placeholder="Nombre del álbum..."
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
              (!artistQuery.trim() || !albumQuery.trim()) && styles.manualSearchButtonDisabled
            ]}
            onPress={searchDiscogsManual}
            disabled={manualLoading || !artistQuery.trim() || !albumQuery.trim()}
          >
            {manualLoading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.manualSearchButtonText}>Buscar en Discogs</Text>
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
              <Text style={styles.clearAllButtonText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Resultados de búsqueda */}
      {manualLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Buscando versiones en vinilo...</Text>
        </View>
      ) : (
        <FlatList
          data={manualSearchResults}
          renderItem={renderDiscogsRelease}
          keyExtractor={(item) => item.id.toString()}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="disc-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {artistQuery && albumQuery 
                  ? 'No se encontraron versiones en vinilo para esta búsqueda'
                  : 'Ingresa el artista y álbum para buscar versiones en vinilo'
                }
              </Text>
              {artistQuery && albumQuery && (
                <Text style={styles.emptySubtext}>
                  Solo se muestran versiones en formato vinilo (LP, 12", 7", etc.)
                </Text>
              )}
            </View>
          }
        />
      )}
    </View>
  );

  const renderCameraTab = () => {
    if (showCamera) {
      return (
        <View style={styles.cameraContainer}>
          <CameraComponent
            onCapture={(imageUri) => {
              setCapturedImage(imageUri);
              closeCamera();
            }}
            onClose={closeCamera}
            onOCRResult={async (artist, album) => {
              console.log('🎵 OCR Result:', { artist, album });
              if (artist && album) {
                setOcrLoading(true);
                try {
                  const results = await searchDiscogsFromOCR(artist, album);
                  setOcrResults(results || []);
                } catch (error) {
                  console.error('Error searching Discogs from OCR:', error);
                  Alert.alert('Error', 'No se pudieron buscar resultados en Discogs');
                  setOcrResults([]);
                } finally {
                  setOcrLoading(false);
                }
              }
            }}
          />
        </View>
      );
    }

    return (
      <View style={styles.tabContent}>
        {capturedImage ? (
          <View style={styles.capturedImageContainer}>
            <Image source={{ uri: capturedImage }} style={styles.capturedImage} />
            
            {/* Botones de acción */}
            <View style={styles.capturedImageButtons}>
              <TouchableOpacity
                style={styles.capturedImageButton}
                onPress={() => {
                  setCapturedImage(null);
                  setOcrResults([]);
                  setExtractedText('');
                }}
              >
                <Ionicons name="refresh" size={20} color="#007AFF" />
                <Text style={styles.capturedImageButtonText}>Nueva foto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.capturedImageButton, ocrLoading && styles.capturedImageButtonDisabled]}
                onPress={() => performOCR(capturedImage)}
                disabled={ocrLoading}
              >
                <Ionicons name="text" size={20} color={ocrLoading ? "#ccc" : "#007AFF"} />
                <Text style={[styles.capturedImageButtonText, ocrLoading && styles.capturedImageButtonTextDisabled]}>
                  {ocrLoading ? 'Analizando...' : 'Analizar texto'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Texto extraído por OCR */}
            {extractedText && (
              <View style={styles.extractedTextContainer}>
                <Text style={styles.extractedTextTitle}>Texto reconocido:</Text>
                <Text style={styles.extractedText}>{extractedText}</Text>
              </View>
            )}

            {/* Resultados de búsqueda en Discogs */}
            {ocrLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.loadingText}>Analizando imagen y buscando en Discogs...</Text>
              </View>
            ) : ocrResults.length > 0 ? (
              <View style={styles.ocrResultsContainer}>
                <Text style={styles.ocrResultsTitle}>Resultados encontrados:</Text>
                <FlatList
                  data={ocrResults}
                  renderItem={renderDiscogsRelease}
                  keyExtractor={(item) => item.id.toString()}
                  showsVerticalScrollIndicator={false}
                />
              </View>
            ) : null}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="camera-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>
              Escanear con cámara
            </Text>
            <Text style={styles.emptySubtext}>
              Toma una foto de la portada del álbum para analizar automáticamente
            </Text>
            {permission?.status !== 'granted' && (
              <Text style={styles.permissionText}>
                Se requiere permiso de cámara para usar esta función
              </Text>
            )}
            <TouchableOpacity
              style={styles.cameraOpenButton}
              onPress={openCamera}
              disabled={permission?.status !== 'granted'}
            >
              <Ionicons name="camera" size={24} color="white" />
              <Text style={styles.cameraOpenButtonText}>Abrir cámara</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'search' && styles.activeTab]}
          onPress={() => setActiveTab('search')}
        >
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={20}
            color={activeTab === 'search' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'search' && styles.activeTabText]}>
            Buscar
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'manual' && styles.activeTab]}
          onPress={() => setActiveTab('manual')}
        >
          <Ionicons
            name={activeTab === 'manual' ? 'create' : 'create-outline'}
            size={20}
            color={activeTab === 'manual' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'manual' && styles.activeTabText]}>
            Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'camera' && styles.activeTab]}
          onPress={() => setActiveTab('camera')}
        >
          <Ionicons
            name={activeTab === 'camera' ? 'camera' : 'camera-outline'}
            size={20}
            color={activeTab === 'camera' ? '#007AFF' : '#666'}
          />
          <Text style={[styles.tabText, activeTab === 'camera' && styles.activeTabText]}>
            Cámara
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {activeTab === 'search' && renderSearchTab()}
      {activeTab === 'manual' && renderManualTab()}
      {activeTab === 'camera' && renderCameraTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
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
    backgroundColor: '#007AFF',
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
    backgroundColor: '#007AFF',
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
    height: '100%',
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
    backgroundColor: '#007AFF',
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
    color: '#007AFF',
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
    backgroundColor: '#007AFF',
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
}); 