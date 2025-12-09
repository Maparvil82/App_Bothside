import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Alert } from 'react-native';
import { BothsideLoader } from './components/BothsideLoader';
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
    return <BothsideLoader />;
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
      <ThemeProvider>
        <SessionNoteProvider>
          <GemsProvider>
            <StatusBar style="auto" />
            <AppWithModal />
          </GemsProvider>
        </SessionNoteProvider>
      </ThemeProvider>
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
