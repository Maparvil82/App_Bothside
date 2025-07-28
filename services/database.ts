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

export interface UserCollection {
  id: string;
  user_id: string;
  album_id: string;
  added_at: string;
  is_gem?: boolean;
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