import { supabase } from '../lib/supabase';
// TODO: Migrar a la nueva API de filesystem cuando reescribamos las operaciones de archivos
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalyticsService } from './analytics';

// Tipos para la base de datos
export interface Album {
  id: string;
  title: string;
  artist: string;
  year?: number;
  label?: string;
  catalog_no?: string;
  format?: string;
  cover_url?: string;
  country?: string;
  edition?: string;
  user_id?: string;
  release_year?: string;
  notes?: string;
  created_at?: string;
  format_id?: string;
  description?: string;
  price?: number;
  condition?: string;
  quantity?: number;
  barcode?: string;
  updated_at?: string;
  catalog_number?: string;
  discogs_id?: number;
  master_id?: number;
  format_descriptions?: string[];
  discogs_cached_at?: string;
}

export interface AlbumStats {
  album_id: string;
  avg_price?: number;
  low_price?: number;
  high_price?: number;
  have?: number;
  want?: number;
  last_sold?: string;
}

export interface UserCollection {
  id: string;
  user_id: string;
  album_id: string;
  added_at: string;
  is_gem?: boolean;
  audio_note?: string;
}

export interface UserWishlist {
  id: string;
  user_id: string;
  album_id: string;
  added_at: string;
}

export interface Listing {
  id: string;
  album_id: string;
  user_id: string;
  price: number;
  condition: string;
  quantity: number;
  created_at: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: string;
  price: number;
  created_at: string;
}

export interface UserMaleta {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
  is_collaborative?: boolean;
  user_id: string;
  created_at: string;
  albums?: Array<{
    albums: {
      id: string;
      title: string;
      artist: string;
      cover_url?: string;
    };
  }>;
  collaborators?: {
    user_id: string;
    profile: {
      id: string;
      username: string;
      avatar_url: string | null;
    } | null;
  }[];
  owner?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

export interface MaletaAlbum {
  maleta_id: string;
  album_id: string;
}

// Servicios de estilos
export const StyleService = {
  // Obtener estilo por nombre
  async getStyleByName(name: string) {
    const { data, error } = await supabase
      .from('styles')
      .select('*')
      .eq('name', name)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Crear nuevo estilo
  async createStyle(name: string) {
    const { data, error } = await supabase
      .from('styles')
      .insert([{ name }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Obtener o crear estilo
  async getOrCreateStyle(name: string) {
    let style = await this.getStyleByName(name);
    if (!style) {
      style = await this.createStyle(name);
    }
    return style;
  },

  // Vincular estilo a álbum
  async linkStyleToAlbum(albumId: string, styleId: string) {
    const { data, error } = await supabase
      .from('album_styles')
      .insert([{
        album_id: albumId,
        style_id: styleId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Servicios de álbumes
export const AlbumService = {
  // Obtener todos los álbumes
  async getAllAlbums() {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener álbum por ID
  async getAlbumById(id: string) {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  },

  // Buscar álbumes por título, artista o sello
  async searchAlbums(query: string) {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,label.ilike.%${query}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    return data;
  },

  // Crear nuevo álbum
  async createAlbum(album: Omit<Album, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('albums')
      .insert([album])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar álbum
  async updateAlbum(id: string, updates: Partial<Album>) {
    const { data, error } = await supabase
      .from('albums')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar álbum
  async deleteAlbum(id: string) {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Actualizar o crear estadísticas de Discogs para un álbum
  async updateAlbumWithDiscogsStats(albumId: string, discogsStats: any) {
    const statsData: Partial<AlbumStats> = {
      album_id: albumId,
    };

    // Extraer datos de las estadísticas de Discogs
    if (discogsStats.lowest_price !== undefined) {
      statsData.low_price = discogsStats.lowest_price;
    }
    if (discogsStats.highest_price !== undefined) {
      statsData.high_price = discogsStats.highest_price;
    }
    if (discogsStats.avg_price !== undefined) {
      statsData.avg_price = discogsStats.avg_price;
    }
    if (discogsStats.have !== undefined) {
      statsData.have = discogsStats.have;
    }
    if (discogsStats.want !== undefined) {
      statsData.want = discogsStats.want;
    }
    if (discogsStats.last_sold_date !== undefined) {
      statsData.last_sold = discogsStats.last_sold_date;
    }

    // Solo actualizar si hay datos
    if (Object.keys(statsData).length > 1) { // Más de 1 porque siempre incluimos album_id
      try {
        // Intentar actualizar primero
        const { data: updateData, error: updateError } = await supabase
          .from('album_stats')
          .update(statsData)
          .eq('album_id', albumId)
          .select()
          .single();

        if (updateError && updateError.code === 'PGRST116') {
          // Si no existe, crear nuevo registro
          const { data: insertData, error: insertError } = await supabase
            .from('album_stats')
            .insert([statsData])
            .select()
            .single();

          if (insertError) throw insertError;
          return insertData;
        }

        if (updateError) throw updateError;
        return updateData;
      } catch (error) {
        console.error('Error updating album stats:', error);
        throw error;
      }
    }

    return null;
  },

  // Obtener álbumes sin estadísticas de Discogs
  async getAlbumsWithoutStats() {
    const { data, error } = await supabase
      .from('albums')
      .select('id, title, artist, discogs_id, created_at')
      .not('discogs_id', 'is', null)
      .not('id', 'in', '(select album_id from album_stats)')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener estadísticas de álbumes existentes
  async getAlbumStatsSummary() {
    // Total de álbumes
    const { count: totalAlbums } = await supabase
      .from('albums')
      .select('*', { count: 'exact', head: true });

    // Álbumes con discogs_id
    const { count: albumsWithDiscogs } = await supabase
      .from('albums')
      .select('*', { count: 'exact', head: true })
      .not('discogs_id', 'is', null);

    // Álbumes con estadísticas
    const { count: albumsWithStats } = await supabase
      .from('album_stats')
      .select('*', { count: 'exact', head: true });

    return {
      totalAlbums: totalAlbums || 0,
      albumsWithDiscogs: albumsWithDiscogs || 0,
      albumsWithStats: albumsWithStats || 0,
      albumsWithoutStats: (albumsWithDiscogs || 0) - (albumsWithStats || 0),
      percentageWithStats: (albumsWithDiscogs || 0) > 0 ? ((albumsWithStats || 0) / (albumsWithDiscogs || 0) * 100) : 0
    };
  },

  /**
   * Update album CC0 data from Discogs and refresh cache timestamp
   * Only updates CC0 data (title, year, artists, cover, label, genres, styles, tracklist)
   * Does NOT update user data or marketplace data
   */
  async updateAlbumCC0Data(
    albumId: string,
    cc0Data: {
      title: string;
      year: number;
      artists: string;
      cover_url: string | null;
      label: string;
      genres: string[];
      styles: string[];
      tracklist: Array<{ position: string; title: string; duration: string }>;
    }
  ): Promise<boolean> {
    try {
      console.log(`🔄 Updating CC0 data for album ${albumId}...`);

      // Update album basic data
      const { error: albumError } = await supabase
        .from('albums')
        .update({
          title: cc0Data.title,
          artist: cc0Data.artists,
          release_year: cc0Data.year.toString(),
          label: cc0Data.label,
          cover_url: cc0Data.cover_url,
          discogs_cached_at: new Date().toISOString(),
        })
        .eq('id', albumId);

      if (albumError) {
        console.error('❌ Error updating album:', albumError);
        throw albumError;
      }

      // Update tracks
      if (cc0Data.tracklist.length > 0) {
        // Delete existing tracks
        const { error: deleteTracksError } = await supabase
          .from('tracks')
          .delete()
          .eq('album_id', albumId);

        if (deleteTracksError) {
          console.warn('⚠️ Error deleting old tracks:', deleteTracksError);
        }

        // Insert new tracks
        const tracksToInsert = cc0Data.tracklist.map((track) => ({
          album_id: albumId,
          position: track.position,
          title: track.title,
          duration: track.duration,
        }));

        const { error: tracksError } = await supabase
          .from('tracks')
          .insert(tracksToInsert);

        if (tracksError) {
          console.warn('⚠️ Error inserting new tracks:', tracksError);
        }
      }

      // Update styles
      if (cc0Data.styles.length > 0) {
        // Delete existing styles
        const { error: deleteStylesError } = await supabase
          .from('album_styles')
          .delete()
          .eq('album_id', albumId);

        if (deleteStylesError) {
          console.warn('⚠️ Error deleting old styles:', deleteStylesError);
        }

        // Get or create style IDs and link them
        for (const styleName of cc0Data.styles) {
          try {
            // Check if style exists
            const { data: existingStyle } = await supabase
              .from('styles')
              .select('id')
              .eq('name', styleName)
              .single();

            let styleId = existingStyle?.id;

            // Create style if it doesn't exist
            if (!styleId) {
              const { data: newStyle, error: createStyleError } = await supabase
                .from('styles')
                .insert({ name: styleName })
                .select('id')
                .single();

              if (createStyleError) {
                console.warn(`⚠️ Error creating style ${styleName}:`, createStyleError);
                continue;
              }

              styleId = newStyle?.id;
            }

            // Link style to album
            if (styleId) {
              const { error: linkError } = await supabase
                .from('album_styles')
                .insert({ album_id: albumId, style_id: styleId });

              if (linkError) {
                console.warn(`⚠️ Error linking style ${styleName}:`, linkError);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error processing style ${styleName}:`, error);
          }
        }
      }

      console.log(`✅ Album ${albumId} CC0 data updated successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Error updating album CC0 data:`, error);
      return false;
    }
  }
};

// Servicios de colección de usuario
export const UserCollectionService = {
  // Obtener colección del usuario
  async getUserCollection(userId: string) {
    const { data, error } = await supabase
      .from('user_collection')
      .select(`
        *,
        albums (
          *,
          album_stats (*),
          album_styles (
            styles (*)
          )
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Agregar álbum a la colección
  async addToCollection(userId: string, albumId: string, isGem: boolean = false) {
    const { data, error } = await supabase
      .from('user_collection')
      .insert([{
        user_id: userId,
        album_id: albumId,
        is_gem: isGem
      }])
      .select()
      .single();

    if (error) throw error;
    
    // Tracking first record added
    try {
      const hasAdded = await AsyncStorage.getItem('ph_first_record_added');
      if (!hasAdded) {
        AnalyticsService.track('first_record_added');
        await AsyncStorage.setItem('ph_first_record_added', 'true');
      }
    } catch (e) {
      console.error('Analytics tracking error', e);
    }
    
    return data;
  },

  // Remover álbum de la colección
  async removeFromCollection(userId: string, albumId: string) {
    const { error } = await supabase
      .from('user_collection')
      .delete()
      .eq('user_id', userId)
      .eq('album_id', albumId);

    if (error) throw error;
  },

  // Verificar si un álbum está en la colección
  async isInCollection(userId: string, albumId: string) {
    const { data, error } = await supabase
      .from('user_collection')
      .select('id')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // Toggle gem status de un álbum
  async toggleGemStatus(userId: string, albumId: string) {
    console.log('🔍 UserCollectionService: toggleGemStatus called with:', { userId, albumId });

    // Primero obtener el estado actual
    const { data: currentData, error: fetchError } = await supabase
      .from('user_collection')
      .select('is_gem')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .single();

    if (fetchError) {
      console.error('❌ UserCollectionService: Error fetching current gem status:', fetchError);
      throw fetchError;
    }

    console.log('✅ UserCollectionService: Current gem status:', currentData);

    // Toggle el estado
    const newGemStatus = !currentData.is_gem;
    console.log('🔄 UserCollectionService: Toggling gem status from', currentData.is_gem, 'to', newGemStatus);

    const { data, error } = await supabase
      .from('user_collection')
      .update({ is_gem: newGemStatus })
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .select()
      .single();

    if (error) {
      console.error('❌ UserCollectionService: Error updating gem status:', error);
      throw error;
    }

    console.log('✅ UserCollectionService: Gem status updated successfully:', data);
    return data;
  },

  // Obtener solo los gems del usuario
  async getUserGems(userId: string) {
    console.log('🔍 UserCollectionService: getUserGems called for user:', userId);

    // Primero obtener todas las colecciones del usuario para contar
    const { data: userRecords, error: userError } = await supabase
      .from('user_collection')
      .select('is_gem')
      .eq('user_id', userId);

    if (userError) {
      console.error('❌ UserCollectionService: Error getting user records:', userError);
      throw userError;
    }

    console.log('📊 UserCollectionService: Total records for user:', userRecords?.length || 0);

    const gemsCount = userRecords?.filter(record => record.is_gem === true).length || 0;
    const nonGemsCount = userRecords?.filter(record => record.is_gem === false).length || 0;
    const nullGemsCount = userRecords?.filter(record => record.is_gem === null).length || 0;

    console.log('💎 UserCollectionService: Records with is_gem = true:', gemsCount);
    console.log('📋 UserCollectionService: Records with is_gem = false:', nonGemsCount);
    console.log('❓ UserCollectionService: Records with is_gem = null:', nullGemsCount);

    // Ahora obtener solo los gems con información básica del álbum
    const { data, error } = await supabase
      .from('user_collection')
      .select(`
        id,
        album_id,
        is_gem,
        added_at,
        albums (
          id,
          title,
          artist,
          cover_url
        )
      `)
      .eq('user_id', userId)
      .eq('is_gem', true)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('❌ UserCollectionService: Error getting user gems:', error);
      throw error;
    }

    console.log('✅ UserCollectionService: Found', data?.length || 0, 'gems for user');
    if (data && data.length > 0) {
      console.log('📋 UserCollectionService: First gem:', {
        id: data[0].id,
        albumId: data[0].album_id,
        albumTitle: (data[0].albums as any)?.title || '',
        albumArtist: (data[0].albums as any)?.artist || '',
        albumCover: (data[0].albums as any)?.cover_url || 'No cover',
        isGem: data[0].is_gem
      });
    }

    return data || [];
  },

  // Guardar nota de audio
  async saveAudioNote(userId: string, albumId: string, audioUri: string) {
    console.log('🔍 UserCollectionService: saveAudioNote called with:', { userId, albumId, audioUri });

    // Verificar autenticación actual
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ UserCollectionService: Auth error:', authError);
      throw new Error('Error de autenticación');
    }

    if (!currentUser) {
      console.error('❌ UserCollectionService: No user authenticated');
      throw new Error('Usuario no autenticado');
    }

    console.log('✅ UserCollectionService: User authenticated:', currentUser.id);

    // Primero verificar si el álbum está en la colección del usuario
    console.log('🔍 UserCollectionService: Checking if album exists in collection...');
    const { data: existingRecord, error: checkError } = await supabase
      .from('user_collection')
      .select('id')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .single();

    console.log('🔍 UserCollectionService: Check result:', { existingRecord, checkError });

    if (checkError && checkError.code === 'PGRST116') {
      // El álbum no está en la colección, agregarlo primero
      console.log('📝 UserCollectionService: Album not in collection, adding it first...');
      const { data: newRecord, error: insertError } = await supabase
        .from('user_collection')
        .insert([{
          user_id: userId,
          album_id: albumId,
          audio_note: audioUri
        }])
        .select()
        .single();

      if (insertError) {
        console.error('❌ UserCollectionService: Error adding album to collection:', insertError);
        console.error('❌ UserCollectionService: Insert error details:', {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint
        });
        throw insertError;
      }

      console.log('✅ UserCollectionService: Album added to collection with audio note:', newRecord);
      return newRecord;
    } else if (checkError) {
      console.error('❌ UserCollectionService: Error checking collection:', checkError);
      throw checkError;
    }

    // El álbum ya está en la colección, actualizar la nota de audio
    console.log('📝 UserCollectionService: Album exists, updating audio note...');
    const { data, error } = await supabase
      .from('user_collection')
      .update({ audio_note: audioUri })
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .select()
      .single();

    if (error) {
      console.error('❌ UserCollectionService: Error saving audio note:', error);
      console.error('❌ UserCollectionService: Update error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }

    console.log('✅ UserCollectionService: Audio note saved successfully:', data);
    return data;
  },

  // Eliminar nota de audio
  async deleteAudioNote(userId: string, albumId: string) {
    const { data, error } = await supabase
      .from('user_collection')
      .update({ audio_note: null })
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};

// Servicios de lista de deseos
export const WishlistService = {
  // Obtener lista de deseos del usuario
  async getUserWishlist(userId: string) {
    const { data, error } = await supabase
      .from('user_wishlist')
      .select(`
        *,
        albums (*)
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Agregar álbum a la lista de deseos
  async addToWishlist(userId: string, albumId: string) {
    const { data, error } = await supabase
      .from('user_wishlist')
      .insert([{
        user_id: userId,
        album_id: albumId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Remover álbum de la lista de deseos
  async removeFromWishlist(userId: string, albumId: string) {
    const { error } = await supabase
      .from('user_wishlist')
      .delete()
      .eq('user_id', userId)
      .eq('album_id', albumId);

    if (error) throw error;
  },

  // Verificar si un álbum está en la lista de deseos
  async isInWishlist(userId: string, albumId: string) {
    const { data, error } = await supabase
      .from('user_wishlist')
      .select('id')
      .eq('user_id', userId)
      .eq('album_id', albumId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
};

// Servicios de anuncios
export const ListingService = {
  // Obtener todos los anuncios
  async getAllListings() {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        albums (*),
        users!listings_user_id_fkey (username)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Obtener anuncios de un usuario
  async getUserMaletaings(userId: string) {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        albums (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Crear nuevo anuncio
  async createMaletaing(listing: Omit<Listing, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('listings')
      .insert([listing])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Actualizar anuncio
  async updateMaletaing(id: string, updates: Partial<Listing>) {
    const { data, error } = await supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar anuncio
  async deleteMaletaing(id: string) {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Servicios de maletas de usuario
export const UserMaletaService = {
  // Obtener todas las maletas del usuario
  async getUserMaletas(userId: string) {
    console.log('Getting maletas for user:', userId);

    const { data, error } = await supabase
      .from('user_maletas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting user maletas:', error);
      throw error;
    }

    console.log('User maletas retrieved:', data);
    return data;
  },

  // Obtener maletas del usuario con álbumes incluidos para collage
  async getUserMaletasWithAlbums(userId: string) {
    console.log('🔍 UserMaletaService: Getting maletas with albums for user:', userId);

    // 1. Obtener maletas propias
    const { data: own, error: ownError } = await supabase
      .from('user_maletas')
      .select('*')
      .eq('user_id', userId);

    if (ownError) throw ownError;

    // 2. Obtener maletas colaborativas usando función RPC (bypasea RLS)
    const { data: collabMaletas, error: collabError } = await supabase
      .rpc('get_user_collaborative_maletas', { p_user_id: userId });

    if (collabError) {
      console.error('❌ Error fetching collaborative maletas:', collabError);
    }

    console.log('🔍 Own maletas:', own?.length || 0);
    console.log('🔍 Collaborative maletas:', collabMaletas?.length || 0);

    const allMaletas = [...(own || []), ...(collabMaletas || [])];

    // 4. Eliminar duplicados por id
    const uniqueMaletas = Array.from(new Map(allMaletas.map(m => [m.id, m])).values());

    // Ordenar por fecha de creación (más recientes primero)
    uniqueMaletas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Para cada maleta, obtener sus álbumes y detalles adicionales
    const maletasWithAlbums = await Promise.all(
      uniqueMaletas.map(async (maleta) => {
        try {
          const { data: albums, error: albumsError } = await supabase
            .from('maleta_albums')
            .select(`
              *,
              albums (
                id,
                title,
                artist,
                cover_url
              )
            `)
            .eq('maleta_id', maleta.id)
            .limit(4); // Solo los últimos 4 para el collage

          const { data: collaborators, error: collaboratorsError } = await supabase
            .from('maleta_collaborators')
            .select('user_id')
            .eq('maleta_id', maleta.id)
            .eq('status', 'accepted')
            .limit(3);

          let collaboratorsWithProfiles: any[] = [];
          if (!collaboratorsError && collaborators && collaborators.length > 0) {
            const userIds = collaborators.map(c => c.user_id);
            const { data: profiles } = await supabase
              .from('profiles')
              .select('id, avatar_url')
              .in('id', userIds);

            const profilesMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {} as Record<string, any>);

            collaboratorsWithProfiles = collaborators.map(c => ({
              user_id: c.user_id,
              profile: profilesMap[c.user_id] || null
            }));
          }

          // Obtener información del owner si no soy yo
          let ownerProfile = null;
          if (maleta.user_id !== userId) {
            const { data: ownerData, error: ownerError } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .eq('id', maleta.user_id)
              .maybeSingle();

            if (!ownerError && ownerData) {
              ownerProfile = ownerData;
            }
          }

          if (albumsError) {
            console.error('❌ UserMaletaService: Error getting albums for maleta:', maleta.id, albumsError);
            return { ...maleta, albums: [], collaborators: [] };
          }

          return {
            ...maleta,
            albums: albums || [],
            collaborators: collaboratorsWithProfiles,
            owner: ownerProfile // Añadir info del owner
          };
        } catch (error) {
          console.error('❌ UserMaletaService: Error processing maleta:', maleta.id, error);
          return { ...maleta, albums: [] };
        }
      })
    );

    console.log('✅ UserMaletaService: Found', maletasWithAlbums.length, 'maletas with albums');
    return maletasWithAlbums;
  },

  // Obtener maleta por ID
  async getMaletaById(maletaId: string) {
    // Obtener el usuario actual
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No user found');
    }

    // Usar función RPC para obtener la maleta (bypasea RLS)
    const { data, error } = await supabase
      .rpc('get_maleta_by_id_for_user', {
        p_maleta_id: maletaId,
        p_user_id: user.id
      })
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('Maleta not found or access denied');
    return data;
  },

  // Crear nueva maleta
  async createMaleta(maleta: Omit<UserMaleta, 'id' | 'created_at'>) {
    console.log('Creating maleta with data:', maleta);

    const { data, error } = await supabase
      .from('user_maletas')
      .insert([maleta])
      .select()
      .single();

    if (error) {
      console.error('Error creating maleta:', error);
      throw error;
    }

    // Tracking first shelf created
    try {
      const hasAdded = await AsyncStorage.getItem('ph_first_shelf_created');
      if (!hasAdded) {
        AnalyticsService.track('first_shelf_created');
        await AsyncStorage.setItem('ph_first_shelf_created', 'true');
      }
    } catch (e) {
      console.error('Analytics tracking error', e);
    }

    console.log('Maleta created successfully:', data);
    return data;
  },

  // Actualizar maleta
  async updateMaleta(id: string, updates: Partial<UserMaleta>) {
    const { data, error } = await supabase
      .from('user_maletas')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Eliminar maleta
  async deleteMaleta(id: string) {
    console.log('🗑️ UserMaletaService: Deleting maleta with ID:', id);

    const { error } = await supabase
      .from('user_maletas')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ UserMaletaService: Error deleting maleta:', error);
      throw error;
    }

    console.log('✅ UserMaletaService: Maleta deleted successfully');
  },

  // Obtener álbumes de una maleta
  async getMaletaAlbums(maletaId: string) {
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

    if (error) throw error;

    // Manually fetch profiles for added_by users
    const addedByUserIds = [...new Set(data?.map(item => item.added_by).filter(Boolean))];
    let profilesMap: Record<string, any> = {};

    if (addedByUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .in('id', addedByUserIds);

      if (!profilesError && profiles) {
        // Note: We need to fetch ID to map correctly, but select only asked for username/avatar.
        // Let's re-fetch with ID or assume order? No, map by ID.
        // Re-doing the select to include ID.
      }
    }

    // Correct implementation with ID
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

    const albumsWithProfiles = data?.map(item => ({
      ...item,
      added_by_user: item.added_by ? profilesMap[item.added_by] : null
    }));

    return albumsWithProfiles;
  },

  // Añadir álbum a maleta
  async addAlbumToMaleta(maletaId: string, albumId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('maleta_albums')
      .insert([{
        maleta_id: maletaId,
        album_id: albumId,
        added_by: user.id,
        added_at: new Date().toISOString()
      }]);

    if (error) throw error;
    return { maleta_id: maletaId, album_id: albumId };
  },

  // Remover álbum de maleta
  async removeAlbumFromMaleta(maletaId: string, albumId: string) {
    const { error } = await supabase
      .from('maleta_albums')
      .delete()
      .eq('maleta_id', maletaId)
      .eq('album_id', albumId);

    if (error) throw error;
  },

  // Verificar si álbum está en maleta
  async isAlbumInMaleta(maletaId: string, albumId: string) {
    const { data, error } = await supabase
      .from('maleta_albums')
      .select('maleta_id, album_id')
      .eq('maleta_id', maletaId)
      .eq('album_id', albumId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // Obtener maletas públicas
  async getPublicMaletas() {
    const { data, error } = await supabase
      .from('user_maletas')
      .select(`
        *,
        users!user_maletas_user_id_fkey (username)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  // Crear maleta para sesión con discos aleatorios
  async createBagForSession(
    userId: string,
    sessionName: string,
    sessionId: string,
    styles: string[],
    description?: string
  ) {
    console.log('Creating bag for session:', { userId, sessionName, sessionId, styles, description });

    // 1. Crear la maleta
    const { data: maleta, error: maletaError } = await supabase
      .from('user_maletas')
      .insert([{
        user_id: userId,
        title: sessionName,
        description: description || null,
        is_public: false,
        is_collaborative: false
      }])
      .select()
      .single();

    if (maletaError) {
      console.error('Error creating maleta for session:', maletaError);
      throw maletaError;
    }

    // 2. Buscar 3 discos aleatorios que coincidan con los estilos
    // Primero obtenemos los IDs de los estilos
    const { data: styleIdsData, error: stylesError } = await supabase
      .from('styles')
      .select('id')
      .in('name', styles);

    if (stylesError) {
      console.error('Error fetching style IDs:', stylesError);
      // Si falla, seguimos sin añadir discos
      return { maleta, albumsAdded: 0 };
    }

    const styleIds = styleIdsData?.map(s => s.id) || [];

    if (styleIds.length === 0) {
      return { maleta, albumsAdded: 0 };
    }

    // Buscamos discos del usuario que tengan esos estilos
    // Esta query es compleja, así que la simplificamos:
    // 1. Obtener discos de la colección del usuario
    // 2. Filtrar por estilos (esto es mejor hacerlo en JS si no hay muchos, o con una query más compleja)
    // Para simplificar y dado que Supabase JS client tiene limitaciones con joins complejos y random:
    // Vamos a usar una RPC si fuera necesario, pero intentaremos con queries encadenadas.

    // Opción: Obtener álbumes del usuario que tengan esos estilos.
    // user_collection -> albums -> album_styles -> styles
    // Esto es difícil de hacer eficiente con una sola query simple en el cliente sin RPC.
    // Vamos a intentar obtener una lista de álbumes candidatos.

    // Query: Obtener album_ids de album_styles donde style_id IN styleIds
    // Y que estén en user_collection del usuario.

    // Paso A: Obtener todos los album_ids que tienen esos estilos
    const { data: albumsWithStyles, error: albumStylesError } = await supabase
      .from('album_styles')
      .select('album_id')
      .in('style_id', styleIds);

    if (albumStylesError) {
      console.error('Error fetching albums with styles:', albumStylesError);
      return { maleta, albumsAdded: 0 };
    }

    const candidateAlbumIds = [...new Set(albumsWithStyles?.map(a => a.album_id) || [])];

    if (candidateAlbumIds.length === 0) {
      return { maleta, albumsAdded: 0 };
    }

    // Paso B: Filtrar los que están en la colección del usuario
    const { data: userAlbums, error: userAlbumsError } = await supabase
      .from('user_collection')
      .select('album_id')
      .eq('user_id', userId)
      .in('album_id', candidateAlbumIds);

    if (userAlbumsError) {
      console.error('Error fetching user albums:', userAlbumsError);
      return { maleta, albumsAdded: 0 };
    }

    let finalAlbumIds = userAlbums?.map(ua => ua.album_id) || [];

    // Paso C: Seleccionar 3 aleatorios
    // Shuffle array
    finalAlbumIds = finalAlbumIds.sort(() => 0.5 - Math.random());
    // Take first 3
    const selectedAlbumIds = finalAlbumIds.slice(0, 3);

    // 3. Insertar en maleta_albums
    if (selectedAlbumIds.length > 0) {
      const maletaAlbumsInserts = selectedAlbumIds.map(albumId => ({
        maleta_id: maleta.id,
        album_id: albumId,
        added_by: userId,
        added_at: new Date().toISOString()
      }));

      const { error: insertAlbumsError } = await supabase
        .from('maleta_albums')
        .insert(maletaAlbumsInserts);

      if (insertAlbumsError) {
        console.error('Error adding albums to maleta:', insertAlbumsError);
        // No lanzamos error, ya se creó la maleta
      }
    }

    return { maleta, albumsAdded: selectedAlbumIds.length };
  }
};

export interface UserProfile {
  id: string;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  show_auto_bag_suggestion_on_session_create?: boolean;
}

// Utilidad: convertir base64 (sin prefijo) a Uint8Array sin usar atob/Buffer
function base64ToUint8Array(base64: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = base64.replace(/\s/g, '');
  // eliminar padding extra
  while (str.endsWith('=')) str = str.slice(0, -1);

  const bytes: number[] = [];
  let i = 0;
  while (i < str.length) {
    const enc1 = chars.indexOf(str.charAt(i++));
    const enc2 = chars.indexOf(str.charAt(i++));
    const enc3 = chars.indexOf(str.charAt(i++));
    const enc4 = chars.indexOf(str.charAt(i++));

    const chr1 = (enc1 << 2) | (enc2 >> 4);
    const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
    const chr3 = ((enc3 & 3) << 6) | enc4;

    bytes.push(chr1);
    if (enc3 !== 64 && !Number.isNaN(enc3)) bytes.push(chr2);
    if (enc4 !== 64 && !Number.isNaN(enc4)) bytes.push(chr3);
  }
  return new Uint8Array(bytes);
}

export const ProfileService = {
  // Delete user account
  async deleteUserAccount() {
    console.log('🗑️ ProfileService: Requesting account deletion...');
    const { data, error } = await supabase.functions.invoke('delete-account');

    if (error) {
      console.error('❌ ProfileService: Error deleting account:', error);
      // Supabase Edge Functions errors might be hidden in the context or response
      if (error && typeof error === 'object' && 'context' in error) {
        // @ts-ignore
        console.error('❌ ProfileService: Error context:', JSON.stringify(error.context));
      }
      throw error;
    }

    // We now return 200 even on error to see the message
    if (data && data.error) {
      console.error('❌ ProfileService: Server returned error:', data.error);
      throw new Error(data.error);
    }

    console.log('✅ ProfileService: Account deletion successful:', data);
    return data;
  },
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating profile: ${error.message}`);
    }

    return data;
  },

  // Nueva versión compatible con React Native/Expo: sube desde una URI local
  async uploadAvatarFromUri(userId: string, uri: string): Promise<string> {
    // Inferir extensión
    const urlParts = uri.split('?')[0].split('#')[0];
    const extMatch = urlParts.match(/\.([a-zA-Z0-9]+)$/);
    const fileExt = (extMatch ? extMatch[1] : 'jpg').toLowerCase();
    const mimeType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    // Leer como base64 para evitar blobs vacíos en iOS/Android
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const bytes = base64ToUint8Array(base64);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error uploading avatar: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Alternativa directa: subir desde base64 proporcionado por expo-image-picker
  async uploadAvatarFromBase64(userId: string, base64: string, mimeType: string = 'image/jpeg'): Promise<string> {
    const ext = (mimeType.split('/')[1] || 'jpg').toLowerCase();
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const bytes = base64ToUint8Array(base64);

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Error uploading avatar: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  },

  // Método previo (mantenido por compatibilidad en caso de uso web)
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error(`Error uploading avatar: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrl;
  }
}; 