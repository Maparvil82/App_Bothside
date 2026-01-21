import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useTheme } from '@react-navigation/native';
import { CreditService } from '../services/CreditService';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation, TxKeyPath } from '../src/i18n/useTranslation';

interface Package {
    id: string;
    credits: number;
    price: string;
    amount: number;
    nameKey: TxKeyPath;
}

const PACKAGES: Package[] = [
    { id: 'starter', credits: 50, price: '1.99€', amount: 50, nameKey: 'store_package_starter' },
    { id: 'pro', credits: 200, price: '5.99€', amount: 200, nameKey: 'store_package_pro' },
    { id: 'master', credits: 500, price: '12.99€', amount: 500, nameKey: 'store_package_master' },
];

export const AICreditsStoreScreen = () => {
    const navigation = useNavigation();
    const { colors } = useTheme();
    const { user, loadUserSubscriptionAndCredits } = useAuth();
    const [loading, setLoading] = useState<string | null>(null);
    const { t } = useTranslation();

    const handlePurchase = async (pkg: Package) => {
        if (!user) return;

        setLoading(pkg.id);
        console.log(`🛒 Simulating purchase of ${t(pkg.nameKey)}...`);

        // Simulation of delay and success
        setTimeout(async () => {
            const success = await CreditService.addCredits(user.id, pkg.amount);

            if (success) {
                await loadUserSubscriptionAndCredits(user.id); // Refresh context
                Alert.alert(t('store_purchase_success_title'), t('store_purchase_success_message').replace('{0}', pkg.credits.toString()));
                navigation.goBack();
            } else {
                Alert.alert(t('common_error'), t('store_purchase_error'));
            }
            setLoading(null);
        }, 1500);
    };

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
                        <Text style={styles.balanceValue}>{user?.creditsRemaining || 0} ⚡</Text>
                    </View>
                </View>

                <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('store_packages_title')}</Text>

                {PACKAGES.map((pkg) => (
                    <TouchableOpacity
                        key={pkg.id}
                        style={[styles.packageCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => handlePurchase(pkg)}
                        disabled={!!loading}
                    >
                        <View style={styles.packageInfo}>
                            <Text style={[styles.packageName, { color: colors.text }]}>{t(pkg.nameKey)}</Text>
                            <Text style={styles.packageCredits}>{pkg.credits} {t('store_credits_suffix')}</Text>
                        </View>

                        <View style={styles.priceButton}>
                            {loading === pkg.id ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <Text style={styles.priceText}>{pkg.price}</Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}

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
