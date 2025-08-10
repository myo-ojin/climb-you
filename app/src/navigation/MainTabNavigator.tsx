import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types/navigation';
import { Text, View } from 'react-native';
import { TodayScreen } from '../screens/main/TodayScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { HistoryScreen as ActualHistoryScreen } from '../screens/history/HistoryScreen';

// Temporary placeholder screens (will be replaced with actual screens)

const GrowthScreen = () => (
  <View className="flex-1 bg-white items-center justify-center">
    <Text className="text-2xl font-bold text-gray-900 mb-2">Growth</Text>
    <Text className="text-base text-gray-600">AI成長分析 + 学習パターン</Text>
  </View>
);

const GoalsScreen = () => (
  <View className="flex-1 bg-white items-center justify-center">
    <Text className="text-2xl font-bold text-gray-900 mb-2">Goals</Text>
    <Text className="text-base text-gray-600">長期目標 + マイルストーン</Text>
  </View>
);


// SettingsScreen is now imported from actual implementation

const Tab = createBottomTabNavigator<MainTabParamList>();

export const MainTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
      initialRouteName="Today"
    >
      <Tab.Screen
        name="Today"
        component={TodayScreen}
        options={{
          tabBarLabel: 'ホーム',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ color, fontSize: 24 }}>
              {focused ? '🏠' : '🏡'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Growth"
        component={GrowthScreen}
        options={{
          tabBarLabel: '成長',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ color, fontSize: 24 }}>
              {focused ? '📈' : '📊'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsScreen}
        options={{
          tabBarLabel: '目標',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ color, fontSize: 24 }}>
              {focused ? '🎯' : '🎪'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={ActualHistoryScreen}
        options={{
          tabBarLabel: '履歴',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ color, fontSize: 24 }}>
              {focused ? '📚' : '📖'}
            </Text>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: '設定',
          tabBarIcon: ({ focused, color }) => (
            <Text style={{ color, fontSize: 24 }}>
              {focused ? '⚙️' : '🔧'}
            </Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};