import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// 1. CONDICIÓN DE MODO DESARROLLO
const IS_DEV_MODE = __DEV__;

interface PricingPlan {
  id: string;
  title: string;
  price: string;
  period: string;
  originalPrice?: string;
  savings?: string;
  popular?: boolean;
  productId: string;
}

const commonFeatures = [
  'Escaneo inteligente de portadas con IA',
  'Assistant musical y de colección',
  'Panel profesional: sesiones, ganancias, estadísticas',
  'Organización completa de tu colección de vinilos',
  'IA por cámara y voz',
  '500 créditos IA mensuales',
  'Cancela cuando quieras',
];

const pricingPlans: PricingPlan[] = [
  {
    id: 'annual',
    title: 'Anual',
    price: '39.99',
    period: 'año',
    originalPrice: '59.88',
    savings: 'Ahorra 33%',
    productId: 'bothside_annual_subscription',
    popular: true,
  },
  {
    id: 'monthly',
    title: 'Mensual',
    price: '7.99',
    period: 'mes',
    productId: 'bothside_monthly_subscription',
  },
];

export const PricingScreen: React.FC = () => {
  // Monthly selected by default
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showDevModal, setShowDevModal] = useState<boolean>(false);
  const navigation = useNavigation<any>();

  // 5. IMPLEMENTACIÓN SUGERIDA
  const handleSubscribe = async () => {
    const plan = pricingPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    if (IS_DEV_MODE) {
      setShowDevModal(true);
    } else {
      initiatePurchase(plan);
    }
  };

  // 3. LÓGICA EN PRODUCCIÓN / 4. LÓGICA EN TESTFLIGHT
  const initiatePurchase = async (plan: PricingPlan) => {
    setIsLoading(true);
    try {
      // Aquí iría la lógica real de StoreKit / RevenueCat
      // Por ahora simulamos un delay y un error o éxito según corresponda en producción real
      console.log('Initiating purchase for:', plan.productId);

      // TODO: Implement actual purchase logic here
      // await Purchases.purchasePackage(package);

      Alert.alert('Producción', 'Aquí se iniciaría la compra real con StoreKit.');

    } catch (error) {
      console.error('Purchase error:', error);
      Alert.alert('Error', 'No se pudo completar la compra.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. MOCK DE COMPRA PARA DESARROLLO
  const simulatePurchase = (action: 'register' | 'store') => {
    setShowDevModal(false);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (action === 'register') {
        // Continuar al registro (simulación interna)
        navigation.navigate('Login', { isSignUp: true });
      } else {
        // Simular compra App Store
        Alert.alert(
          'Compra Exitosa (Simulada)',
          'Has adquirido la suscripción correctamente en el entorno de prueba.',
          [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Login'),
            }
          ]
        );
      }
    }, 1000);
  };

  const handleRestore = () => {
    Alert.alert('Restaurar Compras', 'Buscando suscripciones activas...');
  };

  const handleLogin = () => {
    navigation.navigate('Login');
  };

  const selectedPlanDetails = pricingPlans.find(p => p.id === selectedPlan);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <Image
          source={require('../assets/logo-onboarding.png')}
          style={styles.logo}
        />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Empieza tu prueba gratuita de 7 días</Text>
        </View>

        {/* Features Block */}
        <View style={styles.featuresBlock}>
          {commonFeatures.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={20} color="#007AFF" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {pricingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlan,
                plan.popular && styles.popularPlanCard,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
              activeOpacity={0.9}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Más Popular</Text>
                </View>
              )}

              <View style={styles.cardContent}>
                <View style={styles.cardLeft}>
                  <View style={[styles.radioButton, selectedPlan === plan.id && styles.radioButtonSelected]}>
                    {selectedPlan === plan.id && <View style={styles.radioButtonInner} />}
                  </View>
                  <View>
                    <Text style={styles.planTitle}>{plan.title}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.price}>{plan.price} €</Text>
                      <Text style={styles.period}>/{plan.period}</Text>
                    </View>
                    {plan.savings && (
                      <Text style={styles.savingsText}>{plan.savings}</Text>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Active Block */}
        <View style={styles.trialBlock}>
          <Ionicons name="checkmark-circle" size={24} color="#28a745" />
          <View style={styles.trialBlockText}>
            <Text style={styles.trialBlockTitle}>Prueba gratuita de 7 días activa</Text>
            <Text style={styles.trialBlockSubtitle}>No pagarás nada hoy. Cancela cuando quieras.</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]}
          onPress={handleSubscribe}
          disabled={isLoading}
        >
          <Text style={styles.subscribeButtonText}>
            {isLoading ? 'Cargando...' : 'Empezar prueba gratuita de 7 días'}
          </Text>
        </TouchableOpacity>

        {/* Login Link */}
        <TouchableOpacity style={styles.loginLink} onPress={handleLogin}>
          <Text style={styles.loginLinkText}>Ya tengo una cuenta</Text>
        </TouchableOpacity>

        {/* Footer Links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={handleRestore}>
            <Text style={styles.footerLinkText}>Restaurar compras</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.footerLinkText}>Términos de Servicio</Text>
          </TouchableOpacity>
          <Text style={styles.footerSeparator}>•</Text>
          <TouchableOpacity>
            <Text style={styles.footerLinkText}>Política de Privacidad</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* 2. MODAL DE PRUEBA (solo en desarrollo) */}
      <Modal
        visible={showDevModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDevModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Modo Desarrollo</Text>
            <Text style={styles.modalText}>
              Plan seleccionado: <Text style={{ fontWeight: 'bold' }}>{selectedPlanDetails?.title}</Text> con 7 días de prueba gratuita
            </Text>

            <Text style={styles.modalSubtitle}>Elige acción:</Text>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => simulatePurchase('register')}
            >
              <Text style={styles.modalButtonText}>Continuar al registro (simulación interna)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => simulatePurchase('store')}
            >
              <Text style={styles.modalButtonTextSecondary}>Simular compra App Store</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setShowDevModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  logo: {
    height: 25,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 10,
    tintColor: '#000',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 0,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    marginTop: 10,
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  featuresBlock: {
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    lineHeight: 20,
    flex: 1,
  },
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#e5e5e5',
    position: 'relative',
    height: 100, // Fixed height for consistency
    justifyContent: 'center',
  },
  selectedPlan: {
    borderColor: '#007AFF',
    backgroundColor: '#f8f9ff',
    borderWidth: 2,
  },
  popularPlanCard: {
    // Extra styling for popular if needed
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    zIndex: 10,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#007AFF',
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  period: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  savingsText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 2,
  },
  trialBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f9f4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#d1e7dd',
  },
  trialBlockText: {
    marginLeft: 12,
    flex: 1,
  },
  trialBlockTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#155724',
    marginBottom: 2,
  },
  trialBlockSubtitle: {
    fontSize: 13,
    color: '#155724',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  loginLink: {
    alignSelf: 'center',
    paddingVertical: 12,
    marginBottom: 20,
  },
  loginLinkText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  footerLinkText: {
    fontSize: 12,
    color: '#888',
    textDecorationLine: 'underline',
  },
  footerSeparator: {
    fontSize: 12,
    color: '#ccc',
    marginHorizontal: 8,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  modalText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
    lineHeight: 22,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
    alignSelf: 'flex-start',
    width: '100%',
  },
  modalButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: '#007AFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  modalButtonCancel: {
    marginTop: 8,
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSecondary: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextCancel: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});