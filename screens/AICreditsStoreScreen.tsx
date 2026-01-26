import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useTheme } from '@react-navigation/native';
import { CreditService } from '../services/CreditService';
import PurchaseService from '../services/PurchaseService';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { useTranslation } from '../src/i18n/useTranslation';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PurchasesPackage } from 'react-native-purchases';

export const AICreditsStoreScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { credits, refreshCredits } = useCredits();
    const [loading, setLoading] = useState<string | null>(null);
    const [pageLoading, setPageLoading] = useState(true);
    const [packages, setPackages] = useState<PurchasesPackage[]>([]);
    const { t } = useTranslation();
    const { subscriptionStatus } = useSubscription();

    useEffect(() => {
        const loadPackages = async () => {
            try {
                const offerings = await PurchaseService.getCreditsOfferings();
                if (offerings && offerings.availablePackages.length > 0) {
                    setPackages(offerings.availablePackages);
                }
            } catch (e) {
                console.error('Error loading credit packages:', e);
            } finally {
                setPageLoading(false);
            }
        };
        loadPackages();
    }, []);

    const handlePurchase = async (pkg: PurchasesPackage) => {
        if (!user) return;

        // Business Rule: Disable extra credit purchase during Trial
        if (subscriptionStatus === 'trial') {
            Alert.alert(
                t('store_trial_restriction_title') || 'Periodo de Prueba',
                t('store_trial_restriction_message') || 'Espera a que se active tu suscripción completa para recargar créditos.'
            );
            return;
        }

        setLoading(pkg.identifier);
        try {
            const purchaseResult = await PurchaseService.purchasePackage(pkg);

            if (purchaseResult && purchaseResult.customerInfo) {
                // Determine credit amount from product identifier
                let amount = 0;
                if (pkg.product.identifier.includes('50')) amount = 50;
                else if (pkg.product.identifier.includes('200')) amount = 200;
                else if (pkg.product.identifier.includes('master')) amount = 500; // Assuming master is 500
                else amount = 50; // Fallback

                // Update database
                const success = await CreditService.addCredits(user.id, amount);

                if (success) {
                    await refreshCredits();
                    Alert.alert(t('store_purchase_success_title'), t('store_purchase_success_message').replace('{0}', amount.toString()));
                    navigation.goBack();
                } else {
                    Alert.alert('Error', 'Compra realizada pero hubo un error actualizando tu saldo. Contacta soporte.');
                }
            }
        } catch (e: any) {
            if (!e.userCancelled) {
                Alert.alert('Error', e.message || t('store_purchase_error'));
            }
        } finally {
            setLoading(null);
        }
    };

    if (pageLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={AppColors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>{t('store_title')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.hero}>
                    <Ionicons name="sparkles" size={60} color={AppColors.primary} />
                    <Text style={[styles.heroTitle, { color: colors.text }]}>{t('store_hero_title')}</Text>
                    <Text style={styles.heroSubtitle}>
                        {t('store_hero_subtitle')}
                    </Text>

                    <View style={styles.balanceContainer}>
                        <Text style={styles.balanceLabel}>{t('store_current_balance')}</Text>
                        <Text style={styles.balanceValue}>{credits} ⚡</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('store_packages_title')}</Text>

                {packages.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No hay paquetes disponibles.</Text>
                ) : (
                    packages.map((pkg) => (
                        <TouchableOpacity
                            key={pkg.identifier}
                            style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                            onPress={() => handlePurchase(pkg)}
                            disabled={!!loading}
                        >
                            <View style={styles.packageInfo}>
                                <Text style={[styles.packageName, { color: colors.text }]}>{pkg.product.title}</Text>
                                <Text style={styles.packageCredits}>{pkg.product.description}</Text>
                            </View>

                            <View style={styles.priceButton}>
                                {loading === pkg.identifier ? (
                                    <ActivityIndicator color="white" size="small" />
                                ) : (
                                    <Text style={styles.priceText}>{pkg.product.priceString}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))
                )}

                <Text style={styles.disclaimer}>
                    {t('store_disclaimer')}
                </Text>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        justifyContent: 'center',
        position: 'relative'
    },
    closeButton: {
        position: 'absolute',
        left: 20,
        padding: 5
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    content: {
        padding: 20,
        paddingBottom: 40
    },
    hero: {
        alignItems: 'center',
        marginBottom: 30,
        padding: 20,
    },
    heroTitle: {
        fontSize: 24,
        fontWeight: '800',
        marginTop: 15,
        marginBottom: 10,
        textAlign: 'center'
    },
    heroSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20
    },
    balanceContainer: {
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: 'rgba(0,100,255,0.1)',
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 20
    },
    balanceLabel: {
        fontSize: 12,
        color: AppColors.primary,
        fontWeight: '600',
        textTransform: 'uppercase'
    },
    balanceValue: {
        fontSize: 28,
        fontWeight: 'bold',
        color: AppColors.primary
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15
    },
    packageCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    packageInfo: {
        flex: 1
    },
    packageName: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4
    },
    packageCredits: {
        fontSize: 14,
        color: '#666'
    },
    priceButton: {
        backgroundColor: AppColors.primary,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center'
    },
    priceText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16
    },
    disclaimer: {
        textAlign: 'center',
        color: '#999',
        fontSize: 12,
        marginTop: 20
    }
});
