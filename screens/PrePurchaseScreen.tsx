import React, { useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase'; // Ajusta la ruta según tu proyecto

import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../src/i18n/useTranslation';

export const PrePurchaseScreen: React.FC = () => {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { user, selectedPlan } = route.params || {};
    const { loadUserSubscriptionAndCredits } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        console.log("Llega a PrePurchaseScreen", user, selectedPlan);
        iniciarProceso();
    }, []);

    const iniciarProceso = async () => {
        if (!user?.id) {
            Alert.alert(t('common_error'), t('pre_purchase_error_user_not_found'));
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
                    Alert.alert(t('common_error'), t('pre_purchase_error_trial_activation'));
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
                Alert.alert(t('common_error'), t('pre_purchase_error_trial_activation'));
                navigation.goBack();
            }
        }

        // 👉 3. Si es compra real → todavía no implementado
        Alert.alert(
            t('pre_purchase_alert_dev_mode_title'),
            t('pre_purchase_alert_dev_mode_message')
        );
        navigation.goBack();
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
                <Text style={styles.title}>{t('pre_purchase_status_preparing')}</Text>
                <Text style={styles.subtitle}>
                    {t('pre_purchase_label_selected_plan')} {selectedPlan === 'annual'
                        ? t('pricing_plan_annual_title')
                        : selectedPlan === 'trial'
                            ? t('pre_purchase_plan_trial')
                            : t('pricing_plan_monthly_title')}
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
