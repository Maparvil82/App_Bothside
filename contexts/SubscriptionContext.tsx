import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired';

interface SubscriptionContextType {
    subscriptionStatus: SubscriptionStatus;
    hasSeenOnboarding: boolean;
    isLoading: boolean;
    setHasSeenOnboarding: (value: boolean) => Promise<void>;
    startTrial: () => Promise<void>;
    checkSubscriptionStatus: () => Promise<void>;
    restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export const useSubscription = () => useContext(SubscriptionContext);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none');
    const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial state
    useEffect(() => {
        loadState();
    }, [user]); // Re-check when user changes (e.g. login)

    const loadState = async () => {
        try {
            setIsLoading(true);

            // 1. Onboarding Status
            // LOGIC CHANGE: If user is logged in, valid, skip Onboarding (treat as seen).
            // If user is NOT logged in, Force Onboarding (treat as not seen).
            // This satisfies "Always appear if logged out".
            // We do NOT read from AsyncStorage anymore for this flag.

            if (user) {
                setHasSeenOnboardingState(true);

                // 2. Subscription Status (Only relevant if user exists)
                // TODO: Replace with real check
                const isTrial = await AsyncStorage.getItem('isTrialActive');
                if (isTrial === 'true') {
                    setSubscriptionStatus('trial');
                } else {
                    // STRICT MODE: Existing users must also go through Paywall if not subscribed
                    setSubscriptionStatus('none');
                }
            } else {
                setHasSeenOnboardingState(false);
                setSubscriptionStatus('none');
            }

        } catch (e) {
            console.error('Error loading subscription state:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const setHasSeenOnboarding = async (value: boolean) => {
        // In-memory update only. 
        // We do NOT persist to AsyncStorage so it resets on app restart/logout logic.
        console.log('📝 SubscriptionContext: setHasSeenOnboarding called with:', value);
        setHasSeenOnboardingState(value);
    };

    const startTrial = async () => {
        try {
            // 1. Logic to trigger StoreKit/RevenueCat purchase
            // 2. Verify receipt
            // 3. Update state
            await AsyncStorage.setItem('isTrialActive', 'true');
            setSubscriptionStatus('trial');
        } catch (e) {
            console.error('Error starting trial:', e);
            throw e;
        }
    };

    const restorePurchases = async () => {
        // Mock restore
        alert('Funcionalidad de restaurar en desarrollo');
    };

    const checkSubscriptionStatus = async () => {
        // Refresh status logic
        await loadState();
    };

    return (
        <SubscriptionContext.Provider
            value={{
                subscriptionStatus,
                hasSeenOnboarding,
                isLoading,
                setHasSeenOnboarding,
                startTrial,
                checkSubscriptionStatus,
                restorePurchases,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};
