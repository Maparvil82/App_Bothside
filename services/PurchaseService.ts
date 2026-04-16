import Purchases, {
    PurchasesOffering,
    PurchasesPackage,
    CustomerInfo,
    LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { ENV } from '../config/env';

const API_KEY = Platform.select({
    ios: ENV.REVENUECAT_API_KEY_IOS,
    android: ENV.REVENUECAT_API_KEY_ANDROID,
});

class PurchaseService {
    private static instance: PurchaseService;
    private isInitialized = false;

    private constructor() { }

    static getInstance(): PurchaseService {
        if (!PurchaseService.instance) {
            PurchaseService.instance = new PurchaseService();
        }
        return PurchaseService.instance;
    }

    async init() {
        if (this.isInitialized) return;

        if (!API_KEY) {
            console.warn('RevenueCat API Key not found. IAP will not work.');
            return;
        }

        if (__DEV__) {
            Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        Purchases.configure({ apiKey: API_KEY });
        this.isInitialized = true;
        console.log('✅ RevenueCat Initialized');
    }

    async getOfferings(): Promise<PurchasesOffering | null> {
        try {
            await this.EnsureInitialized();
            const offerings = await Purchases.getOfferings();
            console.log('📦 RC Offerings:', JSON.stringify(offerings, null, 2));
            if (offerings.current !== null && offerings.current.availablePackages.length !== 0) {
                return offerings.current;
            }
            console.warn('⚠️ No current offering found in RevenueCat');
            return null;
        } catch (e: any) {
            console.error('Error fetching offerings:', e);
            
            // Si estamos en desarrollo, devolvemos un Mock para que la UI no se rompa
            if (__DEV__) {
                console.log('⚠️ Error de RevenueCat en desarrollo. Usando Mock Offering para permitir pruebas de UI.');
                return {
                    serverDescription: "Mock Offering (Dev Fallback)",
                    identifier: "default",
                    availablePackages: [
                        {
                            identifier: "$rc_annual",
                            packageType: "ANNUAL",
                            product: {
                                identifier: "mock_annual_product",
                                description: "Annual Subscription (Mock)",
                                title: "Annual Premium",
                                price: 14.99,
                                priceString: "14,99 €",
                                currencyCode: "EUR",
                                introPrice: null,
                                discounts: [],
                                productCategory: "SUBSCRIPTION",
                                productType: "SUBSCRIPTION",
                                subscriptionPeriod: "P1Y",
                            },
                            offeringIdentifier: "default"
                        } as any,
                        {
                            identifier: "$rc_monthly",
                            packageType: "MONTHLY",
                            product: {
                                identifier: "mock_monthly_product",
                                description: "Monthly Subscription (Mock)",
                                title: "Monthly Premium",
                                price: 4.99,
                                priceString: "4,99 €",
                                currencyCode: "EUR",
                                introPrice: null,
                                discounts: [],
                                productCategory: "SUBSCRIPTION",
                                productType: "SUBSCRIPTION",
                                subscriptionPeriod: "P1M",
                            },
                            offeringIdentifier: "default"
                        } as any
                    ]
                } as PurchasesOffering;
            }
            throw e;
        }
    }

    async getCreditsOfferings(): Promise<PurchasesOffering | null> {
        try {
            await this.EnsureInitialized();
            const offerings = await Purchases.getOfferings();

            // Look for 'credits' offering specifically
            if (offerings.all['credits'] && offerings.all['credits'].availablePackages.length > 0) {
                return offerings.all['credits'];
            }

            console.warn('⚠️ No credits offering found in RevenueCat');

            // Mock for Expo Go or Sandbox if configured
            if (__DEV__ || !offerings.all['credits']) {
                return {
                    serverDescription: "Mock Credits Offering",
                    identifier: "credits",
                    availablePackages: [
                        {
                            identifier: "$rc_credits_50",
                            packageType: "CUSTOM",
                            product: {
                                identifier: "bothside_credits_50",
                                description: "50 AI Credits",
                                title: "Starter Pack",
                                price: 1.99,
                                priceString: "1,99 €",
                                currencyCode: "EUR",
                                introPrice: null,
                                discounts: [],
                                productCategory: "NON_SUBSCRIPTION",
                                productType: "CONSUMABLE",
                                subscriptionPeriod: null,
                            },
                            offeringIdentifier: "credits"
                        },
                        {
                            identifier: "$rc_credits_200",
                            packageType: "CUSTOM",
                            product: {
                                identifier: "bothside_credits_200",
                                description: "200 AI Credits",
                                title: "Pro Pack",
                                price: 5.99,
                                priceString: "5,99 €",
                                currencyCode: "EUR",
                                introPrice: null,
                                discounts: [],
                                productCategory: "NON_SUBSCRIPTION",
                                productType: "CONSUMABLE",
                                subscriptionPeriod: null,
                            },
                            offeringIdentifier: "credits"
                        },
                        {
                            identifier: "$rc_credits_500",
                            packageType: "CUSTOM",
                            product: {
                                identifier: "bothside_credits_master",
                                description: "500 AI Credits",
                                title: "Master Pack",
                                price: 12.99,
                                priceString: "12,99 €",
                                currencyCode: "EUR",
                                introPrice: null,
                                discounts: [],
                                productCategory: "NON_SUBSCRIPTION",
                                productType: "CONSUMABLE",
                                subscriptionPeriod: null,
                            },
                            offeringIdentifier: "credits"
                        }
                    ] as any
                } as PurchasesOffering;
            }

            return null;
        } catch (e) {
            console.error('Error fetching credit offerings:', e);
            return null;
        }
    }

    async purchasePackage(pkg: PurchasesPackage): Promise<{ customerInfo: CustomerInfo; method: 'purchase'; } | null> {
        try {
            await this.EnsureInitialized();

            // Check for Mock Package
            if (pkg.product.identifier === 'mock_annual_product') {
                console.log('🛒 Realizando compra simulada (Mock Purchase)');
                return {
                    customerInfo: {
                        entitlements: {
                            active: {
                                "premium": {
                                    identifier: "premium",
                                    isActive: true,
                                    willRenew: true,
                                    periodType: "NORMAL",
                                    latestPurchaseDate: new Date().toISOString(),
                                    originalPurchaseDate: new Date().toISOString(),
                                    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                                    store: "APP_STORE",
                                    productIdentifier: "mock_annual_product",
                                    isSandbox: true,
                                    unsubscribeDetectedAt: null,
                                    billingIssueDetectedAt: null
                                }
                            },
                            all: {}
                        },
                        allPurchaseDates: {},
                        activeSubscriptions: ["mock_annual_product"],
                        allPurchasedProductIdentifiers: ["mock_annual_product"],
                        firstSeen: new Date().toISOString(),
                        originalAppUserId: "mock_user",
                        requestDate: new Date().toISOString(),
                        latestExpirationDate: null,
                        managementURL: null,
                        nonSubscriptionTransactions: [],
                        originalApplicationVersion: "1.0",
                        originalPurchaseDate: new Date().toISOString()
                    } as any,
                    method: 'purchase'
                };
            }

            const { customerInfo } = await Purchases.purchasePackage(pkg);
            return { customerInfo, method: 'purchase' };
        } catch (e: any) {
            if (!e.userCancelled) {
                console.error('Error purchasing package:', e);
            }
            return null;
        }
    }

    async restorePurchases(): Promise<CustomerInfo | null> {
        try {
            await this.EnsureInitialized();
            const customerInfo = await Purchases.restorePurchases();
            return customerInfo;
        } catch (e) {
            console.error('Error restoring purchases:', e);
            return null;
        }
    }

    async getCustomerInfo(): Promise<CustomerInfo | null> {
        try {
            await this.EnsureInitialized();
            return await Purchases.getCustomerInfo();
        } catch (e) {
            console.error('Error getting customer info:', e);
            return null;
        }
    }

    // Identificar al usuario en RevenueCat (útil si hay login)
    async logIn(userId: string) {
        try {
            await this.EnsureInitialized();
            await Purchases.logIn(userId);
        } catch (e) {
            console.error('Error logging in to RC:', e);
        }
    }

    async logOut() {
        try {
            await this.EnsureInitialized();
            await Purchases.logOut();
        } catch (e) {
            console.error('Error logging out of RC:', e);
        }
    }

    private async EnsureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
    }
}

export default PurchaseService.getInstance();
