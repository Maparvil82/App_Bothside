import { DiscogsRelease, DiscogsSearchResponse } from '../types';

import { ENV } from '../config/env';

const DISCOGS_API_URL = 'https://api.discogs.com';
const DISCOGS_TOKEN = ENV.DISCOGS_TOKEN;

export class DiscogsService {
  private static async makeRequest(endpoint: string): Promise<any> {
    try {
      const response = await fetch(`${DISCOGS_API_URL}${endpoint}`, {
        headers: {
          'Authorization': `Discogs token=${DISCOGS_TOKEN}`,
          'User-Agent': 'BothsideApp/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error making Discogs request:', error);
      throw error;
    }
  }

  static async searchReleases(query: string, page: number = 1): Promise<DiscogsSearchResponse> {
    const encodedQuery = encodeURIComponent(query);
    const endpoint = `/database/search?q=${encodedQuery}&type=release&page=${page}&per_page=20`;
    
    return this.makeRequest(endpoint);
  }

  static async getRelease(id: number): Promise<DiscogsRelease> {
    const endpoint = `/releases/${id}`;
    return this.makeRequest(endpoint);
  }

  static async getArtistReleases(artistId: number, page: number = 1): Promise<DiscogsSearchResponse> {
    const endpoint = `/artists/${artistId}/releases?page=${page}&per_page=20`;
    return this.makeRequest(endpoint);
  }
} 