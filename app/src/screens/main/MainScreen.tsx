import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

export const MainScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="pt-12 pb-6 px-6 bg-blue-50">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              おかえりなさい
            </Text>
            <Text className="text-gray-600 mt-1">
              {user?.displayName || user?.email}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white border border-gray-200 rounded-lg px-4 py-2"
            activeOpacity={0.8}
          >
            <Text className="text-gray-700 font-medium">ログアウト</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 justify-center items-center px-8">
        <View className="items-center mb-12">
          <View className="w-32 h-32 bg-blue-500 rounded-full items-center justify-center mb-6">
            <Text className="text-6xl text-white">🏔️</Text>
          </View>
          
          <Text className="text-3xl font-bold text-gray-900 mb-4 text-center">
            Climb You
          </Text>
          
          <Text className="text-lg text-gray-600 text-center mb-2">
            MVP-004 認証UI実装完了！
          </Text>
          
          <Text className="text-base text-gray-500 text-center leading-6">
            次はMVP-005 基本ナビゲーション{'\n'}
            とMVP-006 プロファイリング機能を{'\n'}
            実装します
          </Text>
        </View>

        {/* User Info Card */}
        <View className="w-full bg-gray-50 rounded-xl p-6 mb-8">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            ユーザー情報
          </Text>
          
          <View className="space-y-3">
            <View className="flex-row justify-between">
              <Text className="text-gray-600">メールアドレス:</Text>
              <Text className="text-gray-900 font-medium">{user?.email}</Text>
            </View>
            
            {user?.displayName && (
              <View className="flex-row justify-between">
                <Text className="text-gray-600">表示名:</Text>
                <Text className="text-gray-900 font-medium">{user.displayName}</Text>
              </View>
            )}
            
            <View className="flex-row justify-between">
              <Text className="text-gray-600">メール認証:</Text>
              <Text className={`font-medium ${user?.emailVerified ? 'text-green-600' : 'text-orange-600'}`}>
                {user?.emailVerified ? '認証済み' : '未認証'}
              </Text>
            </View>
          </View>
        </View>

        {/* Next Features Preview */}
        <View className="w-full">
          <Text className="text-lg font-semibold text-gray-900 mb-4">
            実装予定の機能
          </Text>
          
          <View className="space-y-3">
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="font-semibold text-gray-900">🧭 ナビゲーション</Text>
              <Text className="text-gray-600 text-sm mt-1">
                タブナビゲーションとスタックナビゲーション
              </Text>
            </View>
            
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="font-semibold text-gray-900">🧠 プロファイリング</Text>
              <Text className="text-gray-600 text-sm mt-1">
                AI駆動の学習スタイル診断
              </Text>
            </View>
            
            <View className="bg-white border border-gray-200 rounded-lg p-4">
              <Text className="font-semibold text-gray-900">🎯 クエスト生成</Text>
              <Text className="text-gray-600 text-sm mt-1">
                パーソナライズされた日次クエスト
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};