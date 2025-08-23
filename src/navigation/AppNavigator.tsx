import React from 'react';
import { Image } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import TasksScreen from '../screens/TasksScreen';
import MainScreen from '../screens/MainScreen';

const Tab = createBottomTabNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tab.Screen 
          name="Main" 
          component={MainScreen}
          options={{
            tabBarLabel: 'ホーム',
            tabBarIcon: ({ focused }) => (
              <Image 
                source={require('../../assets/home-icon.png')} 
                style={{ 
                  width: 24, 
                  height: 24,
                  tintColor: focused ? '#007AFF' : '#666'
                }} 
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Tasks" 
          component={TasksScreen}
          options={{
            tabBarLabel: 'タスク',
            tabBarIcon: ({ focused }) => (
              <Image 
                source={require('../../assets/mountain-flag-icon.png')} 
                style={{ 
                  width: 24, 
                  height: 24,
                  tintColor: focused ? '#007AFF' : '#666'
                }} 
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Settings" 
          component={TasksScreen}
          options={{
            tabBarLabel: '設定',
            tabBarIcon: ({ focused }) => (
              <Image 
                source={require('../../assets/settings-icon.png')} 
                style={{ 
                  width: 24, 
                  height: 24,
                  tintColor: focused ? '#007AFF' : '#666'
                }} 
              />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}


