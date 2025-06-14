import React from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';
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

  if (!ringData) {
    return null;
  }

  // Calculate progress percentage
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1) * 100;

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
    width: `${progressPercentage}%`,
    backgroundColor: ringData.color, // Uses exact same color as the ring
    borderRadius: height / 2,
    ...(isNeonTheme && Platform.OS === 'web' ? {
      boxShadow: `0 0 ${height * 2}px ${ringData.color}`, // Same glow effect as rings
    } : {}),
  } as any;

  return (
    <View style={styles.container}>
      <View style={progressBarStyle}>
        <Animated.View style={progressFillStyle} />
      </View>
      

      
      {showPercentage && (
        <ThemedText style={[styles.percentage, { color: ringData.color }]}>
          {Math.round(progressPercentage)}%
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