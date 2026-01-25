import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';

export type SubscriptionStatus = 'none' | 'trial' | 'active' | 'expired';

interface SubscriptionContextType {
    subscriptionStatus: SubscriptionStatus;
    hasSeenOnboarding: boolean;
    isLoading: boolean;
    setHasSeenOnboarding: (value: boolean) => Promise<void>;
    purchasePackage: (pkg: PurchasesPackage) => Promise<void>;
    checkSubscriptionStatus: () => Promise<void>;
    restorePurchases: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({} as SubscriptionContextType);

export const useSubscription = () => useContext(SubscriptionContext);

import { PurchasesPackage } from 'react-native-purchases';
import PurchaseService from '../services/PurchaseService';

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('none');
    const [hasSeenOnboarding, setHasSeenOnboardingState] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Load initial state
    useEffect(() => {
        // Init RC
        PurchaseService.init();
    }, []);

    useEffect(() => {
        loadState();
    }, [user]);

    const loadState = async () => {
        try {
            setIsLoading(true);

            if (user) {
                setHasSeenOnboardingState(true);
                // Check RC status
                await checkSubscriptionStatus();
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
        console.log('📝 SubscriptionContext: setHasSeenOnboarding called with:', value);
        setHasSeenOnboardingState(value);
    };

    const purchasePackage = async (pkg: PurchasesPackage): Promise<void> => {
        try {
            const result = await PurchaseService.purchasePackage(pkg);
            // Check if purchase was successful and entitlement is active
            // We check for ANY active entitlement for now as we don't know the exact ID
            const activeEntitlements = result?.customerInfo?.entitlements.active || {};
            const isActive = Object.keys(activeEntitlements).length > 0;

            if (isActive) {
                setSubscriptionStatus('active');
            }
        } catch (e) {
            console.error('Error purchasing package:', e);
            throw e;
        }
    };

    const restorePurchases = async () => {
        try {
            const info = await PurchaseService.restorePurchases();
            const activeEntitlements = info?.entitlements.active || {};
            const isActive = Object.keys(activeEntitlements).length > 0;

            if (isActive) {
                setSubscriptionStatus('active');
                alert('Compras restauradas con éxito');
            } else {
                alert('No se encontraron compras activas para restaurar');
            }
        } catch (e) {
            console.error('Error restoring purchases:', e);
            alert('Error al restaurar compras');
        }
    };

    const checkSubscriptionStatus = async () => {
        if (!user) return;

        // 1. Check Supabase Status (Unified Truth)
        // If AuthContext says we are premium (from user_subscriptions), we trust it.
        // We cast to any or check property safely because Typescript might not see isPremium on generic User
        const isSupabasePremium = (user as any).isPremium === true;

        if (isSupabasePremium) {
            console.log('✅ SubscriptionContext: User is premium via Supabase');
            setSubscriptionStatus('active');
            // We still sync with RC in background if needed, but for now we grant access
            return;
        }

        // 2. Check RevenueCat Status
        try {
            const info = await PurchaseService.getCustomerInfo();
            const activeEntitlements = info?.entitlements.active || {};
            const isActive = Object.keys(activeEntitlements).length > 0;

            if (isActive) {
                console.log('✅ SubscriptionContext: User is premium via RevenueCat');
                setSubscriptionStatus('active');
            } else {
                console.log('ℹ️ SubscriptionContext: User is NOT premium');
                setSubscriptionStatus('none');
            }
        } catch (e) {
            console.error('Error checking subscription status:', e);
            // If API fails, we default to none, unless Supabase said yes (handled above)
            setSubscriptionStatus('none');
        }
    };

    return (
        <SubscriptionContext.Provider
            value={{
                subscriptionStatus,
                hasSeenOnboarding,
                isLoading,
                setHasSeenOnboarding,
                purchasePackage,
                checkSubscriptionStatus,
                restorePurchases,
            }}
        >
            {children}
        </SubscriptionContext.Provider>
    );
};
