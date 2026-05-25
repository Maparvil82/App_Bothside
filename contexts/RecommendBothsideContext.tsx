import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserCollectionService } from '../services/database';
import { useAuth } from './AuthContext';

interface RecommendBothsideContextType {
    recommendModalVisible: boolean;
    checkRecommendationTrigger: () => Promise<void>;
    handleRecommend: () => Promise<void>;
    handleDismiss: () => void;
    handleNeverShowAgain: () => Promise<void>;
}

const RecommendBothsideContext = createContext<RecommendBothsideContextType | undefined>(undefined);

export const RecommendBothsideProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [recommendModalVisible, setRecommendModalVisible] = useState(false);
    const [sessionDismissed, setSessionDismissed] = useState(false);
    const isChecking = useRef(false);

    const checkRecommendationTrigger = useCallback(async () => {
        if (!user) {
            console.log('[RecommendBothside] No authenticated user. Bailing out.');
            return;
        }

        // Avoid parallel checks or duplicate triggers
        if (isChecking.current || recommendModalVisible) {
            console.log('[RecommendBothside] Already checking or modal is visible. Bailing out.');
            return;
        }

        isChecking.current = true;

        try {
            // 1. Check persistent preference "never show again"
            const neverShow = await AsyncStorage.getItem('bothside_recommend_never_show');
            if (neverShow === 'true') {
                console.log('[RecommendBothside] User opted to "never show again". Bailing out.');
                return;
            }

            // 2. Check persistent preference "already shown"
            const alreadyShown = await AsyncStorage.getItem('bothside_recommend_shown');
            if (alreadyShown === 'true') {
                console.log('[RecommendBothside] Modal has already been shown in a previous session. Bailing out.');
                return;
            }

            // 3. Check session dismissal state
            if (sessionDismissed) {
                console.log('[RecommendBothside] Modal dismissed for this session. Bailing out.');
                return;
            }

            // 4. Calculate number of discs in user collection
            console.log('[RecommendBothside] Checking collection count for user:', user.id);
            const count = await UserCollectionService.getUserCollectionCount(user.id);
            console.log('[RecommendBothside] Current collection count:', count);

            // 5. Trigger modal only if they just reached exactly 4 discs
            if (count === 4) {
                console.log('[RecommendBothside] Trigger criteria met (4 discs)! Showing modal...');
                setRecommendModalVisible(true);
            }
        } catch (error) {
            console.error('[RecommendBothside] Error checking trigger:', error);
        } finally {
            isChecking.current = false;
        }
    }, [user, recommendModalVisible, sessionDismissed]);

    const handleRecommend = useCallback(async () => {
        setRecommendModalVisible(false);
        try {
            // Persist the shown state so they never see it again
            await AsyncStorage.setItem('bothside_recommend_shown', 'true');
        } catch (error) {
            console.error('[RecommendBothside] Error saving shown state:', error);
        }
    }, []);

    const handleDismiss = useCallback(() => {
        console.log('[RecommendBothside] Dismissed for the current session.');
        setRecommendModalVisible(false);
        setSessionDismissed(true);
    }, []);

    const handleNeverShowAgain = useCallback(async () => {
        console.log('[RecommendBothside] Dismissed permanently.');
        setRecommendModalVisible(false);
        try {
            await AsyncStorage.setItem('bothside_recommend_never_show', 'true');
        } catch (error) {
            console.error('[RecommendBothside] Error saving never show state:', error);
        }
    }, []);

    return (
        <RecommendBothsideContext.Provider
            value={{
                recommendModalVisible,
                checkRecommendationTrigger,
                handleRecommend,
                handleDismiss,
                handleNeverShowAgain,
            }}
        >
            {children}
        </RecommendBothsideContext.Provider>
    );
};

export const useRecommendBothside = () => {
    const context = useContext(RecommendBothsideContext);
    if (context === undefined) {
        throw new Error('useRecommendBothside must be used within a RecommendBothsideProvider');
    }
    return context;
};
