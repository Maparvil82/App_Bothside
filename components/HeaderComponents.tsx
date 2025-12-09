import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/database';
import { usePendingInvitationsCount } from '../hooks/useCollaboration';

export const HeaderAvatar = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { mode } = useThemeMode();
    const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const { count: pendingInvites, refresh: refreshInvites } = usePendingInvitationsCount();

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
            refreshInvites();
        }, [user?.id, refreshInvites])
    );

    const getInitials = () => {
        if (!profile?.username) return 'U';
        return profile.username.substring(0, 2).toUpperCase();
    };

    return (
        <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => navigation.navigate('Profile' as never)}
            disabled={loading}
        >
            {profile?.avatar_url ? (
                <Image
                    source={{ uri: `${profile.avatar_url}` }}
                    style={[styles.avatarImage, { borderColor: colors.border }]}
                    resizeMode="cover"
                />
            ) : (
                <View style={[styles.avatarPlaceholder, { borderColor: colors.border, backgroundColor: primaryColor }]}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                </View>
            )}
            {pendingInvites > 0 && (
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                        {pendingInvites > 9 ? '9+' : pendingInvites}
                    </Text>
                </View>
            )}
        </TouchableOpacity>
    );
};

export const HeaderCalendar = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => navigation.navigate('Calendar' as never)}
        >
            <Ionicons name="calendar-outline" size={24} color={colors.text} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    avatarContainer: {
        marginRight: 16,
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
    calendarButton: {
        marginLeft: 16,
        padding: 4,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#E33',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 3,
        borderWidth: 1.5,
        borderColor: 'white',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
});
