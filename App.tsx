import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GemsProvider } from './contexts/GemsContext';
import { SessionNoteProvider, useSessionNoteModal } from './contexts/SessionNoteContext';
import { AddSessionNoteModal } from './components/AddSessionNoteModal';
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

  return <AppNavigator />;
};

const AppWithModal: React.FC = () => {
  const { isModalVisible, sessionId, closeSessionNoteModal } = useSessionNoteModal();

  return (
    <>
      <AppContent />
      <AddSessionNoteModal
        visible={isModalVisible}
        sessionId={sessionId}
        onClose={closeSessionNoteModal}
      />
    </>
  );
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
      <SessionNoteProvider>
        <GemsProvider>
          <StatusBar style="auto" />
          <AppWithModal />
        </GemsProvider>
      </SessionNoteProvider>
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
