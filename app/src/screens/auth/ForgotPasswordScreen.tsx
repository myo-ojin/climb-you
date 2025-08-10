import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { AuthStackScreenProps } from '../../types/navigation';

type Props = AuthStackScreenProps<'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { resetPassword, loading, error, clearError } = useAuth();

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('エラー', 'メールアドレスを入力してください');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('エラー', '有効なメールアドレスを入力してください');
      return;
    }

    try {
      clearError();
      await resetPassword(email.trim());
      setIsSubmitted(true);
    } catch (err) {
      // Error is handled by AuthContext
    }
  };

  if (isSubmitted) {
    return (
      <View className="flex-1 bg-white">
        {/* Header */}
        <View className="pt-12 pb-8 px-6">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mb-4">
            <Text className="text-blue-500 text-lg">← ログインに戻る</Text>
          </TouchableOpacity>
        </View>

        {/* Success Message */}
        <View className="flex-1 justify-center items-center px-8">
          <View className="w-20 h-20 bg-green-100 rounded-full items-center justify-center mb-8">
            <Text className="text-3xl">✉️</Text>
          </View>

          <Text className="text-2xl font-bold text-gray-900 mb-4 text-center">
            メールを送信しました
          </Text>

          <Text className="text-gray-600 text-center text-base leading-6 mb-8">
            {email} にパスワードリセット用のメールを送信しました。{'\n\n'}
            メール内のリンクをクリックしてパスワードを再設定してください。
          </Text>

          <Text className="text-sm text-gray-500 text-center leading-5">
            メールが届かない場合は、迷惑メールフォルダをご確認ください。
          </Text>
        </View>

        {/* Back Button */}
        <View className="px-6 pb-12">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="bg-blue-500 rounded-xl py-4"
            activeOpacity={0.8}
          >
            <Text className="text-white text-lg font-semibold text-center">
              ログイン画面に戻る
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
          パスワードリセット
        </Text>
        <Text className="text-gray-600">
          アカウントのメールアドレスを入力してください
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

        {/* Info Message */}
        <View className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <Text className="text-blue-700 text-sm">
            パスワードリセット用のメールをお送りします。メール内のリンクをクリックして新しいパスワードを設定してください。
          </Text>
        </View>

        {/* Email Input */}
        <View className="mb-8">
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

        {/* Reset Button */}
        <TouchableOpacity
          onPress={handleResetPassword}
          disabled={loading}
          className={`rounded-xl py-4 mb-8 ${
            loading ? 'bg-gray-300' : 'bg-blue-500'
          }`}
          activeOpacity={0.8}
        >
          <Text className="text-white text-lg font-semibold text-center">
            {loading ? '送信中...' : 'リセットメールを送信'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};