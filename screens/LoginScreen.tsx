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
  Image,
  Dimensions,
  StatusBar,
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

const { width, height } = Dimensions.get('window');

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
  const primaryColor = AppColors.primary; // Enforce brand color for premium feel
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
    try {
      if (isSignUp) {
        await signUp(email, password, username.trim());
      } else {
        await signIn(email, password);
      }

      if (route.params?.selectedPlan) {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          navigation.navigate('PrePurchase', {
            user: authUser,
            selectedPlan: route.params.selectedPlan
          });
        }
      } else {
        if (navigation.canGoBack()) {
          navigation.goBack();
        }
      }
    } catch (error: any) {
      console.error('LoginScreen: Auth error:', error);
      Alert.alert(t('common_error'), error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header Image */}
      <View style={styles.headerImageContainer}>
        <Image
          source={require('../assets/1.png')}
          style={styles.headerImage}
          resizeMode="cover"
        />
        <View style={styles.overlay} />
        <Image
          source={require('../assets/logo-onboarding.png')}
          style={styles.logoHeader}
        />
      </View>

      {/* Login Form Card */}
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >

            <Text style={styles.title}>
              {isSignUp ? t('auth_create_account') : t('auth_login')}
            </Text>
            <Text style={styles.subtitle}>
              {isSignUp ? t('auth_signup_subtitle') : t('auth_login_subtitle')}
            </Text>

            <View style={styles.inputsWrapper}>
              {isSignUp && (
                <View style={styles.inputContainer}>
                  <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={t('auth_placeholder_username')}
                    placeholderTextColor="#999"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                    maxLength={20}
                  />
                </View>
              )}

              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={t('auth_placeholder_email')}
                  placeholderTextColor="#999"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { paddingRight: 40 }]}
                  placeholder={t('auth_placeholder_password')}
                  placeholderTextColor="#999"
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
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
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
                if (isSignUp) {
                  setIsSignUp(false);
                } else {
                  setHasSeenOnboarding(false);
                }
              }}
            >
              <Text style={styles.switchText}>
                {isSignUp ? t('auth_switch_to_login') : t('auth_switch_to_signup')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Matches top area if image doesn't load or verify status bar
  },
  headerImageContainer: {
    height: height * 0.55,
    width: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  headerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slight dark overlay for premium feel/contrast
  },
  formContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  logoHeader: {
    width: 100,
    height: 45,
    resizeMode: 'contain',
    tintColor: '#ffffff', // White for better contrast on image
    zIndex: 10,
    top: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
    color: '#888',
    fontWeight: '400',
    lineHeight: 22,
  },
  inputsWrapper: {
    gap: 16,
  },
  inputContainer: {
    backgroundColor: '#F5F5F7', // Premium light grey input background
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'transparent', // Can become colored on focus if needed
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    height: '100%',
  },
  eyeIcon: {
    padding: 8,
  },
  button: {
    backgroundColor: AppColors.primary,
    height: 56,
    borderRadius: 16, // Modern pill/rounded rect
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    shadowColor: AppColors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
  },
  switchButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  switchText: {
    color: AppColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});