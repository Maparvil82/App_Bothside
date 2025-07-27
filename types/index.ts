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
  thumb?: string;
  cover_image?: string;
  resource_url?: string;
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