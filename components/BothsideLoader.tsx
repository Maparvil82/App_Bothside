import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet, Image } from "react-native";

export const BothsideLoader = () => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

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

    return (
        <View style={styles.container}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <Image
                    source={require("../assets/logo-bothside.png")} // ← tu logo negro
                    style={styles.logo}
                    resizeMode="contain"
                />
            </Animated.View>

            <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff", // fondo blanco limpio
    },
    logo: {
        width: 70,
        height: 70,
        tintColor: "#000", // asegura que es negro
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: "#000",
        opacity: 0.7,
    },
});
