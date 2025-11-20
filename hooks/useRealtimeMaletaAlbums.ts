import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeMaletaAlbums = (maletaId: string) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!maletaId) {
      console.log('🔍 useRealtimeMaletaAlbums: No maletaId, clearing albums');
      setAlbums([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useRealtimeMaletaAlbums: Setting up for maletaId:', maletaId);

    // Cargar álbumes iniciales
    const loadInitialAlbums = async () => {
      try {
        setLoading(true);
        console.log('🔍 useRealtimeMaletaAlbums: Loading initial albums...');

        const { data, error } = await supabase
          .from('maleta_albums')
          .select(`
            *,
            albums (
              *,
              album_styles (
                styles (*)
              )
            )
          `)
          .eq('maleta_id', maletaId);

        if (error) {
          console.error('❌ useRealtimeMaletaAlbums: Error loading initial albums:', error);
          return;
        }

        console.log('✅ useRealtimeMaletaAlbums: Initial albums loaded:', data?.length || 0);
        setAlbums(data || []);
      } catch (error) {
        console.error('❌ useRealtimeMaletaAlbums: Error in loadInitialAlbums:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialAlbums();

    // Suscripción en tiempo real para maleta_albums
    const albumsSubscription = supabase
      .channel(`maleta_albums_${maletaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maleta_albums',
          filter: `maleta_id=eq.${maletaId}`,
        },
        async (payload) => {
          console.log('🔄 useRealtimeMaletaAlbums: Realtime change:', payload);

          if (payload.eventType === 'INSERT') {
            console.log('➕ useRealtimeMaletaAlbums: Adding new album to list');
            // Obtener los datos completos del álbum
            const { data: albumData, error } = await supabase
              .from('maleta_albums')
              .select(`
                *,
                albums (
                  *,
                  album_styles (
                    styles (*)
                  )
                )
              `)
              .eq('maleta_id', maletaId)
              .eq('album_id', payload.new.album_id)
              .single();

            if (!error && albumData) {
              console.log('✅ useRealtimeMaletaAlbums: Album data fetched:', albumData);
              setAlbums(prev => [albumData, ...prev]);
            } else {
              console.error('❌ useRealtimeMaletaAlbums: Error fetching album data:', error);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useRealtimeMaletaAlbums: Removing album from list');
            setAlbums(prev =>
              prev.filter(album => album.album_id !== payload.old.album_id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeMaletaAlbums: Subscription status:', status);
      });

    return () => {
      console.log('🔌 useRealtimeMaletaAlbums: Unsubscribing from channel');
      albumsSubscription.unsubscribe();
    };
  }, [maletaId]);

  return { albums, loading };
}; 