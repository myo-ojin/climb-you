import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';

const { width } = Dimensions.get('window');

export interface MountainProgressProps {
  currentProgress: number; // 0-100
  questsCompleted: number;
  totalQuests: number;
  level: number; // Current level
  showAnimation?: boolean;
  onLevelUp?: (newLevel: number) => void;
}

interface MountainStage {
  id: number;
  name: string;
  emoji: string;
  color: string;
  description: string;
  progressThreshold: number; // Percentage to reach this stage
}

const MOUNTAIN_STAGES: MountainStage[] = [
  {
    id: 0,
    name: 'ベースキャンプ',
    emoji: '⛺',
    color: '#8B7355',
    description: '登山開始地点',
    progressThreshold: 0,
  },
  {
    id: 1,
    name: '5合目',
    emoji: '🌲',
    color: '#2D5016',
    description: '基礎スキル習得',
    progressThreshold: 25,
  },
  {
    id: 2,
    name: '8合目',
    emoji: '🏔️',
    color: '#4A5568',
    description: '実践レベル到達',
    progressThreshold: 60,
  },
  {
    id: 3,
    name: '山頂',
    emoji: '⛰️',
    color: '#2B6CB0',
    description: '目標達成間近',
    progressThreshold: 85,
  },
  {
    id: 4,
    name: '制覇',
    emoji: '👑',
    color: '#D69E2E',
    description: '完全マスター',
    progressThreshold: 100,
  },
];

const colors = {
  NightSky: '#0F2A44',
  Moonlight: '#F3E7C9',
  white: '#fff',
  text: '#333',
  textSecondary: '#666',
  textOnNight: '#fff',
  success: '#10B981',
  warning: '#F59E0B',
  cardBackground: 'rgba(255, 255, 255, 0.9)',
};

export const MountainProgress: React.FC<MountainProgressProps> = ({
  currentProgress,
  questsCompleted,
  totalQuests,
  level,
  showAnimation = true,
  onLevelUp,
}) => {
  const progressAnimValue = useRef(new Animated.Value(0)).current;
  const scaleAnimValue = useRef(new Animated.Value(1)).current;
  const glowAnimValue = useRef(new Animated.Value(0)).current;

  const currentStage = getCurrentStage(currentProgress);
  const nextStage = getNextStage(currentProgress);
  const progressToNextStage = getProgressToNextStage(currentProgress);

  useEffect(() => {
    if (showAnimation) {
      // Animate progress
      Animated.timing(progressAnimValue, {
        toValue: currentProgress,
        duration: 1500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();

      // Achievement animation if at milestone
      if (currentProgress === currentStage.progressThreshold && currentProgress > 0) {
        Animated.sequence([
          Animated.timing(scaleAnimValue, {
            toValue: 1.2,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnimValue, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();

        // Glow effect
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnimValue, {
              toValue: 1,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
            Animated.timing(glowAnimValue, {
              toValue: 0,
              duration: 1000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: false,
            }),
          ]),
          { iterations: 3 }
        ).start();
      }
    } else {
      progressAnimValue.setValue(currentProgress);
    }
  }, [currentProgress, showAnimation]);

  const hikerPosition = progressAnimValue.interpolate({
    inputRange: [0, 100],
    outputRange: [20, width - 80],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Mountain Visualization */}
      <View style={styles.mountainContainer}>
        {/* Mountain Path */}
        <View style={styles.mountainPath}>
          {MOUNTAIN_STAGES.map((stage, index) => (
            <View
              key={stage.id}
              style={[
                styles.stagePoint,
                {
                  left: `${(stage.progressThreshold / 100) * 90 + 5}%`,
                  backgroundColor: currentProgress >= stage.progressThreshold ? stage.color : '#E2E8F0',
                },
                currentProgress >= stage.progressThreshold && styles.stagePointActive,
              ]}
            >
              <Text style={[
                styles.stageEmoji,
                currentProgress < stage.progressThreshold && styles.stageEmojiInactive,
              ]}>
                {stage.emoji}
              </Text>
            </View>
          ))}
          
          {/* Progress Line */}
          <Animated.View
            style={[
              styles.progressLine,
              {
                width: progressAnimValue.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '90%'],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          />
        </View>

        {/* Hiker Character */}
        <Animated.View
          style={[
            styles.hikerContainer,
            {
              left: hikerPosition,
              transform: [{ scale: scaleAnimValue }],
            },
          ]}
        >
          <Text style={styles.hikerEmoji}>🚶‍♂️</Text>
          {/* Achievement Glow */}
          <Animated.View
            style={[
              styles.achievementGlow,
              {
                opacity: glowAnimValue,
                transform: [{ scale: glowAnimValue }],
              },
            ]}
          />
        </Animated.View>
      </View>

      {/* Progress Info */}
      <View style={styles.progressInfo}>
        <View style={styles.currentStageInfo}>
          <Text style={styles.currentStageEmoji}>{currentStage.emoji}</Text>
          <View style={styles.stageDetails}>
            <Text style={styles.currentStageName}>{currentStage.name}</Text>
            <Text style={styles.currentStageDescription}>{currentStage.description}</Text>
          </View>
        </View>

        {/* Progress Stats */}
        <View style={styles.progressStats}>
          <Text style={styles.progressText}>
            {currentProgress.toFixed(1)}% 完了
          </Text>
          <Text style={styles.questStats}>
            クエスト達成: {questsCompleted} / {totalQuests}
          </Text>
        </View>

        {/* Next Stage Preview */}
        {nextStage && (
          <View style={styles.nextStagePreview}>
            <Text style={styles.nextStageText}>
              次の目標: {nextStage.name} {nextStage.emoji}
            </Text>
            <View style={styles.nextStageProgress}>
              <View style={styles.nextStageProgressBg}>
                <View
                  style={[
                    styles.nextStageProgressFill,
                    { width: `${progressToNextStage}%` },
                  ]}
                />
              </View>
              <Text style={styles.nextStageProgressText}>
                {progressToNextStage.toFixed(0)}%
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Level Display */}
      <View style={styles.levelContainer}>
        <Text style={styles.levelLabel}>レベル</Text>
        <Text style={styles.levelValue}>{level}</Text>
      </View>
    </View>
  );
};

// Helper functions
function getCurrentStage(progress: number): MountainStage {
  for (let i = MOUNTAIN_STAGES.length - 1; i >= 0; i--) {
    if (progress >= MOUNTAIN_STAGES[i].progressThreshold) {
      return MOUNTAIN_STAGES[i];
    }
  }
  return MOUNTAIN_STAGES[0];
}

function getNextStage(progress: number): MountainStage | null {
  for (let i = 0; i < MOUNTAIN_STAGES.length; i++) {
    if (progress < MOUNTAIN_STAGES[i].progressThreshold) {
      return MOUNTAIN_STAGES[i];
    }
  }
  return null; // Already at max stage
}

function getProgressToNextStage(progress: number): number {
  const nextStage = getNextStage(progress);
  if (!nextStage) return 100;
  
  const currentStage = getCurrentStage(progress);
  const stageRange = nextStage.progressThreshold - currentStage.progressThreshold;
  const progressInStage = progress - currentStage.progressThreshold;
  
  return Math.min(100, Math.max(0, (progressInStage / stageRange) * 100));
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.cardBackground,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mountainContainer: {
    height: 120,
    marginBottom: 20,
    position: 'relative',
  },
  mountainPath: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
  },
  progressLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 4,
    backgroundColor: colors.Moonlight,
    borderRadius: 2,
  },
  stagePoint: {
    position: 'absolute',
    top: -16,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  stagePointActive: {
    shadowColor: colors.Moonlight,
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  stageEmoji: {
    fontSize: 16,
  },
  stageEmojiInactive: {
    opacity: 0.5,
  },
  hikerContainer: {
    position: 'absolute',
    top: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hikerEmoji: {
    fontSize: 24,
    zIndex: 2,
  },
  achievementGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.Moonlight,
    opacity: 0,
    zIndex: 1,
  },
  progressInfo: {
    marginBottom: 16,
  },
  currentStageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentStageEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  stageDetails: {
    flex: 1,
  },
  currentStageName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  currentStageDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  questStats: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  nextStagePreview: {
    backgroundColor: 'rgba(243, 231, 201, 0.2)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.Moonlight,
  },
  nextStageText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  nextStageProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nextStageProgressBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
  },
  nextStageProgressFill: {
    height: 6,
    backgroundColor: colors.Moonlight,
    borderRadius: 3,
  },
  nextStageProgressText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    minWidth: 32,
  },
  levelContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  levelValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
});