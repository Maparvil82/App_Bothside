import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface InvitationItemProps {
    invitation: any; // Using any for now to avoid complex type imports, but should be typed properly
    onAccept: (id: string) => void;
    onReject: (id: string) => void;
}

export const InvitationItem: React.FC<InvitationItemProps> = ({ invitation, onAccept, onReject }) => {
    const { colors } = useTheme();
    const { maleta, inviter } = invitation;

    return (
        <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.header}>
                <View style={styles.maletaInfo}>
                    {maleta?.cover_url ? (
                        <Image source={{ uri: maleta.cover_url }} style={styles.cover} />
                    ) : (
                        <View style={[styles.coverPlaceholder, { backgroundColor: colors.border }]}>
                            <Ionicons name="briefcase" size={24} color={colors.text} />
                        </View>
                    )}
                    <View style={styles.textContainer}>
                        <Text style={[styles.maletaName, { color: colors.text }]}>{maleta?.name || 'Unknown Maleta'}</Text>
                        <Text style={[styles.inviterName, { color: colors.text }]}>
                            Invited by {inviter?.username || 'Unknown'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.rejectButton]}
                    onPress={() => onReject(invitation.id)}
                >
                    <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => onAccept(invitation.id)}
                >
                    <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    maletaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    cover: {
        width: 50,
        height: 50,
        borderRadius: 8,
        marginRight: 12,
    },
    coverPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    maletaName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    inviterName: {
        fontSize: 14,
        opacity: 0.7,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        minWidth: 100,
        alignItems: 'center',
    },
    acceptButton: {
        backgroundColor: '#007AFF',
    },
    rejectButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    acceptText: {
        color: 'white',
        fontWeight: '600',
    },
    rejectText: {
        color: '#FF3B30',
        fontWeight: '600',
    },
});
