// Tipos para Discogs API
export interface DiscogsRelease {
  id: number;
  title: string;
  artists?: Array<{
    name: string;
    id: number;
  }>;
  year?: number;
  genres?: string[];
  styles?: string[];
  labels?: Array<{
    name: string;
    id: number;
  }>;
  thumb?: string;
  cover_image?: string;
  resource_url?: string;
  // Campos de marketplace
  lowest_price?: number;
  highest_price?: number;
  avg_price?: number;
  have?: number;
  want?: number;
  last_sold_date?: string;
  // Campo community para estadísticas
  community?: {
    have: number;
    want: number;
  };
}

export interface DiscogsSearchResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  results: DiscogsRelease[];
}

// Tipos para autenticación
import { User } from '@supabase/supabase-js';

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}

// Tipos para la aplicación
export interface AppState {
  auth: AuthState;
  releases: DiscogsRelease[];
  loading: boolean;
} 