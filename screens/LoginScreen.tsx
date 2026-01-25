import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '../src/theme/colors';
import { useTranslation } from '../src/i18n/useTranslation';
import { useThemeMode } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';


export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();
  const { setHasSeenOnboarding } = useSubscription();
  const { t } = useTranslation();
  const { mode } = useThemeMode();
  const primaryColor = mode === 'dark' ? AppColors.dark.primary : AppColors.primary;
  const route = useRoute<any>();
  const navigation = useNavigation<any>();

  // Verificar si venimos de pricing con modo registro
  useEffect(() => {
    if (route.params?.isSignUp) {
      setIsSignUp(true);
    }
  }, [route.params?.isSignUp]);

  const validateUsername = (username: string): string | null => {
    if (!username.trim()) {
      return t('auth_validation_username_required');
    }

    if (username.length < 3) {
      return t('auth_validation_username_min_length');
    }

    if (username.length > 20) {
      return t('auth_validation_username_max_length');
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return t('auth_validation_username_format');
    }

    return null;
  };



  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert(t('common_error'), t('auth_validation_all_fields_required'));
      return;
    }

    if (isSignUp) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        Alert.alert(t('common_error'), usernameError);
        return;
      }
    }

    setLoading(true);
    console.log('LoginScreen: Starting auth...');
    try {
      if (isSignUp) {
        console.log('LoginScreen: Attempting sign up...');
        await signUp(email, password, username.trim());
        console.log('LoginScreen: Sign up successful');
        // Alert.alert('Éxito', 'Cuenta creada. Revisa tu email para confirmar.');
      } else {
        console.log('LoginScreen: Attempting sign in...');
        await signIn(email, password);
        console.log('LoginScreen: Sign in successful');
      }

      // Verificar si hay plan seleccionado para navegar a PrePurchase
      if (route.params?.selectedPlan) {
        console.log('LoginScreen: Navigating to PrePurchase...');
        // Obtener el usuario actual directamente de supabase ya que el contexto puede tardar en actualizarse
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          navigation.navigate('PrePurchase', {
            user: authUser,
            selectedPlan: route.params.selectedPlan
          });
        }
      } else {
        // Si es login normal desde el Paywall o Onboarding, volvemos atrás
        // para que el usuario vea el Paywall o entre a la app (si ya tiene sub)
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          // Fallback si no hay historial, intentamos ir a Paywall explícitamente si estamos en ese flujo
          navigation.navigate('Paywall');
        }
      }
    } catch (error: any) {
      console.error('LoginScreen: Auth error:', error);
      Alert.alert(t('common_error'), error.message);
    } finally {
      console.log('LoginScreen: Auth finished, stopping loading');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <Image
            source={require('../assets/logo-onboarding.png')}
            style={styles.logo}
          />

          <Text style={styles.title}>
            {isSignUp ? t('auth_create_account') : t('auth_login')}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? t('auth_signup_subtitle')
              : t('auth_login_subtitle')}
          </Text>

          {isSignUp && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('auth_placeholder_username')}
                placeholderTextColor="#B3B3B3"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={t('auth_placeholder_email')}
              placeholderTextColor="#B3B3B3"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { paddingRight: 50 }]}
              placeholder={t('auth_placeholder_password')}
              placeholderTextColor="#B3B3B3"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.eyeIcon}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={24}
                color="#B3B3B3"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled, { backgroundColor: primaryColor, shadowColor: primaryColor }]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? t('common_loading') : isSignUp ? t('auth_create_account') : t('auth_login')}
            </Text>
          </TouchableOpacity>



          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => {
              console.log('🔘 Switch Button Pressed. isSignUp:', isSignUp);
              if (isSignUp) {
                // If in Sign Up mode, switch to Login
                setIsSignUp(false);
              } else {
                console.log('🔄 Resetting Onboarding state to false');
                // If in Login mode, "Create Account" -> Go to Onboarding (Restart Flow)
                setHasSeenOnboarding(false);
              }
            }}
          >
            <Text style={styles.switchText}>
              {isSignUp ? t('auth_switch_to_login') : t('auth_switch_to_signup')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  logo: {
    width: 120,
    height: 40,
    resizeMode: 'contain',
    alignSelf: 'center',

    marginBottom: 40,
    tintColor: '#2f2f2fff',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    color: '#222',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    fontWeight: '400',
  },
  inputContainer: {
    marginBottom: 14,
    position: 'relative',
  },
  input: {
    backgroundColor: '#fff',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E3E3E3',
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: 13,
  },
  button: {
    backgroundColor: AppColors.primary,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '600',
  },
  switchButton: {
    marginTop: 18,
    paddingVertical: 10,
    alignItems: 'center',
  },
  switchText: {
    color: '#3A6BFF',
    fontSize: 15,
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '600',
  },
  googleIcon: {
    marginRight: 10,
  },
});