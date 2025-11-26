import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase'; // Ajusta la ruta según tu proyecto

import { useAuth } from '../contexts/AuthContext';

export const PrePurchaseScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { user, selectedPlan } = route.params || {};
    const { loadUserSubscriptionAndCredits } = useAuth();

    useEffect(() => {
        console.log("Llega a PrePurchaseScreen", user, selectedPlan);
        iniciarProceso();
    }, []);

    const iniciarProceso = async () => {
        if (!user?.id) {
            Alert.alert("Error", "No se encontró el usuario.");
            navigation.goBack();
            return;
        }

        // 👉 1. Si el plan es trial, llamamos a la RPC
        if (selectedPlan === "trial") {
            try {
                console.log("Llamando RPC TRIAL…");

                const { data, error } = await supabase.rpc(
                    "init_trial_subscription",
                    {
                        p_user_id: user.id
                    }
                );

                if (error) {
                    console.log("Error RPC:", error);
                    Alert.alert("Error", "No se pudo activar la prueba gratuita.");
                    navigation.goBack();
                    return;
                }

                console.log("Trial activado correctamente", data);

                // 👉 1.5 Cargar datos actualizados en el contexto
                await loadUserSubscriptionAndCredits(user.id);

                // 👉 2. Ir al Home y evitar volver al paywall
                navigation.reset({
                    index: 0,
                    routes: [{ name: "Main" }],
                });

                return;
            } catch (err) {
                console.log("Excepción:", err);
                Alert.alert("Error", "No se pudo activar la prueba gratuita.");
                navigation.goBack();
            }
        }

        // 👉 3. Si es compra real → todavía no implementado
        Alert.alert(
            "Modo desarrollo",
            "Las compras reales se activarán en producción."
        );
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                <Text style={styles.title}>Preparando compra...</Text>
                <Text style={styles.subtitle}>
                    Plan seleccionado: {selectedPlan === 'annual'
                        ? 'Anual'
                        : selectedPlan === 'trial'
                            ? 'Prueba gratuita'
                            : 'Mensual'}
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
