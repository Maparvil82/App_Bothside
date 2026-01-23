import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@react-navigation/native';

export const TypingIndicator: React.FC = () => {
    const { colors } = useTheme();
    const opacity1 = useRef(new Animated.Value(0.3)).current;
    const opacity2 = useRef(new Animated.Value(0.3)).current;
    const opacity3 = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        const animate = (anim: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 500,
                        delay,
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0.3,
                        duration: 500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animate(opacity1, 0);
        animate(opacity2, 200);
        animate(opacity3, 400);
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.dot, { opacity: opacity1, backgroundColor: colors.text }]} />
            <Animated.View style={[styles.dot, { opacity: opacity2, backgroundColor: colors.text }]} />
            <Animated.View style={[styles.dot, { opacity: opacity3, backgroundColor: colors.text }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        marginLeft: 16,
        height: 40,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 3,
    },
});
