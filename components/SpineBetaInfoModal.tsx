import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';

interface SpineBetaInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

export const SpineBetaInfoModal: React.FC<SpineBetaInfoModalProps> = ({
    visible,
    onClose,
}) => {
    const { t } = useTranslation();

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.overlay}>
                <View style={styles.container}>
                    {/* Header Icon */}
                    <View style={styles.iconBadge}>
                        <Ionicons name="library" size={32} color={AppColors.primary} />
                        <View style={styles.miniBetaBadge}>
                            <Text style={styles.miniBetaText}>BETA</Text>
                        </View>
                    </View>

                    {/* Title */}
                    <Text style={styles.title}>{t('spines_beta_modal_title' as any)}</Text>

                    {/* Description */}
                    <Text style={styles.body}>{t('spines_beta_modal_intro' as any)}</Text>

                    {/* Tips Section */}
                    <View style={styles.tipsContainer}>
                        <Text style={styles.tipsTitle}>{t('spines_beta_modal_tips_title' as any)}</Text>
                        
                        <View style={styles.tipRow}>
                            <Text style={styles.tipText}>{t('spines_beta_modal_tip_light' as any)}</Text>
                        </View>

                        <View style={styles.tipRow}>
                            <Text style={styles.tipText}>{t('spines_beta_modal_tip_align' as any)}</Text>
                        </View>

                        <View style={styles.tipRow}>
                            <Text style={styles.tipText}>{t('spines_beta_modal_tip_focus' as any)}</Text>
                        </View>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity style={styles.primaryButton} onPress={onClose}>
                        <Text style={styles.primaryButtonText}>{t('spines_beta_modal_btn' as any)}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)', // Darker overlay for better camera backdrop contrast
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '88%',
        backgroundColor: '#1C1C1E', // Match standard iOS dark modal theme
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 12,
        elevation: 10,
    },
    iconBadge: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: 'rgba(255,255,255,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        position: 'relative',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    miniBetaBadge: {
        position: 'absolute',
        bottom: -2,
        right: -6,
        backgroundColor: AppColors.primary,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#1C1C1E',
    },
    miniBetaText: {
        color: '#FFF',
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    title: {
        color: '#FFF',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    body: {
        color: '#A0A0A2',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    tipsContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)',
    },
    tipsTitle: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 12,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    tipText: {
        color: '#D1D1D6',
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },
    primaryButton: {
        backgroundColor: AppColors.primary,
        width: '100%',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: AppColors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
