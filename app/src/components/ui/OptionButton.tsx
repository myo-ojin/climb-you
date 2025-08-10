import React from 'react';
import { TouchableOpacity, Text, View } from 'react-native';

interface OptionButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  description?: string;
  icon?: string;
  multiSelect?: boolean;
}

export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  selected,
  onPress,
  description,
  icon,
  multiSelect = false,
}) => {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`border-2 rounded-lg p-4 mb-3 ${
        selected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white'
      }`}
    >
      <View className="flex-row items-center">
        {icon && (
          <Text className="text-2xl mr-3">{icon}</Text>
        )}
        
        <View className="flex-1">
          <Text className={`text-base font-semibold ${
            selected ? 'text-blue-700' : 'text-gray-900'
          }`}>
            {label}
          </Text>
          
          {description && (
            <Text className={`text-sm mt-1 ${
              selected ? 'text-blue-600' : 'text-gray-600'
            }`}>
              {description}
            </Text>
          )}
        </View>
        
        <View className={`w-6 h-6 rounded-full border-2 ${
          selected 
            ? 'border-blue-500 bg-blue-500' 
            : 'border-gray-300 bg-white'
        } ${multiSelect ? 'rounded-md' : ''}`}>
          {selected && (
            <View className="flex-1 items-center justify-center">
              <Text className="text-white text-xs font-bold">
                {multiSelect ? '✓' : '●'}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};