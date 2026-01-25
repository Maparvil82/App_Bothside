import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Dimensions, SafeAreaView, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSubscription } from '../contexts/SubscriptionContext';
import { PurchasesPackage } from 'react-native-purchases';
import PurchaseService from '../services/PurchaseService';
import { useTheme } from '@react-navigation/native';
import { translate } from '../src/i18n';
import { ENV } from '../config/env';

// Compatibility alias to match the code style I just wrote
const i18n = { t: translate };

const { width } = Dimensions.get('window');

export const PaywallScreen = () => {
    const { colors } = useTheme();
    const navigation = useNavigation<any>();
    const { purchasePackage, restorePurchases } = useSubscription();
    const [loading, setLoading] = useState(false);
    const [pkg, setPkg] = useState<PurchasesPackage | null>(null);

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

    return (
        <View style={styles.container}>
            {/* Background Image / Gradient */}
            {/* Background Image / Gradient */}
            <Image
                source={require('../assets/wall.png')}
                style={styles.backgroundImage}
            />
            <LinearGradient
                colors={['transparent', '#000000']}
                style={styles.gradient}
            />

            <SafeAreaView style={styles.contentContainer}>




                <View style={styles.offerCard}>

                    <Text style={styles.planTitle}>{i18n.t('pricing_plan_annual_title')}</Text>
                    <View style={styles.priceContainer}>
                        <Text style={styles.price}>{priceString}</Text>
                        <Text style={styles.period}>{i18n.t('pricing_period_annual_slash')}</Text>
                    </View>
                    <Text style={styles.trialText}>{i18n.t('pricing_trial_text_5_days')}</Text>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, (loading || !pkg) && styles.buttonDisabled]}
                        onPress={handleSubscribe}
                        disabled={loading || !pkg}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? i18n.t('pricing_button_starting') : i18n.t('pricing_button_start_5_days')}
                        </Text>
                    </TouchableOpacity>

                    <Text style={styles.legalText}>
                        {i18n.t('pricing_legal_annual')}
                    </Text>

                    <View style={styles.linksContainer}>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={[styles.link, { textDecorationLine: 'underline', color: '#FFF' }]}>
                                {i18n.t('pricing_login_link')}
                            </Text>
                        </TouchableOpacity>
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
        height: '60%',
        top: 0,
        opacity: 0.6,
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
        justifyContent: 'flex-end',
        padding: 24,
    },
    header: {
        marginBottom: 30,
        alignItems: 'center',
    },
    preTitle: {
        color: '#AAA',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        color: '#FFF',
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: -1,
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
