import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Dimensions, Linking, Platform } from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import PurchaseService from '../services/PurchaseService';
import { useTheme } from '@react-navigation/native';
import { translate } from '../src/i18n';
import { ENV } from '../config/env';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnalyticsService } from '../services/analytics';
import { FREE_COLLECTION_LIMIT } from '../config/features';

// Compatibility alias to match the code style I just wrote
const i18n = { t: translate };

const { width } = Dimensions.get('window');

export const PaywallScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();
    const { subscriptionStatus, purchasePackage, restorePurchases } = useSubscription();
    const isCollectionLimit = route.params?.source === 'collection_limit';
    const [loading, setLoading] = useState(false);
    const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

    useEffect(() => {
        if (subscriptionStatus === 'active' && user) {
            navigation.goBack();
        }
    }, [subscriptionStatus, user, navigation]);

    const showAndroidDiagnostic = async (errorObj?: any) => {
        try {
            const apiKey = ENV.REVENUECAT_API_KEY_ANDROID;
            const keyPrefix = apiKey ? apiKey.substring(0, 5) : 'empty';
            const keyLength = apiKey ? apiKey.length : 0;

            let nativeOfferings = null;
            let fetchErrorMsg = '';
            try {
                nativeOfferings = await Purchases.getOfferings();
            } catch (e: any) {
                fetchErrorMsg = `FetchError: ${e.code || 'unknown'} - ${e.message || e}`;
            }

            const currentId = nativeOfferings?.current?.identifier || 'null';
            const currentPackagesLength = nativeOfferings?.current?.availablePackages?.length || 0;
            const allKeys = nativeOfferings ? Object.keys(nativeOfferings.all) : [];

            let packagesDetails = '';
            if (nativeOfferings?.current?.availablePackages) {
                packagesDetails = nativeOfferings.current.availablePackages
                    .map((pkgItem: any) => `- ${pkgItem.identifier} / ${pkgItem.product?.identifier} / ${pkgItem.product?.priceString}`)
                    .join('\n');
            }

            const errDetails = errorObj
                ? `Err: ${errorObj.code || 'unknown'} - ${errorObj.message || errorObj}`
                : fetchErrorMsg || 'None';

            const diagnosticMessage = [
                `Platform: ${Platform.OS}`,
                `API Key Prefix: ${keyPrefix}`,
                `API Key Length: ${keyLength}`,
                `Current ID: ${currentId}`,
                `Current Pkgs Count: ${currentPackagesLength}`,
                `All Offering Keys: [${allKeys.join(', ')}]`,
                `Packages:\n${packagesDetails || 'None'}`,
                `Errors: ${errDetails}`
            ].join('\n\n');

            Alert.alert('Diagnóstico Temporal Android', diagnosticMessage);
        } catch (diagErr: any) {
            Alert.alert('Error en Diagnóstico', diagErr.message);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            AnalyticsService.track('paywall_shown');
        }, [])
    );

    useEffect(() => {
        const loadOfferings = async () => {
            const offerings = await PurchaseService.getOfferings();
            if (offerings && offerings.availablePackages.length > 0) {
                // Assuming the first package is the Annual one or the one we want to show
                setPkg(offerings.availablePackages[0]);
            }
        };
        loadOfferings();
    }, []);

    const handleSubscribe = async () => {
        if (!pkg) {
            Alert.alert('Error', 'No se ha podido cargar la información del plan.');
            return;
        }
        setLoading(true);
        try {
            await purchasePackage(pkg);
            // Context updates status to active, which should trigger navigation or we manually navigate
            if (user) {
                navigation.goBack();
            } else {
                navigation.replace('Login', { isSignUp: true });
            }
        } catch (error: any) {
            if (!error.userCancelled) {
                Alert.alert(i18n.t('pricing_error_title'), error.message || i18n.t('pricing_error_trial'));
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        setLoading(true);
        await restorePurchases();
        setLoading(false);
    };

    const openLink = async (url: string) => {
        const supported = await Linking.canOpenURL(url);
        if (supported) {
            await Linking.openURL(url);
        } else {
            Alert.alert("Error", "No se pudo abrir el enlace: " + url);
        }
    };

    const priceString = pkg?.product.priceString || i18n.t('pricing_price_annual');
    const yearlyPriceText = i18n.t('paywall_price_per_year').replace('{0}', priceString);
    const afterTrialText = i18n.t('paywall_after_trial').replace('{0}', yearlyPriceText);

    return (
        <View style={styles.container}>
            {/* Background Image / Gradient */}
            <Image
                source={require('../assets/wall_1.png')}
                style={styles.backgroundImage}
            />
            <LinearGradient
                colors={['rgba(255, 255, 255, 0.7)', '#FFFFFF']}
                style={styles.gradient}
            />

            <SafeAreaView style={styles.contentContainer} edges={['top', 'bottom']}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent} 
                    showsVerticalScrollIndicator={false}
                >
                    {/* Group 1: Close Button & Hero Header (keeps them close at the top) */}
                    <View>
                        <View style={styles.topHeader}>
                            {user ? (
                                <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
                                    <Ionicons name="close-outline" size={24} color="#1A2530" />
                                </TouchableOpacity>
                            ) : (
                                <View style={{ width: 40, height: 40 }} />
                            )}
                        </View>

                        {/* Hero Header */}
                        <View style={styles.header}>
                            {isCollectionLimit && (
                                <Text style={styles.limitReachedLabel}>
                                    {i18n.t('paywall_reached_limit_label').replace('{{freeLimit}}', String(FREE_COLLECTION_LIMIT))}
                                </Text>
                            )}
                            <View style={styles.proBadge}>
                                <Ionicons name="sparkles" size={12} color="#D4AF37" style={{ marginRight: 4 }} />
                                <Text style={styles.proBadgeText}>PRO</Text>
                            </View>
                            <Text style={styles.title}>
                                {isCollectionLimit ? i18n.t('paywall_limit_title_continue') : i18n.t('paywall_limit_title')}
                            </Text>
                            <Text style={styles.subtitle}>
                                {i18n.t('paywall_limit_subtitle')}
                            </Text>
                        </View>
                    </View>

                    {/* Pro Features Showcase */}
                    <View style={styles.featuresContainer}>
                        <FeatureItem
                            icon="disc-outline"
                            title={i18n.t('paywall_feat_1_title')}
                            description={i18n.t('paywall_feat_1_desc')}
                        />
                        <FeatureItem
                            icon="grid-outline"
                            title={i18n.t('paywall_feat_2_title')}
                            description={i18n.t('paywall_feat_2_desc')}
                        />
                        <FeatureItem
                            icon="briefcase-outline"
                            title={i18n.t('paywall_feat_3_title')}
                            description={i18n.t('paywall_feat_3_desc')}
                        />
                        <FeatureItem
                            icon="scan-outline"
                            title={i18n.t('paywall_feat_4_title')}
                            description={i18n.t('paywall_feat_4_desc')}
                        />
                    </View>

                    {/* Premium Subscription Offer Card */}
                    <View style={styles.offerCard}>
                        <View style={styles.offerCardBadge}>
                            <Text style={styles.offerCardBadgeText}>ACCESO COMPLETO</Text>
                        </View>
                        <Text style={styles.planSubtitle}>{i18n.t('paywall_pro_plan')}</Text>
                        <Text style={styles.trialText}>{i18n.t('paywall_pro_trial_v2')}</Text>
                        <Text style={styles.price}>{i18n.t('paywall_pro_price_after_trial').replace('{0}', yearlyPriceText)}</Text>
                    </View>

                    {/* Action & Legal Footer */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[
                                styles.button,
                                loading && styles.buttonDisabled,
                                (!pkg && !loading) && { backgroundColor: '#FF453A' } // Red for error/retry
                            ]}
                            onPress={!pkg ? async () => {
                                setLoading(true);
                                let offeringsObj: any = null;
                                let errorObj: any = null;
                                try {
                                    if (Platform.OS === 'android') {
                                        try {
                                            offeringsObj = await Purchases.getOfferings();
                                        } catch (err) {
                                            console.error('Error fetching offerings directly:', err);
                                        }
                                    }

                                    const offerings = await PurchaseService.getOfferings();
                                    if (offerings && offerings.availablePackages.length > 0) {
                                        setPkg(offerings.availablePackages[0]);
                                    } else {
                                        if (Platform.OS === 'android') {
                                            const apiKey = ENV.REVENUECAT_API_KEY_ANDROID || '';
                                            const keyPrefix = apiKey ? apiKey.substring(0, 5) : 'empty';
                                            const keyLength = apiKey ? apiKey.length : 0;

                                            const currentId = offeringsObj?.current?.identifier || 'null';
                                            const currentPkgsLen = offeringsObj?.current?.availablePackages?.length || 0;
                                            const allKeys = offeringsObj?.all ? Object.keys(offeringsObj.all) : [];

                                            Alert.alert(
                                                "RC DEBUG",
                                                `Platform.OS: ${Platform.OS}\n` +
                                                `API key prefix: ${keyPrefix}\n` +
                                                `API key length: ${keyLength}\n` +
                                                `offerings.current?.identifier: ${currentId}\n` +
                                                `offerings.current?.availablePackages?.length: ${currentPkgsLen}\n` +
                                                `Object.keys(offerings.all): [${allKeys.join(', ')}]\n` +
                                                `error.code: null\n` +
                                                `error.message: null`
                                            );
                                        }
                                        Alert.alert('Error', 'No se encontraron planes disponibles.');
                                    }
                                } catch (e: any) {
                                    errorObj = e;
                                    if (Platform.OS === 'android') {
                                        const apiKey = ENV.REVENUECAT_API_KEY_ANDROID || '';
                                        const keyPrefix = apiKey ? apiKey.substring(0, 5) : 'empty';
                                        const keyLength = apiKey ? apiKey.length : 0;

                                        const currentId = offeringsObj?.current?.identifier || 'null';
                                        const currentPkgsLen = offeringsObj?.current?.availablePackages?.length || 0;
                                        const allKeys = offeringsObj?.all ? Object.keys(offeringsObj.all) : [];

                                        Alert.alert(
                                            "RC DEBUG",
                                            `Platform.OS: ${Platform.OS}\n` +
                                            `API key prefix: ${keyPrefix}\n` +
                                            `API key length: ${keyLength}\n` +
                                            `offerings.current?.identifier: ${currentId}\n` +
                                            `offerings.current?.availablePackages?.length: ${currentPkgsLen}\n` +
                                            `Object.keys(offerings.all): [${allKeys.join(', ')}]\n` +
                                            `error.code: ${errorObj?.code || 'unknown'}\n` +
                                            `error.message: ${errorObj?.message || errorObj}`
                                        );
                                    }
                                    Alert.alert('Error Detalles', e.message || 'Error desconocido al cargar planes.');
                                } finally {
                                    setLoading(false);
                                }
                            } : handleSubscribe}
                            disabled={loading}
                        >
                            <Text style={styles.buttonText}>
                                {loading
                                    ? i18n.t('pricing_button_starting')
                                    : pkg
                                        ? i18n.t('paywall_pro_cta_v2')
                                        : 'Reintentar Cargar Plan'
                                }
                            </Text>
                        </TouchableOpacity>

                        <Text style={styles.legalText}>
                            {i18n.t('paywall_cancel_anytime').replace('{0}', yearlyPriceText)}
                        </Text>

                        <Text style={[styles.legalText, { marginTop: -6, marginBottom: 12, color: '#4B5563' }]}>
                            {i18n.t('paywall_keep_collection')}
                        </Text>

                        <View style={styles.linksContainer}>
                            {!user && (
                                <TouchableOpacity onPress={() => navigation.navigate('Login', { isSignUp: false })}>
                                    <Text style={[styles.link, { textDecorationLine: 'underline', color: '#1A2530', fontSize: 13, fontWeight: '600', marginBottom: 8 }]}>
                                        {i18n.t('pricing_login_link')}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.bottomLinksContainer}>
                            <TouchableOpacity onPress={handleRestore}>
                                <Text style={styles.bottomLink}>{i18n.t('pricing_restore_short')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.divider}>•</Text>
                            <TouchableOpacity onPress={() => openLink(ENV.TERMS_URL)}>
                                <Text style={styles.bottomLink}>{i18n.t('pricing_terms')}</Text>
                            </TouchableOpacity>
                            <Text style={styles.divider}>•</Text>
                            <TouchableOpacity onPress={() => openLink(ENV.PRIVACY_URL)}>
                                <Text style={styles.bottomLink}>{i18n.t('pricing_privacy')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const FeatureItem = ({ icon, title, description, rotateIcon = false }: { icon: any, title: string, description: string, rotateIcon?: boolean }) => (
    <View style={styles.featureItem}>
        <View style={styles.featureIconContainer}>
            <Ionicons
                name={icon}
                size={22}
                color="#000000"
                style={rotateIcon ? { transform: [{ rotate: '90deg' }] } : undefined}
            />
        </View>
        <View style={styles.featureTextContainer}>
            <Text style={styles.featureTitle}>{title}</Text>
            <Text style={styles.featureDescription}>{description}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    backgroundImage: {
        position: 'absolute',
        width: width,
        height: '100%',
        top: 0,
        opacity: 0.12,
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 1,
    },
    contentContainer: {
        flex: 1,
        zIndex: 2,
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingVertical: 12,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    limitReachedLabel: {
        color: '#E65100',
        backgroundColor: '#FFF9E6',
        borderColor: '#FFE0B2',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
        overflow: 'hidden',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        height: 10,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logo: {
        width: 50,
        height: 50,
        tintColor: '#000000',
        marginBottom: 10,
    },
    header: {
        alignItems: 'center',
        marginBottom: 8,
    },
    proBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
        marginBottom: 8,
    },
    proBadgeText: {
        color: '#1A2530',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    title: {
        color: '#1A2530',
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
        lineHeight: 32,
    },
    subtitle: {
        color: '#4B5563',
        fontSize: 14.5,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    featuresContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 6,
    },
    featureIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    featureTextContainer: {
        flex: 1,
    },
    featureTitle: {
        color: '#1A2530',
        fontSize: 15.5,
        fontWeight: '700',
    },
    featureDescription: {
        color: '#6B7280',
        fontSize: 12.5,
        marginTop: 2,
        lineHeight: 16.5,
    },
    offerCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderWidth: 2,
        borderColor: '#000000',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
        position: 'relative',
    },
    offerCardBadge: {
        position: 'absolute',
        top: -10,
        backgroundColor: '#000000',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    offerCardBadgeText: {
        color: '#FFFFFF',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1,
    },
    planSubtitle: {
        color: '#6B7280',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
        marginTop: 2,
    },
    price: {
        color: '#1A2530',
        fontSize: 14.5,
        fontWeight: '700',
    },
    trialText: {
        color: '#34A853',
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 2,
    },
    footer: {
        alignItems: 'center',
        width: '100%',
    },
    button: {
        backgroundColor: '#000000',
        width: '100%',
        paddingVertical: 16,
        borderRadius: 28,
        alignItems: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    legalText: {
        color: '#9CA3AF',
        fontSize: 11,
        textAlign: 'center',
        lineHeight: 14,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    linksContainer: {
        alignItems: 'center',
        width: '100%',
    },
    link: {
        color: '#888',
        fontSize: 11,
    },
    bottomLinksContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 6,
    },
    bottomLink: {
        color: '#9CA3AF',
        fontSize: 11,
    },
    divider: {
        color: '#E5E7EB',
        marginHorizontal: 8,
    },
});
