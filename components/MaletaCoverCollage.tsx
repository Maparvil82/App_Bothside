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
  size = 80 
}) => {
  // Obtener los últimos 4 álbumes
  const last4Albums = albums.slice(-4);
  
  // Si no hay álbumes, mostrar placeholder
  if (last4Albums.length === 0) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={[styles.placeholder, { width: size, height: size }]}>
          {/* Placeholder content */}
        </View>
      </View>
    );
  }

  // Si hay 1 álbum
  if (last4Albums.length === 1) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <Image
          source={{ uri: last4Albums[0].albums.cover_url || 'https://via.placeholder.com/80' }}
          style={[styles.singleImage, { width: size, height: size }]}
        />
      </View>
    );
  }

  // Si hay 2 álbumes
  if (last4Albums.length === 2) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.twoImagesContainer}>
          <Image
            source={{ uri: last4Albums[0].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.halfImage, { width: size / 2, height: size }]}
          />
          <Image
            source={{ uri: last4Albums[1].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.halfImage, { width: size / 2, height: size }]}
          />
        </View>
      </View>
    );
  }

  // Si hay 3 álbumes
  if (last4Albums.length === 3) {
    return (
      <View style={[styles.container, { width: size, height: size }]}>
        <View style={styles.threeImagesContainer}>
          <Image
            source={{ uri: last4Albums[0].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
          />
          <View style={styles.rightColumn}>
            <Image
              source={{ uri: last4Albums[1].albums.cover_url || 'https://via.placeholder.com/40' }}
              style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
            />
            <Image
              source={{ uri: last4Albums[2].albums.cover_url || 'https://via.placeholder.com/40' }}
              style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
            />
          </View>
        </View>
      </View>
    );
  }

  // Si hay 4 o más álbumes (mostrar los últimos 4)
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={styles.fourImagesContainer}>
        <View style={styles.topRow}>
          <Image
            source={{ uri: last4Albums[0].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
          />
          <Image
            source={{ uri: last4Albums[1].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
          />
        </View>
        <View style={styles.bottomRow}>
          <Image
            source={{ uri: last4Albums[2].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
          />
          <Image
            source={{ uri: last4Albums[3].albums.cover_url || 'https://via.placeholder.com/40' }}
            style={[styles.quarterImage, { width: size / 2, height: size / 2 }]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  singleImage: {
    borderRadius: 4,
  },
  twoImagesContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  halfImage: {
    borderRadius: 0,
  },
  threeImagesContainer: {
    flexDirection: 'row',
    flex: 1,
  },
  rightColumn: {
    flex: 1,
  },
  fourImagesContainer: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    flex: 1,
  },
  bottomRow: {
    flexDirection: 'row',
    flex: 1,
  },
  quarterImage: {
    borderRadius: 0,
  },
}); 