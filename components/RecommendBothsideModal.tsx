import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeMode } from '../contexts/ThemeContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { useRecommendBothside } from '../contexts/RecommendBothsideContext';
import { APP_STORE_URL } from '../config/env';

const { width } = Dimensions.get('window');

export const RecommendBothsideModal = () => {
    const { mode } = useThemeMode();
    const { t } = useTranslation();
    const {
        recommendModalVisible,
        handleRecommend,
        handleDismiss,
        handleNeverShowAgain
    } = useRecommendBothside();

    const handleShare = async () => {
        try {
            const shareText = t('recommend_share_text', { appStoreUrl: APP_STORE_URL });
            console.log('[RecommendBothsideModal] Sharing message:', shareText);
            const result = await Share.share({
                message: shareText,
            });

            if (result.action === Share.sharedAction) {
                console.log('[RecommendBothsideModal] Native share succeeded!');
                await handleRecommend();
            } else if (result.action === Share.dismissedAction) {
                console.log('[RecommendBothsideModal] Native share was dismissed.');
                // We still count it as dismissed/postponed
                handleDismiss();
            }
        } catch (error) {
            console.error('[RecommendBothsideModal] Error opening native share:', error);
            // Fallback: close modal even if share failed
            handleDismiss();
        }
    };

    if (!recommendModalVisible) return null;

    // Premium styling depending on clear/dark themes
    const isDark = mode === 'dark';
    const cardBgColor = isDark ? '#1C1C1E' : '#FFFFFF';
    const textColor = isDark ? '#FFFFFF' : '#1C1C1E';
    const subtextColor = isDark ? '#A1A1AA' : '#6B7280';
    const borderColor = isDark ? '#2C2C2E' : '#E5E5EA';
    const primaryBtnColor = isDark ? '#FF9F0A' : '#000000'; // Elegant orange for dark mode, sleek black for light mode
    const secondaryBtnBg = isDark ? '#2C2C2E' : '#F2F2F7';

    return (
        <Modal
            transparent
            visible={recommendModalVisible}
            animationType="fade"
            statusBarTranslucent
            onRequestClose={handleDismiss}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: cardBgColor, borderColor: borderColor }]}>
                    
                    {/* Premium Circle Icon Backdrop */}
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(255, 159, 10, 0.12)' : 'rgba(0, 0, 0, 0.05)' }]}>
                        <Ionicons 
                            name="share-social" 
                            size={44} 
                            color={isDark ? '#FF9F0A' : '#000000'} 
                        />
                    </View>

                    {/* Headline */}
                    <Text style={[styles.title, { color: textColor }]}>
                        {t('recommend_modal_title')}
                    </Text>

                    {/* Supporting Text */}
                    <Text style={[styles.message, { color: subtextColor }]}>
                        {t('recommend_modal_text')}
                    </Text>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        {/* Primary action */}
                        <TouchableOpacity
                            style={[styles.buttonPrimary, { backgroundColor: primaryBtnColor }]}
                            onPress={handleShare}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="logo-apple-appstore" size={18} color="#FFF" style={styles.buttonIcon} />
                            <Text style={styles.buttonTextPrimary}>
                                {t('recommend_modal_btn_primary')}
                            </Text>
                        </TouchableOpacity>

                        {/* Secondary action */}
                        <TouchableOpacity
                            style={[styles.buttonSecondary, { backgroundColor: secondaryBtnBg }]}
                            onPress={handleDismiss}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.buttonTextSecondary, { color: textColor }]}>
                                {t('recommend_modal_btn_secondary')}
                            </Text>
                        </TouchableOpacity>

                        {/* Tertiary action */}
                        <TouchableOpacity
                            style={styles.buttonTertiary}
                            onPress={handleNeverShowAgain}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.buttonTextTertiary}>
                                {t('recommend_modal_btn_tertiary')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: width * 0.88,
        borderRadius: 28,
        paddingHorizontal: 24,
        paddingTop: 32,
        paddingBottom: 20,
        alignItems: 'center',
        borderWidth: 1.5,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 12,
    },
    iconContainer: {
        marginBottom: 24,
        padding: 20,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 28,
        letterSpacing: -0.3,
    },
    message: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
        alignItems: 'center',
    },
    buttonPrimary: {
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    buttonTextPrimary: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.1,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonSecondary: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextSecondary: {
        fontSize: 15,
        fontWeight: '600',
    },
    buttonTertiary: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    buttonTextTertiary: {
        color: '#8E8E93',
        fontSize: 13,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
