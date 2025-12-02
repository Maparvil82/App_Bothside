import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { BothsideLoader } from '../components/BothsideLoader';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { analyzeAudio, AudioScanResult, AudioScanStatus } from '../modules/audioScan';
import { useTranslation } from '../src/i18n/useTranslation';

export const AudioScanScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { t } = useTranslation();

    const [status, setStatus] = useState<AudioScanStatus>('idle');
    const [result, setResult] = useState<AudioScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStartScan = async () => {
        setStatus('listening');
        setResult(null);
        setError(null);

        try {
            // Simular tiempo de escucha (2 segundos)
            await new Promise(resolve => setTimeout(resolve, 2000));

            setStatus('processing');

            // Llamada al servicio mock
            const scanResult = await analyzeAudio();

            setResult(scanResult);

            if (scanResult.inCollection) {
                setStatus('match');
            } else {
                setStatus('no_match');
            }

        } catch (err) {
            console.error("Scan failed:", err);
            setError(t('audio_scan_error_analysis'));
            setStatus('idle');
        }
    };

    const handleReset = () => {
        setStatus('idle');
        setResult(null);
        setError(null);
    };

    const renderContent = () => {
        switch (status) {
            case 'listening':
                return <BothsideLoader />;

            case 'processing':
                return <BothsideLoader />;

            case 'match':
                return (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>{t('audio_scan_found_title')}</Text>
                        <View style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 }]}>
                            <Ionicons name="checkmark-circle" size={48} color={colors.primary} style={{ marginBottom: 16 }} />
                            <Text style={[styles.trackName, { color: colors.text }]}>{result?.trackName}</Text>
                            <Text style={[styles.artistName, { color: colors.text }]}>{result?.artist}</Text>
                            <Text style={[styles.releaseName, { color: colors.text }]}>{result?.matchedRelease}</Text>
                            <Text style={[styles.confidence, { color: colors.primary }]}>
                                {t('audio_scan_confidence')} {result?.confidence ? Math.round(result.confidence * 100) : 0}%
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: colors.primary, marginTop: 32 }]}
                            onPress={handleReset}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.scanButtonText}>{t('audio_scan_button_scan_again')}</Text>
                        </TouchableOpacity>
                    </>
                );

            case 'no_match':
                return (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>{t('audio_scan_not_found_title')}</Text>
                        <View style={[styles.resultCard, { backgroundColor: colors.card }]}>
                            <Ionicons name="close-circle" size={48} color="#EF4444" style={{ marginBottom: 16 }} />
                            <Text style={[styles.description, { color: colors.text, marginBottom: 8 }]}>
                                {t('audio_scan_not_found_desc')}
                            </Text>
                            {result?.trackName && (
                                <Text style={[styles.possibleMatch, { color: colors.text }]}>
                                    {t('audio_scan_possible_match')} {result.trackName} - {result.artist}
                                </Text>
                            )}
                        </View>
                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: colors.primary, marginTop: 32 }]}
                            onPress={handleReset}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.scanButtonText}>{t('audio_scan_button_scan_again')}</Text>
                        </TouchableOpacity>
                    </>
                );

            case 'idle':
            default:
                return (
                    <>
                        <Text style={[styles.title, { color: colors.text }]}>{t('audio_scan_idle_title')}</Text>

                        <View style={styles.iconContainer}>
                            <Ionicons name="musical-notes" size={64} color={colors.primary} />
                        </View>

                        <Text style={[styles.description, { color: colors.text }]}>
                            {t('audio_scan_idle_desc')}
                        </Text>

                        <TouchableOpacity
                            style={[styles.scanButton, { backgroundColor: colors.primary }]}
                            onPress={handleStartScan}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.scanButtonText}>{t('audio_scan_button_start')}</Text>
                        </TouchableOpacity>

                        {error && (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{error}</Text>
                                <TouchableOpacity onPress={() => setError(null)}>
                                    <Text style={[styles.retryText, { color: colors.primary }]}>{t('common_retry')}</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </>
                );
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                    <Text style={[styles.backText, { color: colors.primary }]}>{t('common_back')}</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                {renderContent()}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    backText: {
        fontSize: 17,
        marginLeft: 4,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        marginTop: -60,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 32,
        textAlign: 'center',
    },
    loaderContainer: {
        marginBottom: 48,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 48,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 48,
        opacity: 0.8,
        lineHeight: 24,
    },
    scanButton: {
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    scanButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultCard: {
        padding: 24,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    trackName: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    artistName: {
        fontSize: 18,
        marginBottom: 4,
        textAlign: 'center',
        opacity: 0.9,
    },
    releaseName: {
        fontSize: 14,
        marginBottom: 16,
        textAlign: 'center',
        opacity: 0.7,
        fontStyle: 'italic',
    },
    confidence: {
        fontSize: 14,
        fontWeight: '600',
    },
    possibleMatch: {
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: 8,
        textAlign: 'center',
        opacity: 0.8,
    },
    errorContainer: {
        marginTop: 24,
        alignItems: 'center',
    },
    errorText: {
        color: '#EF4444',
        marginBottom: 8,
        textAlign: 'center',
    },
    retryText: {
        fontWeight: '600',
    },
});
