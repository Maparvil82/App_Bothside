import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';

interface AiConsentModalProps {
    visible: boolean;
    onAccept: () => void;
    onDecline: () => void;
}

export const AiConsentModal: React.FC<AiConsentModalProps> = ({
    visible,
    onAccept,
    onDecline,
}) => {
    const { t } = useTranslation();

    const handleOpenPrivacy = () => {
        Linking.openURL('https://bothside.app/privacy-policy'); // Reemplazar con URL real de política de privacidad
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Ionicons name="sparkles" size={40} color={AppColors.primary} style={styles.icon} />

                    <Text style={styles.title}>{t('ai_consent_title')}</Text>

                    <Text style={styles.body}>{t('ai_consent_body')}</Text>

                    <Text style={styles.disclaimer}>{t('ai_consent_disclaimer')}</Text>

                    <TouchableOpacity style={styles.primaryButton} onPress={onAccept}>
                        <Text style={styles.primaryButtonText}>{t('ai_consent_accept')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onDecline}>
                        <Text style={styles.secondaryButtonText}>{t('ai_consent_decline')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.linkButton} onPress={handleOpenPrivacy}>
                        <Text style={styles.linkText}>{t('ai_consent_privacy_link')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '85%',
        backgroundColor: '#1E1E1E', // Dark mode elegant approach
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    icon: {
        marginBottom: 16,
    },
    title: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    body: {
        color: '#E0E0E0',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 22,
    },
    disclaimer: {
        color: '#A0A0A0',
        fontSize: 13,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 18,
    },
    primaryButton: {
        backgroundColor: AppColors.primary,
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#4A4A4A',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 20,
    },
    secondaryButtonText: {
        color: '#E0E0E0',
        fontSize: 16,
        fontWeight: '600',
    },
    linkButton: {
        paddingVertical: 8,
    },
    linkText: {
        color: AppColors.primary,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
