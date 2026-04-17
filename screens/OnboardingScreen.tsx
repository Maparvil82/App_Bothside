import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

export const OnboardingScreen: React.FC = () => {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;

  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const navigation = useNavigation<any>();
  const { setHasSeenOnboarding } = useSubscription();

  const onboardingSteps = [
    {
      id: 1,
      title: t('onboarding_step1_title'),
      subtitle: t('onboarding_step1_subtitle'),
      image: require('../assets/1.png'),
      color: '#9b59b6',
    },
    {
      id: 2,
      title: t('onboarding_step2_title'),
      subtitle: t('onboarding_step2_subtitle'),
      image: require('../assets/2.png'),
      color: '#28a745',
    },
    {
      id: 3,
      title: t('onboarding_step3_title'),
      subtitle: t('onboarding_step3_subtitle'),
      image: require('../assets/3.png'),
      color: primaryColor,
    },
    {
      id: 4,
      title: t('onboarding_step4_title'),
      subtitle: t('onboarding_step4_subtitle'),
      image: require('../assets/Gemini_Generated_Image_8jxpae8jxpae8jxp.png'),
      color: '#f39c12',
    },
    {
      id: 5,
      title: t('onboarding_step5_title'),
      subtitle: t('onboarding_step5_subtitle'),
      image: require('../assets/image.png'), // Placeholder, reusing existing until user provides new
      color: '#e74c3c',
    },
    {
      id: 6,
      title: t('onboarding_step6_title'),
      subtitle: t('onboarding_step6_subtitle'),
      image: require('../assets/4.png'), // Placeholder
      color: '#8e44ad',
    }
  ];

  const finishOnboarding = async () => {
    // Mark onboarding as seen.
    // The AppNavigator will automatically switch to Paywall (if not subscribed) or Login/Main
    await setHasSeenOnboarding(true);
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      finishOnboarding();
    }
  };

  const handleSkip = () => {
    finishOnboarding();
  };

  const handleLogin = () => {
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
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
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
        scrollEventThrottle={16}
      >
        {onboardingSteps.map((step, index) => (
          <View key={step.id} style={[styles.slide, { width }]}>
            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <Image
                source={step.image}
                style={[
                  styles.image,
                  { 
                    width: width > 600 ? 500 : width * 0.85, 
                    height: height * (height > 800 ? 0.4 : 0.45) 
                  }
                ]}
                resizeMode="contain"
              />
            </View>

            {/* Text content */}
            <View style={[styles.textContainer, { maxWidth: 600, alignItems: width > 600 ? 'center' : 'flex-start' }]}>
              <Text style={[styles.title, width > 600 && { textAlign: 'center' }]}>{step.title}</Text>
              <Text style={[styles.subtitle, width > 600 && { textAlign: 'center' }]}>{step.subtitle}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section */}
      <View style={[styles.bottomSection, { paddingBottom: height > 800 ? 20 : 30 }]}>
        {/* Dots indicator */}
        <View style={styles.dotsContainer}>
          {onboardingSteps.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                currentStep === index && [styles.activeDot, { backgroundColor: primaryColor }],
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]} 
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Ionicons
            name={currentStep === onboardingSteps.length - 1 ? "checkmark" : "arrow-forward"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Account section */}
      <View style={[styles.accountSection, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Text style={styles.accountText}>{t('onboarding_has_account')}</Text>
        <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
          <Text style={[styles.loginLink, { color: primaryColor }]}>{t('auth_login')}</Text>
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
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  illustrationContainer: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 20,
  },
  image: {
    // Dynamic styles passed in component
  },
  textContainer: {
    flex: 2,
    justifyContent: 'flex-start',
    width: '100%',
    paddingTop: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'left',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 17,
    color: '#666',
    textAlign: 'left',
    lineHeight: 24,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    backgroundColor: '#fff',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    height: 6,
    borderRadius: 3,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  accountSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    backgroundColor: '#fff',
  },
  accountText: {
    fontSize: 14,
    color: '#888',
    marginRight: 6,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});