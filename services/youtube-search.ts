import { ENV } from '../config/env';

export class YouTubeSearchService {
  /**
   * Searches for a full album or video on YouTube when Discogs does not provide any videos.
   * @param artist The artist's name
   * @param album The album title
   * @returns An array of found video URLs and titles
   */
  static async searchYouTubeVideos(artist: string, album: string): Promise<Array<{ url: string; title: string }>> {
    try {
      const apiKey = ENV.YOUTUBE_API_KEY;
      if (!apiKey) {
        console.warn('⚠️ No YOUTUBE_API_KEY found in config/env, skipping YouTube API search');
        return [];
      }

      console.log(`🌐 Searching YouTube for: "${artist} - ${album}"...`);
      const searchQuery = encodeURIComponent(`${artist} ${album} full album`);
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${searchQuery}&type=video&key=${apiKey}&maxResults=3`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`⚠️ YouTube API returned status ${response.status}`);
        return [];
      }

      const data = await response.json();
      if (data.items && data.items.length > 0) {
        return data.items
          .filter((item: any) => item.id?.videoId)
          .map((item: any) => ({
            url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
            title: item.snippet?.title || `${artist} - ${album} Video`,
          }));
      }

      console.log('ℹ️ No YouTube videos found for query');
      return [];
    } catch (error) {
      console.error('❌ Error searching YouTube videos:', error);
      return [];
    }
  }
}
