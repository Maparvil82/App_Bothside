import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Share, ImageBackground, SafeAreaView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '../src/i18n/useTranslation';
import { useRecommendBothside } from '../contexts/RecommendBothsideContext';
import { APP_STORE_URL } from '../config/env';

export const RecommendBothsideModal = () => {
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
                handleDismiss();
            }
        } catch (error) {
            console.error('[RecommendBothsideModal] Error opening native share:', error);
            handleDismiss();
        }
    };

    if (!recommendModalVisible) return null;

    return (
        <Modal
            transparent
            visible={recommendModalVisible}
            animationType="slide"
            statusBarTranslucent
            onRequestClose={handleDismiss}
        >
            {/* Dark semi-transparent backdrop */}
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={handleDismiss}
            >
                {/* Bottom Sheet Container */}
                <TouchableOpacity
                    activeOpacity={1}
                    style={styles.sheetContainer}
                >
                    <ImageBackground
                        source={require('../assets/compart.png')}
                        style={styles.sheetBackground}
                        resizeMode="cover"
                    >
                        {/* Overlay covering only the sheet background for readability */}
                        <View style={styles.sheetOverlay}>
                            <SafeAreaView style={styles.safeArea}>
                                <View style={styles.contentContainer}>

                                    {/* Top section: Handle + Title + Subtitle */}
                                    <View style={styles.topContainer}>
                                        {/* Bottom sheet drag handle indicator */}
                                        <View style={styles.dragHandle} />

                                        {/* Headline */}
                                        <Text style={styles.title}>
                                            {t('recommend_modal_title')}
                                        </Text>

                                        {/* Supporting Text */}
                                        <Text style={styles.message}>
                                            {t('recommend_modal_text')}
                                        </Text>
                                    </View>

                                    {/* Bottom section: Action Buttons */}
                                    <View style={styles.buttonContainer}>
                                        {/* Primary action */}
                                        <TouchableOpacity
                                            style={styles.buttonPrimary}
                                            onPress={handleShare}
                                            activeOpacity={0.9}
                                        >
                                            <Ionicons name="share-social-outline" size={18} color="#000" style={styles.buttonIcon} />
                                            <Text style={styles.buttonTextPrimary}>
                                                {t('recommend_modal_btn_primary')}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Secondary action */}
                                        <TouchableOpacity
                                            style={styles.buttonSecondary}
                                            onPress={handleDismiss}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.buttonTextSecondary}>
                                                {t('recommend_modal_btn_secondary')}
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Tertiary action */}
                                        <TouchableOpacity
                                            style={styles.buttonTertiary}
                                            onPress={handleNeverShowAgain}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.buttonTextTertiary}>
                                                {t('recommend_modal_btn_tertiary')}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </SafeAreaView>
                        </View>
                    </ImageBackground>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', // Dim backdrop showing the screen behind the sheet
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        width: '100%',
        height: Dimensions.get('window').height * 0.7, // Cover ~72% height of screen like a standard sheet
        borderTopLeftRadius: 36,
        borderTopRightRadius: 36,
        overflow: 'hidden', // Enforces rounded corners on child background
    },
    sheetBackground: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    sheetOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.65)', // Ensure superb readability of white text
        justifyContent: 'flex-end',
    },
    safeArea: {
        flex: 1,
        width: '100%',
    },
    contentContainer: {
        flex: 1,
        paddingHorizontal: 28,
        paddingBottom: 28,
        paddingTop: 16,
        width: '100%',
        justifyContent: 'space-between', // Spaces topContainer (top) and buttonContainer (bottom) perfectly
    },
    topContainer: {
        width: '100%',
    },
    dragHandle: {
        width: 44,
        height: 5,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
        alignSelf: 'center',
        marginBottom: 28,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
        textAlign: 'left',
        lineHeight: 34,
        letterSpacing: -0.6,
    },
    message: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.85)',
        textAlign: 'left',
        lineHeight: 22,
        fontWeight: '400',
        marginBottom: 16,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
    },
    buttonPrimary: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        paddingVertical: 15,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonTextPrimary: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    buttonIcon: {
        marginRight: 8,
    },
    buttonSecondary: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        paddingVertical: 15,
        borderRadius: 14,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonTextSecondary: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    buttonTertiary: {
        paddingVertical: 8,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    buttonTextTertiary: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 13,
        fontWeight: '500',
        textDecorationLine: 'underline',
    },
});
