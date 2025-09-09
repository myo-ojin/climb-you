/**
 * Profile Question Card Component
 * Enhanced question component with memo functionality and branching support
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Question, QuestionOption } from '../types/onboardingQuestions';

interface ProfileQuestionCardProps {
  question: Question;
  selectedOptionId?: string;
  memo?: string;
  loading?: boolean;
  onOptionSelect: (optionId: string, value: string | number, dataKey: string) => void;
  onMemoChange: (memo: string) => void;
}

export const ProfileQuestionCard: React.FC<ProfileQuestionCardProps> = ({
  question,
  selectedOptionId,
  memo = '',
  loading = false,
  onOptionSelect,
  onMemoChange,
}) => {
  const [showMemoInput, setShowMemoInput] = useState(!!memo || false);

  const handleOptionPress = (option: QuestionOption) => {
    onOptionSelect(option.id, option.value, option.dataKey);
  };

  const toggleMemoInput = () => {
    setShowMemoInput(!showMemoInput);
  };

  return (
    <View style={styles.container}>
      {/* Question */}
      <View style={styles.questionContainer}>
        <Text style={styles.questionText}>{question.question}</Text>
      </View>

      {/* Options */}
      <View style={styles.optionsContainer}>
        {question.options.map((option, index) => (
          <TouchableOpacity
            key={option.id}
            disabled={loading}
            style={[
              styles.optionButton,
              selectedOptionId === option.id && styles.selectedOption,
              loading && styles.disabledOption,
            ]}
            onPress={() => handleOptionPress(option)}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionNumber}>{index + 1}</Text>
              <Text style={[
                styles.optionText,
                selectedOptionId === option.id && styles.selectedOptionText,
              ]}>
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Optional memo section */}
      {question.hasOptionalMemo && (
        <View style={styles.memoSection}>
          {!showMemoInput ? (
            <TouchableOpacity style={styles.memoToggleButton} onPress={toggleMemoInput}>
              <Text style={styles.memoToggleText}>
                💭 メモを追加する（任意）
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.memoInputContainer}>
              <Text style={styles.memoLabel}>💭 メモ（任意）</Text>
              <TextInput
                style={styles.memoInput}
                value={memo}
                onChangeText={onMemoChange}
                placeholder="具体的な内容や補足があれば..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
              <TouchableOpacity style={styles.memoCloseButton} onPress={toggleMemoInput}>
                <Text style={styles.memoCloseText}>閉じる</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    lineHeight: 26,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedOption: {
    backgroundColor: '#F3E7C9',
    borderColor: '#F3E7C9',
    shadowColor: '#F3E7C9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledOption: {
    opacity: 0.5,
    backgroundColor: '#F5F5F5',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F2A44',
    backgroundColor: '#F0F0F0',
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  selectedOptionText: {
    color: '#0F2A44',
    fontWeight: '600',
  },
  memoSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  memoToggleButton: {
    padding: 12,
    alignItems: 'center',
  },
  memoToggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  memoInputContainer: {
    gap: 8,
  },
  memoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  memoInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  memoCloseButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  memoCloseText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
});