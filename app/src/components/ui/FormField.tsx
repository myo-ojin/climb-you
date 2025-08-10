import React from 'react';
import { View, Text, TextInput, TextInputProps } from 'react-native';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  required = false,
  description,
  ...textInputProps
}) => {
  return (
    <View className="mb-4">
      <Text className="text-base font-semibold text-gray-900 mb-2">
        {label}
        {required && <Text className="text-red-500 ml-1">*</Text>}
      </Text>
      
      {description && (
        <Text className="text-sm text-gray-600 mb-2">{description}</Text>
      )}
      
      <TextInput
        className={`border rounded-lg px-4 py-3 text-base ${
          error 
            ? 'border-red-500 bg-red-50' 
            : 'border-gray-300 bg-white focus:border-blue-500'
        }`}
        placeholderTextColor="#9ca3af"
        {...textInputProps}
      />
      
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
};