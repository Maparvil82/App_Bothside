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

        // Obtener el usuario actual
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          console.error('❌ useRealtimeMaletaAlbums: No user found');
          setLoading(false);
          return;
        }

        // Usar función RPC para obtener álbumes (bypasea RLS)
        console.log('🔍 Calling RPC with maletaId:', maletaId, 'userId:', user.id);
        const { data: maletaAlbums, error: maletaAlbumsError } = await supabase
          .rpc('get_maleta_albums_for_user', {
            p_maleta_id: maletaId,
            p_user_id: user.id
          });

        console.log('🔍 RPC result - data:', maletaAlbums, 'error:', maletaAlbumsError);

        if (maletaAlbumsError) {
          console.error('❌ useRealtimeMaletaAlbums: Error loading albums via RPC:', maletaAlbumsError);
          setLoading(false);
          return;
        }

        if (!maletaAlbums || maletaAlbums.length === 0) {
          console.log('✅ useRealtimeMaletaAlbums: No albums found');
          setAlbums([]);
          setLoading(false);
          return;
        }

        console.log('🔍 Found', maletaAlbums.length, 'albums from RPC');

        // Obtener los datos completos de los álbumes desde la tabla albums
        const albumIds = maletaAlbums.map((ma: any) => ma.album_id);
        const { data: albumsData, error: albumsError } = await supabase
          .from('albums')
          .select(`
            *,
            album_styles (
              styles (*)
            )
          `)
          .in('id', albumIds);

        if (albumsError) {
          console.error('❌ useRealtimeMaletaAlbums: Error loading album details:', albumsError);
        }

        // Crear un mapa de álbumes por ID
        const albumsMap = (albumsData || []).reduce((acc, album) => {
          acc[album.id] = album;
          return acc;
        }, {} as Record<string, any>);

        // Obtener perfiles de los usuarios que añadieron los álbumes
        const addedByUserIds = [...new Set(maletaAlbums.map((item: any) => item.added_by).filter(Boolean))];
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

        // Combinar datos de maleta_albums con datos de albums y perfiles
        const albumsWithDetails = maletaAlbums.map((ma: any) => ({
          ...ma,
          albums: albumsMap[ma.album_id] || null,
          added_by_user: ma.added_by ? profilesMap[ma.added_by] : null
        }));

        console.log('✅ useRealtimeMaletaAlbums: Initial albums loaded:', albumsWithDetails.length);
        setAlbums(albumsWithDetails);
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