import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const onboardingSteps = [
  {
    id: 1,
    title: 'IA que entiende tu música',
    subtitle: 'Pregunta a nuestra IA sobre tu colección y descubre recomendaciones personalizadas',
    image: require('../assets/Gemini_Generated_Image_x5lylox5lylox5ly.png'),
    color: '#9b59b6',
  },
  {
    id: 2,
    title: 'Organiza tu música físicamente',
    subtitle: 'Crea ubicaciones físicas para encontrar tus discos rápidamente en tus estanterías',
    image: require('../assets/image.png'),
    color: '#28a745',
  },
  {
    id: 3,
    title: 'Tu colección te conoce mejor que nadie',
    subtitle: 'Descubre insights únicos sobre tu música y encuentra joyas olvidadas en tu colección',
    image: require('../assets/videoframe_8000.png'),
    color: '#007AFF',
  },
  {
    id: 4,
    title: 'Analiza tu colección',
    subtitle: 'Conoce en detalle tus discos, artistas, géneros y el valor de tu colección en el mercado',
    image: require('../assets/Gemini_Generated_Image_8jxpae8jxpae8jxp.png'),
    color: '#f39c12',
  },



];

export const OnboardingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      // Ir a la pantalla de pricing
      navigation.navigate('Pricing');
    }
  };

  const handleSkip = () => {
    // Ir directamente a la pantalla de pricing
    navigation.navigate('Pricing');
  };

  const handleLogin = () => {
    // Ir directamente a la pantalla de login
    navigation.navigate('Login');
  };

  const handleDotPress = (index: number) => {
    setCurrentStep(index);
    scrollViewRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
  };

  return (
    <SafeAreaView style={styles.container}>

      {/* Logo Header */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../assets/logo-onboarding.png')}
          style={styles.logo}
        />
      </View>
      {/* Main content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentStep(newIndex);
        }}
        style={styles.scrollView}
      >
        {onboardingSteps.map((step, index) => (
          <View key={step.id} style={styles.slide}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View>
                <Image source={step.image} style={styles.image} />
              </View>
            </View>

            {/* Text content */}
            <View style={styles.textContainer}>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.subtitle}>{step.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={styles.bottomSection}>
        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {onboardingSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                currentStep === index && styles.activeDot,
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Ionicons
            name={currentStep === onboardingSteps.length - 1 ? "checkmark" : "arrow-forward"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Account section */}
      <View style={styles.accountSection}>
        <Text style={styles.accountText}>¿Tiene una cuenta en Bothside?</Text>
        <TouchableOpacity onPress={handleLogin}>
          <Text style={styles.loginLink}>Iniciar sesión</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  illustrationContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },

  image: {

    width: width - 40,
    height: height * 0.4,
    resizeMode: 'cover',
    borderRadius: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',

  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'left',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'left',
    lineHeight: 26,

  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 30,
    backgroundColor: '#fff',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#007AFF',
    width: 24,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  accountSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  accountText: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  loginLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  logoContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,

  },
  logo: {
    width: 100,
    height: 50,
    resizeMode: 'contain',
  },
}); 