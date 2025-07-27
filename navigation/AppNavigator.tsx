import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { SearchScreen } from '../screens/SearchScreen';
import { ProfileScreen } from '../screens/ProfileScreen';

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



const ProfileStack = () => (
  <Stack.Navigator>
    <Stack.Screen 
      name="Profile" 
      component={ProfileScreen}
      options={{ title: 'Perfil' }}
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
          name="ProfileTab" 
          component={ProfileStack}
          options={{ title: 'Perfil' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}; 