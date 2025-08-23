import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MountainAnimationProps {
  progress: number; // 0 to 100
}

export default function MountainAnimation({ progress }: MountainAnimationProps) {
  const climberPosition = useRef(new Animated.Value(0)).current;
  const flagOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate climber position based on progress
    Animated.timing(climberPosition, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: false,
    }).start();

    // Show flag when progress is complete
    if (progress >= 100) {
      Animated.timing(flagOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    } else {
      flagOpacity.setValue(0);
    }
  }, [progress]);

  const climberBottom = climberPosition.interpolate({
    inputRange: [0, 100],
    outputRange: [50, screenHeight * 0.7],
    extrapolate: 'clamp',
  });

  const climberLeft = climberPosition.interpolate({
    inputRange: [0, 25, 50, 75, 100],
    outputRange: [
      screenWidth * 0.1,
      screenWidth * 0.3,
      screenWidth * 0.5,
      screenWidth * 0.7,
      screenWidth * 0.5,
    ],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      {/* Sky gradient background */}
      <LinearGradient
        colors={['#87CEEB', '#E0F6FF', '#87CEEB']}
        style={styles.background}
      />

      {/* Mountain peaks */}
      <View style={styles.mountainContainer}>
        {/* Back mountain */}
        <View style={[styles.mountain, styles.backMountain]} />
        
        {/* Main mountain */}
        <View style={[styles.mountain, styles.mainMountain]} />
        
        {/* Front mountain */}
        <View style={[styles.mountain, styles.frontMountain]} />
      </View>

      {/* Climbing path */}
      <View style={styles.pathContainer}>
        {[...Array(10)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.pathDot,
              {
                bottom: 50 + (index * (screenHeight * 0.06)),
                left: screenWidth * (0.1 + (index % 2 === 0 ? 0.1 : 0.3) + (index * 0.05)),
                opacity: progress >= (index + 1) * 10 ? 1 : 0.3,
              }
            ]}
          />
        ))}
      </View>

      {/* Climber */}
      <Animated.View
        style={[
          styles.climber,
          {
            bottom: climberBottom,
            left: climberLeft,
          }
        ]}
      >
        <View style={styles.climberBody} />
        <View style={styles.climberHead} />
      </Animated.View>

      {/* Flag at the top */}
      <Animated.View
        style={[
          styles.flag,
          {
            opacity: flagOpacity,
          }
        ]}
      >
        <View style={styles.flagPole} />
        <View style={styles.flagCloth} />
      </Animated.View>

      {/* Progress indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  mountainContainer: {
    flex: 1,
    position: 'relative',
  },
  mountain: {
    position: 'absolute',
    bottom: 0,
  },
  backMountain: {
    width: screenWidth * 0.6,
    height: screenHeight * 0.4,
    backgroundColor: '#8B7D6B',
    right: 0,
    transform: [{ skewX: '-15deg' }],
  },
  mainMountain: {
    width: screenWidth * 0.8,
    height: screenHeight * 0.6,
    backgroundColor: '#8B4513',
    left: screenWidth * 0.1,
    transform: [{ skewX: '10deg' }],
  },
  frontMountain: {
    width: screenWidth * 0.4,
    height: screenHeight * 0.3,
    backgroundColor: '#654321',
    left: 0,
    transform: [{ skewX: '20deg' }],
  },
  pathContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  pathDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#228B22',
  },
  climber: {
    position: 'absolute',
    width: 20,
    height: 30,
    alignItems: 'center',
  },
  climberBody: {
    width: 12,
    height: 20,
    backgroundColor: '#FF4444',
    borderRadius: 6,
  },
  climberHead: {
    width: 10,
    height: 10,
    backgroundColor: '#FFDBAC',
    borderRadius: 5,
    position: 'absolute',
    top: -5,
  },
  flag: {
    position: 'absolute',
    top: screenHeight * 0.2,
    right: screenWidth * 0.4,
    alignItems: 'center',
  },
  flagPole: {
    width: 2,
    height: 40,
    backgroundColor: '#8B4513',
  },
  flagCloth: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 15,
    backgroundColor: '#FFD700',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
});