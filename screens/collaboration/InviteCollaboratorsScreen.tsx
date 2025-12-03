import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMaletaCollaborators, useUserSearch, useInviteCollaborator } from '../../hooks/useCollaboration';
import { UserSearchItem } from '../../components/collaboration/UserSearchItem';
import { CollaboratorItem } from '../../components/collaboration/CollaboratorItem';
import { useTranslation } from '../../src/i18n/useTranslation';
import { supabase } from '../../lib/supabase';

interface InviteCollaboratorsScreenProps {
    route: any;
    navigation: any;
}

const InviteCollaboratorsScreen: React.FC<InviteCollaboratorsScreenProps> = ({ route, navigation }) => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { maletaId } = route.params;
    const [searchQuery, setSearchQuery] = useState('');

    const { collaborators, loading: loadingCollaborators, refresh } = useMaletaCollaborators(maletaId);
    const { results: searchResults, loading: searching, search } = useUserSearch();
    const { invite, loading: inviting } = useInviteCollaborator();

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.length >= 3) {
            search(text, maletaId);
        }
    };

    const handleInvite = async (userId: string) => {
        const result = await invite(maletaId, userId);
        if (result.success) {
            Alert.alert(t('common_success'), t('maletas_collaborative_successInvitationSent'));
            setSearchQuery(''); // Clear search
            refresh(); // Refresh collaborators list
        } else {
            const errorMessage = result.error === 'User already invited or collaborating'
                ? t('maletas_collaborative_errorAlreadyInvited')
                : t('maletas_collaborative_errorInvitationFailed');
            Alert.alert(t('common_error'), errorMessage);
        }
    };

    const handleRemoveCollaborator = async (collaboratorId: string) => {
        Alert.alert(
            t('maletas_collaborative_removeTitle'),
            t('maletas_collaborative_removeMessage'),
            [
                { text: t('common_cancel'), style: 'cancel' },
                {
                    text: t('maletas_collaborative_removeConfirm'),
                    style: 'destructive',
                    onPress: async () => {
                        const { error } = await supabase
                            .from('maleta_collaborators')
                            .delete()
                            .eq('maleta_id', maletaId)
                            .eq('user_id', collaboratorId);

                        if (error) {
                            console.error(error);
                            Alert.alert(t('common_error'), t('maletas_collaborative_errorRemoveFailed'));
                            return;
                        }

                        // refrescar listas
                        refresh();
                    }
                }
            ]
        );
    };

    const isUserInvited = (userId: string) => {
        return collaborators.some(c => c.user_id === userId);
    };

    return (
        <View style={[styles.container, { backgroundColor: '#FFF' }]}>


            <View style={styles.searchContainer}>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder={t('maletas_collaborative_searchPlaceholder')}
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {searchQuery.length >= 3 && (
                <View style={styles.resultsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('common_results')}</Text>
                    {searching ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <FlatList
                            data={searchResults}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <UserSearchItem
                                    user={item}
                                    onInvite={handleInvite}
                                    isInvited={isUserInvited(item.id)}
                                />
                            )}
                            ListEmptyComponent={
                                <Text style={styles.emptyText}>{t('maletas_collaborative_errorUserNotFound')}</Text>
                            }
                        />
                    )}
                </View>
            )}

            <View style={styles.collaboratorsContainer}>
                {loadingCollaborators ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                    <>

                        {/* Pending Invitations */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('maletas_collaborative_pendingSectionTitle')}</Text>
                            <FlatList
                                data={collaborators.filter(c => c.status === 'pending')}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => <CollaboratorItem collaborator={item} />}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>{t('common_no_results')}</Text>
                                }
                            />
                        </View>

                        {/* Accepted Collaborators */}
                        <View style={styles.section}>
                            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('maletas_collaborative_acceptedSectionTitle')}</Text>
                            <FlatList
                                data={collaborators.filter(c => c.status === 'accepted')}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <CollaboratorItem
                                        collaborator={item}
                                        onRemove={handleRemoveCollaborator}
                                    />
                                )}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>{t('common_no_results')}</Text>
                                }
                            />
                        </View>
                    </>
                )}
            </View>
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
    searchContainer: {
        padding: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
    },
    resultsContainer: {
        maxHeight: 200,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    collaboratorsContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        padding: 16,
        paddingBottom: 8,
    },
    section: {
        marginBottom: 24,
    },
    emptyText: {
        padding: 16,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default InviteCollaboratorsScreen;
