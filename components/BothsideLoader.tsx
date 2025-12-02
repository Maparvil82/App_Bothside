import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Image } from "react-native";
import { useTranslation } from '../src/i18n/useTranslation';

interface BothsideLoaderProps {
    size?: 'small' | 'medium' | 'large';
    fullscreen?: boolean;
}

export const BothsideLoader = ({ size = 'large', fullscreen = true }: BothsideLoaderProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const { t } = useTranslation();

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 1.15,
                    duration: 600,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 600,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    const getLogoSize = () => {
        switch (size) {
            case 'small': return 24;
            case 'medium': return 48;
            default: return 70;
        }
    };

    const logoSize = getLogoSize();

    return (
        <View style={[
            styles.container,
            !fullscreen && styles.containerInline,
            fullscreen && styles.containerFullscreen
        ]}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Image
                    source={require("../assets/logo-bothside.png")}
                    style={[
                        styles.logo,
                        { width: logoSize, height: logoSize },
                        size === 'small' && { tintColor: '#fff' } // White for small loader (usually on buttons)
                    ]}
                    resizeMode="contain"
                />
            </Animated.View>

            {size !== 'small' && <Text style={styles.loadingText}>{t('common_loading_data')}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        justifyContent: "center",
        alignItems: "center",
    },
    containerFullscreen: {
        flex: 1,
        backgroundColor: "#fff",
    },
    containerInline: {
        padding: 5,
    },
    logo: {
        tintColor: "#000",
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: "#000",
        opacity: 0.7,
    },
});
