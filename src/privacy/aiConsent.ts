import AsyncStorage from '@react-native-async-storage/async-storage';

const CONSENT_KEY = 'ai_consent';
const ENABLED_KEY = 'ai_enabled';

/**
 * Returns true if the user has explicitly consented to use AI features.
 */
export const getAiConsent = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(CONSENT_KEY);
        return value === '1';
    } catch (error) {
        console.warn('Error reading AI consent:', error);
        return false;
    }
};

/**
 * Sets the AI consent flag.
 */
export const setAiConsent = async (value: boolean): Promise<void> => {
    try {
        await AsyncStorage.setItem(CONSENT_KEY, value ? '1' : '0');
    } catch (error) {
        console.warn('Error setting AI consent:', error);
    }
};

/**
 * Returns true if the AI feature is currently enabled by the user in Settings.
 * Normally this implies consent was given, unless revoked.
 */
export const getAiEnabled = async (): Promise<boolean> => {
    try {
        const value = await AsyncStorage.getItem(ENABLED_KEY);
        // If not set, we default to false until consent is given for the FIRST time, 
        // but here we strictly read the flag.
        return value === '1';
    } catch (error) {
        console.warn('Error reading AI enabled state:', error);
        return false;
    }
};

/**
 * Sets the AI enabled flag.
 */
export const setAiEnabled = async (value: boolean): Promise<void> => {
    try {
        await AsyncStorage.setItem(ENABLED_KEY, value ? '1' : '0');
    } catch (error) {
        console.warn('Error setting AI enabled state:', error);
    }
};

/**
 * Ensures AI is allowed before an action. 
 * Resolves to true if allowed, or false if not allowed (e.g. disabled from settings without showing modal).
 * If consent hasn't been given, caller is responsible for showing the modal and awaiting the user choice, 
 * or this function could theoretically handle the prompt (but we prefer to handle UI in the component).
 * 
 * We will return a state so the caller knows what to do.
 */
export const checkAiAllowedState = async (): Promise<{ allowed: boolean; needsConsentPrompt: boolean }> => {
    const hasConsent = await getAiConsent();
    const isEnabled = await getAiEnabled();

    // If both are true, we are good to go.
    if (hasConsent && isEnabled) {
        return { allowed: true, needsConsentPrompt: false };
    }

    // If no consent has been given (or revoked), we need to prompt or rely on the caller's logic.
    // Actually, if it was disabled explicitly, we just say not allowed, unless they want to prompt to re-enable.
    // The simplest flow:
    // If no consent -> needsConsentPrompt = true
    if (!hasConsent) {
        return { allowed: false, needsConsentPrompt: true };
    }

    // If has consent but disabled in settings -> not allowed, no prompt (tell user to go to settings).
    return { allowed: false, needsConsentPrompt: false };
};
