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
            // Check for Expo Go specific error
            if (e.message && (e.message.includes('Invalid API key') || e.message.includes('native store is not available'))) {
                console.log('⚠️ Detectado Expo Go sin configuración nativa. Usando Mock Offering.');
                return {
                    serverDescription: "Mock Offering",
                    identifier: "default",
                    availablePackages: [
                        {
                            identifier: "$rc_annual",
                            packageType: "ANNUAL",
                            product: {
                                identifier: "mock_annual_product",
                                description: "Annual Subscription (Mock)",
                                title: "Annual Premium",
                                price: 29.99,
                                priceString: "$29.99",
                                currencyCode: "USD",
                                introPrice: null,
                                discounts: [],
                                productCategory: "SUBSCRIPTION",
                                productType: "SUBSCRIPTION",
                                subscriptionPeriod: "P1Y",
                            },
                            offeringIdentifier: "default"
                        } as any
                    ]
                } as PurchasesOffering;
            }
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
