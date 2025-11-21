import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { DiscogsService } from '../services/discogs';
import { AlbumService } from '../services/database';

export const AdminScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [updatingStats, setUpdatingStats] = useState(false);
  const [stats, setStats] = useState<any>(null);

  const checkAlbumStats = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Obtener álbumes que tienen discogs_id pero no tienen estadísticas
      const { data: albums, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          discogs_id,
          album_stats (
            album_id
          )
        `)
        .not('discogs_id', 'is', null);

      if (error) {
        Alert.alert('Error', 'No se pudieron obtener los álbumes');
        return;
      }

      // Filtrar álbumes que no tienen estadísticas
      const albumsWithoutStats = albums.filter(album =>
        !album.album_stats || album.album_stats.length === 0
      );

      setStats({
        total: albums.length,
        withoutStats: albumsWithoutStats.length,
        withStats: albums.length - albumsWithoutStats.length
      });

    } catch (error) {
      console.error('Error checking album stats:', error);
      Alert.alert('Error', 'No se pudo verificar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const updateAlbumStats = async () => {
    if (!user) return;

    setUpdatingStats(true);
    try {
      // Obtener álbumes que tienen discogs_id pero no tienen estadísticas
      const { data: albums, error } = await supabase
        .from('albums')
        .select(`
          id,
          title,
          discogs_id,
          album_stats (
            album_id
          )
        `)
        .not('discogs_id', 'is', null);

      if (error) {
        Alert.alert('Error', 'No se pudieron obtener los álbumes');
        return;
      }

      // Filtrar álbumes que no tienen estadísticas
      const albumsWithoutStats = albums.filter(album =>
        !album.album_stats || album.album_stats.length === 0
      );

      if (albumsWithoutStats.length === 0) {
        Alert.alert('Info', 'Todos los álbumes ya tienen estadísticas');
        return;
      }

      Alert.alert(
        'Confirmar actualización',
        `¿Estás seguro de que quieres actualizar las estadísticas de ${albumsWithoutStats.length} álbumes? Esto puede tomar varios minutos.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Actualizar', onPress: () => performUpdate(albumsWithoutStats) }
        ]
      );

    } catch (error) {
      console.error('Error preparing update:', error);
      Alert.alert('Error', 'No se pudo preparar la actualización');
    } finally {
      setUpdatingStats(false);
    }
  };

  const performUpdate = async (albums: any[]) => {
    setUpdatingStats(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (let i = 0; i < albums.length; i++) {
        const album = albums[i];

        try {
          console.log(`Actualizando estadísticas para: ${album.title} (${i + 1}/${albums.length})`);

          // Obtener estadísticas de Discogs
          const discogsStats = await DiscogsService.getReleaseStats(album.discogs_id);

          if (discogsStats && (discogsStats.lowest_price || discogsStats.avg_price || discogsStats.have || discogsStats.want)) {
            // Actualizar estadísticas en la base de datos
            await AlbumService.updateAlbumWithDiscogsStats(album.id, discogsStats);
            successCount++;
            console.log(`✅ Estadísticas guardadas para: ${album.title}`);
          } else {
            console.log(`⚠️ No se encontraron estadísticas para: ${album.title}`);
            errorCount++;
          }

          // Esperar un poco entre requests para no sobrecargar la API
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`❌ Error procesando ${album.title}:`, error);
          errorCount++;
        }
      }

      Alert.alert(
        'Actualización completada',
        `Éxitos: ${successCount}\nErrores: ${errorCount}`,
        [{ text: 'OK', onPress: () => checkAlbumStats() }]
      );

    } catch (error) {
      console.error('Error durante la actualización:', error);
      Alert.alert('Error', 'Ocurrió un error durante la actualización');
    } finally {
      setUpdatingStats(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Panel de Administración</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Estadísticas de Álbumes</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={checkAlbumStats}
          disabled={loading}
        >
          {loading ? (
            <BothsideLoader size="small" fullscreen={false} />
          ) : (
            <Text style={styles.buttonText}>Verificar Estadísticas</Text>
          )}
        </TouchableOpacity>

        {stats && (
          <View style={styles.statsContainer}>
            <Text style={styles.statsText}>Total de álbumes: {stats.total}</Text>
            <Text style={styles.statsText}>Con estadísticas: {stats.withStats}</Text>
            <Text style={styles.statsText}>Sin estadísticas: {stats.withoutStats}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.button, styles.updateButton]}
          onPress={updateAlbumStats}
          disabled={updatingStats}
        >
          {updatingStats ? (
            <BothsideLoader size="small" fullscreen={false} />
          ) : (
            <Text style={styles.buttonText}>Actualizar Estadísticas</Text>
          )}
        </TouchableOpacity>

        {updatingStats && (
          <Text style={styles.updatingText}>
            Actualizando estadísticas... Esto puede tomar varios minutos.
          </Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 15,
  },
  updateButton: {
    backgroundColor: '#FF9500',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  statsText: {
    fontSize: 14,
    marginBottom: 5,
  },
  updatingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
}); 