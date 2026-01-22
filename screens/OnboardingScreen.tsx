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
import { useTranslation } from '../src/i18n/useTranslation';
import { AppColors } from '../src/theme/colors';
import { useThemeMode } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const { width, height } = Dimensions.get('window');

export const OnboardingScreen: React.FC = () => {
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
      image: require('../assets/Gemini_Generated_Image_x5lylox5lylox5ly.png'),
      color: '#9b59b6',
    },
    {
      id: 2,
      title: t('onboarding_step2_title'),
      subtitle: t('onboarding_step2_subtitle'),
      image: require('../assets/image.png'),
      color: '#28a745',
    },
    {
      id: 3,
      title: t('onboarding_step3_title'),
      subtitle: t('onboarding_step3_subtitle'),
      image: require('../assets/videoframe_8000.png'),
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
      image: require('../assets/image.png'), // Placeholder
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
    // If user clicks "I have an account", go to Login directly.
    // Do NOT set hasSeenOnboarding=true manually.
    // If login is successful, context will set seen=true automatically.
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
                currentStep === index && [styles.activeDot, { backgroundColor: primaryColor }],
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>

        {/* Next button */}
        <TouchableOpacity style={[styles.nextButton, { backgroundColor: primaryColor, shadowColor: primaryColor }]} onPress={handleNext}>
          <Ionicons
            name={currentStep === onboardingSteps.length - 1 ? "checkmark" : "arrow-forward"}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      {/* Account section - REMOVED or changed behavior? 
          Reqs say "Start" on last step.
          If we keep this "Have account? Login", it should behave consistent with new flow.
          If I click Login here, I probably expect to go to Login screen.
          But strict flow says Paywall first.
          Let's assume "Login" here means "I already have a sub, let me in".
          So going to Paywall (where Restore is) is technically correct, 
          BUT users will be confused if they just want to Login to check something.
          However, adhering to strict "Hard Paywall", blocking entry is the goal.
      */}
      <View style={styles.accountSection}>
        <Text style={styles.accountText}>{t('onboarding_has_account')}</Text>
        <TouchableOpacity onPress={handleLogin}>
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
    width: width - 20,
    height: height * 0.5,
    resizeMode: 'cover',
    borderRadius: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',

  },
  title: {
    fontSize: 24,
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
    backgroundColor: AppColors.primary,
    width: 24,
  },
  nextButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: AppColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: AppColors.primary,
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
    color: AppColors.primary,
    fontWeight: '500',
  },
  logo: {
    width: 100,
    height: 50,
    resizeMode: 'contain',
  },
});