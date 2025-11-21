import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Image, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface BothsideLoaderProps {
    size?: 'small' | 'large' | number;
    fullscreen?: boolean;
    backgroundColor?: string;
}

export const BothsideLoader = ({
    size = 'large',
    fullscreen = true,
    backgroundColor = '#ffffffff'
}: BothsideLoaderProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 0.6,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.6,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 0.4,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.4,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );

        pulse.start();

        return () => pulse.stop();
    }, [scaleAnim, opacityAnim]);

    const getImageSize = () => {
        if (typeof size === 'number') return size;
        return size === 'small' ? 40 : 120;
    };

    const imageSize = getImageSize();

    const containerStyle = fullscreen ? [
        styles.fullscreenContainer,
        { backgroundColor }
    ] : [
        styles.inlineContainer,
        { backgroundColor: backgroundColor === '#fcfcfcff' ? 'transparent' : backgroundColor }
    ];

    return (
        <View style={containerStyle}>
            <Animated.View
                style={[
                    styles.imageContainer,
                    {
                        width: imageSize,
                        height: imageSize,
                        transform: [{ scale: scaleAnim }],
                        opacity: opacityAnim,
                    },
                ]}
            >
                <Image
                    source={require('../assets/logo-bothside.png')}
                    style={styles.image}
                    resizeMode="contain"
                />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    fullscreenContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: width,
        height: height,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    inlineContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    image: {
        width: '100%',
        height: '100%',
    },
});
