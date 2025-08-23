import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import TasksScreen from '../screens/TasksScreen';
import MountainScreen from '../screens/MountainScreen';

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
          name="Tasks" 
          component={TasksScreen}
          options={{
            tabBarLabel: 'Tasks',
            tabBarIcon: ({ color }) => (
              <TaskIcon color={color} />
            ),
          }}
        />
        <Tab.Screen 
          name="Mountain" 
          component={MountainScreen}
          options={{
            tabBarLabel: 'Mountain',
            tabBarIcon: ({ color }) => (
              <MountainIcon color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Simple icon components (you can replace these with actual icons)
function TaskIcon({ color }: { color: string }) {
  return (
    <View style={{ 
      width: 24, 
      height: 24, 
      backgroundColor: color, 
      borderRadius: 4 
    }} />
  );
}

function MountainIcon({ color }: { color: string }) {
  return (
    <View style={{ 
      width: 24,
      height: 24,
      backgroundColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'flex-end',
    }}>
      <View style={{
        width: 0,
        height: 0,
        borderLeftWidth: 12,
        borderRightWidth: 12,
        borderBottomWidth: 20,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: color,
      }} />
    </View>
  );
}