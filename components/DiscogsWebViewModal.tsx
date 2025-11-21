import React, { useState } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import { BothsideLoader } from './BothsideLoader';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@react-navigation/native';

interface DiscogsWebViewModalProps {
    visible: boolean;
    releaseId: number;
    onClose: () => void;
}

export const DiscogsWebViewModal: React.FC<DiscogsWebViewModalProps> = ({
    visible,
    releaseId,
    onClose,
}) => {
    const { colors } = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const discogsUrl = `https://www.discogs.com/release/${releaseId}`;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>
                        Discogs Release
                    </Text>
                    <TouchableOpacity
                        onPress={onClose}
                        style={styles.closeButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons name="close" size={28} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* WebView */}
                {!error ? (
                    <>
                        {loading && (
                            <View style={styles.loadingContainer}>
                                <BothsideLoader />
                                <Text style={[styles.loadingText, { color: colors.text }]}>
                                    Loading Discogs page...
                                </Text>
                            </View>
                        )}
                        <WebView
                            source={{ uri: discogsUrl }}
                            style={styles.webview}
                            onLoadStart={() => setLoading(true)}
                            onLoadEnd={() => setLoading(false)}
                            onError={() => {
                                setLoading(false);
                                setError(true);
                            }}
                            startInLoadingState={true}
                        />
                    </>
                ) : (
                    <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle-outline" size={64} color={colors.text} opacity={0.3} />
                        <Text style={[styles.errorText, { color: colors.text }]}>
                            Unable to load Discogs page. Please try again.
                        </Text>
                        <TouchableOpacity
                            onPress={onClose}
                            style={[styles.retryButton, { backgroundColor: colors.primary }]}
                        >
                            <Text style={styles.retryButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        position: 'absolute',
        right: 20,
        padding: 4,
    },
    webview: {
        flex: 1,
    },
    loadingContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        opacity: 0.7,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 30,
        opacity: 0.7,
    },
    retryButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
