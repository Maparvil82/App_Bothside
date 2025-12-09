import React from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMyInvitations } from '../../hooks/useCollaboration';
import { InvitationItem } from '../../components/collaboration/InvitationItem';

interface InvitationsScreenProps {
    navigation: any;
}

import { useTranslation } from '../../src/i18n/useTranslation';

const InvitationsScreen: React.FC<InvitationsScreenProps> = ({ navigation }) => {
    const { colors } = useTheme();
    const { t } = useTranslation();
    const { invitations, loading, respond, refresh } = useMyInvitations();

    const handleAccept = async (id: string) => {
        const success = await respond(id, 'accepted');
        if (success) {
            Alert.alert(t('common_success'), t('maletas_collaborative_successInvitationAccepted'));
        } else {
            Alert.alert(t('common_error'), t('maletas_collaborative_errorGeneric'));
        }
    };

    const handleReject = async (id: string) => {
        const success = await respond(id, 'rejected');
        if (success) {
            Alert.alert(t('common_success'), t('maletas_collaborative_successInvitationRejected'));
        } else {
            Alert.alert(t('common_error'), t('maletas_collaborative_errorGeneric'));
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>


            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={invitations}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <InvitationItem
                            invitation={item}
                            onAccept={handleAccept}
                            onReject={handleReject}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="mail-open-outline" size={64} color={colors.border} />
                            <Text style={[styles.emptyText, { color: colors.text }]}>{t('common_no_results')}</Text>
                        </View>
                    }
                    refreshing={loading}
                    onRefresh={refresh}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    backButton: {
        marginRight: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        opacity: 0.6,
    },
});

export default InvitationsScreen;
