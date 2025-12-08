import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

interface MaletaCoverCollageProps {
  albums: Array<{
    albums: {
      cover_url?: string;
    };
  }>;
  size?: number;
}

export const MaletaCoverCollage: React.FC<MaletaCoverCollageProps> = ({
  albums,
  size = 50
}) => {
  // Obtener los últimos 3 álbumes (suficiente para el mosaico)
  // Invertimos para mostrar los más recientes primero si vienen ordenados cronológicamente
  // Asumimos que 'albums' viene ordenado, tomamos los últimos.
  const displayAlbums = albums.slice(0, 3);
  const count = displayAlbums.length;

  const GAP = 2;
  const BORDER_RADIUS = 12;

  // Si no hay álbumes, mostrar placeholder
  if (count === 0) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: BORDER_RADIUS, backgroundColor: '#F0F0F0' }]}>
        <View style={styles.placeholder}>
          {/* Placeholder content could go here */}
        </View>
      </View>
    );
  }

  // 1 Álbum: Imagen completa
  if (count === 1) {
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: BORDER_RADIUS }]}>
        <Image
          source={{ uri: displayAlbums[0].albums.cover_url || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 2 Álbumes: Split vertical (50/50)
  if (count === 2) {
    const itemWidth = (size - GAP) / 2;
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: BORDER_RADIUS, flexDirection: 'row', gap: GAP }]}>
        <Image
          source={{ uri: displayAlbums[0].albums.cover_url || 'https://via.placeholder.com/150' }}
          style={{ width: itemWidth, height: '100%' }}
          resizeMode="cover"
        />
        <Image
          source={{ uri: displayAlbums[1].albums.cover_url || 'https://via.placeholder.com/150' }}
          style={{ width: itemWidth, height: '100%' }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 3+ Álbumes: Mosaico (1 Grande izquierda, 2 Pequeños derecha)
  // Left: 66%, Right: 33%
  const leftWidth = (size * 0.66) - (GAP / 2);
  const rightWidth = (size * 0.34) - (GAP / 2);
  const rightItemHeight = (size - GAP) / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: BORDER_RADIUS, flexDirection: 'row', gap: GAP }]}>
      {/* Main Image (Left) */}
      <Image
        source={{ uri: displayAlbums[0].albums.cover_url || 'https://via.placeholder.com/150' }}
        style={{ width: leftWidth, height: '100%' }}
        resizeMode="cover"
      />

      {/* Right Column */}
      <View style={{ width: rightWidth, height: '100%', gap: GAP }}>
        <Image
          source={{ uri: displayAlbums[1].albums.cover_url || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: rightItemHeight }}
          resizeMode="cover"
        />
        <Image
          source={{ uri: displayAlbums[2].albums.cover_url || 'https://via.placeholder.com/150' }}
          style={{ width: '100%', height: rightItemHeight }}
          resizeMode="cover"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#E0E0E0',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 