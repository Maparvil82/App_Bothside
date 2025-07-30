import React, { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/database';

interface UserAvatarProps {
  size?: number;
  onPress?: () => void;
  showBorder?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  size = 40, 
  onPress, 
  showBorder = true 
}) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const userProfile = await ProfileService.getUserProfile(user.id);
        setProfile(userProfile);
      } catch (error) {
        console.error('Error loading user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.id]);

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name
        .split(' ')
        .map(name => name.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.charAt(0).toUpperCase() || 'U';
  };

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: showBorder ? 2 : 0,
    borderColor: showBorder ? '#007AFF' : 'transparent',
  };

  if (loading) {
    return (
      <View style={[styles.container, avatarStyle, styles.loading]} />
    );
  }

  const AvatarContent = () => (
    <>
      {profile?.avatar_url ? (
        <Image
          source={{ uri: profile.avatar_url }}
          style={[styles.avatarImage, avatarStyle]}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.avatarPlaceholder, avatarStyle]}>
          <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>
            {getInitials()}
          </Text>
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={styles.container}>
        <AvatarContent />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <AvatarContent />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
  },
  loading: {
    backgroundColor: '#f0f0f0',
  },
}); 