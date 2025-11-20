import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export const AudioScanScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();

    const handleStartScan = () => {
        console.log("Audio scan started");
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                    <Text style={[styles.backText, { color: colors.primary }]}>Volver</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <Text style={[styles.title, { color: colors.text }]}>¿Qué está sonando?</Text>

                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={colors.primary} style={{ transform: [{ scale: 1.5 }] }} />
                </View>

                <Text style={[styles.description, { color: colors.text }]}>
                    Coloca el móvil cerca de la música para analizar lo que está sonando.
                </Text>

                <TouchableOpacity
                    style={[styles.scanButton, { backgroundColor: colors.primary }]}
                    onPress={handleStartScan}
                    activeOpacity={0.8}
                >
                    <Text style={styles.scanButtonText}>Iniciar escaneo</Text>
                </TouchableOpacity>
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
        marginTop: -60, // Ajuste visual para centrar mejor ópticamente
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        marginBottom: 48,
        textAlign: 'center',
    },
    loaderContainer: {
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
});
