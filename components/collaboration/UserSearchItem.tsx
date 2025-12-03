import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

import { useTranslation } from '../../src/i18n/useTranslation';

interface UserSearchItemProps {
    user: {
        id: string;
        username: string | null;
        full_name: string | null;
        avatar_url: string | null;
    };
    onInvite: (userId: string) => void;
    isInvited?: boolean;
}

export const UserSearchItem: React.FC<UserSearchItemProps> = ({ user, onInvite, isInvited = false }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.userInfo}>
                {user.avatar_url ? (
                    <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="person" size={20} color={colors.text} />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.username, { color: colors.text }]}>{user.username || 'Unknown'}</Text>
                    {user.full_name && (
                        <Text style={[styles.fullName, { color: colors.text }]}>{user.full_name}</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={[
                    styles.inviteButton,
                    isInvited ? styles.invitedButton : { backgroundColor: colors.primary }
                ]}
                onPress={() => !isInvited && onInvite(user.id)}
                disabled={isInvited}
            >
                <Text style={[
                    styles.inviteButtonText,
                    isInvited ? { color: colors.text } : { color: 'white' }
                ]}>
                    {isInvited ? t('maletas_collaborative_errorAlreadyInvited') : t('maletas_collaborative_inviteButton')}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    username: {
        fontSize: 16,
        fontWeight: '600',
    },
    fullName: {
        fontSize: 14,
        opacity: 0.7,
    },
    inviteButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    invitedButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    inviteButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
