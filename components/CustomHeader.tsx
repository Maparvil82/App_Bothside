import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { AppColors } from '../src/theme/colors';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/database';
import { Ionicons } from '@expo/vector-icons';

interface CustomHeaderProps {
  title: string;
  showAvatar?: boolean;
  showBackButton?: boolean;
  showCalendarIcon?: boolean;
  onAvatarPress?: () => void;
  onBackPress?: () => void;
  onCalendarPress?: () => void;
}

export const CustomHeader: React.FC<CustomHeaderProps> = ({
  title,
  showAvatar = true,
  showBackButton = false,
  showCalendarIcon = true,
  onAvatarPress,
  onBackPress,
  onCalendarPress
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      if (!user?.id) return;
      setLoading(true);
      const userProfile = await ProfileService.getUserProfile(user!.id);
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [user?.id])
  );

  const getInitials = () => {
    if (!profile?.full_name) return 'U';
    return profile.full_name
      .split(' ')
      .map((name: string) => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarPress = () => {
    if (onAvatarPress) {
      onAvatarPress();
    } else {
      navigation.navigate('Profile' as never);
    }
  };

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      navigation.goBack();
    }
  };

  const handleCalendarPress = () => {
    if (onCalendarPress) {
      onCalendarPress();
    } else {
      navigation.navigate('Calendar' as never);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        {/* Icono del calendario al principio */}
        {showCalendarIcon && (
          <TouchableOpacity
            style={styles.calendarButton}
            onPress={handleCalendarPress}
          >
            <Ionicons name="calendar-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        {showBackButton && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
        <View style={styles.rightContainer}>
          {showAvatar && (
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleAvatarPress}
              disabled={loading}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: `${profile.avatar_url}` }}
                  style={[styles.avatarImage, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.avatarPlaceholder, { borderColor: colors.border }]}>
                  <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    borderBottomWidth: 1,
    height: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    height: 56,
    position: 'relative',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    zIndex: 1,
  },
  titleContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 0,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  rightContainer: {
    position: 'absolute',
    right: 16,
    top: 6,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  calendarButton: {
    padding: 8,
    marginRight: 8,
    zIndex: 1,
  },
  avatarContainer: {
    zIndex: 1,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  avatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
}); 