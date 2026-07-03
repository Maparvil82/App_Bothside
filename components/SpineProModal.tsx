import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';

interface SpineProModalProps {
    visible: boolean;
    onUpgrade: () => void;
    onClose: () => void;
}

export const SpineProModal: React.FC<SpineProModalProps> = ({
    visible,
    onUpgrade,
    onClose,
}) => {
    const { t } = useTranslation();

    if (!visible) return null;

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                {/* Golden/Premium Icon Badge */}
                <View style={styles.iconBadge}>
                    <Ionicons name="diamond" size={38} color="#F1C40F" />
                    <View style={styles.proLabelBadge}>
                        <Text style={styles.proLabelText}>PRO</Text>
                    </View>
                </View>

                {/* Title */}
                <Text style={styles.title}>{t('spines_pro_modal_title' as any)}</Text>

                {/* Description */}
                <Text style={styles.body}>{t('spines_pro_modal_desc' as any)}</Text>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={onUpgrade}>
                        <Text style={styles.primaryButtonText}>{t('spines_pro_modal_cta' as any)}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
                        <Text style={styles.secondaryButtonText}>{t('spines_pro_modal_cancel' as any)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#FAF9F6', // Cozy light theme background used in Bothside
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    container: {
        width: '100%',
        backgroundColor: '#FFFFFF', // Light background
        borderRadius: 24,
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E5E4E2', // Soft border
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
    },
    iconBadge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(241, 196, 21, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        position: 'relative',
        borderWidth: 1.5,
        borderColor: 'rgba(241, 196, 21, 0.3)',
    },
    proLabelBadge: {
        position: 'absolute',
        bottom: -2,
        backgroundColor: '#F1C40F',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#FFFFFF', // Matches the card's background
    },
    proLabelText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.8,
    },
    title: {
        color: '#1C1C1E', // Dark text
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 16,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    body: {
        color: '#636366', // Subtle dark gray body text
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        backgroundColor: AppColors.primary,
        width: '100%',
        paddingVertical: 15,
        borderRadius: 14,
        alignItems: 'center',
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: '#E5E4E2',
        width: '100%',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: '#8E8E93',
        fontSize: 15,
        fontWeight: '600',
    },
});
