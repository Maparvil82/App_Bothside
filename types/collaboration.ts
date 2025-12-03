import { Database } from './supabase';

export type MaletaCollaboratorStatus = 'pending' | 'accepted' | 'rejected';

export interface MaletaCollaborator {
    id: string;
    maleta_id: string;
    user_id: string;
    invited_by: string;
    status: MaletaCollaboratorStatus;
    created_at: string;
    updated_at: string;
}

export interface MaletaCollaboratorWithProfile extends MaletaCollaborator {
    profile: {
        id: string;
        username: string | null;
        avatar_url: string | null;
        full_name: string | null;
    } | null;
}

// Extend the existing Database type to include the new tables if they are missing
// This is a workaround since we can't regenerate types from the DB directly
export type ExtendedDatabase = Database & {
    public: {
        Tables: {
            maleta_collaborators: {
                Row: MaletaCollaborator;
                Insert: Omit<MaletaCollaborator, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<MaletaCollaborator, 'id' | 'created_at' | 'updated_at'>>;
            };
            // We assume user_maletas already exists but we need to ensure is_collaborative is recognized
            // if we were strictly typing it, but for now we might just cast or extend if needed.
        };
    };
};
