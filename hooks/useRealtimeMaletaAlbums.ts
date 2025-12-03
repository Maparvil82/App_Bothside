import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useRealtimeMaletaAlbums = (maletaId: string) => {
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Función para añadir álbum localmente (expuesta para uso externo)
  const addAlbumLocally = useCallback((albumData: any) => {
    setAlbums(prev => {
      // Evitar duplicados
      const exists = prev.some(a => a.album_id === albumData.album_id);
      if (exists) return prev;
      return [albumData, ...prev];
    });
  }, []);

  // Función para eliminar álbum localmente (expuesta para uso externo)
  const removeAlbumLocally = useCallback((albumId: string) => {
    setAlbums(prev => prev.filter(album => album.album_id !== albumId));
  }, []);

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
          .eq('maleta_id', maletaId)
          .order('added_at', { ascending: false });

        if (error) {
          console.error('❌ useRealtimeMaletaAlbums: Error loading initial albums:', error);
          return;
        }

        // Manually fetch profiles for added_by users
        const addedByUserIds = [...new Set(data?.map(item => item.added_by).filter(Boolean))];
        let profilesMap: Record<string, any> = {};

        if (addedByUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', addedByUserIds);

          if (!profilesError && profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
              acc[profile.id] = profile;
              return acc;
            }, {} as Record<string, any>);
          }
        }

        // Merge profiles into album data
        const albumsWithProfiles = data?.map(item => ({
          ...item,
          added_by_user: item.added_by ? profilesMap[item.added_by] : null
        })) || [];

        console.log('✅ useRealtimeMaletaAlbums: Initial albums loaded:', albumsWithProfiles.length);
        setAlbums(albumsWithProfiles);
      } catch (error) {
        console.error('❌ useRealtimeMaletaAlbums: Error in loadInitialAlbums:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialAlbums();

    // Suscripción en tiempo real para maleta_albums con eventos específicos
    const channel = supabase
      .channel(`maleta-${maletaId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'maleta_albums',
          filter: `maleta_id=eq.${maletaId}`,
        },
        async (payload) => {
          console.log('➕ useRealtimeMaletaAlbums: INSERT event:', payload);
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
            // Fetch profile for the new album adder
            let addedByUser = null;
            if (albumData.added_by) {
              const { data: profile } = await supabase
                .from('profiles')
                .select('username, avatar_url')
                .eq('id', albumData.added_by)
                .single();
              addedByUser = profile;
            }

            const albumWithProfile = {
              ...albumData,
              added_by_user: addedByUser
            };

            console.log('✅ useRealtimeMaletaAlbums: Album data fetched, adding to list');
            setAlbums(prev => {
              // Evitar duplicados
              const exists = prev.some(a => a.album_id === albumWithProfile.album_id);
              if (exists) return prev;
              return [albumWithProfile, ...prev];
            });
          } else {
            console.error('❌ useRealtimeMaletaAlbums: Error fetching album data:', error);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'maleta_albums',
          filter: `maleta_id=eq.${maletaId}`,
        },
        (payload) => {
          console.log('🗑️ useRealtimeMaletaAlbums: DELETE event:', payload);
          setAlbums(prev =>
            prev.filter(album => album.album_id !== payload.old.album_id)
          );
        }
      )
      .subscribe((status) => {
        console.log('🔌 useRealtimeMaletaAlbums: Subscription status:', status);
      });

    return () => {
      console.log('🔌 useRealtimeMaletaAlbums: Unsubscribing from channel');
      channel.unsubscribe();
    };
  }, [maletaId]);

  return { albums, loading, addAlbumLocally, removeAlbumLocally };
};