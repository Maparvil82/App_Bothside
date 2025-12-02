import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { FloatingAudioPlayer } from './FloatingAudioPlayer';
import { useTranslation } from '../src/i18n/useTranslation';

interface AudioNoteAlbum {
  id: string;
  title: string;
  artist: string;
  cover_url?: string;
  audio_note: string;
  added_at: string;
}

interface AudioNotesSectionProps {
  onPress?: () => void;
}

export const AudioNotesSection: React.FC<AudioNotesSectionProps> = ({ onPress }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [albumsWithAudio, setAlbumsWithAudio] = useState<AudioNoteAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFloatingPlayer, setShowFloatingPlayer] = useState(false);
  const [floatingAudioUri, setFloatingAudioUri] = useState('');
  const [floatingAlbumTitle, setFloatingAlbumTitle] = useState('');

  useEffect(() => {
    if (user) {
      loadAlbumsWithAudio();
    }
  }, [user]);

  const loadAlbumsWithAudio = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: collection, error } = await supabase
        .from('user_collection')
        .select(`
          id,
          audio_note,
          added_at,
          albums (
            title,
            artist,
            cover_url
          )
        `)
        .eq('user_id', user.id)
        .not('audio_note', 'is', null)
        .order('added_at', { ascending: false });

      if (error) {
        console.error('Error loading albums with audio:', error);
        Alert.alert(t('common_error'), t('audio_notes_error_load'));
        return;
      }

      const albumsData: AudioNoteAlbum[] = (collection || []).map(item => ({
        id: item.id,
        title: item.albums?.title || t('common_untitled'),
        artist: item.albums?.artist || t('common_unknown_artist'),
        cover_url: item.albums?.cover_url,
        audio_note: item.audio_note,
        added_at: item.added_at,
      }));

      setAlbumsWithAudio(albumsData);
      console.log('🎤 Albums with audio loaded:', albumsData.length);

    } catch (error) {
      console.error('Error processing audio albums:', error);
      Alert.alert(t('common_error'), t('audio_notes_error_process'));
    } finally {
      setLoading(false);
    }
  };

  const handlePlayAudio = async (audioUri: string, albumTitle: string) => {
    try {
      setFloatingAudioUri(audioUri);
      setFloatingAlbumTitle(albumTitle);
      setShowFloatingPlayer(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert(t('common_error'), t('audio_notes_error_play'));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="mic" size={20} color="#007AFF" />
          <Text style={styles.title}>{t('audio_notes_title')}</Text>
        </View>
        <View style={styles.loadingContainer}>
          <BothsideLoader size="small" fullscreen={false} />
          <Text style={styles.loadingText}>{t('audio_notes_loading')}</Text>
        </View>
      </View>
    );
  }

  if (albumsWithAudio.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="mic" size={20} color="#007AFF" />
          <Text style={styles.title}>{t('audio_notes_title')}</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="mic-outline" size={24} color="#9CA3AF" />
          <Text style={styles.emptyText}>{t('audio_notes_empty_title')}</Text>
          <Text style={styles.emptySubtext}>{t('audio_notes_empty_text')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="mic" size={20} color="#007AFF" />
        <Text style={styles.title}>{t('audio_notes_title')} ({albumsWithAudio.length})</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {albumsWithAudio.map((album, index) => (
          <TouchableOpacity
            key={album.id}
            style={styles.albumCard}
            onPress={() => handlePlayAudio(album.audio_note, album.title)}
            activeOpacity={0.8}
          >
            <View style={styles.albumImageContainer}>
              {album.cover_url ? (
                <Image
                  source={{ uri: album.cover_url }}
                  style={styles.albumImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.albumImagePlaceholder}>
                  <Text style={styles.albumImagePlaceholderText}>{t('common_no_image')}</Text>
                </View>
              )}
              <View style={styles.playButton}>
                <Ionicons name="play" size={16} color="white" />
              </View>
            </View>

            <View style={styles.albumInfo}>
              <Text style={styles.albumTitle} numberOfLines={1}>
                {album.title}
              </Text>
              <Text style={styles.albumArtist} numberOfLines={1}>
                {album.artist}
              </Text>
              <Text style={styles.albumDate}>
                {formatDate(album.added_at)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Reproductor flotante */}
      <FloatingAudioPlayer
        visible={showFloatingPlayer}
        audioUri={floatingAudioUri}
        albumTitle={floatingAlbumTitle}
        onClose={() => setShowFloatingPlayer(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    margin: 10,
    borderRadius: 8,
    padding: 16,


  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  scrollContainer: {
    paddingRight: 16,
  },
  albumCard: {
    width: 120,
    marginRight: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    overflow: 'hidden',
  },
  albumImageContainer: {
    position: 'relative',
    width: '100%',
    height: 120,
  },
  albumImage: {
    width: '100%',
    height: '100%',
  },
  albumImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumImagePlaceholderText: {
    fontSize: 10,
    color: '#6c757d',
    textAlign: 'center',
  },
  playButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.9)',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumInfo: {
    padding: 8,
  },
  albumTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 2,
  },
  albumArtist: {
    fontSize: 11,
    color: '#495057',
    marginBottom: 4,
  },
  albumDate: {
    fontSize: 10,
    color: '#6c757d',
  },
}); 