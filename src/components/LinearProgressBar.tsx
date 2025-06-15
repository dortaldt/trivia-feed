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
  showLevelProgress?: boolean; // Whether to show the level progression bar
}

export const LinearProgressBar: React.FC<LinearProgressBarProps> = ({
  ringData,
  width = 200,
  height = 8,
  showLabel = false,
  showPercentage = false,
  showLevelProgress = false,
}) => {
  const { isNeonTheme } = useTheme();
  
  // Animation values for both progress bars
  const progressAnim = useRef(new Animated.Value(0)).current;
  const levelProgressAnim = useRef(new Animated.Value(0)).current;

  if (!ringData) {
    return null;
  }

  // Calculate progress percentages
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1);
  
  const safeLevelProgress = typeof ringData.levelProgress === 'number' && !isNaN(ringData.levelProgress) ? ringData.levelProgress : 0;
  const levelProgressPercentage = Math.min(Math.max(safeLevelProgress, 0), 1);

  // Animate progress changes smoothly
  useEffect(() => {
    Animated.parallel([
      Animated.timing(progressAnim, {
        toValue: progressPercentage,
        duration: 600,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.timing(levelProgressAnim, {
        toValue: levelProgressPercentage,
        duration: 800, // Slightly slower for level progress
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start();
  }, [progressPercentage, levelProgressPercentage]);

  // Create dynamic styles for main progress bar
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
  
  // Level progress bar styles (brighter and more prominent)
  const levelProgressHeight = Math.max(3, height * 0.8); // Increased height from 60% to 80%
  const levelProgressBarStyle = {
    width: width,
    height: levelProgressHeight,
    backgroundColor: isNeonTheme ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.15)', // More visible background
    borderRadius: levelProgressHeight / 2,
    overflow: 'hidden' as const,
    ...(isNeonTheme && Platform.OS === 'web' ? {
      boxShadow: `0 0 ${levelProgressHeight}px rgba(255, 255, 255, 0.15)`,
    } : {}),
  };

  // Create a brighter version of the color for level progress
  const brightenColor = (hexColor: string, factor: number = 1.2) => {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Parse RGB values
    const r = Math.min(255, Math.round(parseInt(hex.substring(0, 2), 16) * factor));
    const g = Math.min(255, Math.round(parseInt(hex.substring(2, 4), 16) * factor));
    const b = Math.min(255, Math.round(parseInt(hex.substring(4, 6), 16) * factor));
    
    // Convert back to hex
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };

  const levelProgressFillStyle = {
    height: levelProgressHeight,
    width: levelProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    }),
    backgroundColor: brightenColor(ringData.color, 1.3), // 30% brighter than main color
    borderRadius: levelProgressHeight / 2,
    ...(isNeonTheme && Platform.OS === 'web' ? {
      boxShadow: `0 0 ${levelProgressHeight * 2}px ${brightenColor(ringData.color, 1.3)}`,
    } : {}),
  };

  return (
    <View style={styles.container}>
      <View style={styles.progressBarRow}>
        <View style={styles.progressBarsContainer}>
          {/* Main progress bar (current level progress) */}
          <View style={progressBarStyle}>
            <Animated.View style={progressFillStyle} />
          </View>
          
          {/* Level progression bar (overall level progress) */}
          {showLevelProgress && ringData.levelProgress !== undefined && (
            <View style={[levelProgressBarStyle, { marginTop: 2 }]}>
              <Animated.View style={levelProgressFillStyle} />
            </View>
          )}
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
      
      {showLevelProgress && ringData.levelProgress !== undefined && (
        <ThemedText style={[styles.levelProgressText, { color: isNeonTheme ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.6)' }]}>
          Level {ringData.level} / {ringData.maxDisplayLevel || 5}
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
  progressBarsContainer: {
    flex: 1,
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
  levelProgressText: {
    fontSize: 10,
    marginTop: 2,
  },
}); 