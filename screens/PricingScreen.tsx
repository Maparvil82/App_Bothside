import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Linking,
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
  features: string[];
  popular?: boolean;
  productId: string; // StoreKit product identifier
}

const pricingPlans: PricingPlan[] = [
  {
    id: 'monthly',
    title: 'Mensual',
    price: '4.99',
    period: 'mes',
    productId: 'bothside_monthly_subscription',
    features: [
      'Acceso completo a tu colección',
      'Organización física de discos',
      'Análisis de estadísticas',
      'IA personalizada',
      'Funciones avanzadas por cámara y voz',
      
    ],
  },
  {
    id: 'annual',
    title: 'Anual',
    price: '39.99',
    period: 'año',
    originalPrice: '59.88',
    savings: 'Ahorras 33%',
    productId: 'bothside_annual_subscription',
    features: [
      'Todo lo del plan mensual pero con un ahorro',
    ],
    popular: true,
  },
];

export const PricingScreen: React.FC = () => {
  const [selectedPlan, setSelectedPlan] = useState<string>('annual');
  const [includeTrial, setIncludeTrial] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const navigation = useNavigation<any>();

  const handleSubscribe = async () => {
    const plan = pricingPlans.find(p => p.id === selectedPlan);
    if (!plan) return;

    setIsLoading(true);
    
    try {
      const trialText = includeTrial ? ' con 7 días de prueba gratuita' : '';
      
      // Durante desarrollo, permitir continuar directamente
      Alert.alert(
        'Modo Desarrollo',
        `Plan seleccionado: ${plan.title}${trialText}\n\nEn desarrollo: Continuar al registro\nEn producción: Redirigir a App Store`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Continuar al registro',
            onPress: () => {
              // En desarrollo: ir directamente al login con modo registro
              navigation.navigate('Login', { isSignUp: true });
            },
          },
          {
            text: 'Simular App Store',
            onPress: () => {
              // Simular redirección a App Store
              Alert.alert(
                'Redirección a App Store',
                'En producción, aquí se abriría la App Store para descargar la versión completa.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Login'),
                  },
                ]
              );
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error en suscripción:', error);
      Alert.alert(
        'Error',
        'Ocurrió un error. Por favor, intenta de nuevo.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          
          
        </View>

        {/* Plans */}
        <View style={styles.plansContainer}>
          {pricingPlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              style={[
                styles.planCard,
                selectedPlan === plan.id && styles.selectedPlan,
              ]}
              onPress={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Más Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planTitle}>{plan.title}</Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.currency}>€</Text>
                  <Text style={styles.price}>{plan.price}</Text>
                  <Text style={styles.period}>/{plan.period}</Text>
                </View>
                {plan.originalPrice && (
                  <View style={styles.savingsContainer}>
                    <Text style={styles.originalPrice}>€{plan.originalPrice}</Text>
                    <Text style={styles.savings}>{plan.savings}</Text>
                  </View>
                )}
              </View>

              <View style={styles.featuresContainer}>
                {plan.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {selectedPlan === plan.id && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Trial Toggle */}
        <View style={styles.trialContainer}>
          <TouchableOpacity
            style={styles.trialToggle}
            onPress={() => setIncludeTrial(!includeTrial)}
          >
            <View style={[styles.toggleSwitch, includeTrial && styles.toggleActive]}>
              <View style={[styles.toggleThumb, includeTrial && styles.toggleThumbActive]} />
            </View>
            <View style={styles.trialTextContainer}>
              <Text style={styles.trialTitle}>Prueba gratuita de 7 días</Text>
              <Text style={styles.trialSubtitle}>
                Prueba todas las funciones sin compromiso
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.subscribeButton, isLoading && styles.subscribeButtonDisabled]} 
            onPress={handleSubscribe}
            disabled={isLoading}
          >
            <Text style={styles.subscribeButtonText}>
              {isLoading ? 'Cargando...' : 'Continuar al registro'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Ya tengo una cuenta</Text>
          </TouchableOpacity>
        </View>

        {/* Terms */}
        <Text style={styles.termsText}>
          Al suscribirte, aceptas nuestros{' '}
          <Text style={styles.termsLink}>Términos de Servicio</Text> y{' '}
          <Text style={styles.termsLink}>Política de Privacidad</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'left',
    lineHeight: 24,
    fontWeight: '600',
  },
  plansContainer: {
    marginBottom: 30,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  selectedPlan: {
    borderColor: '#007AFF',
    backgroundColor: '#f8f9ff',
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    left: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  popularText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currency: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
  },
  price: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  period: {
    fontSize: 16,
    color: '#666',
    marginLeft: 4,
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalPrice: {
    fontSize: 14,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  savings: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  selectedIndicator: {
    position: 'absolute',
    top: 20,
    right: 20,
  },
  trialContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 30,
  },
  trialToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#e9ecef',
    borderRadius: 12,
    padding: 2,
    marginRight: 12,
  },
  toggleActive: {
    backgroundColor: '#007AFF',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
  trialTextContainer: {
    flex: 1,
  },
  trialTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  trialSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonDisabled: {
    backgroundColor: '#ccc',
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#666',
    fontSize: 16,
  },
  termsText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#007AFF',
    textDecorationLine: 'underline',
  },
}); 