import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { useNavigation, useFocusEffect, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ProfileService, UserProfile } from '../services/database';

export const HeaderAvatar = () => {
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
                <View style={[styles.avatarPlaceholder, { borderColor: colors.border }]}>
                    <Text style={styles.avatarText}>{getInitials()}</Text>
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
        backgroundColor: '#007AFF',
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
});
