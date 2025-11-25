import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';

import { SearchScreen } from '../screens/SearchScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddDiscScreen } from '../screens/AddDiscScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DjStatsDashboard from '../screens/DjStatsDashboard';
import { AdminScreen } from '../screens/AdminScreen';
import GemsScreen from '../screens/GemsScreen';
import MaletasScreen from '../screens/MaletasScreen';
import ViewMaletaScreen from '../screens/ViewMaletaScreen';
import EditMaletaScreen from '../screens/EditMaletaScreen';
import { CustomHeader } from '../components/CustomHeader';
import { useAuth } from '../contexts/AuthContext';
import { GemsProvider } from '../contexts/GemsContext';
import { StatsProvider } from '../contexts/StatsContext';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import AIChatScreen from '../screens/AIChatScreen';
import ShelfConfigScreen from '../screens/ShelfConfigScreen';
import ShelvesListScreen from '../screens/ShelvesListScreen';
import ShelfEditScreen from '../screens/ShelfEditScreen';
import ShelfViewScreen from '../screens/ShelfViewScreen';
import SelectCellScreen from '../screens/SelectCellScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { PricingScreen } from '../screens/PricingScreen';
import { FeedbackScreen } from '../screens/FeedbackScreen';
import CalendarScreen from '../screens/CalendarScreen';
import { LegalScreen } from '../screens/LegalScreen';
import { AccountScreen } from '../screens/AccountScreen';
import { AudioScanScreen } from '../screens/AudioScanScreen';
import { ThemeProvider, useThemeMode } from '../contexts/ThemeContext';
import { CreateMaletaModalContext } from '../contexts/CreateMaletaModalContext';
import { CreateMaletaModal } from '../components/CreateMaletaModal';
import { ENABLE_AUDIO_SCAN } from '../config/features';
import { BothsideLoader } from '../components/BothsideLoader';
import { UserMaletaService } from '../services/database';
import { PrePurchaseScreen } from '../screens/PrePurchaseScreen';
import { Alert } from 'react-native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Custom dark theme keeping brand color
const AppDarkTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#0A84FF',
    background: '#121212',
    card: '#1E1E1E',
    text: '#FFFFFF',
    border: '#2C2C2C',
    notification: '#FF453A',
  },
};

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Search"
      component={SearchScreen}
      options={{
        header: () => <CustomHeader title="Bothside" />
      }}
    />
  </Stack.Navigator>
);

const GemsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Gems"
      component={GemsScreen}
      options={{
        header: () => <CustomHeader title="Bothside" />
      }}
    />
  </Stack.Navigator>
);

const MaletasStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Maletas"
      component={MaletasScreen}
      options={{
        header: () => <CustomHeader title="Bothside" />
      }}
    />
    <Stack.Screen
      name="ViewMaleta"
      component={ViewMaletaScreen}
      options={{
        header: () => <CustomHeader title="Ver Maleta" showAvatar={false} showBackButton={true} showCalendarIcon={false} />
      }}
    />
    <Stack.Screen
      name="EditMaleta"
      component={EditMaletaScreen}
      options={{
        header: () => <CustomHeader title="Editar Maleta" showAvatar={false} />
      }}
    />
  </Stack.Navigator>
);

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Dashboard"
      component={DashboardScreen}
      options={{
        header: () => <CustomHeader title="Bothside" />
      }}
    />
    <Stack.Screen
      name="DjStatsDashboard"
      component={DjStatsDashboard}
      options={{
        headerShown: true,
        header: () => <CustomHeader title="Panel DJ" showBackButton={true} />,
      }}
    />
    <Stack.Screen
      name="ShelvesList"
      component={ShelvesListScreen}
      options={{
        title: 'Mis Estanterías',
        header: () => <CustomHeader title="Mis Estanterías" showAvatar={false} />
      }}
    />
    <Stack.Screen
      name="ShelfEdit"
      component={ShelfEditScreen}
      options={{
        // El título se establece dinámicamente en la pantalla
        header: () => <CustomHeader title="" showAvatar={false} />
      }}
    />
    <Stack.Screen
      name="ShelfView"
      component={ShelfViewScreen}
      options={({ route }: any) => ({
        title: route.params?.shelfName || 'Estantería',
        header: () => <CustomHeader title={route.params?.shelfName || 'Estantería'} showBackButton={true} />
      })}
    />
  </Stack.Navigator>
);

const AddDiscStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="AddDisc"
      component={AddDiscScreen}
      options={{
        header: () => <CustomHeader title="Bothside" showAvatar={false} />
      }}
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="ProfileScreen"
      component={ProfileScreen}
      options={{
        title: 'Perfil',
        headerShown: true,
        headerBackTitle: 'Atrás'
      }}
    />
    <Stack.Screen
      name="Admin"
      component={AdminScreen}
      options={{ title: 'Administración' }}
    />
    <Stack.Screen
      name="Legal"
      component={LegalScreen}
      options={{
        title: 'Información Legal',
        headerShown: true,
        headerBackTitle: 'Atrás'
      }}
    />
    <Stack.Screen
      name="Feedback"
      component={FeedbackScreen}
      options={{
        title: 'Feedback',
        headerShown: true,
        headerBackTitle: 'Atrás'
      }}
    />
    <Stack.Screen
      name="Account"
      component={AccountScreen}
      options={{
        title: 'Cuenta',
        headerShown: true,
        headerBackTitle: 'Atrás'
      }}
    />
  </Stack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: string = 'help-outline';

        if (route.name === 'SearchTab') {
          iconName = focused ? 'disc' : 'disc-outline';
        } else if (route.name === 'DashboardTab') {
          iconName = focused ? 'stats-chart' : 'stats-chart-outline';
        } else if (route.name === 'AddDiscTab') {
          iconName = focused ? 'add' : 'add';
        } else if (route.name === 'MaletasTab') {
          iconName = focused ? 'cube' : 'cube-outline';
        } else if (route.name === 'GemsTab') {
          iconName = focused ? 'diamond' : 'diamond-outline';
        }

        return <Ionicons name={iconName as any} size={route.name === 'AddDiscTab' ? size + 8 : size} color={color} />;
      },
      tabBarActiveTintColor: '#0f0f0fff',
      tabBarInactiveTintColor: 'gray',
      headerShown: false,
      tabBarStyle: {
        height: 80,
        paddingTop: 14,
        justifyContent: 'center',
        alignItems: 'center',
      },
    })}
  >
    <Tab.Screen name="SearchTab" component={SearchStack} options={{ title: '' }} />
    <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: '' }} />
    <Tab.Screen name="AddDiscTab" component={AddDiscStack} options={{ title: '' }} />
    <Tab.Screen name="MaletasTab" component={MaletasStack} options={{ title: '' }} />
    <Tab.Screen name="GemsTab" component={GemsStack} options={{ title: '' }} />
  </Tab.Navigator>
);

const ThemedNavigationContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useThemeMode();
  const theme = mode === 'dark' ? AppDarkTheme : DefaultTheme; // light remains existing

  // Configuración de deep linking
  const linking = {
    prefixes: [Linking.createURL('/'), 'bothside://'],
    config: {
      screens: {
        Main: 'main',

        // Tabs reales
        SearchTab: 'search',
        DashboardTab: 'dashboard',
        AddDiscTab: 'add-disc',
        MaletasTab: 'maletas',
        GemsTab: 'gems',

        // Otras pantallas
        AlbumDetail: 'album/:albumId',
        AIChat: 'ai-chat',
        Leaderboard: 'leaderboard',
        Profile: 'profile',
        Account: 'account',
        AudioScan: 'audio-scan',
      },
    },
  };
  return (
    <NavigationContainer
      theme={theme}
      linking={linking}
      fallback={<BothsideLoader />}
    >
      {children}
    </NavigationContainer>
  );
};

// Wrapper para las pantallas principales con StatsProvider
const MainAppWrapper = () => (
  <StatsProvider>
    <TabNavigator />
  </StatsProvider>
);

const AppNavigator = () => {
  const { user, loading } = useAuth();

  // Global modal state
  const [isCreateMaletaVisible, setIsCreateMaletaVisible] = useState(false);
  const [initialAlbumId, setInitialAlbumId] = useState<string | null>(null);
  const [onMaletaCreatedCallback, setOnMaletaCreatedCallback] = useState<(() => void) | null>(null);
  const [creatingMaleta, setCreatingMaleta] = useState(false);

  // Function to open modal with optional album ID and success callback
  const openCreateMaletaModal = (albumId?: string, onSuccess?: () => void) => {
    setInitialAlbumId(albumId ?? null);
    if (onSuccess) {
      setOnMaletaCreatedCallback(() => onSuccess);
    }
    setIsCreateMaletaVisible(true);
  };

  // Function to set the callback
  const setOnMaletaCreated = (callback: (() => void) | null) => {
    setOnMaletaCreatedCallback(callback ? () => callback : null);
  };

  // Handler for creating maleta
  const handleCreateMaleta = async (
    data: { title: string; description?: string; is_public: boolean },
    albumId?: string
  ) => {
    if (!user) {
      Alert.alert('Error', 'Debes iniciar sesión para crear una maleta');
      return;
    }

    try {
      setCreatingMaleta(true);
      const newMaleta = await UserMaletaService.createMaleta({
        title: data.title,
        description: data.description,
        is_public: data.is_public,
        user_id: user.id,
      });

      console.log('✅ AppNavigator: Maleta created successfully:', newMaleta);

      // If albumId is provided, add the album to the newly created maleta
      if (albumId) {
        console.log('➕ AppNavigator: Adding album to new maleta:', albumId);
        await UserMaletaService.addAlbumToMaleta(newMaleta.id, albumId);
        Alert.alert('Éxito', 'Maleta creada y álbum añadido correctamente');
      } else {
        Alert.alert('Éxito', 'Maleta creada correctamente');
      }

      setIsCreateMaletaVisible(false);
      setInitialAlbumId(null);

      // Call the success callback if it exists
      if (onMaletaCreatedCallback) {
        onMaletaCreatedCallback();
        setOnMaletaCreatedCallback(null);
      }
    } catch (error: any) {
      console.error('❌ AppNavigator: Error creating maleta:', error);
      Alert.alert('Error', `No se pudo crear la maleta: ${error?.message || 'Error desconocido'}`);
    } finally {
      setCreatingMaleta(false);
    }
  };

  // Mostrar loading mientras se verifica la autenticación
  if (loading) {
    return null; // O un componente de loading
  }

  return (
    <CreateMaletaModalContext.Provider value={{
      isCreateMaletaVisible,
      initialAlbumId,
      setIsCreateMaletaVisible,
      openCreateMaletaModal,
      setOnMaletaCreated
    }}>
      <ThemeProvider>
        <ThemedNavigationContainer>
          <GemsProvider>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              {user ? (

                <>
                  <Stack.Screen name="Main" component={MainAppWrapper} />

                  <Stack.Screen name="Profile" component={ProfileStack} />
                  <Stack.Screen
                    name="AlbumDetail"
                    component={AlbumDetailScreen}
                    options={{
                      header: () => <CustomHeader title="Detalle del Álbum" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="AIChat"
                    component={AIChatScreen}
                    options={{
                      header: () => <CustomHeader title="Chat IA" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="Leaderboard"
                    component={LeaderboardScreen}
                    options={{
                      header: () => <CustomHeader title="Ranking" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="ViewMaleta"
                    component={ViewMaletaScreen}
                    options={{
                      header: () => <CustomHeader title="Ver Maleta" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="EditMaleta"
                    component={EditMaletaScreen}
                    options={{
                      header: () => <CustomHeader title="Editar Maleta" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="Account"
                    component={AccountScreen}
                    options={{
                      header: () => <CustomHeader title="Cuenta" showAvatar={false} />
                    }}
                  />
                  <Stack.Screen
                    name="Calendar"
                    component={CalendarScreen}
                    options={{
                      headerShown: true,
                      header: () => <CustomHeader title="Calendario" showBackButton={true} showCalendarIcon={false} />
                    }}
                  />
                  {ENABLE_AUDIO_SCAN && (
                    <Stack.Screen
                      name="AudioScan"
                      component={AudioScanScreen}
                      options={{
                        header: () => <CustomHeader title="Escaneo de Audio" showAvatar={false} />
                      }}
                    />
                  )}
                  <Stack.Screen
                    name="SelectCell"
                    component={SelectCellScreen}
                    options={{
                      headerShown: true,
                      header: () => <CustomHeader title="Ubicar Vinilo" showBackButton={true} showCalendarIcon={false} />
                    }}
                  />
                </>
              ) : (

                <>
                  <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                  <Stack.Screen name="Login" component={LoginScreen} />
                  <Stack.Screen name="Pricing" component={PricingScreen} />
                  <Stack.Screen name="Legal" component={LegalScreen} />
                </>
              )}


              <Stack.Screen name="PrePurchase" component={PrePurchaseScreen} />
            </Stack.Navigator>

            {/* Modal Global - Fuera del Stack Navigator */}
            <CreateMaletaModal
              visible={isCreateMaletaVisible}
              onClose={() => setIsCreateMaletaVisible(false)}
              onSubmit={handleCreateMaleta}
              loading={creatingMaleta}
              initialAlbumId={initialAlbumId ?? undefined}
            />
          </GemsProvider>
        </ThemedNavigationContainer>
      </ThemeProvider>
    </CreateMaletaModalContext.Provider>
  );
};

export default AppNavigator;