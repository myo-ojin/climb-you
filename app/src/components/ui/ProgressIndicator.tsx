import React from 'react';
import { View, Text } from 'react-native';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles?: string[];
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
}) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <View className="mb-6">
      {/* Step indicator */}
      <View className="flex-row justify-center items-center mb-4">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <View key={stepNumber} className="flex-row items-center">
              <View className={`w-8 h-8 rounded-full items-center justify-center ${
                isCompleted 
                  ? 'bg-green-500' 
                  : isCurrent 
                    ? 'bg-blue-500' 
                    : 'bg-gray-300'
              }`}>
                <Text className={`text-sm font-bold ${
                  isCompleted || isCurrent ? 'text-white' : 'text-gray-600'
                }`}>
                  {isCompleted ? '✓' : stepNumber}
                </Text>
              </View>
              
              {stepNumber < totalSteps && (
                <View className={`w-8 h-1 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-gray-300'
                }`} />
              )}
            </View>
          );
        })}
      </View>

      {/* Progress bar */}
      <View className="bg-gray-200 h-2 rounded-full mb-2">
        <View 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </View>

      {/* Progress text */}
      <View className="flex-row justify-between items-center">
        <Text className="text-sm text-gray-600">
          ステップ {currentStep} / {totalSteps}
        </Text>
        <Text className="text-sm font-semibold text-blue-600">
          {Math.round(progress)}% 完了
        </Text>
      </View>

      {/* Current step title */}
      {stepTitles && stepTitles[currentStep - 1] && (
        <Text className="text-lg font-semibold text-gray-900 text-center mt-4">
          {stepTitles[currentStep - 1]}
        </Text>
      )}
    </View>
  );
};