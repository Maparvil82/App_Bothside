import { ENV } from '../config/env';

interface WebSearchResult {
  title: string;
  snippet: string;
  url: string;
}

interface ArtistInfo {
  name: string;
  biography?: string;
  genres?: string[];
  activeYears?: string;
  notableAlbums?: string[];
  influences?: string[];
  awards?: string[];
}

interface AlbumInfo {
  title: string;
  artist: string;
  releaseYear?: string;
  genre?: string;
  description?: string;
  criticalReception?: string;
  commercialSuccess?: string;
  tracklist?: string[];
  producers?: string[];
  discogsUrl?: string;
}

interface CollectionAlbum {
  album_id: string;
  albums: {
    id: string;
    title: string;
    artist: string;
    discogs_id?: string;
    label?: string;
    release_year?: string;
    cover_url?: string;
    album_stats?: {
      avg_price?: number;
      low_price?: number;
      high_price?: number;
    };
    album_styles?: Array<{
      styles: {
        name: string;
      };
    }>;
  };
}

export class WebSearchService {
  private static readonly WIKIPEDIA_API = 'https://es.wikipedia.org/api/rest_v1/page/summary/';
  private static readonly MUSICBRAINZ_API = 'https://musicbrainz.org/ws/2/';
  private static readonly DISCOGS_API = 'https://api.discogs.com/';
  private static readonly DISCOGS_BASE_URL = 'https://www.discogs.com/es/release/';

  /**
   * Busca información adicional sobre un artista
   */
  static async searchArtistInfo(artistName: string): Promise<ArtistInfo | null> {
    try {
      // Buscar en Wikipedia
      const wikiInfo = await this.searchWikipedia(`${artistName} (músico)`);
      
      // Buscar en MusicBrainz
      const musicBrainzInfo = await this.searchMusicBrainz(artistName);
      
      // Combinar información
      const artistInfo: ArtistInfo = {
        name: artistName,
        biography: wikiInfo?.extract || 'Información no disponible',
        genres: musicBrainzInfo?.genres || [],
        activeYears: musicBrainzInfo?.activeYears,
        notableAlbums: musicBrainzInfo?.notableAlbums || [],
        influences: musicBrainzInfo?.influences || [],
        awards: musicBrainzInfo?.awards || []
      };

      return artistInfo;
    } catch (error) {
      console.error('Error buscando información del artista:', error);
      return null;
    }
  }

  /**
   * Busca información adicional sobre un álbum usando discogs_id
   */
  static async searchAlbumInfoWithDiscogsId(
    albumTitle: string, 
    artistName: string, 
    discogsId?: string
  ): Promise<AlbumInfo | null> {
    try {
      let albumInfo: AlbumInfo = {
        title: albumTitle,
        artist: artistName
      };

      // Si tenemos discogs_id, usar la URL directa
      if (discogsId) {
        const discogsUrl = `${this.DISCOGS_BASE_URL}${discogsId}`;
        albumInfo.discogsUrl = discogsUrl;
        
        // Buscar información detallada en Discogs API
        const discogsInfo = await this.searchDiscogsById(discogsId);
        if (discogsInfo) {
          albumInfo = { ...albumInfo, ...discogsInfo };
        }
      } else {
        // Fallback: buscar por nombre
        const discogsInfo = await this.searchDiscogs(albumTitle, artistName);
        if (discogsInfo) {
          albumInfo = { ...albumInfo, ...discogsInfo };
        }
      }

      // Buscar en Wikipedia como complemento
      const wikiInfo = await this.searchWikipedia(`${albumTitle} (álbum)`);
      if (wikiInfo?.extract && !albumInfo.description) {
        albumInfo.description = wikiInfo.extract;
      }

      return albumInfo;
    } catch (error) {
      console.error('Error buscando información del álbum:', error);
      return null;
    }
  }

  /**
   * Busca información en Wikipedia
   */
  private static async searchWikipedia(query: string): Promise<{ extract: string; url: string } | null> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(`${this.WIKIPEDIA_API}${encodedQuery}`);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.extract) {
        return {
          extract: data.extract,
          url: data.content_urls?.desktop?.page || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando en Wikipedia:', error);
      return null;
    }
  }

  /**
   * Busca información en MusicBrainz
   */
  private static async searchMusicBrainz(artistName: string): Promise<{
    genres: string[];
    activeYears: string;
    notableAlbums: string[];
    influences: string[];
    awards: string[];
  } | null> {
    try {
      const encodedName = encodeURIComponent(artistName);
      const response = await fetch(
        `${this.MUSICBRAINZ_API}artist/?query=name:${encodedName}&fmt=json&limit=1`
      );
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.artists && data.artists.length > 0) {
        const artist = data.artists[0];
        
        return {
          genres: artist.tags?.map((tag: any) => tag.name) || [],
          activeYears: artist['life-span']?.begin ? 
            `${artist['life-span'].begin} - ${artist['life-span'].end || 'Presente'}` : '',
          notableAlbums: artist.releases?.map((release: any) => release.title) || [],
          influences: artist.relations?.filter((rel: any) => rel.type === 'influenced by')
            .map((rel: any) => rel.artist?.name) || [],
          awards: []
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando en MusicBrainz:', error);
      return null;
    }
  }

  /**
   * Busca información en Discogs usando discogs_id
   */
  private static async searchDiscogsById(discogsId: string): Promise<{
    releaseYear: string;
    genre: string;
    description: string;
    criticalReception: string;
    commercialSuccess: string;
    tracklist: string[];
    producers: string[];
  } | null> {
    try {
      const response = await fetch(
        `${this.DISCOGS_API}releases/${discogsId}?token=${ENV.DISCOGS_TOKEN}`
      );
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      return {
        releaseYear: data.year?.toString() || '',
        genre: data.genres?.join(', ') || '',
        description: data.title || '',
        criticalReception: '',
        commercialSuccess: '',
        tracklist: data.tracklist?.map((track: any) => track.title) || [],
        producers: data.extraartists?.filter((artist: any) => artist.role === 'Producer')
          .map((artist: any) => artist.name) || []
      };
    } catch (error) {
      console.error('Error buscando en Discogs por ID:', error);
      return null;
    }
  }

  /**
   * Busca información en Discogs por nombre (fallback)
   */
  private static async searchDiscogs(albumTitle: string, artistName: string): Promise<{
    releaseYear: string;
    genre: string;
    description: string;
    criticalReception: string;
    commercialSuccess: string;
    tracklist: string[];
    producers: string[];
  } | null> {
    try {
      const encodedQuery = encodeURIComponent(`${artistName} ${albumTitle}`);
      const response = await fetch(
        `${this.DISCOGS_API}database/search?q=${encodedQuery}&type=release&token=${ENV.DISCOGS_TOKEN}`
      );
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        const release = data.results[0];
        
        return {
          releaseYear: release.year?.toString() || '',
          genre: release.genre?.join(', ') || '',
          description: release.title || '',
          criticalReception: '',
          commercialSuccess: '',
          tracklist: [],
          producers: []
        };
      }

      return null;
    } catch (error) {
      console.error('Error buscando en Discogs:', error);
      return null;
    }
  }

  /**
   * Busca información general sobre un tema musical
   */
  static async searchMusicTopic(topic: string): Promise<string | null> {
    try {
      const wikiInfo = await this.searchWikipedia(topic);
      return wikiInfo?.extract || null;
    } catch (error) {
      console.error('Error buscando información musical:', error);
      return null;
    }
  }

  /**
   * Enriquece una respuesta con información web usando datos de la colección
   */
  static async enrichResponseWithCollection(
    userMessage: string, 
    collectionData: CollectionAlbum[]
  ): Promise<string> {
    try {
      // Extraer nombres de artistas y álbumes del mensaje
      const artists = this.extractArtistsFromMessage(userMessage);
      const albums = this.extractAlbumsFromMessage(userMessage);
      
      let additionalInfo = '';
      
      // Buscar información de artistas mencionados
      for (const artist of artists) {
        const artistInfo = await this.searchArtistInfo(artist);
        if (artistInfo) {
          additionalInfo += `\n\n📚 INFORMACIÓN ADICIONAL SOBRE ${artist.toUpperCase()}:\n`;
          if (artistInfo.biography) {
            additionalInfo += `Biografía: ${artistInfo.biography.substring(0, 300)}...\n`;
          }
          if (artistInfo.genres && artistInfo.genres.length > 0) {
            additionalInfo += `Géneros: ${artistInfo.genres.join(', ')}\n`;
          }
          if (artistInfo.activeYears) {
            additionalInfo += `Años activo: ${artistInfo.activeYears}\n`;
          }
          if (artistInfo.notableAlbums && artistInfo.notableAlbums.length > 0) {
            additionalInfo += `Álbumes destacados: ${artistInfo.notableAlbums.slice(0, 5).join(', ')}\n`;
          }
        }
      }
      
      // Buscar información de álbumes mencionados usando discogs_id
      for (const album of albums) {
        // Buscar el álbum en la colección para obtener discogs_id
        const collectionAlbum = collectionData.find(
          item => item.albums.title.toLowerCase().includes(album.title.toLowerCase()) &&
                  item.albums.artist.toLowerCase().includes(album.artist.toLowerCase())
        );
        
        const discogsId = collectionAlbum?.albums.discogs_id;
        const albumInfo = await this.searchAlbumInfoWithDiscogsId(album.title, album.artist, discogsId);
        
        if (albumInfo) {
          additionalInfo += `\n\n💿 INFORMACIÓN ADICIONAL SOBRE ${albumInfo.title.toUpperCase()}:\n`;
          
          if (albumInfo.discogsUrl) {
            additionalInfo += `🔗 Ver en Discogs: ${albumInfo.discogsUrl}\n`;
          }
          
          if (albumInfo.description) {
            additionalInfo += `Descripción: ${albumInfo.description.substring(0, 300)}...\n`;
          }
          if (albumInfo.releaseYear) {
            additionalInfo += `Año de lanzamiento: ${albumInfo.releaseYear}\n`;
          }
          if (albumInfo.genre) {
            additionalInfo += `Género: ${albumInfo.genre}\n`;
          }
          if (albumInfo.tracklist && albumInfo.tracklist.length > 0) {
            additionalInfo += `Canciones destacadas: ${albumInfo.tracklist.slice(0, 5).join(', ')}\n`;
          }
          if (albumInfo.producers && albumInfo.producers.length > 0) {
            additionalInfo += `Productores: ${albumInfo.producers.join(', ')}\n`;
          }
        }
      }
      
      return additionalInfo;
    } catch (error) {
      console.error('Error enriqueciendo respuesta:', error);
      return '';
    }
  }

  /**
   * Enriquece una respuesta con información web (método original)
   */
  static async enrichResponse(
    userMessage: string, 
    collectionContext: string
  ): Promise<string> {
    try {
      // Extraer nombres de artistas y álbumes del mensaje
      const artists = this.extractArtistsFromMessage(userMessage);
      const albums = this.extractAlbumsFromMessage(userMessage);
      
      let additionalInfo = '';
      
      // Buscar información de artistas mencionados
      for (const artist of artists) {
        const artistInfo = await this.searchArtistInfo(artist);
        if (artistInfo) {
          additionalInfo += `\n\n📚 INFORMACIÓN ADICIONAL SOBRE ${artist.toUpperCase()}:\n`;
          if (artistInfo.biography) {
            additionalInfo += `Biografía: ${artistInfo.biography.substring(0, 300)}...\n`;
          }
          if (artistInfo.genres && artistInfo.genres.length > 0) {
            additionalInfo += `Géneros: ${artistInfo.genres.join(', ')}\n`;
          }
          if (artistInfo.activeYears) {
            additionalInfo += `Años activo: ${artistInfo.activeYears}\n`;
          }
          if (artistInfo.notableAlbums && artistInfo.notableAlbums.length > 0) {
            additionalInfo += `Álbumes destacados: ${artistInfo.notableAlbums.slice(0, 5).join(', ')}\n`;
          }
        }
      }
      
      // Buscar información de álbumes mencionados
      for (const album of albums) {
        const albumInfo = await this.searchAlbumInfoWithDiscogsId(album.title, album.artist);
        if (albumInfo) {
          additionalInfo += `\n\n💿 INFORMACIÓN ADICIONAL SOBRE ${albumInfo.title.toUpperCase()}:\n`;
          if (albumInfo.discogsUrl) {
            additionalInfo += `🔗 Ver en Discogs: ${albumInfo.discogsUrl}\n`;
          }
          if (albumInfo.description) {
            additionalInfo += `Descripción: ${albumInfo.description.substring(0, 300)}...\n`;
          }
          if (albumInfo.releaseYear) {
            additionalInfo += `Año de lanzamiento: ${albumInfo.releaseYear}\n`;
          }
          if (albumInfo.genre) {
            additionalInfo += `Género: ${albumInfo.genre}\n`;
          }
          if (albumInfo.tracklist && albumInfo.tracklist.length > 0) {
            additionalInfo += `Canciones destacadas: ${albumInfo.tracklist.slice(0, 5).join(', ')}\n`;
          }
          if (albumInfo.producers && albumInfo.producers.length > 0) {
            additionalInfo += `Productores: ${albumInfo.producers.join(', ')}\n`;
          }
        }
      }
      
      return additionalInfo;
    } catch (error) {
      console.error('Error enriqueciendo respuesta:', error);
      return '';
    }
  }

  /**
   * Extrae nombres de artistas del mensaje del usuario
   */
  private static extractArtistsFromMessage(message: string): string[] {
    const artists = new Set<string>();
    
    // Buscar artistas mencionados en la colección
    const commonArtists = [
      'Led Zeppelin', 'The Beatles', 'Pink Floyd', 'Radiohead', 'Nirvana',
      'The Rolling Stones', 'Queen', 'David Bowie', 'Prince', 'Michael Jackson',
      'Madonna', 'U2', 'The Cure', 'Depeche Mode', 'The Smiths',
      'Joy Division', 'New Order', 'The Clash', 'Sex Pistols', 'Ramones',
      'Black Sabbath', 'Metallica', 'Iron Maiden', 'AC/DC', 'Guns N\' Roses',
      'Red Hot Chili Peppers', 'Pearl Jam', 'Soundgarden', 'Alice In Chains',
      'Foo Fighters', 'Green Day', 'Blink-182', 'Sum 41', 'Linkin Park',
      'System Of A Down', 'Slipknot', 'Korn', 'Limp Bizkit', 'Rage Against The Machine',
      'Tool', 'Nine Inch Nails', 'Marilyn Manson', 'Rob Zombie', 'White Zombie',
      'Pantera', 'Megadeth', 'Slayer', 'Anthrax', 'Testament',
      'Death', 'Cannibal Corpse', 'Morbid Angel', 'Deicide', 'Obituary',
      'Sepultura', 'Soulfly', 'Cavalera Conspiracy', 'Nailbomb', 'Dirty Rotten Imbeciles',
      'Suicidal Tendencies', 'Dead Kennedys', 'Bad Religion', 'NOFX', 'Pennywise',
      'The Offspring', 'Rancid', 'Dropkick Murphys', 'Flogging Molly', 'The Pogues',
      'The Dubliners', 'The Chieftains', 'Clannad', 'Enya', 'Loreena McKennitt',
      'Dead Can Dance', 'Cocteau Twins', 'This Mortal Coil', 'The Gathering', 'Within Temptation',
      'Nightwish', 'Epica', 'Delain', 'Lacuna Coil', 'Evanescence',
      'Within Temptation', 'After Forever', 'Stream of Passion', 'Xandria', 'Leaves\' Eyes',
      'Sirenia', 'Tristania', 'Theatre of Tragedy', 'Lacrimosa', 'Haggard',
      'Therion', 'Rhapsody', 'Blind Guardian', 'Helloween', 'Gamma Ray',
      'Stratovarius', 'Sonata Arctica', 'Nightwish', 'Kamelot', 'Symphony X',
      'Dream Theater', 'Tool', 'Porcupine Tree', 'Opeth', 'Mastodon',
      'Gojira', 'Meshuggah', 'Periphery', 'Animals As Leaders', 'Polyphia',
      'Chon', 'Covet', 'Plini', 'Intervals', 'Scale The Summit',
      'Russian Circles', 'Pelican', 'Isis', 'Neurosis', 'Cult of Luna',
      'The Ocean', 'Rosetta', 'Caspian', 'This Will Destroy You', 'Explosions in the Sky',
      'God Is An Astronaut', 'Mogwai', 'Sigur Rós', 'Explosions in the Sky', 'This Will Destroy You',
      'God Is An Astronaut', 'Caspian', 'Russian Circles', 'Pelican', 'Isis',
      'Neurosis', 'Cult of Luna', 'The Ocean', 'Rosetta', 'Caspian',
      'This Will Destroy You', 'Explosions in the Sky', 'God Is An Astronaut', 'Mogwai', 'Sigur Rós'
    ];
    
    for (const artist of commonArtists) {
      if (message.toLowerCase().includes(artist.toLowerCase())) {
        artists.add(artist);
      }
    }
    
    return Array.from(artists);
  }

  /**
   * Extrae nombres de álbumes del mensaje del usuario
   */
  private static extractAlbumsFromMessage(message: string): Array<{title: string, artist: string}> {
    const albums: Array<{title: string, artist: string}> = [];
    
    // Buscar álbumes mencionados en la colección
    const commonAlbums = [
      { title: 'Led Zeppelin IV', artist: 'Led Zeppelin' },
      { title: 'Abbey Road', artist: 'The Beatles' },
      { title: 'The Dark Side of the Moon', artist: 'Pink Floyd' },
      { title: 'OK Computer', artist: 'Radiohead' },
      { title: 'Nevermind', artist: 'Nirvana' },
      { title: 'Exile on Main St.', artist: 'The Rolling Stones' },
      { title: 'A Night at the Opera', artist: 'Queen' },
      { title: 'The Rise and Fall of Ziggy Stardust', artist: 'David Bowie' },
      { title: 'Purple Rain', artist: 'Prince' },
      { title: 'Thriller', artist: 'Michael Jackson' },
      { title: 'Like a Prayer', artist: 'Madonna' },
      { title: 'The Joshua Tree', artist: 'U2' },
      { title: 'Disintegration', artist: 'The Cure' },
      { title: 'Violator', artist: 'Depeche Mode' },
      { title: 'The Queen Is Dead', artist: 'The Smiths' },
      { title: 'Unknown Pleasures', artist: 'Joy Division' },
      { title: 'London Calling', artist: 'The Clash' },
      { title: 'Never Mind the Bollocks', artist: 'Sex Pistols' },
      { title: 'Ramones', artist: 'Ramones' },
      { title: 'Paranoid', artist: 'Black Sabbath' },
      { title: 'Master of Puppets', artist: 'Metallica' },
      { title: 'The Number of the Beast', artist: 'Iron Maiden' },
      { title: 'Back in Black', artist: 'AC/DC' },
      { title: 'Appetite for Destruction', artist: 'Guns N\' Roses' },
      { title: 'Blood Sugar Sex Magik', artist: 'Red Hot Chili Peppers' },
      { title: 'Ten', artist: 'Pearl Jam' },
      { title: 'Superunknown', artist: 'Soundgarden' },
      { title: 'Dirt', artist: 'Alice In Chains' },
      { title: 'The Colour and the Shape', artist: 'Foo Fighters' },
      { title: 'Dookie', artist: 'Green Day' },
      { title: 'Enema of the State', artist: 'Blink-182' },
      { title: 'All Killer No Filler', artist: 'Sum 41' },
      { title: 'Hybrid Theory', artist: 'Linkin Park' },
      { title: 'Toxicity', artist: 'System Of A Down' },
      { title: 'Slipknot', artist: 'Slipknot' },
      { title: 'Follow the Leader', artist: 'Korn' },
      { title: 'Significant Other', artist: 'Limp Bizkit' },
      { title: 'Rage Against the Machine', artist: 'Rage Against the Machine' },
      { title: 'Ænima', artist: 'Tool' },
      { title: 'The Downward Spiral', artist: 'Nine Inch Nails' },
      { title: 'Antichrist Superstar', artist: 'Marilyn Manson' },
      { title: 'Hellbilly Deluxe', artist: 'Rob Zombie' },
      { title: 'La Sexorcisto', artist: 'White Zombie' },
      { title: 'Vulgar Display of Power', artist: 'Pantera' },
      { title: 'Rust in Peace', artist: 'Megadeth' },
      { title: 'Reign in Blood', artist: 'Slayer' },
      { title: 'Among the Living', artist: 'Anthrax' },
      { title: 'The Legacy', artist: 'Testament' },
      { title: 'Human', artist: 'Death' },
      { title: 'Tomb of the Mutilated', artist: 'Cannibal Corpse' },
      { title: 'Altars of Madness', artist: 'Morbid Angel' },
      { title: 'Legion', artist: 'Deicide' },
      { title: 'Slowly We Rot', artist: 'Obituary' },
      { title: 'Arise', artist: 'Sepultura' },
      { title: 'Soulfly', artist: 'Soulfly' },
      { title: 'Inflikted', artist: 'Cavalera Conspiracy' },
      { title: 'Point Blank', artist: 'Nailbomb' },
      { title: 'Dealing with It!', artist: 'Dirty Rotten Imbeciles' },
      { title: 'How Will I Laugh Tomorrow', artist: 'Suicidal Tendencies' },
      { title: 'Fresh Fruit for Rotting Vegetables', artist: 'Dead Kennedys' },
      { title: 'Suffer', artist: 'Bad Religion' },
      { title: 'Punk in Drublic', artist: 'NOFX' },
      { title: 'Unknown Road', artist: 'Pennywise' },
      { title: 'Smash', artist: 'The Offspring' },
      { title: '...And Out Come the Wolves', artist: 'Rancid' },
      { title: 'Do or Die', artist: 'Dropkick Murphys' },
      { title: 'Drunken Lullabies', artist: 'Flogging Molly' },
      { title: 'Rum Sodomy & the Lash', artist: 'The Pogues' },
      { title: 'The Dubliners', artist: 'The Dubliners' },
      { title: 'The Chieftains', artist: 'The Chieftains' },
      { title: 'Clannad', artist: 'Clannad' },
      { title: 'Watermark', artist: 'Enya' },
      { title: 'The Visit', artist: 'Loreena McKennitt' },
      { title: 'Within the Realm of a Dying Sun', artist: 'Dead Can Dance' },
      { title: 'Heaven or Las Vegas', artist: 'Cocteau Twins' },
      { title: 'It\'ll End in Tears', artist: 'This Mortal Coil' },
      { title: 'Mandylion', artist: 'The Gathering' },
      { title: 'Mother Earth', artist: 'Within Temptation' },
      { title: 'Oceanborn', artist: 'Nightwish' },
      { title: 'The Phantom Agony', artist: 'Epica' },
      { title: 'Lucidity', artist: 'Delain' },
      { title: 'Comalies', artist: 'Lacuna Coil' },
      { title: 'Fallen', artist: 'Evanescence' },
      { title: 'Mother Earth', artist: 'Within Temptation' },
      { title: 'Decipher', artist: 'After Forever' },
      { title: 'Embrace the Storm', artist: 'Stream of Passion' },
      { title: 'Ravenheart', artist: 'Xandria' },
      { title: 'Lovelorn', artist: 'Leaves\' Eyes' },
      { title: 'At Sixes and Sevens', artist: 'Sirenia' },
      { title: 'Widow\'s Weeds', artist: 'Tristania' },
      { title: 'Velvet Darkness They Fear', artist: 'Theatre of Tragedy' },
      { title: 'Inferno', artist: 'Lacrimosa' },
      { title: 'And Thou Shalt Trust... the Seer', artist: 'Haggard' },
      { title: 'Theli', artist: 'Therion' },
      { title: 'Legendary Tales', artist: 'Rhapsody' },
      { title: 'Somewhere Far Beyond', artist: 'Blind Guardian' },
      { title: 'Keeper of the Seven Keys Part I', artist: 'Helloween' },
      { title: 'Land of the Free', artist: 'Gamma Ray' },
      { title: 'Visions', artist: 'Stratovarius' },
      { title: 'Ecliptica', artist: 'Sonata Arctica' },
      { title: 'Oceanborn', artist: 'Nightwish' },
      { title: 'Karma', artist: 'Kamelot' },
      { title: 'The Divine Wings of Tragedy', artist: 'Symphony X' },
      { title: 'Images and Words', artist: 'Dream Theater' },
      { title: 'Ænima', artist: 'Tool' },
      { title: 'Fear of a Blank Planet', artist: 'Porcupine Tree' },
      { title: 'Blackwater Park', artist: 'Opeth' },
      { title: 'Leviathan', artist: 'Mastodon' },
      { title: 'From Mars to Sirius', artist: 'Gojira' },
      { title: 'Nothing', artist: 'Meshuggah' },
      { title: 'Periphery', artist: 'Periphery' },
      { title: 'Animals as Leaders', artist: 'Animals As Leaders' },
      { title: 'Muse', artist: 'Polyphia' },
      { title: 'Grow', artist: 'Chon' },
      { title: 'Effloresce', artist: 'Covet' },
      { title: 'Handmade Cities', artist: 'Plini' },
      { title: 'The Shape of Colour', artist: 'Intervals' },
      { title: 'The Migration', artist: 'Scale The Summit' },
      { title: 'Enter', artist: 'Russian Circles' },
      { title: 'The Fire in Our Throats', artist: 'Pelican' },
      { title: 'Oceanic', artist: 'Isis' },
      { title: 'Through Silver in Blood', artist: 'Neurosis' },
      { title: 'Salvation', artist: 'Cult of Luna' },
      { title: 'Precambrian', artist: 'The Ocean' },
      { title: 'The Galilean Satellites', artist: 'Rosetta' },
      { title: 'Tertia', artist: 'Caspian' },
      { title: 'Young Mountain', artist: 'This Will Destroy You' },
      { title: 'The Earth Is Not a Cold Dead Place', artist: 'Explosions in the Sky' },
      { title: 'All Is Violent, All Is Bright', artist: 'God Is An Astronaut' },
      { title: 'Young Team', artist: 'Mogwai' },
      { title: 'Ágætis byrjun', artist: 'Sigur Rós' }
    ];
    
    for (const album of commonAlbums) {
      if (message.toLowerCase().includes(album.title.toLowerCase())) {
        albums.push(album);
      }
    }
    
    return albums;
  }
} 