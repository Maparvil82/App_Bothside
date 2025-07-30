import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const SearchStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Search" 
      component={SearchScreen}
      options={{ title: 'Colección' }}
    />
  </Stack.Navigator>
);

const GemsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Gems" 
      component={GemsScreen}
      options={{ title: 'Mis Gems' }}
    />
  </Stack.Navigator>
);

const ListsStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Lists" 
      component={ListsScreen}
      options={{ 
        title: 'Mis Estanterías',
        headerLeft: () => null
      }}
    />
    <Stack.Screen 
      name="CreateList" 
      component={CreateListScreen}
      options={{ 
        title: 'Crear Lista',
        headerLeft: () => null
      }}
    />
    <Stack.Screen 
      name="ViewList" 
      component={ViewListScreen}
      options={{ 
        title: 'Mis Listas',
        headerShown: true,
        headerLeft: () => null
      }}
    />
    <Stack.Screen 
      name="AddAlbumToList" 
      component={AddAlbumToListScreen}
      options={{ 
        title: 'Añadir Álbumes',
        headerLeft: () => null
      }}
    />
    <Stack.Screen 
      name="EditList" 
      component={EditListScreen}
      options={{ 
        title: 'Editar Lista',
        headerLeft: () => null
      }}
    />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Perfil' }}
    />
    <Stack.Screen 
      name="Admin" 
      component={AdminScreen}
      options={{ title: 'Administración' }}
    />
  </Stack.Navigator>
);

const DashboardStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Dashboard" 
      component={DashboardScreen}
      options={{ title: 'Dashboard' }}
    />
  </Stack.Navigator>
);

const AddDiscStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="AddDisc" 
      component={AddDiscScreen}
      options={{ title: 'Añadir Disco' }}
    />
  </Stack.Navigator>
);

export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'SearchTab') {
              iconName = focused ? 'disc' : 'disc-outline';
            } else if (route.name === 'GemsTab') {
              iconName = focused ? 'diamond' : 'diamond-outline';
            } else if (route.name === 'ListsTab') {
              iconName = focused ? 'list' : 'list-outline';
            } else if (route.name === 'DashboardTab') {
              iconName = focused ? 'stats-chart' : 'stats-chart-outline';
            } else if (route.name === 'AddDiscTab') {
              iconName = focused ? 'add-circle' : 'add-circle-outline';
            } else if (route.name === 'ProfileTab') {
              iconName = focused ? 'person' : 'person-outline';
            } else {
              iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
        })}
      >
        <Tab.Screen 
          name="SearchTab" 
          component={SearchStack}
          options={{ title: 'Colección' }}
        />
        <Tab.Screen 
          name="GemsTab" 
          component={GemsStack}
          options={{ title: 'Gems' }}
        />
        <Tab.Screen 
          name="ListsTab" 
          component={ListsStack}
          options={{ title: 'Listas' }}
        />
        <Tab.Screen 
          name="DashboardTab" 
          component={DashboardStack}
          options={{ title: 'Dashboard' }}
        />
        <Tab.Screen 
          name="AddDiscTab" 
          component={AddDiscStack}
          options={{ title: 'Añadir' }}
        />
        <Tab.Screen 
          name="ProfileTab" 
          component={ProfileStack}
          options={{ title: 'Perfil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}; 