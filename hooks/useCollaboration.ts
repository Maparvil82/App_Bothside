import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
    getCollaborators,
    inviteCollaborator,
    searchUsers,
    getMyInvitations,
    respondToInvitation,
    updateMaletaCollaborativeStatus
} from '../lib/supabase/collaboration';
import { MaletaCollaboratorWithProfile } from '../types/collaboration';

export const useMaletaCollaborators = (maletaId: string | undefined) => {
    const [collaborators, setCollaborators] = useState<MaletaCollaboratorWithProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchCollaborators = useCallback(async () => {
        if (!maletaId) return;
        try {
            setLoading(true);
            const data = await getCollaborators(maletaId);
            setCollaborators(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [maletaId]);

    useEffect(() => {
        fetchCollaborators();

        // Subscribe to changes
        if (!maletaId) return;

        const channel = supabase
            .channel(`maleta_collaborators:${maletaId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'maleta_collaborators',
                    filter: `maleta_id=eq.${maletaId}`
                },
                () => {
                    fetchCollaborators();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [maletaId, fetchCollaborators]);

    return { collaborators, loading, error, refresh: fetchCollaborators };
};

export const useUserSearch = () => {
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const search = async (query: string, maletaId?: string) => {
        if (query.length < 3) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const data = await searchUsers(query, maletaId);
            setResults(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return { results, loading, search };
};

export const useInviteCollaborator = () => {
    const [loading, setLoading] = useState(false);

    const invite = async (maletaId: string, userId: string) => {
        setLoading(true);
        try {
            await inviteCollaborator(maletaId, userId);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        } finally {
            setLoading(false);
        }
    };

    return { invite, loading };
};

export const useMyInvitations = () => {
    const [invitations, setInvitations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchInvitations = async () => {
        try {
            setLoading(true);
            const data = await getMyInvitations();
            setInvitations(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvitations();
    }, []);

    const respond = async (id: string, status: 'accepted' | 'rejected') => {
        try {
            await respondToInvitation(id, status);
            fetchInvitations(); // Refresh list
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    return { invitations, loading, respond, refresh: fetchInvitations };
};

export const useIsCollaborator = (maletaId: string | undefined) => {
    const [isCollaborator, setIsCollaborator] = useState(false);
    const [status, setStatus] = useState<string | null>(null);

    useEffect(() => {
        const checkStatus = async () => {
            if (!maletaId) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data } = await supabase
                .from('maleta_collaborators')
                .select('status')
                .eq('maleta_id', maletaId)
                .eq('user_id', user.id)
                .single();

            if (data) {
                setIsCollaborator(true);
                setStatus(data.status);
            } else {
                setIsCollaborator(false);
                setStatus(null);
            }
        };

        checkStatus();
    }, [maletaId]);

    return { isCollaborator, status };
};
