import { supabase } from '../lib/supabase';

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

export interface UserList {
  id: string;
  title: string;
  description?: string;
  cover_url?: string;
  is_public: boolean;
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
}

export interface ListAlbum {
  list_id: string;
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
    
    // Ahora obtener solo los gems con información del álbum
    const { data, error } = await supabase
      .from('user_collection')
      .select(`
        id,
        album_id,
        is_gem,
        albums (
          id,
          title
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
  async getUserListings(userId: string) {
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
  async createListing(listing: Omit<Listing, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('listings')
      .insert([listing])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Actualizar anuncio
  async updateListing(id: string, updates: Partial<Listing>) {
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
  async deleteListing(id: string) {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Servicios de listas de usuario
export const UserListService = {
  // Obtener todas las listas del usuario
  async getUserLists(userId: string) {
    console.log('Getting lists for user:', userId);
    
    const { data, error } = await supabase
      .from('user_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error getting user lists:', error);
      throw error;
    }
    
    console.log('User lists retrieved:', data);
    return data;
  },

  // Obtener listas del usuario con álbumes incluidos para collage
  async getUserListsWithAlbums(userId: string) {
    console.log('🔍 UserListService: Getting lists with albums for user:', userId);
    
    // Primero obtener las listas
    const { data: lists, error: listsError } = await supabase
      .from('user_lists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (listsError) {
      console.error('❌ UserListService: Error getting user lists:', listsError);
      throw listsError;
    }
    
    // Para cada lista, obtener sus álbumes
    const listsWithAlbums = await Promise.all(
      (lists || []).map(async (list) => {
        try {
          const { data: albums, error: albumsError } = await supabase
            .from('list_albums')
            .select(`
              *,
              albums (
                id,
                title,
                artist,
                cover_url
              )
            `)
            .eq('list_id', list.id)
            .limit(4); // Solo los últimos 4 para el collage
          
          if (albumsError) {
            console.error('❌ UserListService: Error getting albums for list:', list.id, albumsError);
            return { ...list, albums: [] };
          }
          
          return { ...list, albums: albums || [] };
        } catch (error) {
          console.error('❌ UserListService: Error processing list:', list.id, error);
          return { ...list, albums: [] };
        }
      })
    );
    
    console.log('✅ UserListService: Found', listsWithAlbums.length, 'lists with albums');
    return listsWithAlbums;
  },

  // Obtener lista por ID
  async getListById(listId: string) {
    const { data, error } = await supabase
      .from('user_lists')
      .select('*')
      .eq('id', listId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Crear nueva lista
  async createList(list: Omit<UserList, 'id' | 'created_at'>) {
    console.log('Creating list with data:', list);
    
    const { data, error } = await supabase
      .from('user_lists')
      .insert([list])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating list:', error);
      throw error;
    }
    
    console.log('List created successfully:', data);
    return data;
  },

  // Actualizar lista
  async updateList(id: string, updates: Partial<UserList>) {
    const { data, error } = await supabase
      .from('user_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Eliminar lista
  async deleteList(id: string) {
    console.log('🗑️ UserListService: Deleting list with ID:', id);
    
    const { error } = await supabase
      .from('user_lists')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('❌ UserListService: Error deleting list:', error);
      throw error;
    }
    
    console.log('✅ UserListService: List deleted successfully');
  },

  // Obtener álbumes de una lista
  async getListAlbums(listId: string) {
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
    
    if (error) throw error;
    return data;
  },

  // Añadir álbum a lista
  async addAlbumToList(listId: string, albumId: string) {
    const { error } = await supabase
      .from('list_albums')
      .insert([{
        list_id: listId,
        album_id: albumId
      }]);
    
    if (error) throw error;
    return { list_id: listId, album_id: albumId };
  },

  // Remover álbum de lista
  async removeAlbumFromList(listId: string, albumId: string) {
    const { error } = await supabase
      .from('list_albums')
      .delete()
      .eq('list_id', listId)
      .eq('album_id', albumId);
    
    if (error) throw error;
  },

  // Verificar si álbum está en lista
  async isAlbumInList(listId: string, albumId: string) {
    const { data, error } = await supabase
      .from('list_albums')
      .select('list_id, album_id')
      .eq('list_id', listId)
      .eq('album_id', albumId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  // Obtener listas públicas
  async getPublicLists() {
    const { data, error } = await supabase
      .from('user_lists')
      .select(`
        *,
        users!user_lists_user_id_fkey (username)
      `)
      .eq('is_public', true)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  }
};

export interface UserProfile {
  id: string;
  avatar_url?: string | null;
  full_name?: string | null;
  username?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export const ProfileService = {
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
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Error updating profile: ${error.message}`);
    }

    return data;
  },

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