import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme, getFocusedRouteNameFromRoute, useTheme } from '@react-navigation/native';
import { HeaderBackButton } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import * as Linking from 'expo-linking';
import { useTranslation } from '../src/i18n/useTranslation';

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
import InviteCollaboratorsScreen from '../screens/collaboration/InviteCollaboratorsScreen';
import InvitationsScreen from '../screens/collaboration/InvitationsScreen';
import { HeaderAvatar, HeaderCalendar } from '../components/HeaderComponents';
import { useAuth } from '../contexts/AuthContext';
import { GemsProvider } from '../contexts/GemsContext';
import { StatsProvider } from '../contexts/StatsContext';
import AlbumDetailScreen from '../screens/AlbumDetailScreen';
import ShelfConfigScreen from '../screens/ShelfConfigScreen';
import ShelvesListScreen from '../screens/ShelvesListScreen';
import ShelfEditScreen from '../screens/ShelfEditScreen';
import ShelfViewScreen from '../screens/ShelfViewScreen';
import SelectCellScreen from '../screens/SelectCellScreen';
import LeaderboardScreen from '../screens/LeaderboardScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { LoginScreen } from '../screens/LoginScreen';

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
import { UserMaletaService, UserCollectionService } from '../services/database';
import { CameraScanScreen } from '../screens/CameraScanScreen';
import { BarcodeScanScreen } from '../screens/BarcodeScanScreen';
import { AICreditsStoreScreen } from '../screens/AICreditsStoreScreen';
import { Alert } from 'react-native';
import { DarkModeWIPModal } from '../components/DarkModeWIPModal';
import AuthCallbackScreen from '../src/auth/AuthCallbackScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { PaywallScreen } from '../screens/PaywallScreen';
import { SubscriptionProvider, useSubscription } from '../contexts/SubscriptionContext';
import { AnalyticsService } from '../services/analytics';
import { CreditsProvider } from '../contexts/CreditsContext';
import Svg, { Rect, Line } from 'react-native-svg';

const ShelvesTabIcon: React.FC<{ color: string; size: number; focused: boolean }> = ({ color, size, focused }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer Cabinet Frame */}
      <Rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="2.5"
        stroke={color}
        strokeWidth={focused ? 2.4 : 1.8}
        fill={focused ? `${color}15` : "none"}
      />
      {/* Partition Lines */}
      <Line
        x1="12"
        y1="2"
        x2="12"
        y2="22"
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      <Line
        x1="2"
        y1="12"
        x2="22"
        y2="12"
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      
      {/* Top-Left Shelf Vinyls (leaning) */}
      <Line
        x1={5.5}
        y1={4.5}
        x2={6.5}
        y2={9.5}
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      <Line
        x1={7.5}
        y1={4.5}
        x2={8.5}
        y2={9.5}
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      <Line
        x1={9.5}
        y1={4.5}
        x2={10.5}
        y2={9.5}
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />

      {/* Bottom-Right Shelf Vinyls (leaning) */}
      <Line
        x1={14.5}
        y1={14.5}
        x2={15.5}
        y2={19.5}
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      <Line
        x1={16.5}
        y1={14.5}
        x2={17.5}
        y2="19.5"
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
      <Line
        x1={18.5}
        y1={14.5}
        x2={19.5}
        y2={19.5}
        stroke={color}
        strokeWidth={focused ? 1.8 : 1.2}
      />
    </Svg>
  );
};

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

// ... (previous imports)

// Group of screens accessible from Profile (to keep them in the current Tab Stack)
const ProfileScreensGroup = () => {
  const { colors } = useTheme();
  return (
    <>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          title: 'Perfil',
          headerShown: true,
          headerTintColor: colors.text,
          headerBackTitle: '',
          headerLeft: (props) => (
            <HeaderBackButton
              {...props}
              onPress={() => navigation.goBack()}
              tintColor={colors.text}
              label=""
            />
          )
        })}
      />
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          title: 'Administración',
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={{
          title: 'Información Legal',
          headerShown: true,
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="Feedback"
        component={FeedbackScreen}
        options={{
          title: 'Feedback',
          headerShown: true,
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: 'Cuenta',
          headerShown: true,
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />
      <Stack.Screen
        name="Invitations"
        component={InvitationsScreen}
        options={{
          title: 'Invitaciones',
          headerShown: true,
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />
    </>
  );
};


const SearchStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{
          title: 'Bothside',
          headerRight: () => <HeaderAvatar />,
        }}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const GemsStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="Gems"
        component={GemsScreen}
        options={({ navigation }) => ({
          title: 'Bothside',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => <HeaderAvatar />,
        })}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const MaletasStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="Maletas"
        component={MaletasScreen}
        options={({ navigation }) => ({
          title: 'Bothside',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="ViewMaleta"
        component={ViewMaletaScreen}
        options={({ route }: any) => ({
          title: route.params?.listTitle || 'Ver Maleta',
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="EditMaleta"
        component={EditMaletaScreen}
        options={{ title: 'Editar Maleta' }}
      />
      <Stack.Screen
        name="InviteCollaborators"
        component={InviteCollaboratorsScreen}
        options={{ title: 'Invitar Colaboradores' }}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const DashboardStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={({ navigation }) => ({
          title: 'Bothside',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="DjStatsDashboard"
        component={DjStatsDashboard}
        options={{ title: 'Panel DJ' }}
      />
      <Stack.Screen
        name="ShelvesList"
        component={ShelvesListScreen}
        options={({ navigation }) => ({
          title: 'Mis Estanterías',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen
        name="ShelfView"
        component={ShelfViewScreen}
        options={({ route }: any) => ({
          title: route.params?.shelfName || 'Estantería'
        })}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const AddDiscStack = () => {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="AddDisc"
        component={AddDiscScreen}
        options={({ navigation }) => ({
          title: 'Bothside',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="CameraScan"
        component={CameraScanScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BarcodeScan"
        component={BarcodeScanScreen}
        options={{ headerShown: false }}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const ShelvesStack = () => {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      <Stack.Screen
        name="ShelvesList"
        component={ShelvesListScreen}
        options={({ navigation }) => ({
          title: t('tab_locations') || 'Locations',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="ShelfView"
        component={ShelfViewScreen}
        options={({ route }: any) => ({
          title: route.params?.shelfName || 'Estantería'
        })}
      />
      {ProfileScreensGroup()}
    </Stack.Navigator>
  );
};

const TabNavigator = () => {
  const { subscriptionStatus } = useSubscription();
  const { user } = useAuth();
  const isCheckingRef = React.useRef(false);

  const handleAddDiscTabPress = async (navigation: any, e: any) => {
    // Always intercept so we can run async checks
    e.preventDefault();

    // Debounce: ignore tap while already checking
    if (isCheckingRef.current) return;

    const isPro = subscriptionStatus === 'active';

    // Pro users: let them through immediately
    if (isPro) {
      navigation.navigate('AddDiscTab');
      return;
    }

    // Free users: check against limit
    try {
      isCheckingRef.current = true;

      if (!user) {
        // Unauthenticated (shouldn't happen in main app, but be safe)
        navigation.navigate('AddDiscTab');
        return;
      }

      const count = await UserCollectionService.getUserCollectionCount(user.id);

      AnalyticsService.track('add_album_pressed', {
        is_pro: isPro,
        albums_count: count,
        free_album_limit: FREE_ALBUM_LIMIT,
      });

      if (count >= FREE_ALBUM_LIMIT) {
        // Block and show paywall
        AnalyticsService.track('add_album_blocked_free_limit', {
          albums_count: count,
          free_album_limit: FREE_ALBUM_LIMIT,
          source: 'add_album_limit',
        });
        // Navigate to Paywall in the parent AppStack
        navigation.getParent()?.navigate('Paywall');
        return;
      }

      // Under limit: allow
      AnalyticsService.track('add_album_allowed_free', {
        albums_count: count,
        free_album_limit: FREE_ALBUM_LIMIT,
      });
      navigation.navigate('AddDiscTab');
    } catch (error) {
      console.error('[AddDiscGate] Error checking album limit:', error);
      Alert.alert('Error', 'No se pudo verificar tu colección. Inténtalo de nuevo.');
    } finally {
      isCheckingRef.current = false;
    }
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          if (route.name === 'ShelvesTab') {
            return <ShelvesTabIcon color={color} size={size} focused={focused} />;
          }

          let iconName: string = 'help-outline';

          if (route.name === 'SearchTab') {
            iconName = focused ? 'disc' : 'disc-outline';
          } else if (route.name === 'DashboardTab') {
            iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          } else if (route.name === 'AddDiscTab') {
            iconName = focused ? 'add' : 'add';
          } else if (route.name === 'MaletasTab') {
            iconName = focused ? 'bag-remove' : 'bag-remove-outline';
          } else if (route.name === 'GemsTab') {
            iconName = focused ? 'diamond' : 'diamond-outline';
          }

          return <Ionicons name={iconName as any} size={route.name === 'AddDiscTab' ? size + 8 : size} color={color} />;
        },
        tabBarActiveTintColor: '#0f0f0fff',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarShowLabel: false,
        tabBarItemStyle: {
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: 12,
        },
        tabBarStyle: {
          height: 80,
          width: '100%',

        },
      })}
    >
      <Tab.Screen name="SearchTab" component={SearchStack} options={{ title: '' }} />
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: '' }} />
      <Tab.Screen
        name="ShelvesTab"
        component={ShelvesStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'ShelvesList';
          if (routeName === 'ShelfEdit' || routeName === 'ShelfView') {
            return {
              title: '',
              tabBarStyle: { display: 'none' }
            };
          }
          return { title: '' };
        }}
      />
      <Tab.Screen
        name="MaletasTab"
        component={MaletasStack}
        options={({ route }) => {
          const routeName = getFocusedRouteNameFromRoute(route) ?? 'Maletas';
          if (routeName === 'ViewMaleta' || routeName === 'InviteCollaborators') {
            return {
              title: '',
              tabBarStyle: { display: 'none' }
            };
          }
          return { title: '' };
        }}
      />
      <Tab.Screen name="GemsTab" component={GemsStack} options={{ title: '' }} />
      <Tab.Screen
        name="AddDiscTab"
        component={AddDiscStack}
        options={{
          title: '',
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none' },
          tabBarStyle: { display: 'none' }
        }}
      />
    </Tab.Navigator>
  );
};

const ThemedNavigationContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useThemeMode();
  const theme = mode === 'dark' ? AppDarkTheme : DefaultTheme; // light remains existing

  // Configuración de deep linking
  const linking = {
    prefixes: [Linking.createURL('/'), 'bothside://', 'appbothside://'],
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

        Leaderboard: 'leaderboard',
        Profile: 'profile',
        Account: 'account',
        AudioScan: 'audio-scan',
        AuthCallback: 'auth/callback',
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
const MainAppWrapper = () => {
  return (
    <StatsProvider>
      <View style={{ flex: 1 }}>
        <TabNavigator />
      </View>
    </StatsProvider>
  );
};

// ... imports
// Removed PricingScreen and PrePurchaseScreen imports

// ... AppStack

// Limit for free users
const FREE_ALBUM_LIMIT = 5;

const AppStack = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { subscriptionStatus, hasSeenOnboarding, isLoading } = useSubscription();

  console.log('🔄 AppStack Render:', { hasSeenOnboarding, subscriptionStatus, user: !!user });

  if (isLoading) {
    return <BothsideLoader />;
  }

  // 1. Onboarding Check — show only for non-authenticated users
  if (!hasSeenOnboarding) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }

  // 2. Auth Check — not logged in → Login
  // Paywall is NO LONGER a mandatory gate here.
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} initialParams={{ isSignUp: true }} />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ title: 'Información Legal', headerShown: true }} />
        <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      </Stack.Navigator>
    );
  }

  // 3. Auth Check (If in Trial but not logged in? Trial starts -> User creation usually happens after or during)
  // In our flow: Start Trial -> Login/Register.
  // If subStatus is 'trial' but !user -> Show Login.
  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} initialParams={{ isSignUp: true }} />
        <Stack.Screen name="Legal" component={LegalScreen} options={{ title: 'Información Legal', headerShown: true }} />
        <Stack.Screen name="AuthCallback" component={AuthCallbackScreen} />
      </Stack.Navigator>
    );
  }

  // 3. Main App — authenticated (free or paid). Paywall shown via usage gate, not here.
  return (
    <Stack.Navigator
      screenOptions={{
        headerBackTitle: '',
        headerTintColor: colors.text,
        headerShown: true,
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
      }}
    >
      {/* ✅ USUARIO AUTENTICADO (libre o Pro) */}
      <Stack.Screen name="Main" component={MainAppWrapper} options={{ headerShown: false }} />

      {/* Paywall accesible desde la app (límite de discos) */}
      <Stack.Screen name="Paywall" component={PaywallScreen} options={{ headerShown: false, presentation: 'modal' }} />
      {/* Login en stack principal para que PaywallScreen pueda navegar a él tras compra */}
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="AlbumDetail"
        component={AlbumDetailScreen}
        options={{
          headerShown: true,
          title: 'Detalle del Álbum'
        }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Ranking',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />
      {/* ViewMaleta moved to inside MaletasStack usually, but kept here for deep links if needed, duplicates ok */}
      <Stack.Screen
        name="ViewMaleta"
        component={ViewMaletaScreen}
        options={({ route }: any) => ({
          headerShown: true,
          title: route.params?.listTitle || 'Ver Maleta',
          headerRight: () => <HeaderAvatar />,
        })}
      />
      <Stack.Screen
        name="EditMaleta"
        component={EditMaletaScreen}
        options={{
          headerShown: true,
          title: 'Editar Maleta'
        }}
      />

      {/* Account screen kept in global stack for direct access if needed, but primarily accessed via profile inside tabs */}
      <Stack.Screen
        name="Account"
        component={AccountScreen}
        options={{
          headerShown: true,
          title: 'Cuenta'
        }}
      />

      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          headerShown: true,
          title: 'Calendario'
        }}
      />
      {ENABLE_AUDIO_SCAN && (
        <Stack.Screen
          name="AudioScan"
          component={AudioScanScreen}
          options={{
            headerShown: true,
            title: 'Escaneo de Audio'
          }}
        />
      )}
      <Stack.Screen
        name="SelectCell"
        component={SelectCellScreen}
        options={{
          headerShown: true,
          title: 'Ubicar Vinilo'
        }}
      />
      <Stack.Screen
        name="ShelfEdit"
        component={ShelfEditScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: 'Estantería',
          headerLeft: () => (
            <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingHorizontal: 12 }}>
              <Ionicons name="chevron-back-outline" size={24} color={colors.text} />
            </TouchableOpacity>
          ),
        })}
      />

      {/* Admin Screen accessible if needed */}
      <Stack.Screen
        name="Admin"
        component={AdminScreen}
        options={{
          title: 'Administración',
          headerTintColor: colors.text,
          headerBackTitle: '',
        }}
      />

      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Asistente AI',
          headerShown: true
        }}
      />

      <Stack.Screen
        name="AICreditsStore"
        component={AICreditsStoreScreen}
        options={{
          presentation: 'modal',
          headerShown: false
        }}
      />
    </Stack.Navigator>
  );
};


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
    data: { title: string; description?: string; is_public: boolean; is_collaborative?: boolean },
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
        is_collaborative: data.is_collaborative,
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
    return <BothsideLoader />;
  }

  // NOTE: Moving SubscriptionProvider inside here or wrapping outside?
  // It uses useAuth, so it must be inside AuthProvider (which is in App.tsx).
  // AppNavigator is child of AuthProvider in App.tsx, so we can wrap here or in App.tsx.
  // The plan said "Wrap app in SubscriptionProvider". 
  // Let's do it in App.tsx to be cleaner, but I can do it here too.
  // I will wrap here to minimize file edits.

  return (
    <CreateMaletaModalContext.Provider value={{
      isCreateMaletaVisible,
      initialAlbumId,
      setIsCreateMaletaVisible,
      openCreateMaletaModal,
      setOnMaletaCreated
    }}>
      <ThemeProvider>
        <SubscriptionProvider>
          <ThemedNavigationContainer>
            <GemsProvider>
              <CreditsProvider>
                <AppStack />
                <DarkModeWIPModal />

                {/* Modal Global - Fuera del Stack Navigator */}
                <CreateMaletaModal
                  visible={isCreateMaletaVisible}
                  onClose={() => setIsCreateMaletaVisible(false)}
                  onSubmit={handleCreateMaleta}
                  loading={creatingMaleta}
                  initialAlbumId={initialAlbumId ?? undefined}
                />
              </CreditsProvider>
            </GemsProvider>
          </ThemedNavigationContainer>
        </SubscriptionProvider>
      </ThemeProvider>
    </CreateMaletaModalContext.Provider>
  );
};

export default AppNavigator;