import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';
import { MaletaCollaboratorWithProfile } from '../../types/collaboration';

interface CollaboratorItemProps {
    collaborator: MaletaCollaboratorWithProfile;
    onRemove?: (collaboratorId: string) => void;
}

export const CollaboratorItem: React.FC<CollaboratorItemProps> = ({ collaborator, onRemove }) => {
    const { colors } = useTheme();
    const { profile, status } = collaborator;

    const getStatusColor = () => {
        switch (status) {
            case 'accepted': return '#4CAF50';
            case 'pending': return '#FFC107';
            case 'rejected': return '#F44336';
            default: return colors.text;
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={styles.userInfo}>
                {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                        <Ionicons name="person" size={20} color={colors.text} />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.username, { color: colors.text }]}>{profile?.username || 'Unknown'}</Text>
                    <Text style={[styles.status, { color: getStatusColor() }]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                </View>
            </View>
            {onRemove && (
                <TouchableOpacity onPress={() => onRemove(collaborator.user_id)} style={styles.removeButton}>
                    <Ionicons name="close-circle" size={24} color="#FF3B30" />
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
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
    status: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    removeButton: {
        padding: 8,
    },
});
