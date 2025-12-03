import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMaletaCollaborators, useUserSearch, useInviteCollaborator } from '../../hooks/useCollaboration';
import { UserSearchItem } from '../../components/collaboration/UserSearchItem';
import { CollaboratorItem } from '../../components/collaboration/CollaboratorItem';

interface InviteCollaboratorsScreenProps {
    route: any;
    navigation: any;
}

const InviteCollaboratorsScreen: React.FC<InviteCollaboratorsScreenProps> = ({ route, navigation }) => {
    const { maletaId } = route.params;
    const { colors } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const { collaborators, loading: loadingCollaborators, refresh } = useMaletaCollaborators(maletaId);
    const { results: searchResults, loading: searching, search } = useUserSearch();
    const { invite, loading: inviting } = useInviteCollaborator();

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text.length >= 3) {
            search(text);
        }
    };

    const handleInvite = async (userId: string) => {
        const result = await invite(maletaId, userId);
        if (result.success) {
            Alert.alert('Success', 'Invitation sent successfully');
            setSearchQuery(''); // Clear search
            refresh(); // Refresh collaborators list
        } else {
            Alert.alert('Error', result.error || 'Failed to send invitation');
        }
    };

    const isUserInvited = (userId: string) => {
        return collaborators.some(c => c.user_id === userId);
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Invite Collaborators</Text>
            </View>

            <View style={styles.searchContainer}>
                <View style={[styles.searchInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="search" size={20} color={colors.text} style={styles.searchIcon} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.text }]}
                        placeholder="Search by username or email..."
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                    />
                </View>
            </View>

            {searchQuery.length >= 3 && (
                <View style={styles.resultsContainer}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Search Results</Text>
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
                                <Text style={styles.emptyText}>No users found</Text>
                            }
                        />
                    )}
                </View>
            )}

            <View style={styles.collaboratorsContainer}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Collaborators</Text>
                {loadingCollaborators ? (
                    <ActivityIndicator size="large" color={colors.primary} />
                ) : (
                    <FlatList
                        data={collaborators}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => <CollaboratorItem collaborator={item} />}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No collaborators yet</Text>
                        }
                    />
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
    emptyText: {
        padding: 16,
        color: '#999',
        fontStyle: 'italic',
    },
});

export default InviteCollaboratorsScreen;
