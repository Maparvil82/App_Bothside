import { supabase } from '../supabase';
import { MaletaCollaboratorWithProfile, MaletaCollaboratorStatus } from '../../types/collaboration';

// --- Search Users ---

export const searchUsers = async (query: string, maletaId?: string) => {
    if (!query || query.length < 3) return [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Get IDs of users already collaborating or invited to this maleta
    let excludedUserIds = [user.id]; // Always exclude current user

    if (maletaId) {
        const { data: existingCollaborators } = await supabase
            .from('maleta_collaborators')
            .select('user_id')
            .eq('maleta_id', maletaId);

        if (existingCollaborators) {
            const collaboratorIds = existingCollaborators
                .map(c => c.user_id)
                .filter((id): id is string => !!id);
            excludedUserIds = [...excludedUserIds, ...collaboratorIds];
        }
    }

    // 2. Search profiles excluding these IDs
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, full_name')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .not('id', 'in', `(${excludedUserIds.join(',')})`)
        .limit(10);

    if (error) {
        console.error('Error searching users:', error);
        throw error;
    }

    return data;
};

// --- Invitations ---

export const inviteCollaborator = async (maletaId: string, userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already invited
    const { data: existing } = await supabase
        .from('maleta_collaborators')
        .select('id')
        .eq('maleta_id', maletaId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        throw new Error('User already invited or collaborating');
    }

    const { data, error } = await supabase
        .from('maleta_collaborators')
        .insert({
            maleta_id: maletaId,
            user_id: userId,
            invited_by: user.id,
            status: 'pending'
        })
        .select()
        .single();

    if (error) throw error;

    // Dispatch push notification asynchronously in the background
    (async () => {
        try {
            // 1. Get invited user B's profile (especially push token)
            const { data: profileB } = await supabase
                .from('profiles')
                .select('expo_push_token')
                .eq('id', userId)
                .single();

            const token = profileB?.expo_push_token;
            if (!token) {
                console.log(`[Notification] Invited user ${userId} has no registered push token`);
                return;
            }

            // 2. Get inviter's (User A) username or full name
            const { data: profileA } = await supabase
                .from('profiles')
                .select('username, full_name')
                .eq('id', user.id)
                .single();

            const displayName = profileA?.username || profileA?.full_name || 'Un coleccionista';

            // 3. Get the suitcase (maleta) title
            const { data: maleta } = await supabase
                .from('user_maletas')
                .select('title')
                .eq('id', maletaId)
                .single();

            const maletaTitle = maleta?.title || 'una maleta';

            // 4. Send push notification using Expo Push API
            console.log(`[Notification] Dispatching push to user B (${userId}) on token: ${token}`);
            const response = await fetch('https://exp.host/--/api/v2/push/send', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Accept-encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: token,
                    sound: 'default',
                    title: '🎧 Nueva maleta compartida',
                    body: `${displayName} te ha invitado a colaborar en la maleta "${maletaTitle}".`,
                    data: {
                        type: 'shared_crate_invitation',
                        maletaId: maletaId,
                    },
                }),
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error('[Notification] Expo push API returned error status:', response.status, errText);
            } else {
                console.log('[Notification] Push notification successfully sent via Expo API');
            }
        } catch (pushError) {
            // Log but don't block
            console.error('[Notification] Error dispatching push notification:', pushError);
        }
    })();

    return data;
};

export const getCollaborators = async (maletaId: string): Promise<MaletaCollaboratorWithProfile[]> => {
    const { data, error } = await supabase
        .from('maleta_collaborators')
        .select('*')
        .eq('maleta_id', maletaId);

    if (error) throw error;

    // Manually fetch profiles
    const userIds = [...new Set(data?.map(item => item.user_id).filter(Boolean))];
    let profilesMap: Record<string, any> = {};

    if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, full_name')
            .in('id', userIds);

        if (!profilesError && profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
            }, {} as Record<string, any>);
        }
    }

    const collaboratorsWithProfiles = data?.map(item => ({
        ...item,
        profile: item.user_id ? profilesMap[item.user_id] : null
    }));

    return collaboratorsWithProfiles as unknown as MaletaCollaboratorWithProfile[];
};

export const getMyInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('maleta_collaborators')
        .select(`
      *,
      maleta:maleta_id (
        id,
        title,
        cover_url
      )
    `)
        .eq('user_id', user.id)
        .eq('status', 'pending');

    if (error) throw error;

    // Manually fetch inviter profiles
    const inviterIds = [...new Set(data?.map(item => item.invited_by).filter(Boolean))];
    let profilesMap: Record<string, any> = {};

    if (inviterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', inviterIds);

        if (!profilesError && profiles) {
            profilesMap = profiles.reduce((acc, profile) => {
                acc[profile.id] = profile;
                return acc;
            }, {} as Record<string, any>);
        }
    }

    const invitationsWithProfiles = data?.map(item => ({
        ...item,
        inviter: item.invited_by ? profilesMap[item.invited_by] : null
    }));

    return invitationsWithProfiles;
};

export const respondToInvitation = async (invitationId: string, status: 'accepted' | 'rejected') => {
    console.log('🔄 Responding to invitation:', invitationId, 'with status:', status);

    const { data, error } = await supabase
        .from('maleta_collaborators')
        .update({ status })
        .eq('id', invitationId)
        .select()
        .maybeSingle();

    console.log('📝 Update result:', { data, error });

    if (error) {
        console.error('❌ Error updating invitation:', error);
        throw error;
    }

    console.log('✅ Invitation updated successfully');
    return data;
};

// --- Maleta Management ---

export const updateMaletaCollaborativeStatus = async (maletaId: string, isCollaborative: boolean) => {
    const { error } = await supabase
        .from('user_maletas') // Assuming this is the table name based on user request "user_maletas"
        .update({ is_collaborative: isCollaborative })
        .eq('id', maletaId);

    if (error) throw error;
};

export const addAlbumToMaletaAsCollaborator = async (maletaId: string, albumId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('maleta_albums')
        .insert({
            maleta_id: maletaId,
            album_id: albumId,
            added_by: user.id
        });

    if (error) throw error;
};

export const removeAlbumFromMaletaAsCollaborator = async (maletaId: string, albumId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Verify ownership of the addition
    const { error } = await supabase
        .from('maleta_albums')
        .delete()
        .eq('maleta_id', maletaId)
        .eq('album_id', albumId)
        .eq('added_by', user.id); // Security check

    if (error) throw error;
};
