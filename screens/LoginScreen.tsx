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

export const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { signIn, signUp } = useAuth();
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
      return 'Por favor ingresa un nombre de usuario';
    }

    if (username.length < 3) {
      return 'El nombre de usuario debe tener al menos 3 caracteres';
    }

    if (username.length > 20) {
      return 'El nombre de usuario no puede tener más de 20 caracteres';
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'El nombre de usuario solo puede contener letras, números y guiones bajos';
    }

    return null;
  };

  const handleAuth = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (isSignUp) {
      const usernameError = validateUsername(username);
      if (usernameError) {
        Alert.alert('Error', usernameError);
        return;
      }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password, username.trim());
        // Alert.alert('Éxito', 'Cuenta creada. Revisa tu email para confirmar.');
      } else {
        await signIn(email, password);
      }

      // Verificar si hay plan seleccionado para navegar a PrePurchase
      if (route.params?.selectedPlan) {
        // Obtener el usuario actual directamente de supabase ya que el contexto puede tardar en actualizarse
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          navigation.navigate('PrePurchase', {
            user: authUser,
            selectedPlan: route.params.selectedPlan
          });
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
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
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </Text>
          <Text style={styles.subtitle}>
            {isSignUp
              ? 'Introduce tus datos para crear tu cuenta.'
              : 'Accede para sincronizar tu colección y sesiones.'}
          </Text>

          {isSignUp && (
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de usuario"
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
              placeholder="Correo electrónico"
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
              placeholder="Contraseña"
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
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleAuth}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchButton}
            onPress={() => setIsSignUp(!isSignUp)}
          >
            <Text style={styles.switchText}>
              {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Crear cuenta'}
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

    marginBottom: 80,
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
    backgroundColor: '#007AFF',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    shadowColor: '#007AFF',
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
});