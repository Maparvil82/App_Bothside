import { supabase } from '../lib/supabase';

export interface Session {
    id: string;
    name: string;
    date: string;
    tag?: string;
    created_at?: string;
}

export const SessionService = {
    /**
     * Fetch all sessions for the current user, ordered by date descending
     */
    async getAllSessions() {
        const { data, error } = await supabase
            .from('sessions')
            .select('id, name, date, tag')
            .order('date', { ascending: false });

        if (error) throw error;
        return data as Session[];
    },

    /**
     * Fetch sessions where a specific album was played
     */
    /**
     * Fetch sessions where a specific album was played
     * Uses manual join to avoid PGRST200 error due to missing/unrecognized FK
     */
    async getSessionsForAlbum(albumId: string) {
        // 1. Get the links (session_ids)
        const { data: links, error: linkError } = await supabase
            .from('session_albums')
            .select('id, session_id')
            .eq('album_id', albumId);

        if (linkError) throw linkError;

        if (!links || links.length === 0) return [];

        const sessionIds = links.map((l: any) => l.session_id);

        // 2. Get the session details for those IDs
        const { data: sessions, error: sessionError } = await supabase
            .from('sessions')
            .select('id, name, date, tag')
            .in('id', sessionIds)
            .order('date', { ascending: false });

        if (sessionError) throw sessionError;

        // 3. Merge results to include link_id (needed for deletion)
        return sessions.map((session: any) => {
            const link = links.find((l: any) => l.session_id === session.id);
            return {
                ...session,
                link_id: link?.id
            };
        });
    },

    /**
     * Link an album to a session
     */
    async addAlbumToSession(albumId: string, sessionId: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('session_albums')
            .insert({
                album_id: albumId,
                session_id: sessionId,
                user_id: user.id
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Remove an album from a session
     */
    async removeAlbumFromSession(albumId: string, sessionId: string) {
        const { error } = await supabase
            .from('session_albums')
            .delete()
            .eq('album_id', albumId)
            .eq('session_id', sessionId);

        if (error) throw error;
    }
};
