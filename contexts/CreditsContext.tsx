import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { CreditService } from '../services/CreditService';

interface CreditsContextType {
    credits: number;
    loading: boolean;
    refreshCredits: () => Promise<void>;
    deductCredit: (amount?: number) => Promise<boolean>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [credits, setCredits] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const refreshCredits = useCallback(async () => {
        if (!user) {
            setCredits(0);
            return;
        }

        try {
            const data = await CreditService.getUserCredits(user.id);
            if (data) {
                setCredits(data.remaining);
            }
        } catch (error) {
            console.error('❌ CreditsContext: Error fetching credits:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Initial load when user changes
    useEffect(() => {
        refreshCredits();
    }, [refreshCredits]);

    const deductCredit = async (amount: number = 1): Promise<boolean> => {
        if (!user) return false;

        // Optimistic update
        const previousCredits = credits;
        if (credits < amount) return false;

        setCredits(prev => Math.max(0, prev - amount));

        const success = await CreditService.deductCredits(user.id, amount);

        if (!success) {
            // Revert on failure
            setCredits(previousCredits);
            return false;
        }

        return true;
    };

    return (
        <CreditsContext.Provider value={{ credits, loading, refreshCredits, deductCredit }}>
            {children}
        </CreditsContext.Provider>
    );
};

export const useCredits = () => {
    const context = useContext(CreditsContext);
    if (context === undefined) {
        throw new Error('useCredits must be used within a CreditsProvider');
    }
    return context;
};
