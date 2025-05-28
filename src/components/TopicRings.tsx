import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, Easing, ViewStyle, TouchableOpacity, Modal, Pressable , Animated as RNAnimated } from 'react-native';
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
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { updateUserProfile } from '../store/triviaSlice';
import { useTheme } from '@/src/context/ThemeContext';
import Reanimated, { 
  Layout, 
  FadeInLeft, 
  FadeOutRight,
  LinearTransition,
  Easing as REasing,
  SharedTransition,
  withSpring,
  withTiming
} from 'react-native-reanimated';

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
  index?: number;
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
  glowOpacity?: Animated.Value;
}

// Ring Details Modal Component
const RingDetailsModal: React.FC<RingDetailsModalProps> = ({ visible, ringData, onClose }) => {
  // Move null check BEFORE any hooks to avoid hook rule violations
  if (!ringData) return null;

  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBackground = useThemeColor({}, 'background');
  const dispatch = useAppDispatch();
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const [buttonsDisabled, setButtonsDisabled] = useState(false);
  const { isNeonTheme } = useTheme();

  const progressPercentage = Math.round((ringData.currentProgress / ringData.targetAnswers) * 100);
  const nextLevelAnswers = ringData.targetAnswers - ringData.currentProgress;

  // Add CSS for web hover effects when component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && isNeonTheme) {
      const styleId = 'neon-button-hover-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          .neon-more-button:hover:not(:disabled) {
            box-shadow: 0 0 20px rgba(0, 255, 136, 0.8), inset 0 0 15px rgba(0, 255, 136, 0.2) !important;
            transform: scale(1.02);
            border-color: #00FF88;
          }
          .neon-less-button:hover:not(:disabled) {
            box-shadow: 0 0 20px rgba(255, 0, 128, 0.8), inset 0 0 15px rgba(255, 0, 128, 0.2) !important;
            transform: scale(1.02);
            border-color: #FF0080;
          }
          .neon-button-disabled {
            cursor: not-allowed !important;
            opacity: 0.5;
          }
        `;
        document.head.appendChild(style);
      }
      
      return () => {
        const style = document.getElementById(styleId);
        if (style && document.head.contains(style)) {
          document.head.removeChild(style);
        }
      };
    }
  }, [isNeonTheme]);

  const handleTopicWeightChange = (topic: string, weightChange: number) => {
    if (!userProfile || buttonsDisabled) return;

    // Update the topic weight in Redux
    const currentWeight = userProfile.topics[topic]?.weight || 0.5;
    const newWeight = Math.max(0.1, Math.min(1.0, currentWeight + weightChange));
    
    // Create updated profile with new weight
    const updatedProfile = {
      ...userProfile,
      topics: {
        ...userProfile.topics,
        [topic]: {
          ...userProfile.topics[topic],
          weight: newWeight
        }
      },
      lastRefreshed: Date.now()
    };

    // Create a weight change record for the manual adjustment
    const weightChangeRecord = {
      timestamp: Date.now(),
      questionId: 'manual-adjustment',
      interactionType: 'skipped' as const, // Use 'skipped' as closest to manual action
      questionText: 'Manual topic weight adjustment',
      topic: topic,
      subtopic: 'General',
      branch: 'General',
      oldWeights: {
        topicWeight: currentWeight,
        subtopicWeight: userProfile.topics[topic]?.subtopics?.['General']?.weight || 0.5,
        branchWeight: userProfile.topics[topic]?.subtopics?.['General']?.branches?.['General']?.weight || 0.5
      },
      newWeights: {
        topicWeight: newWeight,
        subtopicWeight: userProfile.topics[topic]?.subtopics?.['General']?.weight || 0.5,
        branchWeight: userProfile.topics[topic]?.subtopics?.['General']?.branches?.['General']?.weight || 0.5
      }
    };

    // Dispatch the update to Redux with weight change record
    dispatch(updateUserProfile({ 
      profile: updatedProfile,
      weightChange: weightChangeRecord
    }));
    
    // Disable buttons until next question scroll
    setButtonsDisabled(true);
    
    console.log(`[Feed Control] Updated ${topic} weight: ${currentWeight.toFixed(3)} -> ${newWeight.toFixed(3)} (change: ${weightChange > 0 ? '+' : ''}${weightChange})`);
  };

  // Reset button state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setButtonsDisabled(false);
    }
  }, [visible]);

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

            {/* Total Stats */}
            <View style={styles.modalSection}>
              <ThemedText style={styles.modalSectionTitle}>Total Stats</ThemedText>
              <ThemedText style={styles.modalTotalText}>
                {ringData.totalCorrectAnswers} total correct answers in {ringData.topic}
              </ThemedText>
            </View>

            {/* Feed Control Buttons */}
            <View style={styles.modalSection}>
              <ThemedText style={styles.modalSectionTitle}>Feed Control</ThemedText>
              <View style={styles.feedControlButtons}>
                <TouchableOpacity 
                  style={[
                    styles.feedControlButton, 
                    styles.moreButton,
                    buttonsDisabled && styles.disabledButton
                  ]}
                  onPress={() => handleTopicWeightChange(ringData.topic, 0.15)}
                  activeOpacity={buttonsDisabled ? 1 : 0.7}
                  disabled={buttonsDisabled}
                  {...(Platform.OS === 'web' && isNeonTheme ? { 
                    className: buttonsDisabled ? 'neon-button-disabled' : 'neon-more-button' 
                  } : {}) as any}
                >
                  <Feather name="plus-circle" size={16} color={buttonsDisabled ? '#666' : '#00FF88'} />
                  <ThemedText style={[
                    styles.feedControlButtonText,
                    { color: buttonsDisabled ? '#666' : '#00FF88' }
                  ]}>
                    Show more from topic
                  </ThemedText>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[
                    styles.feedControlButton, 
                    styles.lessButton,
                    buttonsDisabled && styles.disabledButton
                  ]}
                  onPress={() => handleTopicWeightChange(ringData.topic, -0.1)}
                  activeOpacity={buttonsDisabled ? 1 : 0.7}
                  disabled={buttonsDisabled}
                  {...(Platform.OS === 'web' && isNeonTheme ? { 
                    className: buttonsDisabled ? 'neon-button-disabled' : 'neon-less-button' 
                  } : {}) as any}
                >
                  <Feather name="minus-circle" size={16} color={buttonsDisabled ? '#666' : '#FF0080'} />
                  <ThemedText style={[
                    styles.feedControlButtonText,
                    { color: buttonsDisabled ? '#666' : '#FF0080' }
                  ]}>
                    Show less from topic
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {buttonsDisabled && (
                <ThemedText style={styles.disabledMessage}>
                  Buttons will re-enable after scrolling to the next question
                </ThemedText>
              )}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

// Single Ring Component with Apple Activity style
const SingleRing: React.FC<SingleRingProps> = ({ ringData, size, isActive, onPress, index = 0 }) => {
  // Ensure all values are valid numbers before calculations
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1);

  // Animation values for smooth transitions
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const glowOpacity = React.useRef(new Animated.Value(isActive ? 1 : 0)).current;

  // Animate on active state change
  React.useEffect(() => {
    // Parallel animations for scale and glow
    Animated.parallel([
      // Scale animation
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.05 : 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      // Glow opacity animation
      Animated.timing(glowOpacity, {
        toValue: isActive ? 1 : 0,
        duration: 300,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive]);

  return (
    <Reanimated.View
      layout={LinearTransition.springify()
        .stiffness(200)
        .damping(20)
        .mass(1)}
      entering={FadeInLeft.duration(300).delay(index * 50)}
      exiting={FadeOutRight.duration(300)}
      style={[styles.ringWrapper, { marginLeft: index > 0 ? 8 : 0 }]}
    >
      <TouchableOpacity 
        onPress={onPress}
        style={[styles.singleRingContainer, { width: size, height: size }]}
        activeOpacity={0.8}
      >
        <Animated.View
          style={{
            transform: [{ scale: scaleAnim }],
          }}
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
            glowOpacity={glowOpacity}
          />
        </Animated.View>
      </TouchableOpacity>
    </Reanimated.View>
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
  // console.log(`[ACTIVE TOPIC RING] Available rings: [${validRings.map(r => `"${r.topic}"`).join(', ')}] vs activeTopic: "${activeTopic}"`);

  return (
    <Reanimated.View 
      style={styles.container}
      layout={LinearTransition.springify()
        .stiffness(250)
        .damping(25)
        .mass(0.8)}
    >
      {validRings.map((ring, index) => {
        // More robust topic matching - normalize case and trim whitespace
        const normalizedRingTopic = ring.topic.toLowerCase().trim();
        const normalizedActiveTopic = activeTopic?.toLowerCase().trim();
        const isRingActive = normalizedRingTopic === normalizedActiveTopic;
        
        // console.log(`[ACTIVE TOPIC RING] Ring "${ring.topic}" -> isActive: ${isRingActive}`);
        
        return (
          <SingleRing
            key={ring.topic}
            ringData={ring}
            size={size}
            isActive={isRingActive}
            onPress={() => handleRingPress(ring)}
            index={index}
          />
        );
      })}
      
      <RingDetailsModal
        visible={modalVisible}
        ringData={selectedRing}
        onClose={handleCloseModal}
      />
    </Reanimated.View>
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
  glowOpacity,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = React.useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    RNAnimated.timing(animatedProgress, {
      toValue: progress,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [progress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Create internal animations for ring properties
  const ringOpacity = React.useRef(new RNAnimated.Value(isActive ? 1 : 0.7)).current;
  const ringStrokeWidth = React.useRef(new RNAnimated.Value(isActive ? strokeWidth + 1 : strokeWidth)).current;

  React.useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(ringOpacity, {
        toValue: isActive ? 1 : 0.7,
        duration: 300,
        useNativeDriver: true,
      }),
      RNAnimated.timing(ringStrokeWidth, {
        toValue: isActive ? strokeWidth + 1 : strokeWidth,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, strokeWidth]);

  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      {/* Container sized exactly to the ring - no overflow */}
      <View 
        style={{ 
          width: size,
          height: size,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* iOS-specific glow effect - properly sized and subtle */}
        {Platform.OS === 'ios' && glowOpacity && (
          <>
            {/* Outer glow layer */}
            <Animated.View 
              style={{
                position: 'absolute',
                width: size * 0.9,
                height: size * 0.9,
                borderRadius: (size * 0.9) / 2,
                backgroundColor: color,
                opacity: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.15],
                }),
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 8,
              }}
            />
            {/* Inner glow layer */}
            <Animated.View 
              style={{
                position: 'absolute',
                width: size * 0.8,
                height: size * 0.8,
                borderRadius: (size * 0.8) / 2,
                backgroundColor: color,
                opacity: glowOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.1],
                }),
                shadowColor: color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 4,
              }}
            />
          </>
        )}
        
        {/* Web glow effect with animation */}
        {Platform.OS === 'web' && glowOpacity && (
          <Animated.View 
            style={{
              position: 'absolute',
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: (size * 0.9) / 2,
              backgroundColor: color,
              filter: 'blur(12px)',
              opacity: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.4],
              }),
            }}
          />
        )}
        
        {/* Android glow effect - keep existing approach */}
        {Platform.OS === 'android' && glowOpacity && (
          <Animated.View 
            style={{
              position: 'absolute',
              width: size * 0.9,
              height: size * 0.9,
              borderRadius: (size * 0.9) / 2,
              backgroundColor: color,
              opacity: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.2],
              }),
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 12,
              elevation: 8,
            }}
          />
        )}
        
        <Svg width={size} height={size}>
          {/* Active ring fill - subtle background fill when active */}
          {isActive && (
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill={color + '10'} // Very subtle fill with 10% opacity
              stroke="none"
            />
          )}
          
          {/* Background ring - more transparent for inactive rings */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={isActive ? color + '40' : color + '1A'} // 25% opacity for active, 10% for inactive
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress ring with animated opacity */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            opacity={ringOpacity}
          />
        </Svg>
        
        {/* Center icon with animated opacity */}
        <Animated.View style={{ 
          position: 'absolute', 
          justifyContent: 'center', 
          alignItems: 'center',
          opacity: ringOpacity 
        }}>
          <Feather name={icon as any} size={size * 0.32} color={color} />
        </Animated.View>
      </View>
      
      {/* Level below with animated properties */}
      <Animated.View style={{ 
        position: 'absolute', 
        top: size + 2,
        left: 0, 
        right: 0, 
        alignItems: 'center',
        opacity: ringOpacity
      }}>
        <ThemedText style={{ 
          color: color, 
          fontWeight: 'bold',
          fontSize: size * 0.16,
          ...(isActive && Platform.OS === 'web' && {
            textShadow: `0 0 8px ${color}60`,
          }),
          ...(isActive && Platform.OS === 'ios' && {
            textShadowColor: color + '60',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 3,
          }),
          ...(isActive && Platform.OS === 'android' && {
            textShadowColor: color + '80',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 4,
          })
        }}>
          LVL{level}
        </ThemedText>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center', // Center align rings horizontally
    justifyContent: 'flex-start',
    overflow: 'visible', // Ensure glow effects aren't clipped
  },
  ringWrapper: {
    alignItems: 'center',
    overflow: 'visible', // Ensure glow effects aren't clipped
    // Add padding to accommodate glow effects on iOS
    ...(Platform.OS === 'ios' && {
      paddingHorizontal: 4,
      paddingVertical: 4,
    }),
  },
  singleRingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'visible', // Ensure glow effects aren't clipped
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
  modalTotalText: {
    fontSize: 14,
    opacity: 0.8,
  },
  feedControlButtons: {
    flexDirection: 'column',
    gap: 12,
  },
  feedControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 2,
    // Add shadow/glow effects for all platforms
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 8,
        shadowOpacity: 0.6,
      },
      android: {
        elevation: 6,
      },
      web: {
        transition: 'all 0.3s ease',
      }
    }),
  },
  feedControlButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  moreButton: {
    borderColor: '#00FF88',
    // Platform-specific glow
    ...Platform.select({
      ios: {
        shadowColor: '#00FF88',
      },
      android: {
        // Android doesn't support colored elevation, so we use borderColor
      },
      web: {
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.6), inset 0 0 10px rgba(0, 255, 136, 0.1)',
        '&:hover': {
          boxShadow: '0 0 20px rgba(0, 255, 136, 0.8), inset 0 0 15px rgba(0, 255, 136, 0.2)',
          transform: 'scale(1.02)',
        } as any,
      }
    }),
  },
  lessButton: {
    borderColor: '#FF0080',
    // Platform-specific glow
    ...Platform.select({
      ios: {
        shadowColor: '#FF0080',
      },
      android: {
        // Android doesn't support colored elevation, so we use borderColor
      },
      web: {
        boxShadow: '0 0 15px rgba(255, 0, 128, 0.6), inset 0 0 10px rgba(255, 0, 128, 0.1)',
        '&:hover': {
          boxShadow: '0 0 20px rgba(255, 0, 128, 0.8), inset 0 0 15px rgba(255, 0, 128, 0.2)',
          transform: 'scale(1.02)',
        } as any,
      }
    }),
  },
  disabledButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.3)',
    borderColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
    ...Platform.select({
      web: {
        boxShadow: 'none',
      } as any
    }),
  },
  disabledButtonText: {
    color: '#666',
  },
  disabledMessage: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    textAlign: 'center',
  },
}); 