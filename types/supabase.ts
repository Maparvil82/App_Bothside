export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      album_artists: {
        Row: {
          album_id: string
          artist_id: string
        }
        Insert: {
          album_id: string
          artist_id: string
        }
        Update: {
          album_id?: string
          artist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_artists_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_artists_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_artists_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_artists_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_artists_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_artists_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      album_format_details: {
        Row: {
          album_id: string | null
          format_detail_id: string | null
          id: string
        }
        Insert: {
          album_id?: string | null
          format_detail_id?: string | null
          id?: string
        }
        Update: {
          album_id?: string | null
          format_detail_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_format_details_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_format_details_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_format_details_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_format_details_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_format_details_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_format_details_format_detail_id_fkey"
            columns: ["format_detail_id"]
            isOneToOne: false
            referencedRelation: "format_details"
            referencedColumns: ["id"]
          },
        ]
      }
      album_genres: {
        Row: {
          album_id: string
          genre_id: string
        }
        Insert: {
          album_id: string
          genre_id: string
        }
        Update: {
          album_id?: string
          genre_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_genres_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_genres_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_genres_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_genres_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_genres_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_genres_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      album_labels: {
        Row: {
          album_id: string
          catalog_no: string | null
          label_id: string
        }
        Insert: {
          album_id: string
          catalog_no?: string | null
          label_id: string
        }
        Update: {
          album_id?: string
          catalog_no?: string | null
          label_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_labels_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_labels_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_labels_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_labels_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_labels_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_labels_label_id_fkey"
            columns: ["label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      album_stats: {
        Row: {
          album_id: string
          avg_price: number | null
          have: number | null
          high_price: number | null
          last_sold: string | null
          low_price: number | null
          want: number | null
        }
        Insert: {
          album_id: string
          avg_price?: number | null
          have?: number | null
          high_price?: number | null
          last_sold?: string | null
          low_price?: number | null
          want?: number | null
        }
        Update: {
          album_id?: string
          avg_price?: number | null
          have?: number | null
          high_price?: number | null
          last_sold?: string | null
          low_price?: number | null
          want?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "album_stats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: true
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_stats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: true
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_stats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: true
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_stats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: true
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_stats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: true
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      album_styles: {
        Row: {
          album_id: string | null
          id: string
          style_id: string | null
        }
        Insert: {
          album_id?: string | null
          id?: string
          style_id?: string | null
        }
        Update: {
          album_id?: string | null
          id?: string
          style_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "album_styles_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_styles_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_styles_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_styles_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_styles_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_styles_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      album_youtube_urls: {
        Row: {
          album_id: string
          created_at: string
          discogs_video_id: string | null
          id: string
          imported_from_discogs: boolean | null
          is_playlist: boolean | null
          title: string | null
          url: string
        }
        Insert: {
          album_id: string
          created_at?: string
          discogs_video_id?: string | null
          id?: string
          imported_from_discogs?: boolean | null
          is_playlist?: boolean | null
          title?: string | null
          url: string
        }
        Update: {
          album_id?: string
          created_at?: string
          discogs_video_id?: string | null
          id?: string
          imported_from_discogs?: boolean | null
          is_playlist?: boolean | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_youtube_urls_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_urls_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_urls_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_urls_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_urls_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      album_typeform_responses: {
        Row: {
          id: string
          user_id: string
          user_collection_id: string
          question_1: string | null
          question_2: string | null
          question_3: string | null
          question_4: string | null
          question_5: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          user_collection_id: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          user_collection_id?: string
          question_1?: string | null
          question_2?: string | null
          question_3?: string | null
          question_4?: string | null
          question_5?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_typeform_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_typeform_responses_user_collection_id_fkey"
            columns: ["user_collection_id"]
            isOneToOne: false
            referencedRelation: "user_collection"
            referencedColumns: ["id"]
          }
        ]
      }
      album_youtube_videos: {
        Row: {
          added_by: string | null
          album_id: string
          created_at: string | null
          discogs_video_id: string | null
          id: string
          imported_from_discogs: boolean | null
          is_playlist: boolean | null
          title: string | null
          type: string | null
          updated_at: string | null
          url: string
        }
        Insert: {
          added_by?: string | null
          album_id: string
          created_at?: string | null
          discogs_video_id?: string | null
          id?: string
          imported_from_discogs?: boolean | null
          is_playlist?: boolean | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          url: string
        }
        Update: {
          added_by?: string | null
          album_id?: string
          created_at?: string | null
          discogs_video_id?: string | null
          id?: string
          imported_from_discogs?: boolean | null
          is_playlist?: boolean | null
          title?: string | null
          type?: string | null
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "album_youtube_videos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_videos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_videos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_videos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "album_youtube_videos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      albums: {
        Row: {
          artist: string | null
          barcode: string | null
          catalog_no: string | null
          catalog_number: string | null
          condition: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          discogs_id: number | null
          edition: string | null
          format: string | null
          format_descriptions: string[] | null
          format_id: string | null
          id: string
          label: string | null
          master_id: number | null
          notes: string | null
          price: number | null
          quantity: number | null
          release_year: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          artist?: string | null
          barcode?: string | null
          catalog_no?: string | null
          catalog_number?: string | null
          condition?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discogs_id?: number | null
          edition?: string | null
          format?: string | null
          format_descriptions?: string[] | null
          format_id?: string | null
          id?: string
          label?: string | null
          master_id?: number | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          release_year?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          artist?: string | null
          barcode?: string | null
          catalog_no?: string | null
          catalog_number?: string | null
          condition?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discogs_id?: number | null
          edition?: string | null
          format?: string | null
          format_descriptions?: string[] | null
          format_id?: string | null
          id?: string
          label?: string | null
          master_id?: number | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          release_year?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      artists: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          profile: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          profile?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          profile?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      barcodes: {
        Row: {
          album_id: string | null
          code: string | null
          id: string
        }
        Insert: {
          album_id?: string | null
          code?: string | null
          id?: string
        }
        Update: {
          album_id?: string | null
          code?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "barcodes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barcodes_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      discogs_imports: {
        Row: {
          artist: string | null
          catalog_no: string | null
          created_at: string | null
          date_added: string | null
          format: string | null
          id: string
          imported: boolean | null
          label: string | null
          media_condition: string | null
          release_id: number | null
          released: string | null
          sleeve_condition: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          artist?: string | null
          catalog_no?: string | null
          created_at?: string | null
          date_added?: string | null
          format?: string | null
          id?: string
          imported?: boolean | null
          label?: string | null
          media_condition?: string | null
          release_id?: number | null
          released?: string | null
          sleeve_condition?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          artist?: string | null
          catalog_no?: string | null
          created_at?: string | null
          date_added?: string | null
          format?: string | null
          id?: string
          imported?: boolean | null
          label?: string | null
          media_condition?: string | null
          release_id?: number | null
          released?: string | null
          sleeve_condition?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discogs_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      discogs_prices: {
        Row: {
          artist: string | null
          created_at: string | null
          currency: string | null
          discogs_id: number
          highest_price: number | null
          id: string
          last_sold_date: string | null
          last_sold_price: number | null
          lowest_price: number | null
          median_price: number | null
          release_id: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          artist?: string | null
          created_at?: string | null
          currency?: string | null
          discogs_id: number
          highest_price?: number | null
          id?: string
          last_sold_date?: string | null
          last_sold_price?: number | null
          lowest_price?: number | null
          median_price?: number | null
          release_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          artist?: string | null
          created_at?: string | null
          currency?: string | null
          discogs_id?: number
          highest_price?: number | null
          id?: string
          last_sold_date?: string | null
          last_sold_price?: number | null
          lowest_price?: number | null
          median_price?: number | null
          release_id?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      format_details: {
        Row: {
          format_id: string | null
          id: string
          name: string
        }
        Insert: {
          format_id?: string | null
          id?: string
          name: string
        }
        Update: {
          format_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_format_details_format"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "format_details_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
        ]
      }
      formats: {
        Row: {
          id: string
          media_type: string
          name: string
        }
        Insert: {
          id?: string
          media_type: string
          name: string
        }
        Update: {
          id?: string
          media_type?: string
          name?: string
        }
        Relationships: []
      }
      genre_style: {
        Row: {
          created_at: string
          genre_id: string
          id: string
          style_id: string
        }
        Insert: {
          created_at?: string
          genre_id: string
          id?: string
          style_id: string
        }
        Update: {
          created_at?: string
          genre_id?: string
          id?: string
          style_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "genre_style_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "genre_style_style_id_fkey"
            columns: ["style_id"]
            isOneToOne: false
            referencedRelation: "styles"
            referencedColumns: ["id"]
          },
        ]
      }
      genres: {
        Row: {
          id: string
          name: string | null
          normalized_name: string | null
        }
        Insert: {
          id?: string
          name?: string | null
          normalized_name?: string | null
        }
        Update: {
          id?: string
          name?: string | null
          normalized_name?: string | null
        }
        Relationships: []
      }
      labels: {
        Row: {
          created_at: string | null
          id: string
          logo_url: string | null
          name: string
          parent_label_id: string | null
          profile: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name: string
          parent_label_id?: string | null
          profile?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          parent_label_id?: string | null
          profile?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "labels_parent_label_id_fkey"
            columns: ["parent_label_id"]
            isOneToOne: false
            referencedRelation: "labels"
            referencedColumns: ["id"]
          },
        ]
      }
      list_albums: {
        Row: {
          album_id: string
          maleta_id: string
        }
        Insert: {
          album_id: string
          maleta_id: string
        }
        Update: {
          album_id?: string
          maleta_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "list_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_maleta_id_fkey"
            columns: ["maleta_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_albums_maleta_id_fkey"
            columns: ["maleta_id"]
            isOneToOne: false
            referencedRelation: "user_lists_with_album_count"
            referencedColumns: ["id"]
          },
        ]
      }
      list_items: {
        Row: {
          added_at: string | null
          album_id: string | null
          id: string
          maleta_id: string | null
        }
        Insert: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          maleta_id?: string | null
        }
        Update: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          maleta_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "list_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_maleta_id_fkey"
            columns: ["maleta_id"]
            isOneToOne: false
            referencedRelation: "user_lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "list_items_maleta_id_fkey"
            columns: ["maleta_id"]
            isOneToOne: false
            referencedRelation: "user_lists_with_album_count"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          album_id: string | null
          condition: string | null
          created_at: string | null
          id: string
          price: number | null
          quantity: number | null
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          price?: number | null
          quantity?: number | null
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          condition?: string | null
          created_at?: string | null
          id?: string
          price?: number | null
          quantity?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          buyer_id: string | null
          created_at: string | null
          id: string
          listing_id: string | null
          price: number | null
          seller_id: string | null
          status: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          price?: number | null
          seller_id?: string | null
          status?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          price?: number | null
          seller_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      style_details: {
        Row: {
          created_at: string | null
          description: string | null
          history: string | null
          id: string
          influential_artists: string[] | null
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          history?: string | null
          id?: string
          influential_artists?: string[] | null
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          history?: string | null
          id?: string
          influential_artists?: string[] | null
          name?: string
        }
        Relationships: []
      }
      styles: {
        Row: {
          genre_id: string | null
          id: string
          name: string
          normalized_name: string
        }
        Insert: {
          genre_id?: string | null
          id?: string
          name: string
          normalized_name: string
        }
        Update: {
          genre_id?: string | null
          id?: string
          name?: string
          normalized_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "styles_genre_id_fkey"
            columns: ["genre_id"]
            isOneToOne: false
            referencedRelation: "genres"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          album_id: string | null
          created_at: string | null
          duration: string | null
          id: string
          position: string | null
          title: string | null
          track_number: number | null
        }
        Insert: {
          album_id?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          position?: string | null
          title?: string | null
          track_number?: number | null
        }
        Update: {
          album_id?: string | null
          created_at?: string | null
          duration?: string | null
          id?: string
          position?: string | null
          title?: string | null
          track_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tracks_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_albums: {
        Row: {
          album_id: string | null
          created_at: string | null
          id: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          created_at?: string | null
          id?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_collection: {
        Row: {
          added_at: string | null
          album_id: string | null
          id: string
          is_gem: boolean | null
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          is_gem?: boolean | null
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          is_gem?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_collection_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_collection_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_dustoff_picks: {
        Row: {
          album_ids: string[]
          last_updated: string
          user_id: string
        }
        Insert: {
          album_ids: string[]
          last_updated?: string
          user_id: string
        }
        Update: {
          album_ids?: string[]
          last_updated?: string
          user_id?: string
        }
        Relationships: []
      }
      user_lists: {
        Row: {
          collector_type: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          style: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          collector_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          style?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          collector_type?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          style?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stickers: {
        Row: {
          album_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          album_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          album_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stickers_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_stickers_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_viewed_albums: {
        Row: {
          album_id: string
          id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          album_id: string
          id?: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          album_id?: string
          id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_viewed_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_viewed_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_viewed_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_viewed_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_viewed_albums_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      user_wishlist: {
        Row: {
          added_at: string | null
          album_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          added_at?: string | null
          album_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_wishlist_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wishlist_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wishlist_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wishlist_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wishlist_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_wishlist_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_type: string | null
          created_at: string | null
          email: string | null
          id: string
          password: string | null
          username: string | null
          verified: boolean | null
        }
        Insert: {
          auth_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          password?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Update: {
          auth_type?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          password?: string | null
          username?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
      views: {
        Row: {
          album_id: string | null
          created_at: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          album_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          album_id?: string | null
          created_at?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "views_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "views_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      vinyl_format_details: {
        Row: {
          category: string | null
          created_at: string | null
          format_id: string
          id: string
          name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          format_id: string
          id?: string
          name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          format_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinyl_format_details_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "vinyl_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      vinyl_formats: {
        Row: {
          album_id: string
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          album_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          album_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "vinyl_formats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinyl_formats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_artists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinyl_formats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "albums_with_styles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinyl_formats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_viewed_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vinyl_formats_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "most_wanted_albums"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      albums_with_artists: {
        Row: {
          artist: string | null
          artists: Json | null
          barcode: string | null
          catalog_no: string | null
          catalog_number: string | null
          condition: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          discogs_id: number | null
          edition: string | null
          format: string | null
          format_descriptions: string[] | null
          format_id: string | null
          id: string | null
          label: string | null
          master_id: number | null
          notes: string | null
          price: number | null
          quantity: number | null
          release_year: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Insert: {
          artist?: string | null
          artists?: never
          barcode?: string | null
          catalog_no?: string | null
          catalog_number?: string | null
          condition?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discogs_id?: number | null
          edition?: string | null
          format?: string | null
          format_descriptions?: string[] | null
          format_id?: string | null
          id?: string | null
          label?: string | null
          master_id?: number | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          release_year?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Update: {
          artist?: string | null
          artists?: never
          barcode?: string | null
          catalog_no?: string | null
          catalog_number?: string | null
          condition?: string | null
          country?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          discogs_id?: number | null
          edition?: string | null
          format?: string | null
          format_descriptions?: string[] | null
          format_id?: string | null
          id?: string | null
          label?: string | null
          master_id?: number | null
          notes?: string | null
          price?: number | null
          quantity?: number | null
          release_year?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      albums_with_styles: {
        Row: {
          artist: string | null
          barcode: string | null
          catalog_no: string | null
          condition: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          edition: string | null
          format: string | null
          format_id: string | null
          id: string | null
          label: string | null
          notes: string | null
          price: number | null
          quantity: number | null
          release_year: string | null
          styles: Json | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      most_viewed_albums: {
        Row: {
          artist: string | null
          barcode: string | null
          catalog_no: string | null
          condition: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          edition: string | null
          format: string | null
          format_id: string | null
          id: string | null
          label: string | null
          notes: string | null
          price: number | null
          quantity: number | null
          release_year: string | null
          title: string | null
          total_views: number | null
          updated_at: string | null
          user_id: string | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      most_wanted_albums: {
        Row: {
          artist: string | null
          barcode: string | null
          catalog_no: string | null
          condition: string | null
          country: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          edition: string | null
          format: string | null
          format_id: string | null
          id: string | null
          label: string | null
          notes: string | null
          price: number | null
          quantity: number | null
          release_year: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
          want: number | null
          year: number | null
        }
        Relationships: [
          {
            foreignKeyName: "albums_format_id_fkey"
            columns: ["format_id"]
            isOneToOne: false
            referencedRelation: "formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_lists_with_album_count: {
        Row: {
          album_count: number | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_public: boolean | null
          style: string | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          album_count?: never
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          style?: string | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          album_count?: never
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_public?: boolean | null
          style?: string | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_lists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_album_to_collection: {
        Args: { _album_id: string }
        Returns: Json
      }
      add_album_to_collection_by_discogs: {
        Args: {
          artist: string
          title: string
          label: string
          catalog_number: string
          year: string
          cover_url: string
        }
        Returns: Json
      }
      add_sticker: {
        Args: { _album_id: string }
        Returns: Json
      }
      create_vinyl_format_details_table: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      create_vinyl_formats_table: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      debug_user_data: {
        Args: { user_id: string }
        Returns: Json
      }
      execute_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      get_album_lists: {
        Args: { _album_id: string }
        Returns: Json
      }
      get_albums_by_genre: {
        Args: { genre_name_param: string }
        Returns: {
          id: string
          title: string
          label: string
          catalog_no: string
          release_year: string
          country: string
          cover_url: string
          created_at: string
        }[]
      }
      get_countries_ordered_by_album_count: {
        Args: { limit_count?: number }
        Returns: {
          country_name: string
          album_count: number
        }[]
      }
      get_decades_ordered_by_album_count: {
        Args: { limit_count: number }
        Returns: {
          decade: number
          album_count: number
        }[]
      }
      get_genres_ordered_by_album_count: {
        Args: { limit_count: number }
        Returns: {
          genre_id: string
          genre_name: string
          album_count: number
        }[]
      }
      get_or_refresh_dustoff_picks: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_popular_genres: {
        Args: { limit_count: number }
        Returns: {
          genre_id: string
          genre_name: string
          album_count: number
        }[]
      }
      get_public_lists_for_album: {
        Args: { album_id: string }
        Returns: Json[]
      }
      get_styles_ordered_by_album_count: {
        Args: { limit_count: number }
        Returns: {
          style_id: string
          style_name: string
          album_count: number
        }[]
      }
      get_user_display_names: {
        Args: { user_ids: string[] }
        Returns: {
          id: string
          display_name: string
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      import_album_with_relations: {
        Args:
          | {
              p_title: string
              p_release_year: string
              p_cover_url: string
              p_catalog_number: string
              p_country: string
              p_artists: string[]
              p_labels: string[]
              p_genres: string[]
              p_styles: string[]
            }
          | {
              p_title: string
              p_release_year: string
              p_cover_url: string
              p_catalog_number: string
              p_country: string
              p_artists: string[]
              p_labels: string[]
              p_genres: string[]
              p_styles: string[]
              p_discogs_id: number
            }
        Returns: Json
      }
      increment_list_album_count: {
        Args: { maleta_id: string }
        Returns: undefined
      }
      insert_youtube_urls: {
        Args: { urls_data: Json }
        Returns: Json
      }
      insert_youtube_videos: {
        Args: { videos_data: Json }
        Returns: Json
      }
      is_album_in_collection: {
        Args: { _album_id: string }
        Returns: boolean
      }
      process_tags: {
        Args: { table_name: string; tag_names: string[] }
        Returns: string[]
      }
      process_wishlist_ai_query: {
        Args: { query_text: string }
        Returns: Json
      }
      remove_album_from_collection: {
        Args: { _album_id: string }
        Returns: Json
      }
      remove_album_from_collection_with_lists: {
        Args: { _album_id: string; _remove_from_lists?: boolean }
        Returns: Json
      }
      remove_sticker: {
        Args: { _album_id: string }
        Returns: Json
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      toggle_album_gem_status: {
        Args: { _album_id: string }
        Returns: Json
      }
      toggle_gem: {
        Args: { album_id: string; make_gem: boolean }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
