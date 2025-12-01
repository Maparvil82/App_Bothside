import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, SafeAreaView } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../src/i18n/useTranslation';

export const IaSubscriptionScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation();
    const { t } = useTranslation();
    const [subscription, setSubscription] = useState<any>(null);
    const [credits, setCredits] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadSubscriptionData = useCallback(async () => {
        if (!user) return;

        // No setear loading a true aquí para evitar parpadeos al volver a enfocar
        // Solo la primera vez si es necesario, o manejarlo con otro estado si se quiere spinner

        try {
            // 1. Obtener suscripción
            const { data: subData, error: subError } = await supabase
                .from("user_subscriptions")
                .select("plan_type, status, trial_end_at, current_period_end, provider")
                .eq("user_id", user.id)
                .single();

            if (subError && subError.code !== 'PGRST116') { // PGRST116 is 'Row not found' which is acceptable
                console.error("Error fetching subscription:", subError);
            }

            // 2. Obtener créditos
            const { data: creditData, error: creditError } = await supabase
                .from("ia_credits")
                .select("credits_total, credits_used, period_end")
                .eq("user_id", user.id)
                .single();

            if (creditError && creditError.code !== 'PGRST116') {
                console.error("Error fetching credits:", creditError);
            }

            setSubscription(subData);
            setCredits(creditData);

        } catch (error) {
            console.error("Error loading subscription data:", error);
            Alert.alert(t('common_error'), t('ia_sub_error_loading'));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useFocusEffect(
        useCallback(() => {
            loadSubscriptionData();
        }, [loadSubscriptionData])
    );

    const handleManageSubscription = () => {
        Alert.alert(t('ia_sub_alert_management_production'));
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{t('ia_sub_loading')}</Text>
                </View>
            </SafeAreaView>
        );
    }

    // Mapeo de nombre del plan
    let planName = t('ia_sub_plan_none');
    if (subscription?.plan_type === 'trial') planName = t('ia_sub_plan_trial');
    else if (subscription?.plan_type === 'monthly') planName = t('pricing_plan_monthly_title');
    else if (subscription?.plan_type === 'annual') planName = t('pricing_plan_annual_title');

    // Cálculos de créditos
    const totalCredits = credits?.credits_total || 0;
    const usedCredits = credits?.credits_used || 0;
    const remainingCredits = totalCredits - usedCredits;
    const progressPercentage = totalCredits > 0 ? (remainingCredits / totalCredits) * 100 : 0;

    // Fecha de renovación
    const renewalDate = subscription?.current_period_end
        ? new Date(subscription.current_period_end).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
        : '---';

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Bloque 1 — Estado del plan actual */}
                <View style={styles.card}>
                    <Text style={styles.cardLabel}>{t('ia_sub_label_current_plan')}</Text>
                    <Text style={styles.cardValue}>{planName}</Text>

                    <View style={styles.separator} />

                    <Text style={styles.cardLabel}>{t('ia_sub_label_available_credits')}</Text>
                    <Text style={styles.cardValue}>{totalCredits} {t('ia_sub_credits_total')}</Text>
                </View>

                {/* Bloque 2 — Créditos IA restantes (barra de progreso) */}
                <View style={styles.card}>
                    <View style={styles.creditsHeader}>
                        <Text style={styles.cardLabel}>{t('ia_sub_label_remaining_credits')}</Text>
                        <Text style={styles.creditsValue}>{remainingCredits} / {totalCredits}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={[styles.progressBarFill, { width: `${progressPercentage}%` }]} />
                    </View>

                    <Text style={styles.renewalText}>
                        {t('ia_sub_renewal_text')} {renewalDate}.
                    </Text>
                </View>

                {/* Bloque 3 — Descripción del sistema IA */}
                <Text style={styles.descriptionText}>
                    {t('ia_sub_description_1')}{'\n'}
                    {t('ia_sub_description_2')}{'\n'}
                    {t('ia_sub_description_3')}
                </Text>

                {/* Bloque 4 — Botón para ver gestión de suscripción */}
                <TouchableOpacity style={styles.button} onPress={handleManageSubscription}>
                    <Text style={styles.buttonText}>{t('ia_sub_button_manage')}</Text>
                </TouchableOpacity>

                {/* Bloque 5 — (Opcional pero recomendado) */}
                <Text style={styles.footerText}>
                    {t('ia_sub_footer_extra_credits')}
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#666',
        fontSize: 16,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
        alignItems: 'center',
        marginTop: 20,
    },
    title: {
        fontSize: 26,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 30,
        color: '#000000',
        textAlign: 'center',
    },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5E5',
        padding: 20,
        marginBottom: 20,
    },
    cardLabel: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 4,
    },
    cardValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E5E5',
        marginVertical: 12,
    },
    creditsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    creditsValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#007AFF',
    },
    progressBarContainer: {
        height: 12,
        backgroundColor: '#E8E8E8',
        borderRadius: 6,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 6,
    },
    renewalText: {
        fontSize: 12,
        color: '#888888',
    },
    descriptionText: {
        fontSize: 13,
        color: '#666666',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    button: {
        width: '100%',
        height: 50,
        backgroundColor: '#007AFF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footerText: {
        fontSize: 12,
        color: '#777777',
        textAlign: 'center',
    },
});
