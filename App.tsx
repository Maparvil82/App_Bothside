import React from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, Alert, Text } from 'react-native';
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
  const [isEnvValid, setIsEnvValid] = React.useState(true);

  React.useEffect(() => {
    if (!validateEnv()) {
      setIsEnvValid(false);
    }
  }, []);

  if (!isEnvValid) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="auto" />
        <View style={{ padding: 20, alignItems: 'center' }}>
          <BothsideLoader />
          <View style={{ height: 20 }} />
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Error de Configuración</Text>
          <Text style={{ textAlign: 'center', marginBottom: 20 }}>
            No se han detectado las variables de entorno. Por favor, configura las credenciales en EAS Secrets o en tu archivo .env.
          </Text>
        </View>
      </View>
    );
  }

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
