import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme, Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

import { SearchScreen } from '../screens/SearchScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { AddDiscScreen } from '../screens/AddDiscScreen';
import DashboardScreen from '../screens/DashboardScreen';
import { AdminScreen } from '../screens/AdminScreen';
import GemsScreen from '../screens/GemsScreen';
import ListsScreen from '../screens/ListsScreen';
import CreateListScreen from '../screens/CreateListScreen';
import ViewListScreen from '../screens/ViewListScreen';
import AddAlbumToListScreen from '../screens/AddAlbumToListScreen';
import EditListScreen from '../screens/EditListScreen';
import { CustomHeader } from '../components/CustomHeader';
import { AuthProvider } from '../contexts/AuthContext';
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
import { ThemeProvider, useThemeMode } from '../contexts/ThemeContext';

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

const ListsStack = () => (
  <Stack.Navigator>
    <Stack.Screen
      name="Lists"
      component={ListsScreen}
      options={{
        header: () => <CustomHeader title="Bothside" />
      }}
    />
    <Stack.Screen
      name="CreateList"
      component={CreateListScreen}
      options={{
        header: () => <CustomHeader title="Crear Estantería" showAvatar={false} />
      }}
    />
    <Stack.Screen
      name="ViewList"
      component={ViewListScreen}
      options={{
        header: () => <CustomHeader title="Ver Estantería" showAvatar={false} />
      }}
    />
    <Stack.Screen
      name="AddAlbumToList"
      component={AddAlbumToListScreen}
      options={{
        header: () => <CustomHeader title="Añadir a Estantería" showAvatar={false} />
      }}
    />
    <Stack.Screen
      name="EditList"
      component={EditListScreen}
      options={{
        header: () => <CustomHeader title="Editar Estantería" showAvatar={false} />
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
        } else if (route.name === 'ListsTab') {
          iconName = focused ? 'list' : 'list-outline';
        } else if (route.name === 'GemsTab') {
          iconName = focused ? 'diamond' : 'diamond-outline';
        }

        return <Ionicons name={iconName as any} size={route.name === 'AddDiscTab' ? size + 8 : size} color={color} />;
      },
      tabBarActiveTintColor: '#007AFF',
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
    <Tab.Screen name="ListsTab" component={ListsStack} options={{ title: '' }} />
    <Tab.Screen name="GemsTab" component={GemsStack} options={{ title: '' }} />
  </Tab.Navigator>
);

const ThemedNavigationContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mode } = useThemeMode();
  const theme = mode === 'dark' ? AppDarkTheme : DefaultTheme; // light remains existing
  return <NavigationContainer theme={theme}>{children}</NavigationContainer>;
};

const AppNavigator = () => (
  <ThemeProvider>
    <ThemedNavigationContainer>
      <AuthProvider>
        <GemsProvider>
          <StatsProvider>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Profile" component={ProfileStack} />
              <Stack.Screen name="AlbumDetail" component={AlbumDetailScreen} />
              <Stack.Screen name="AIChat" component={AIChatScreen} />
              <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
              <Stack.Screen
                name="SelectCell"
                component={SelectCellScreen}
                options={{
                  headerShown: true,
                  header: () => <CustomHeader title="Ubicar Vinilo" showBackButton={true} />
                }}
              />
            </Stack.Navigator>
          </StatsProvider>
        </GemsProvider>
      </AuthProvider>
    </ThemedNavigationContainer>
  </ThemeProvider>
);

export default AppNavigator; 