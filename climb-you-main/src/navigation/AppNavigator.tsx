import React from 'react';
import { Image, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { RootStackParamList } from '../types';
import TasksScreen from '../screens/TasksScreen';
import MainScreen from '../screens/MainScreen';
import AddTaskScreen from '../screens/AddTaskScreen';
import ProfileScreen from '../screens/ProfileScreen';
import HistoryScreen from '../screens/HistoryScreen';

const Tab = createBottomTabNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#F3E7C9',
          tabBarInactiveTintColor: '#B9C3CF',
          tabBarStyle: {
            backgroundColor: '#0F2A44',
            borderTopColor: 'rgba(243, 231, 201, 0.2)',
            borderTopWidth: 1,
          },
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
                  tintColor: focused ? '#F3E7C9' : '#B9C3CF'
                }} 
              />
            ),
          }}
        />
        <Tab.Screen 
          name="Tasks" 
          component={TasksScreen}
          options={{
            tabBarLabel: 'クエスト',
            tabBarIcon: ({ focused }) => (
              <Image 
                source={require('../../assets/mountain-flag-icon.png')} 
                style={{ 
                  width: 24, 
                  height: 24,
                  tintColor: focused ? '#F3E7C9' : '#B9C3CF'
                }} 
              />
            ),
          }}
        />
         <Tab.Screen 
          name="AddTask" 
          component={AddTaskScreen}
          options={{
            tabBarLabel: '',
            tabBarIcon: () => (
              <View style={{
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#007AFF',
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                elevation: 5,
              }}>
                <View style={{
                  width: 24,
                  height: 3,
                  backgroundColor: '#fff',
                  borderRadius: 2,
                }} />
                <View style={{
                  width: 3,
                  height: 24,
                  backgroundColor: '#fff',
                  borderRadius: 2,
                  position: 'absolute',
                }} />
              </View>
            ),
          }}
        />
        <Tab.Screen 
          name="History" 
          component={HistoryScreen}
          options={{
            tabBarLabel: '履歴',
            tabBarIcon: ({ focused }) => (
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                backgroundColor: focused ? '#F3E7C9' : 'transparent',
                borderWidth: 2,
                borderColor: focused ? '#F3E7C9' : '#B9C3CF',
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <View style={{
                  width: 12,
                  height: 2,
                  backgroundColor: focused ? '#0F2A44' : '#B9C3CF',
                  marginBottom: 2,
                }} />
                <View style={{
                  width: 12,
                  height: 2,
                  backgroundColor: focused ? '#0F2A44' : '#B9C3CF',
                  marginBottom: 2,
                }} />
                <View style={{
                  width: 12,
                  height: 2,
                  backgroundColor: focused ? '#0F2A44' : '#B9C3CF',
                }} />
              </View>
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

