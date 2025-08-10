import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackScreenProps } from '../../types/navigation';

type Props = AuthStackScreenProps<'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { login, loading, error, clearError } = useAuth();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }

    try {
      clearError();
      await login({ email: email.trim(), password });
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  const handleForgotPassword = () => {
    if (!email.trim()) {
      Alert.alert('メールアドレスを入力', 'パスワードリセット用のメールアドレスを入力してください');
      return;
    }
    navigation.navigate('ForgotPassword');
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View className="pt-12 pb-8 px-6">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
          <Text className="text-blue-500 text-lg">← 戻る</Text>
        </TouchableOpacity>
        
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          ログイン
        </Text>
        <Text className="text-gray-600">
          Climb Youでの成長を続けましょう
        </Text>
      </View>

      {/* Form */}
      <View className="flex-1 px-6">
        {/* Error Message */}
        {error && (
          <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <Text className="text-red-700 text-sm">{error}</Text>
          </View>
        )}

        {/* Email Input */}
        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            メールアドレス
          </Text>
          <TextInput
            className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
            placeholder="your@example.com"
            placeholderTextColor="#9CA3AF"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
        </View>

        {/* Password Input */}
        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">
            パスワード
          </Text>
          <View className="relative">
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white pr-12"
              placeholder="パスワードを入力"
              placeholderTextColor="#9CA3AF"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!isPasswordVisible}
              autoComplete="password"
              editable={!loading}
            />
            <TouchableOpacity
              className="absolute right-4 top-3"
              onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              disabled={loading}
            >
              <Text className="text-gray-500 text-sm">
                {isPasswordVisible ? '隠す' : '表示'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Forgot Password */}
        <TouchableOpacity onPress={handleForgotPassword} disabled={loading}>
          <Text className="text-blue-500 text-sm text-right mb-8">
            パスワードを忘れた場合
          </Text>
        </TouchableOpacity>

        {/* Login Button */}
        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className={`rounded-xl py-4 mb-6 ${
            loading ? 'bg-gray-300' : 'bg-blue-500'
          }`}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            {loading ? 'ログイン中...' : 'ログイン'}
          </Text>
        </TouchableOpacity>

        {/* Signup Link */}
        <View className="flex-row justify-center items-center">
          <Text className="text-gray-600 text-base">
            アカウントをお持ちでない場合？{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Signup')} disabled={loading}>
            <Text className="text-blue-500 text-base font-semibold">
              新規登録
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};