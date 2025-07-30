import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GemsProvider } from './contexts/GemsContext';
import AppNavigator from './navigation/AppNavigator';
import { LoginScreen } from './screens/LoginScreen';
import { validateEnv } from './config/env';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return user ? <AppNavigator /> : <LoginScreen />;
};

export default function App() {
  React.useEffect(() => {
    if (!validateEnv()) {
      Alert.alert(
        'Error de Configuración',
        'Por favor, configura las variables de entorno en config/env.ts antes de ejecutar la aplicación.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  return (
    <AuthProvider>
      <GemsProvider>
        <StatusBar style="auto" />
        <AppContent />
      </GemsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
