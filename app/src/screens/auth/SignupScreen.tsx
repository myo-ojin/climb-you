import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackScreenProps } from '../../types/navigation';

type Props = AuthStackScreenProps<'Signup'>;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signup, loading, error, clearError } = useAuth();

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return false;
    }

    if (!email.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return false;
    }

    if (!password.trim()) {
      Alert.alert('エラー', 'パスワードを入力してください');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('エラー', 'パスワードは6文字以上で入力してください');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('エラー', 'パスワードが一致しません');
      return false;
    }

    if (!displayName.trim()) {
      Alert.alert('エラー', '表示名を入力してください');
      return false;
    }

    if (!agreedToTerms) {
      Alert.alert('エラー', '利用規約とプライバシーポリシーに同意してください');
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      clearError();
      await signup({ 
        email: email.trim(), 
        password, 
        displayName: displayName.trim() 
      });
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  return (
    <KeyboardAvoidingView 
      className="flex-1 bg-white" 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="pt-12 pb-8 px-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <Text className="text-blue-500 text-lg">← 戻る</Text>
          </TouchableOpacity>
          
          <Text className="text-3xl font-bold text-gray-900 mb-2">
            アカウント作成
          </Text>
          <Text className="text-gray-600">
            Climb Youで成長の旅を始めましょう
          </Text>
        </View>

        {/* Form */}
        <View className="px-6 pb-8">
          {/* Error Message */}
          {error && (
            <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <Text className="text-red-700 text-sm">{error}</Text>
            </View>
          )}

          {/* Display Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              表示名
            </Text>
            <TextInput
              className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white"
              placeholder="山田太郎"
              placeholderTextColor="#9CA3AF"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              editable={!loading}
            />
          </View>

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
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              パスワード
            </Text>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white pr-12"
                placeholder="6文字以上のパスワード"
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

          {/* Confirm Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              パスワード確認
            </Text>
            <View className="relative">
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 text-base bg-white pr-12"
                placeholder="パスワードを再入力"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!isConfirmPasswordVisible}
                editable={!loading}
              />
              <TouchableOpacity
                className="absolute right-4 top-3"
                onPress={() => setIsConfirmPasswordVisible(!isConfirmPasswordVisible)}
                disabled={loading}
              >
                <Text className="text-gray-500 text-sm">
                  {isConfirmPasswordVisible ? '隠す' : '表示'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms and Conditions */}
          <View className="mb-8">
            <TouchableOpacity
              className="flex-row items-start"
              onPress={() => setAgreedToTerms(!agreedToTerms)}
              disabled={loading}
            >
              <View className={`w-5 h-5 border-2 rounded mr-3 mt-0.5 items-center justify-center ${
                agreedToTerms ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}>
                {agreedToTerms && (
                  <Text className="text-white text-xs">✓</Text>
                )}
              </View>
              <View className="flex-1">
                <Text className="text-sm text-gray-700 leading-5">
                  <Text className="text-blue-500">利用規約</Text>
                  と
                  <Text className="text-blue-500">プライバシーポリシー</Text>
                  に同意します
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            onPress={handleSignup}
            disabled={loading}
            className={`rounded-xl py-4 mb-6 ${
              loading ? 'bg-gray-300' : 'bg-blue-500'
            }`}
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              {loading ? 'アカウント作成中...' : 'アカウントを作成'}
            </Text>
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center items-center">
            <Text className="text-gray-600 text-base">
              すでにアカウントをお持ちですか？{' '}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} disabled={loading}>
              <Text className="text-blue-500 text-base font-semibold">
                ログイン
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};