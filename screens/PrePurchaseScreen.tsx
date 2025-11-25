import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';

export const PrePurchaseScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { user, selectedPlan } = route.params || {};

    useEffect(() => {
        console.log("Llega a PrePurchaseScreen", user, selectedPlan);
    }, [user, selectedPlan]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                <Text style={styles.title}>Preparando compra...</Text>
                <Text style={styles.subtitle}>
                    Plan seleccionado: {selectedPlan === 'annual' ? 'Anual' : 'Mensual'}
                </Text>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loader: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
});
