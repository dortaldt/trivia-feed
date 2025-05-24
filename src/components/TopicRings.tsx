import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, Easing, ViewStyle, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import {
  TopicRingProgress,
  TopicRingsState,
  RingConfig,
  DEFAULT_RING_CONFIG,
  TOPIC_ICONS,
} from '../types/topicRings';
import { useTopicRings } from '../hooks/useTopicRings';
import Svg, { Circle, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from 'react-native-svg';
import { Animated as RNAnimated } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

interface TopicRingsProps {
  config?: RingConfig;
  size?: number;
  userId?: string;
  activeTopic?: string;
  onRingComplete?: (topic: string, newLevel: number) => void;
}

interface SingleRingProps {
  ringData: TopicRingProgress;
  size: number;
  isActive?: boolean;
  onPress: () => void;
}

interface RingDetailsModalProps {
  visible: boolean;
  ringData: TopicRingProgress | null;
  onClose: () => void;
}

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

interface AppleActivityRingProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: number; // 0 to 1
  icon: string;
  level: number;
  isActive?: boolean;
}

// Ring Details Modal Component
const RingDetailsModal: React.FC<RingDetailsModalProps> = ({ visible, ringData, onClose }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBackground = useThemeColor({}, 'background');

  if (!ringData) return null;

  const progressPercentage = Math.round((ringData.currentProgress / ringData.targetAnswers) * 100);
  const nextLevelAnswers = ringData.targetAnswers - ringData.currentProgress;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconContainer, { backgroundColor: `${ringData.color}20` }]}>
                <Feather name={ringData.icon as any} size={32} color={ringData.color} />
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Topic Name */}
            <ThemedText style={[styles.modalTopicName, { color: ringData.color }]}>
              {ringData.topic.charAt(0).toUpperCase() + ringData.topic.slice(1)}
            </ThemedText>

            {/* Level Info */}
            <View style={styles.modalSection}>
              <ThemedText style={styles.modalSectionTitle}>Current Level</ThemedText>
              <ThemedText style={[styles.modalLevelText, { color: ringData.color }]}>
                Level {ringData.level}
              </ThemedText>
            </View>

            {/* Progress Info */}
            <View style={styles.modalSection}>
              <ThemedText style={styles.modalSectionTitle}>Progress</ThemedText>
              <ThemedText style={styles.modalProgressText}>
                {ringData.currentProgress} / {ringData.targetAnswers} correct answers
              </ThemedText>
              <ThemedText style={[styles.modalPercentageText, { color: ringData.color }]}>
                {progressPercentage}% complete
              </ThemedText>
            </View>

            {/* Next Level Info */}
            {nextLevelAnswers > 0 && (
              <View style={styles.modalSection}>
                <ThemedText style={styles.modalSectionTitle}>Next Level</ThemedText>
                <ThemedText style={styles.modalNextLevelText}>
                  {nextLevelAnswers} more correct answer{nextLevelAnswers !== 1 ? 's' : ''} to reach Level {ringData.level + 1}
                </ThemedText>
              </View>
            )}

            {/* Total Stats */}
            <View style={styles.modalSection}>
              <ThemedText style={styles.modalSectionTitle}>Total Stats</ThemedText>
              <ThemedText style={styles.modalTotalText}>
                {ringData.totalCorrectAnswers} total correct answers in {ringData.topic}
              </ThemedText>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

// Single Ring Component with Apple Activity style
const SingleRing: React.FC<SingleRingProps> = ({ ringData, size, isActive, onPress }) => {
  // Ensure all values are valid numbers before calculations
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1);



  // Create a gentle pulse animation for active rings
  const pulseAnimation = React.useRef(new RNAnimated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      // Start pulsing animation
      const pulse = RNAnimated.sequence([
        RNAnimated.timing(pulseAnimation, {
          toValue: 1.03,
          duration: 1000,
          useNativeDriver: true,
        }),
        RNAnimated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
      
      const loop = RNAnimated.loop(pulse);
      loop.start();
      
      return () => loop.stop();
    } else {
      // Reset to normal scale
      RNAnimated.timing(pulseAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isActive, pulseAnimation]);

  return (
    <RNAnimated.View
      style={{
        transform: [{ scale: pulseAnimation }],
      }}
    >
      <TouchableOpacity 
        onPress={onPress}
        style={[styles.singleRingContainer, { width: size, height: size }, isActive && styles.activeRing]}
        activeOpacity={0.8}
      >
        {/* Use the reliable SVG Apple Activity Ring */}
        <AppleActivityRing
          size={size}
          strokeWidth={Math.max(6, size * 0.12)}
          color={ringData.color}
          progress={progressPercentage}
          icon={ringData.icon}
          level={ringData.level}
          isActive={isActive}
        />
      </TouchableOpacity>
    </RNAnimated.View>
  );
};

// Main TopicRings Component
export const TopicRings: React.FC<TopicRingsProps> = ({
  config,
  size = 50,
  userId,
  activeTopic,
  onRingComplete,
}) => {
  const { topRings, onRingComplete: hookOnRingComplete } = useTopicRings({ config, userId });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRing, setSelectedRing] = useState<TopicRingProgress | null>(null);

  // Combine the external callback with the hook's callback
  const handleRingComplete = (topic: string, newLevel: number) => {
    hookOnRingComplete(topic, newLevel);
    if (onRingComplete) {
      onRingComplete(topic, newLevel);
    }
  };

  const handleRingPress = (ring: TopicRingProgress) => {
    setSelectedRing(ring);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRing(null);
  };

  if (topRings.length === 0) {
    return null;
  }

  // Additional safety filter - only show rings with actual progress
  const validRings = topRings.filter(ring => {
    return ring && 
           ring.totalCorrectAnswers > 0 &&
           typeof ring.currentProgress === 'number' && 
           !isNaN(ring.currentProgress) &&
           typeof ring.targetAnswers === 'number' && 
           !isNaN(ring.targetAnswers) &&
           ring.targetAnswers > 0;
  });

  if (validRings.length === 0) {
    return null;
  }

  // Log all available rings and active topic for debugging
  console.log(`[ACTIVE TOPIC RING] Available rings: [${validRings.map(r => `"${r.topic}"`).join(', ')}] vs activeTopic: "${activeTopic}"`);

  return (
    <View style={styles.container}>
      {validRings.map((ring, index) => {
        // More robust topic matching - normalize case and trim whitespace
        const normalizedRingTopic = ring.topic.toLowerCase().trim();
        const normalizedActiveTopic = activeTopic?.toLowerCase().trim();
        const isRingActive = normalizedRingTopic === normalizedActiveTopic;
        
        console.log(`[ACTIVE TOPIC RING] Ring "${ring.topic}" -> isActive: ${isRingActive}`);
        
        return (
          <View key={ring.topic} style={[styles.ringWrapper, { marginLeft: index > 0 ? 8 : 0 }]}>
            <SingleRing
              ringData={ring}
              size={size}
              isActive={isRingActive}
              onPress={() => handleRingPress(ring)}
            />
          </View>
        );
      })}
      
      <RingDetailsModal
        visible={modalVisible}
        ringData={selectedRing}
        onClose={handleCloseModal}
      />
    </View>
  );
};

export const AppleActivityRing: React.FC<AppleActivityRingProps> = ({
  size = 64,
  strokeWidth = 10,
  color = '#FF2D55',
  progress = 0.7,
  icon = 'activity',
  level = 1,
  isActive,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = React.useRef(new RNAnimated.Value(0)).current;
  const glowAnimation = React.useRef(new RNAnimated.Value(0)).current;



  React.useEffect(() => {
    RNAnimated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // Animate glow effect when isActive changes
  React.useEffect(() => {
    if (isActive) {
      // Start pulsing glow animation
      const pulseSequence = RNAnimated.sequence([
        RNAnimated.timing(glowAnimation, {
          toValue: 1,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: false,
        }),
        RNAnimated.timing(glowAnimation, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.bezier(0.4, 0, 0.6, 1),
          useNativeDriver: false,
        }),
      ]);
      
      const loopedAnimation = RNAnimated.loop(pulseSequence);
      loopedAnimation.start();
      
      return () => loopedAnimation.stop();
    } else {
      // Fade out glow
      RNAnimated.timing(glowAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [isActive, glowAnimation]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.8],
  });

  const glowRadius = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      <Animated.View 
        style={{ 
          width: size, 
          height: size, 
          position: 'relative',
          ...(isActive && {
            shadowColor: color,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: glowOpacity,
            shadowRadius: glowRadius,
            ...(Platform.OS === 'android' && {
              elevation: isActive ? 8 : 0,
            }),
          })
        }}
      >
        <Svg width={size} height={size}>
          {/* Glow effect for active ring */}
          {isActive && (
            <Defs>
              <Filter id="glow">
                <FeGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <FeMerge> 
                  <FeMergeNode in="coloredBlur"/>
                  <FeMergeNode in="SourceGraphic"/>
                </FeMerge>
              </Filter>
            </Defs>
          )}
          
          {/* Active ring fill - subtle background fill when active */}
          {isActive && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill={color + '15'} // Very subtle fill with 15% opacity
              stroke="none"
            />
          )}
          
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isActive ? color + '66' : color + '33'} // Stronger background when active
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress ring */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={isActive ? strokeWidth + 1 : strokeWidth} // Slightly thicker when active
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            filter={isActive ? "url(#glow)" : undefined}
          />
        </Svg>
        
        {/* Center icon */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name={icon as any} size={size * 0.32} color={color} />
        </View>
        
        {/* Level below - positioned absolutely to not affect ring centering */}
        <View style={{ position: 'absolute', top: size + 4, left: 0, right: 0, alignItems: 'center' }}>
          <ThemedText style={{ 
            color: isActive ? color : color, 
            fontWeight: isActive ? '900' : 'bold', 
            fontSize: size * 0.16,
            ...(isActive && {
              textShadowColor: color + '80',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 2,
            })
          }}>
            L{level}
          </ThemedText>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Center align rings horizontally
    justifyContent: 'flex-start',
  },
  ringWrapper: {
    alignItems: 'center',
    // Remove marginBottom since level text is now absolutely positioned
  },
  singleRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    width: '80%',
    maxWidth: 350,
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTopicName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSection: {
    marginBottom: 16,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.7,
  },
  modalLevelText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalProgressText: {
    fontSize: 16,
    marginBottom: 4,
  },
  modalPercentageText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalNextLevelText: {
    fontSize: 14,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  modalTotalText: {
    fontSize: 14,
    opacity: 0.8,
  },
  activeRing: {
    // Enhanced container styling for active ring
    transform: [{ scale: 1.05 }], // Slightly larger when active
    ...(Platform.OS === 'web' && {
      filter: 'drop-shadow(0 0 15px rgba(255, 255, 255, 0.4))',
    }),
    ...(Platform.OS !== 'web' && {
      shadowColor: '#ffffff',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
}); 