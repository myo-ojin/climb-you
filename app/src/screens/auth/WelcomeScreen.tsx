import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AuthStackScreenProps } from '../../types/navigation';

type Props = AuthStackScreenProps<'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <View className="flex-1 bg-gradient-to-b from-blue-50 to-white">
      {/* Header Section */}
      <View className="flex-1 justify-center items-center px-8">
        {/* App Logo Area */}
        <View className="items-center mb-12">
          <View className="w-24 h-24 bg-blue-500 rounded-full items-center justify-center mb-6">
            <Text className="text-4xl text-white font-bold">🏔️</Text>
          </View>
          
          <Text className="text-4xl font-bold text-gray-900 mb-2">
            Climb You
          </Text>
          
          <Text className="text-lg text-gray-600 text-center leading-6">
            AIがあなたを理解し、{'\n'}
            最適な成長の道筋を{'\n'}
            毎日提案します
          </Text>
        </View>

        {/* Tagline */}
        <View className="items-center mb-16">
          <Text className="text-base text-blue-600 font-semibold mb-2">
            Your AI-powered growth companion
          </Text>
          <Text className="text-sm text-gray-500">
            For your next step.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="px-8 pb-12">
        {/* Signup Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Signup')}
          className="bg-blue-500 rounded-xl py-4 mb-4 shadow-lg"
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            アカウントを作成
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Login')}
          className="bg-white border-2 border-gray-200 rounded-xl py-4"
          activeOpacity={0.8}
        >
          <Text className="text-gray-700 text-lg font-semibold text-center">
            ログイン
          </Text>
        </TouchableOpacity>

        {/* Terms and Privacy */}
        <Text className="text-xs text-gray-500 text-center mt-6 leading-4">
          続行することで、利用規約とプライバシーポリシーに{'\n'}
          同意したものとみなされます
        </Text>
      </View>
    </View>
  );
};