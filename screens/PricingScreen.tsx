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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

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
  const navigation = useNavigation<any>();

  const handleSubscribe = async () => {
    const plan = pricingPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    // Navegar a Login/Registro con el plan seleccionado
    // El flujo es: Paywall -> Register/Login -> PrePurchaseScreen
    navigation.navigate('Login', {
      isSignUp: true,
      selectedPlan: plan.id
    });
  };

  const handleRestore = () => {
    Alert.alert('Restaurar Compras', 'Buscando suscripciones activas...');
  };

  const handleLogin = () => {
    // Si ya tiene cuenta, también pasamos el plan seleccionado por si acaso
    // aunque el usuario dijo que "Ya tengo una cuenta" solo navega a Login.
    // Pero si se loguea, debería ir a PrePurchaseScreen si venía de aquí?
    // El usuario dijo: "RegisterScreen -> navegación a PrePurchaseScreen".
    // Asumiremos que LoginScreen maneja esto si recibe selectedPlan.
    navigation.navigate('Login', {
      isSignUp: false,
      selectedPlan: selectedPlan // Pasamos el plan seleccionado actual
    });
  };

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
          <Text style={styles.subtitle}>
            Organiza tus sesiones como DJ y tu colección de vinilos como un profesional.
          </Text>
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
});