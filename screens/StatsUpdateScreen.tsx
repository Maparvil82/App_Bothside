import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { AlbumService } from '../services/database';
import { DiscogsService } from '../services/discogs';

interface AlbumStatsSummary {
  totalAlbums: number;
  albumsWithDiscogs: number;
  albumsWithStats: number;
  albumsWithoutStats: number;
  percentageWithStats: number;
}

interface AlbumWithoutStats {
  id: string;
  title: string;
  artist: string;
  discogs_id: number;
  created_at: string;
}

export default function StatsUpdateScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<AlbumStatsSummary | null>(null);
  const [albumsWithoutStats, setAlbumsWithoutStats] = useState<AlbumWithoutStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar resumen de estadísticas
      const statsSummary = await AlbumService.getAlbumStatsSummary();
      setSummary(statsSummary);
      
      // Cargar álbumes sin estadísticas
      const albumsWithoutStatsData = await AlbumService.getAlbumsWithoutStats();
      setAlbumsWithoutStats(albumsWithoutStatsData);
      
    } catch (error) {
      console.error('Error loading stats data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos de estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const updateAlbumStats = async (album: AlbumWithoutStats) => {
    try {
      setUpdating(true);
      
      // Obtener estadísticas de Discogs
      const discogsStats = await DiscogsService.getReleaseStats(album.discogs_id);
      
      if (discogsStats) {
        // Actualizar en la base de datos
        await AlbumService.updateAlbumWithDiscogsStats(album.id, discogsStats);
        
        // Actualizar la lista local
        setAlbumsWithoutStats(prev => prev.filter(a => a.id !== album.id));
        
        // Actualizar el resumen
        const newSummary = await AlbumService.getAlbumStatsSummary();
        setSummary(newSummary);
        
        Alert.alert('Éxito', `Estadísticas actualizadas para "${album.title}"`);
      } else {
        Alert.alert('Error', 'No se pudieron obtener las estadísticas de Discogs');
      }
      
    } catch (error) {
      console.error('Error updating album stats:', error);
      Alert.alert('Error', 'No se pudieron actualizar las estadísticas');
    } finally {
      setUpdating(false);
    }
  };

  const updateAllStats = async () => {
    if (albumsWithoutStats.length === 0) {
      Alert.alert('Info', 'No hay álbumes para actualizar');
      return;
    }

    Alert.alert(
      'Actualizar todas las estadísticas',
      `¿Estás seguro de que quieres actualizar las estadísticas de ${albumsWithoutStats.length} álbumes? Esto puede tomar tiempo.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          style: 'destructive',
          onPress: async () => {
            try {
              setUpdating(true);
              let updatedCount = 0;
              
              for (const album of albumsWithoutStats) {
                try {
                  const discogsStats = await DiscogsService.getReleaseStats(album.discogs_id);
                  if (discogsStats) {
                    await AlbumService.updateAlbumWithDiscogsStats(album.id, discogsStats);
                    updatedCount++;
                  }
                  // Pequeña pausa para evitar límites de API
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                  console.error(`Error updating ${album.title}:`, error);
                }
              }
              
              // Recargar datos
              await loadData();
              
              Alert.alert(
                'Actualización completada',
                `Se actualizaron ${updatedCount} de ${albumsWithoutStats.length} álbumes`
              );
              
            } catch (error) {
              console.error('Error in bulk update:', error);
              Alert.alert('Error', 'Hubo un error durante la actualización masiva');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Cargando estadísticas...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Estadísticas de Discogs</Text>
        <Text style={styles.subtitle}>Estado de las estadísticas de precios</Text>
      </View>

      {/* Resumen de estadísticas */}
      {summary && (
        <View style={styles.summaryContainer}>
          <Text style={styles.sectionTitle}>Resumen</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.totalAlbums}</Text>
              <Text style={styles.statLabel}>Total Álbumes</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.albumsWithDiscogs}</Text>
              <Text style={styles.statLabel}>Con Discogs ID</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.albumsWithStats}</Text>
              <Text style={styles.statLabel}>Con Estadísticas</Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{summary.albumsWithoutStats}</Text>
              <Text style={styles.statLabel}>Sin Estadísticas</Text>
            </View>
          </View>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${summary.percentageWithStats}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {summary.percentageWithStats.toFixed(1)}% completado
            </Text>
          </View>
        </View>
      )}

      {/* Botón para actualizar todo */}
      {albumsWithoutStats.length > 0 && (
        <View style={styles.updateSection}>
          <Text style={styles.sectionTitle}>Actualizar Estadísticas</Text>
          
          <TouchableOpacity 
            style={[styles.updateAllButton, updating && styles.updateAllButtonDisabled]}
            onPress={updateAllStats}
            disabled={updating}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.updateAllButtonText}>
              {updating ? 'Actualizando...' : `Actualizar ${albumsWithoutStats.length} álbumes`}
            </Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            ⚠️ Esto puede tomar tiempo y hacer muchas llamadas a la API de Discogs
          </Text>
        </View>
      )}

      {/* Lista de álbumes sin estadísticas */}
      {albumsWithoutStats.length > 0 && (
        <View style={styles.albumsSection}>
          <Text style={styles.sectionTitle}>
            Álbumes sin estadísticas ({albumsWithoutStats.length})
          </Text>
          
          {albumsWithoutStats.slice(0, 10).map((album, index) => (
            <View key={album.id} style={styles.albumItem}>
              <View style={styles.albumInfo}>
                <Text style={styles.albumTitle}>{album.title}</Text>
                <Text style={styles.albumArtist}>{album.artist}</Text>
                <Text style={styles.albumDate}>
                  Añadido: {new Date(album.created_at).toLocaleDateString('es-ES')}
                </Text>
              </View>
              
              <TouchableOpacity 
                style={[styles.updateButton, updating && styles.updateButtonDisabled]}
                onPress={() => updateAlbumStats(album)}
                disabled={updating}
              >
                <Ionicons name="refresh" size={16} color="white" />
              </TouchableOpacity>
            </View>
          ))}
          
          {albumsWithoutStats.length > 10 && (
            <Text style={styles.moreText}>
              ... y {albumsWithoutStats.length - 10} más
            </Text>
          )}
        </View>
      )}

      {/* Mensaje cuando todo está actualizado */}
      {albumsWithoutStats.length === 0 && summary && summary.albumsWithDiscogs > 0 && (
        <View style={styles.successContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#4CAF50" />
          <Text style={styles.successTitle}>¡Todo actualizado!</Text>
          <Text style={styles.successText}>
            Todos los álbumes tienen estadísticas de Discogs
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  summaryContainer: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  updateSection: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  updateAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  updateAllButtonDisabled: {
    backgroundColor: '#ccc',
  },
  updateAllButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#ff6b35',
    textAlign: 'center',
  },
  albumsSection: {
    margin: 20,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  albumInfo: {
    flex: 1,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  albumArtist: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  albumDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
  },
  updateButtonDisabled: {
    backgroundColor: '#ccc',
  },
  moreText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  successContainer: {
    alignItems: 'center',
    padding: 40,
    margin: 20,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
  successText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
}); 