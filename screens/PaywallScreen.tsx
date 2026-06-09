import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Dimensions, Linking, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
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

// Compatibility alias to match the code style I just wrote
const i18n = { t: translate };

const { width } = Dimensions.get('window');

export const PaywallScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { purchasePackage, restorePurchases } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

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
            navigation.replace('Login', { isSignUp: true });
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
            {/* Background Image / Gradient */}
            <Image
                source={require('../assets/wall_1.png')}
                style={styles.backgroundImage}
            />
            <LinearGradient
                colors={['transparent', '#000000']}
                style={styles.gradient}
            />

            <SafeAreaView style={styles.contentContainer}>

                <View style={styles.header}>
                    <Text style={styles.title}>{i18n.t('paywall_limit_title')}</Text>
                    <Text style={[styles.preTitle, { marginTop: 8, fontSize: 15, textTransform: 'none', letterSpacing: 0, color: '#DDD', textAlign: 'center' }]}>
                        {i18n.t('paywall_limit_subtitle')}
                    </Text>
                </View>

                <View style={styles.offerCard}>

                    <Text style={styles.planTitle}>{i18n.t('paywall_pro_plan')}</Text>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{yearlyPriceText}</Text>
                    </View>
                    <Text style={styles.trialText}>{i18n.t('paywall_pro_trial')}</Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            (loading) && styles.buttonDisabled,
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
                                    ? i18n.t('paywall_pro_cta')
                                    : 'Reintentar Cargar Plan'
                            }
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.legalText}>
                        {afterTrialText}
                    </Text>

                    <Text style={[styles.legalText, { marginTop: -10, marginBottom: 20 }]}>
                        {i18n.t('paywall_keep_collection')}
                    </Text>

                    <View style={styles.linksContainer}>
                        {user ? (
                            <TouchableOpacity onPress={() => navigation.goBack()}>
                                <Text style={[styles.link, { textDecorationLine: 'underline', color: '#FFF', fontSize: 16, fontWeight: '600' }]}>
                                    {i18n.t('paywall_not_now')}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={() => navigation.navigate('Login', { isSignUp: false })}>
                                <Text style={[styles.link, { textDecorationLine: 'underline', color: '#FFF' }]}>
                                    {i18n.t('pricing_login_link')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={[styles.linksContainer, { marginTop: 20 }]}>
                        <TouchableOpacity onPress={handleRestore}>
                            <Text style={styles.link}>{i18n.t('pricing_restore_short')}</Text>
                        </TouchableOpacity>
                        <Text style={styles.divider}>•</Text>
                        <TouchableOpacity onPress={() => openLink(ENV.TERMS_URL)}>
                            <Text style={styles.link}>{i18n.t('pricing_terms')}</Text>
                        </TouchableOpacity>
                        <Text style={styles.divider}>•</Text>
                        <TouchableOpacity onPress={() => openLink(ENV.PRIVACY_URL)}>
                            <Text style={styles.link}>{i18n.t('pricing_privacy')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const FeatureItem = ({ icon, text, highlight = false }: { icon: any, text: string, highlight?: boolean }) => (
    <View style={styles.featureItem}>
        <View style={[styles.iconContainer, highlight && { backgroundColor: '#FFD70030' }]}>
            <Ionicons name={icon} size={24} color={highlight ? '#FFD700' : '#FFF'} />
        </View>
        <Text style={[styles.featureText, highlight && { color: '#FFD700', fontWeight: 'bold' }]}>{text}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    backgroundImage: {
        position: 'absolute',
        width: width,
        height: '100%',
        top: 0,
        opacity: 0.5,
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
        justifyContent: 'space-around',
        padding: 24,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    preTitle: {
        color: '#AAA',
        fontSize: 12,
        fontWeight: '500',
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -1,
        marginBottom: 10,
    },
    featuresContainer: {
        marginBottom: 40,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '500',
    },
    offerCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#0A84FF',
        marginBottom: 24,
        position: 'relative',
        alignItems: 'center', // Centrado
    },
    badgeContainer: {
        position: 'absolute',
        top: -12,
        backgroundColor: '#0A84FF',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    planTitle: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: 4,
    },
    price: {
        color: '#FFF',
        fontSize: 32,
        fontWeight: '800',
    },
    period: {
        color: '#AAA',
        fontSize: 16,
        marginLeft: 4,
    },
    trialText: {
        color: '#0A84FF',
        fontSize: 14,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
    },
    button: {
        backgroundColor: '#0A84FF',
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#0A84FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    legalText: {
        color: '#666',
        fontSize: 12,
        marginBottom: 20,
    },
    linksContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    link: {
        color: '#888',
        fontSize: 12,
    },
    divider: {
        color: '#444',
        marginHorizontal: 8,
    },
});
