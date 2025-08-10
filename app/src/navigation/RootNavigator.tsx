import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, ActivityIndicator, Text } from 'react-native';

import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { AuthStackNavigator } from './AuthStackNavigator';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createStackNavigator<RootStackParamList>();

// Loading Screen Component
const LoadingScreen: React.FC = () => (
  <View className="flex-1 bg-white items-center justify-center">
    <View className="items-center">
      {/* App Logo */}
      <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-6">
        <Text className="text-4xl text-white font-bold">🏔️</Text>
      </View>
      
      {/* Loading Indicator */}
      <ActivityIndicator size="large" color="#3b82f6" />
      
      <Text className="text-lg font-semibold text-gray-900 mt-4">
        Climb You
      </Text>
      <Text className="text-base text-gray-600 mt-2">
        読み込み中...
      </Text>
    </View>
  </View>
);

export const RootNavigator: React.FC = () => {
  const { user, loading } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: 'white' },
        }}
      >
        {loading ? (
          // Show loading screen while checking auth state
          <Stack.Screen 
            name="Loading" 
            component={LoadingScreen} 
          />
        ) : user ? (
          // User is authenticated, show main app
          <Stack.Screen 
            name="Main" 
            component={MainTabNavigator} 
          />
        ) : (
          // User is not authenticated, show auth flow
          <Stack.Screen 
            name="Auth" 
            component={AuthStackNavigator} 
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};