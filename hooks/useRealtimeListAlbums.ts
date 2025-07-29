import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeListAlbums = (listId: string) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!listId) {
      console.log('🔍 useRealtimeListAlbums: No listId, clearing albums');
      setAlbums([]);
      setLoading(false);
      return;
    }

    console.log('🔍 useRealtimeListAlbums: Setting up for listId:', listId);

    // Cargar álbumes iniciales
    const loadInitialAlbums = async () => {
      try {
        setLoading(true);
        console.log('🔍 useRealtimeListAlbums: Loading initial albums...');
        
        const { data, error } = await supabase
          .from('list_albums')
          .select(`
            *,
            albums (
              *,
              album_styles (
                styles (*)
              )
            )
          `)
          .eq('list_id', listId);

        if (error) {
          console.error('❌ useRealtimeListAlbums: Error loading initial albums:', error);
          return;
        }

        console.log('✅ useRealtimeListAlbums: Initial albums loaded:', data?.length || 0);
        setAlbums(data || []);
      } catch (error) {
        console.error('❌ useRealtimeListAlbums: Error in loadInitialAlbums:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialAlbums();

    // Suscripción en tiempo real para list_albums
    const albumsSubscription = supabase
      .channel(`list_albums_${listId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_albums',
          filter: `list_id=eq.${listId}`,
        },
        async (payload) => {
          console.log('🔄 useRealtimeListAlbums: Realtime change:', payload);
          
          if (payload.eventType === 'INSERT') {
            console.log('➕ useRealtimeListAlbums: Adding new album to list');
            // Obtener los datos completos del álbum
            const { data: albumData, error } = await supabase
              .from('list_albums')
              .select(`
                *,
                albums (
                  *,
                  album_styles (
                    styles (*)
                  )
                )
              `)
              .eq('list_id', listId)
              .eq('album_id', payload.new.album_id)
              .single();

            if (!error && albumData) {
              console.log('✅ useRealtimeListAlbums: Album data fetched:', albumData);
              setAlbums(prev => [albumData, ...prev]);
            } else {
              console.error('❌ useRealtimeListAlbums: Error fetching album data:', error);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('🗑️ useRealtimeListAlbums: Removing album from list');
            setAlbums(prev => 
              prev.filter(album => album.album_id !== payload.old.album_id)
            );
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeListAlbums: Subscription status:', status);
      });

    return () => {
      console.log('🔌 useRealtimeListAlbums: Unsubscribing from channel');
      albumsSubscription.unsubscribe();
    };
  }, [listId]);

  return { albums, loading };
}; 