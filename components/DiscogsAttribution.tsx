import React, { useState } from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { DiscogsWebViewModal } from './DiscogsWebViewModal';

interface DiscogsAttributionProps {
    releaseId: number;
}

/**
 * Discogs Attribution Component
 * 
 * Displays mandatory "Data provided by Discogs" attribution text.
 * Opens in-app WebView modal when tapped to show Discogs release page.
 * 
 * Required by Discogs API Terms of Service.
 */
export const DiscogsAttribution: React.FC<DiscogsAttributionProps> = ({ releaseId }) => {
    const { colors } = useTheme();
    const [showModal, setShowModal] = useState(false);

    return (
        <>
            <View style={styles.container}>
                <TouchableOpacity
                    onPress={() => setShowModal(true)}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.attributionText, { color: colors.text }]}>
                        Data provided by Discogs
                    </Text>
                </TouchableOpacity>
            </View>

            <DiscogsWebViewModal
                visible={showModal}
                releaseId={releaseId}
                onClose={() => setShowModal(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 8,
        alignItems: 'center',
    },
    attributionText: {
        fontSize: 12,
        opacity: 0.7,
        textAlign: 'center',
        // No underline - discrete appearance
        // Color will be theme-aware via colors.text with opacity
    },
});
