import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform, Easing } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { TopicRingProgress } from '../types/topicRings';
import { useTheme } from '@/src/context/ThemeContext';

interface LinearProgressBarProps {
  ringData: TopicRingProgress | null;
  width?: number;
  height?: number;
  showLabel?: boolean;
  showPercentage?: boolean;
}

export const LinearProgressBar: React.FC<LinearProgressBarProps> = ({
  ringData,
  width = 200,
  height = 8,
  showLabel = false,
  showPercentage = false,
}) => {
  const { isNeonTheme } = useTheme();
  
  // Single animation value for smooth progress
  const progressAnim = useRef(new Animated.Value(0)).current;

  if (!ringData) {
    return null;
  }

  // Calculate progress percentage
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1);

  // Animate progress changes smoothly
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progressPercentage,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [progressPercentage]);

  // Create dynamic styles
  const progressBarStyle = {
    width: width,
    height: height,
    backgroundColor: isNeonTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)',
    borderRadius: height / 2,
    overflow: 'hidden' as const,
    ...(isNeonTheme && Platform.OS === 'web' ? {
      boxShadow: `0 0 ${height}px rgba(255, 255, 255, 0.2)`,
    } : {}),
  };

  const progressFillStyle = {
    height: height,
    width: progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
    backgroundColor: ringData.color,
    borderRadius: height / 2,
    ...(isNeonTheme && Platform.OS === 'web' ? {
      boxShadow: `0 0 ${height * 2}px ${ringData.color}`,
    } : {}),
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBarRow}>
        <View style={progressBarStyle}>
          <Animated.View style={progressFillStyle} />
        </View>
        
        {/* Counter showing total correct answers */}
        <View style={styles.counterContainer}>
          <ThemedText style={[styles.counterText, { 
            color: ringData.color,
          }]}>
            {ringData.totalCorrectAnswers}
          </ThemedText>
        </View>
      </View>
      
      {showPercentage && (
        <ThemedText style={[styles.percentage, { color: ringData.color }]}>
          {Math.round(progressPercentage * 100)}%
        </ThemedText>
      )}
      
      {showLabel && (
        <ThemedText style={[styles.progressText, { color: isNeonTheme ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.8)' }]}>
          {safeCurrentProgress} / {safeTargetAnswers}
        </ThemedText>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'flex-start',
    width: '100%',
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  counterContainer: {
    marginLeft: 8,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  topicLevel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 3,
  },
  percentage: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  progressText: {
    fontSize: 10,
    marginTop: 2,
  },
}); 