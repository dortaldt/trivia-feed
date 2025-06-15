import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Animated, Platform, Easing, ViewStyle, TouchableOpacity, Modal, Pressable , Animated as RNAnimated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/ThemedText';
import {
  TopicRingProgress,
  TopicRingsState,
  RingConfig,
  DEFAULT_RING_CONFIG,
  TOPIC_ICONS,
  getSubTopicIcon,
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
import { 
  trackTopicRingClick, 
  trackTopicRingModal 
} from '../lib/mixpanelAnalytics';
// Import topic configuration
const topicConfig = require('../../app-topic-config');
const { activeTopic, topics } = topicConfig;

interface TopicRingsProps {
  config?: RingConfig;
  size?: number;
  userId?: string;
  activeTopic?: string;
  activeSubtopic?: string;
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

interface RingHintPopoverProps {
  visible: boolean;
  onDismiss: () => void;
  anchorPosition: { x: number; y: number };
}

interface AppleActivityRingProps {
  size: number;
  strokeWidth: number;
  color: string;
  progress: number; // 0 to 1 (outer ring - current level progress)
  levelProgress?: number; // 0 to 1 (inner ring - overall level progression)
  icon: string;
  level: number;
  isActive?: boolean;
  glowOpacity?: Animated.Value;
  maxDisplayLevel?: number; // Maximum level for level progression calculation
  highlightedRing?: 'level' | 'questions' | null;
}

// Fun Ring Hint Popover Component
const RingHintPopover: React.FC<RingHintPopoverProps> = ({ visible, onDismiss, anchorPosition }) => {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const { isNeonTheme } = useTheme();
  const [popoverAnim] = useState(new Animated.Value(0));

  const borderColor = isNeonTheme ? '#00FF88' : colorScheme === 'dark' ? '#333' : '#E0E0E0';
  const popoverBgColor = isNeonTheme ? '#0A0A0A' : backgroundColor;

  useEffect(() => {
    if (visible) {
      Animated.spring(popoverAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 120,
        friction: 8,
        delay: 300, // Small delay for better UX
      }).start();
    } else {
      Animated.timing(popoverAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
      }).start();
    }
  }, [visible]);

  const animatedStyle = {
    opacity: popoverAnim,
    transform: [
      {
        scale: popoverAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.85, 1],
        }),
      },
      {
        translateY: popoverAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [15, 0],
        }),
      },
    ],
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.popoverContainer,
        {
          backgroundColor: popoverBgColor,
          borderColor: borderColor,
          left: Math.max(20, Math.min(anchorPosition.x - 120, 250)),
          top: anchorPosition.y + 70,
        },
        animatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.popoverArrow, { borderBottomColor: borderColor }]} />
      <View style={styles.popoverContent} pointerEvents="box-none">
        <View style={styles.popoverHeader} pointerEvents="auto">
          <Feather 
            name="zap" 
            size={18} 
            color={isNeonTheme ? '#00FF88' : colorScheme === 'dark' ? '#4A90E2' : '#007AFF'} 
          />
          <ThemedText style={[styles.popoverTitle, { color: textColor }]}>
            Ring Power! 🎯
          </ThemedText>
          <TouchableOpacity onPress={onDismiss} style={styles.popoverClose}>
            <Feather name="x" size={16} color={textColor} />
          </TouchableOpacity>
        </View>
        <ThemedText style={[styles.popoverText, { color: textColor }]}>
          Tap rings to control topic frequency!
        </ThemedText>
      </View>
    </Animated.View>
  );
};

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

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
  
  // Add state to track which stat is being highlighted
  const [highlightedStat, setHighlightedStat] = useState<'level' | 'questions' | null>(null);
  
  // Handle stat highlighting with toggle on tap
  const handleStatHighlight = (stat: 'level' | 'questions') => {
    setHighlightedStat(highlightedStat === stat ? null : stat);
  };

  const progressPercentage = Math.round((ringData.currentProgress / ringData.targetAnswers) * 100);
  const nextLevelAnswers = ringData.targetAnswers - ringData.currentProgress;

  // Track modal open/close events
  useEffect(() => {
    if (visible && ringData) {
      // Track modal opened
      trackTopicRingModal('opened', ringData.topic, {
        ringLevel: ringData.level,
        ringProgress: progressPercentage,
        totalCorrectAnswers: ringData.totalCorrectAnswers,
        isSubTopic: ringData.isSubTopic || false,
        parentTopic: ringData.parentTopic || null,
        ringColor: ringData.color,
        ringIcon: ringData.icon,
      });
    }
  }, [visible, ringData, progressPercentage]);

  // Helper functions for sub-topic display
  const getDisplayTitle = () => {
    if (ringData?.isSubTopic && ringData.parentTopic) {
      const subTopicConfig = topics[ringData.parentTopic]?.subTopics?.[ringData.topic];
      return subTopicConfig?.displayName || ringData.topic;
    }
    return ringData?.topic.charAt(0).toUpperCase() + ringData?.topic.slice(1);
  };

  const getDescription = () => {
    if (ringData?.isSubTopic && ringData.parentTopic) {
      const subTopicConfig = topics[ringData.parentTopic]?.subTopics?.[ringData.topic];
      return subTopicConfig?.description || `Questions about ${ringData.topic}`;
    }
    return `Questions about ${ringData?.topic}`;
  };

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

  // Create a brighter version of the color for inner ring (level display)
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

  const innerRingColor = brightenColor(ringData.color, 1.3); // 30% brighter for level
  const outerRingColor = ringData.color; // Original color for questions counter

  const handleTopicWeightChange = (topic: string, weightChange: number) => {
    if (!userProfile || buttonsDisabled || !ringData) return;

    // Check if we're in a single topic app (niche or regular single topic)
    const isSingleTopicApp = activeTopic && activeTopic !== 'default';
    const isSubTopicInSingleApp = isSingleTopicApp && ringData.isSubTopic;

    // Track feed control button click
    const actionType = weightChange > 0 ? 'feed_control_more' : 'feed_control_less';
    trackTopicRingModal(actionType, ringData.topic, {
      weightChange,
      ringLevel: ringData.level,
      ringProgress: progressPercentage,
      isSubTopic: ringData.isSubTopic || false,
      parentTopic: ringData.parentTopic || null,
      currentWeight: userProfile.topics[ringData?.isSubTopic && ringData.parentTopic ? ringData.parentTopic : topic]?.weight || 0.5,
    });

    if (isSubTopicInSingleApp) {
      // For single topic apps, control subtopic weights
      const parentTopic = ringData.parentTopic;
      const subtopic = ringData.topic;
      if (!parentTopic || !subtopic) return;

      // Ensure the topic structure exists
      const topicData = userProfile.topics[parentTopic] || { weight: 0.5, subtopics: {} };
      const currentSubtopicWeight = topicData.subtopics?.[subtopic]?.weight || 0.5;
      const newSubtopicWeight = Math.max(0.1, Math.min(1.0, currentSubtopicWeight + weightChange));

      // Create updated profile with new subtopic weight
      const updatedProfile = {
        ...userProfile,
        topics: {
          ...userProfile.topics,
          [parentTopic]: {
            ...topicData,
            subtopics: {
              ...topicData.subtopics,
              [subtopic]: {
                ...topicData.subtopics?.[subtopic],
                weight: newSubtopicWeight
              }
            }
          }
        },
        lastRefreshed: Date.now()
      };

      // Create a weight change record for the manual adjustment
      const weightChangeRecord = {
        timestamp: Date.now(),
        questionId: 'manual-adjustment',
        interactionType: 'skipped' as const,
        questionText: 'Manual subtopic weight adjustment',
        topic: parentTopic,
        subtopic: subtopic,
        branch: 'General',
        oldWeights: {
          topicWeight: topicData.weight,
          subtopicWeight: currentSubtopicWeight,
          branchWeight: topicData.subtopics?.[subtopic]?.branches?.['General']?.weight || 0.5
        },
        newWeights: {
          topicWeight: topicData.weight,
          subtopicWeight: newSubtopicWeight,
          branchWeight: topicData.subtopics?.[subtopic]?.branches?.['General']?.weight || 0.5
        }
      };

      // Dispatch the update to Redux with weight change record
      dispatch(updateUserProfile({ 
        profile: updatedProfile,
        weightChange: weightChangeRecord
      }));
      
      console.log(`[Feed Control] Updated ${parentTopic} > ${subtopic} subtopic weight: ${currentSubtopicWeight.toFixed(3)} -> ${newSubtopicWeight.toFixed(3)} (change: ${weightChange > 0 ? '+' : ''}${weightChange})`);
    } else {
      // For multi-topic apps or regular topic rings, use the original logic
      const topicForWeight = ringData?.isSubTopic ? ringData.parentTopic : topic;
      if (!topicForWeight) return;

      // Update the topic weight in Redux
      const currentWeight = userProfile.topics[topicForWeight]?.weight || 0.5;
      const newWeight = Math.max(0.1, Math.min(1.0, currentWeight + weightChange));
      
      // Create updated profile with new weight
      const updatedProfile = {
        ...userProfile,
        topics: {
          ...userProfile.topics,
          [topicForWeight]: {
            ...userProfile.topics[topicForWeight],
            weight: newWeight
          }
        },
        lastRefreshed: Date.now()
      };

      // Create a weight change record for the manual adjustment
      const weightChangeRecord = {
        timestamp: Date.now(),
        questionId: 'manual-adjustment',
        interactionType: 'skipped' as const,
        questionText: 'Manual topic weight adjustment',
        topic: topicForWeight,
        subtopic: 'General',
        branch: 'General',
        oldWeights: {
          topicWeight: currentWeight,
          subtopicWeight: userProfile.topics[topicForWeight]?.subtopics?.['General']?.weight || 0.5,
          branchWeight: userProfile.topics[topicForWeight]?.subtopics?.['General']?.branches?.['General']?.weight || 0.5
        },
        newWeights: {
          topicWeight: newWeight,
          subtopicWeight: userProfile.topics[topicForWeight]?.subtopics?.['General']?.weight || 0.5,
          branchWeight: userProfile.topics[topicForWeight]?.subtopics?.['General']?.branches?.['General']?.weight || 0.5
        }
      };

      // Dispatch the update to Redux with weight change record
      dispatch(updateUserProfile({ 
        profile: updatedProfile,
        weightChange: weightChangeRecord
      }));
      
      console.log(`[Feed Control] Updated ${topicForWeight} weight: ${currentWeight.toFixed(3)} -> ${newWeight.toFixed(3)} (change: ${weightChange > 0 ? '+' : ''}${weightChange})`);
    }
    
    // Disable buttons until next question scroll
    setButtonsDisabled(true);
  };

  // Reset button state when modal opens/closes
  useEffect(() => {
    if (visible) {
      setButtonsDisabled(false);
    }
  }, [visible]);

  // Handle modal close with tracking
  const handleClose = () => {
    // Track modal closed
    if (ringData) {
      trackTopicRingModal('closed', ringData.topic, {
        ringLevel: ringData.level,
        ringProgress: progressPercentage,
        totalCorrectAnswers: ringData.totalCorrectAnswers,
        isSubTopic: ringData.isSubTopic || false,
        parentTopic: ringData.parentTopic || null,
      });
    }
    onClose();
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={[styles.modalHeader, {
              opacity: highlightedStat ? 0.3 : 1,
            }]}>
              <View style={[styles.modalIconContainer, { backgroundColor: `${ringData.color}20` }]}>
                <Feather name={ringData.icon as any} size={32} color={ringData.color} />
              </View>
              {ringData?.isSubTopic && (
                <ThemedText style={styles.parentTopicLabel}>
                  {ringData.parentTopic} ›
                </ThemedText>
              )}
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            {/* Topic Name */}
            <ThemedText style={[styles.modalTopicName, { 
              color: ringData.color,
              opacity: highlightedStat ? 0.3 : 1,
            }]}>
              {getDisplayTitle()}
            </ThemedText>

            {/* Ring Display in Modal */}
            <View style={[styles.modalRingContainer, {
              // Add padding and overflow to prevent glow clipping on iOS
              paddingHorizontal: 30,
              paddingVertical: 20,
              overflow: 'visible',
            }]}>
              <AppleActivityRing
                size={120}
                strokeWidth={12}
                color={ringData.color}
                progress={Math.min(Math.max(ringData.currentProgress / ringData.targetAnswers, 0), 1)}
                levelProgress={ringData.levelProgress}
                icon={ringData.icon}
                level={ringData.level}
                isActive={true}
                maxDisplayLevel={ringData.maxDisplayLevel}
                highlightedRing={highlightedStat}
              />
            </View>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatHighlight('level')}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHighlightedStat('level'),
                  onMouseLeave: () => setHighlightedStat(null)
                } : {})}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.statValue, { 
                  color: innerRingColor,
                  paddingTop: Platform.OS === 'ios' ? 6 : 0, // Fix iOS text cutting
                  lineHeight: Platform.OS === 'ios' ? 44 : 40,
                  opacity: highlightedStat === 'level' ? 1 : (highlightedStat ? 0.4 : 1)
                }]}>
                  {ringData.level}
                </ThemedText>
                <ThemedText style={[styles.statLabel, {
                  opacity: highlightedStat === 'level' ? 1 : (highlightedStat ? 0.4 : 1)
                }]}>Level</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.statItem}
                onPress={() => handleStatHighlight('questions')}
                {...(Platform.OS === 'web' ? {
                  onMouseEnter: () => setHighlightedStat('questions'),
                  onMouseLeave: () => setHighlightedStat(null)
                } : {})}
                activeOpacity={0.8}
              >
                <ThemedText style={[styles.statValue, { 
                  color: outerRingColor,
                  paddingTop: Platform.OS === 'ios' ? 6 : 0, // Fix iOS text cutting
                  lineHeight: Platform.OS === 'ios' ? 44 : 40,
                  opacity: highlightedStat === 'questions' ? 1 : (highlightedStat ? 0.4 : 1)
                }]}>
                  {ringData.totalCorrectAnswers}
                </ThemedText>
                <ThemedText style={[styles.statLabel, {
                  opacity: highlightedStat === 'questions' ? 1 : (highlightedStat ? 0.4 : 1)
                }]}>Correct</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Feed Control */}
            <View style={[styles.modalSection, {
              opacity: highlightedStat ? 0.3 : 1,
            }]}>
              <ThemedText style={styles.modalSectionTitle}>
                Show more or less of this topic
              </ThemedText>
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
                    Show More
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
                    Show Less
                  </ThemedText>
                </TouchableOpacity>
              </View>
              {buttonsDisabled && (
                <ThemedText style={styles.disabledMessage}>
                  Re-enabled after next question
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
  
  // Add theme context for text color calculation
  const { isNeonTheme } = useTheme();
  const colorScheme = useColorScheme() ?? 'light';

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
            levelProgress={ringData.levelProgress}
            icon={ringData.icon}
            level={ringData.level}
            isActive={isActive}
            glowOpacity={glowOpacity}
            maxDisplayLevel={ringData.maxDisplayLevel}
          />
        </Animated.View>
      </TouchableOpacity>
      
      {/* Topic name under the ring */}
      <View style={styles.ringLabelContainer}>
        {splitTopicForDisplay(ringData.topic).map((word, index) => (
          <ThemedText key={index} style={[styles.ringLabel, { color: getReadableTextColor(ringData.color, isNeonTheme, colorScheme) }]}>
            {word}
          </ThemedText>
        ))}
      </View>
    </Reanimated.View>
  );
};

// Main TopicRings Component
export const TopicRings: React.FC<TopicRingsProps> = ({
  config,
  size = 50,
  userId,
  activeTopic: propActiveTopic,
  activeSubtopic,
  onRingComplete,
}) => {
  const { topRings, onRingComplete: hookOnRingComplete, isSubTopicMode } = useTopicRings({ config, userId });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRing, setSelectedRing] = useState<TopicRingProgress | null>(null);
  
  // Popover state
  const [showPopover, setShowPopover] = useState(false);
  const [hasUserClickedRing, setHasUserClickedRing] = useState(false);
  const [popoverDismissed, setPopoverDismissed] = useState(false);
  const [anchorPosition, setAnchorPosition] = useState({ x: 0, y: 0 });

  // Storage keys for persistent state
  const RING_CLICK_KEY = 'topic_ring_clicked';
  const POPOVER_DISMISSED_KEY = 'topic_ring_popover_dismissed';

  // Load persistent state on mount
  useEffect(() => {
    const loadPopoverState = async () => {
      try {
        const [clickedValue, dismissedValue] = await Promise.all([
          AsyncStorage.getItem(RING_CLICK_KEY),
          AsyncStorage.getItem(POPOVER_DISMISSED_KEY),
        ]);
        
        setHasUserClickedRing(clickedValue === 'true');
        setPopoverDismissed(dismissedValue === 'true');
      } catch (error) {
        console.error('Error loading popover state:', error);
      }
    };
    
    loadPopoverState();
  }, []);

  // Check if we should show the popover
  useEffect(() => {
    const shouldShowPopover = topRings.length >= 3 && 
                             !hasUserClickedRing && 
                             !popoverDismissed &&
                             !modalVisible;
    
    if (shouldShowPopover && !showPopover) {
      // Calculate anchor position (center of the third ring)
      const thirdRingIndex = 2;
      const ringSpacing = size + 16; // Ring size + padding between rings
      const containerPadding = 20; // Base container padding
      
      // Calculate horizontal position (center of third ring)
      const anchorX = containerPadding + (thirdRingIndex * ringSpacing) + (size / 2);
      
      // Calculate vertical position (below the rings)
      const anchorY = 30 + size; // Much closer to rings - reduced from 80
      
      setAnchorPosition({ x: anchorX, y: anchorY });
      setShowPopover(true);
    } else if (!shouldShowPopover && showPopover) {
      setShowPopover(false);
    }
  }, [topRings.length, hasUserClickedRing, popoverDismissed, modalVisible, showPopover, size]);

  // Combine the external callback with the hook's callback
  const handleRingComplete = (topic: string, newLevel: number) => {
    hookOnRingComplete(topic, newLevel);
    if (onRingComplete) {
      onRingComplete(topic, newLevel);
    }
  };

  const handleRingPress = async (ring: TopicRingProgress) => {
    // Mark that user has clicked a ring
    if (!hasUserClickedRing) {
      setHasUserClickedRing(true);
      try {
        await AsyncStorage.setItem(RING_CLICK_KEY, 'true');
      } catch (error) {
        console.error('Error saving ring click state:', error);
      }
    }

    // Hide popover if visible
    if (showPopover) {
      setShowPopover(false);
    }

    // Track ring click
    trackTopicRingClick(ring.topic, {
      ringLevel: ring.level,
      ringProgress: Math.round((ring.currentProgress / ring.targetAnswers) * 100),
      totalCorrectAnswers: ring.totalCorrectAnswers,
      isSubTopic: ring.isSubTopic || false,
      parentTopic: ring.parentTopic || null,
      ringColor: ring.color,
      ringIcon: ring.icon,
      isActiveTopic: ring.topic.toLowerCase().trim() === propActiveTopic?.toLowerCase().trim(),
      ringPosition: topRings.findIndex(r => r.topic === ring.topic) + 1,
      totalRingsVisible: topRings.length,
    });

    setSelectedRing(ring);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedRing(null);
  };

  const handlePopoverDismiss = async () => {
    setShowPopover(false);
    setPopoverDismissed(true);
    
    try {
      await AsyncStorage.setItem(POPOVER_DISMISSED_KEY, 'true');
    } catch (error) {
      console.error('Error saving popover dismissed state:', error);
    }
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

  console.log(`[TOPIC RINGS] Rendering ${validRings.length} rings (sub-topic mode: ${isSubTopicMode}):`, 
    validRings.map(r => `${r.topic}${r.isSubTopic ? ' (sub)' : ''} (${r.totalCorrectAnswers} correct)`).join(', ')
  );

  return (
    <View style={styles.mainContainer}>
      <Reanimated.View 
        style={styles.container}
        layout={LinearTransition.springify()
          .stiffness(250)
          .damping(25)
          .mass(0.8)}
      >
        {validRings.map((ring, index) => {
          // For sub-topic rings, check if the current activeSubtopic matches this ring's topic
          // For regular rings, check if the current activeTopic matches this ring's topic
          const isRingActive = ring.isSubTopic 
            ? !!(activeSubtopic && ring.topic.toLowerCase().trim() === activeSubtopic.toLowerCase().trim())
            : !!(propActiveTopic && ring.topic.toLowerCase().trim() === propActiveTopic.toLowerCase().trim());
          
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
      </Reanimated.View>
      
      <RingDetailsModal
        visible={modalVisible}
        ringData={selectedRing}
        onClose={handleCloseModal}
      />
      
      <RingHintPopover
        visible={showPopover}
        onDismiss={handlePopoverDismiss}
        anchorPosition={anchorPosition}
      />
    </View>
  );
};

export const AppleActivityRing: React.FC<AppleActivityRingProps> = ({
  size = 64,
  strokeWidth = 10,
  color = '#FF2D55',
  progress = 0.7,
  levelProgress = 0.7,
  icon = 'activity',
  level = 1,
  isActive,
  glowOpacity,
  maxDisplayLevel = 10,
  highlightedRing,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const animatedProgress = React.useRef(new RNAnimated.Value(0)).current;
  
  // Add animation for level progress (inner ring)
  const animatedLevelProgress = React.useRef(new RNAnimated.Value(0)).current;
  
  // Add animations for ring highlighting
  const outerRingOpacity = React.useRef(new RNAnimated.Value(1)).current;
  const innerRingOpacity = React.useRef(new RNAnimated.Value(1)).current;
  const outerRingGlow = React.useRef(new RNAnimated.Value(0)).current;
  const innerRingGlow = React.useRef(new RNAnimated.Value(0)).current;
  
  // Inner ring calculations - make it more prominent
  const innerStrokeWidth = Math.max(6, strokeWidth * 0.8); // Inner ring is 80% of outer ring width (increased from 60%)
  const innerRadius = radius - strokeWidth - 1; // Leave only 1px gap between rings (reduced from 2px)
  const innerCircumference = 2 * Math.PI * innerRadius;

  React.useEffect(() => {
    // Animate both rings
    RNAnimated.parallel([
      RNAnimated.timing(animatedProgress, {
        toValue: progress,
        duration: 1000,
        useNativeDriver: true,
      }),
      RNAnimated.timing(animatedLevelProgress, {
        toValue: levelProgress || 0,
        duration: 1200, // Slightly slower for inner ring
        useNativeDriver: true,
      }),
    ]).start();
  }, [progress, levelProgress]);

  const strokeDashoffset = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });
  
  // Inner ring animation
  const innerStrokeDashoffset = animatedLevelProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [innerCircumference, 0],
  });

  // Animate highlighting based on highlightedRing
  React.useEffect(() => {
    const duration = 300;
    
    if (highlightedRing === 'level') {
      // Highlight inner ring (level)
      RNAnimated.parallel([
        RNAnimated.timing(outerRingOpacity, { toValue: 0.3, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingOpacity, { toValue: 1.0, duration, useNativeDriver: true }),
        RNAnimated.timing(outerRingGlow, { toValue: 0, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingGlow, { toValue: 1, duration, useNativeDriver: true }),
      ]).start();
    } else if (highlightedRing === 'questions') {
      // Highlight outer ring (questions)
      RNAnimated.parallel([
        RNAnimated.timing(outerRingOpacity, { toValue: 1.0, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingOpacity, { toValue: 0.3, duration, useNativeDriver: true }),
        RNAnimated.timing(outerRingGlow, { toValue: 1, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingGlow, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    } else {
      // Normal state
      RNAnimated.parallel([
        RNAnimated.timing(outerRingOpacity, { toValue: 1.0, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingOpacity, { toValue: 1.0, duration, useNativeDriver: true }),
        RNAnimated.timing(outerRingGlow, { toValue: 0, duration, useNativeDriver: true }),
        RNAnimated.timing(innerRingGlow, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    }
  }, [highlightedRing]);

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

  // Calculate inner ring color (brighter and more prominent than outer ring)
  const innerRingColor = color; // Use full opacity instead of 50%
  
  // Create a brighter version of the color for the inner ring
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
  
  const brighterInnerColor = brightenColor(color, 1.3); // 30% brighter

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
        
        {/* SVG-based glow effects that follow the ring progress */}
        
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
          
          {/* Outer ring (current level progress) */}
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
            opacity={RNAnimated.multiply(ringOpacity, outerRingOpacity)}
          />
          
          {/* Outer ring glow effect that follows progress */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth + 8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            opacity={outerRingGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.3],
            })}
          />
          
          {/* Outer ring glow effect with more blur */}
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth + 16}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
            opacity={outerRingGlow.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.15],
            })}
          />
          
          {/* Inner ring (level progression) */}
          {levelProgress !== undefined && levelProgress > 0 && (
            <>
              {/* Inner background ring */}
              <Circle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={isActive ? brighterInnerColor + '60' : brighterInnerColor + '30'} // More transparent background
                strokeWidth={innerStrokeWidth}
                fill="none"
              />
              
              {/* Inner progress ring */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={brighterInnerColor}
                strokeWidth={innerStrokeWidth}
                fill="none"
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerStrokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
                opacity={RNAnimated.multiply(ringOpacity, innerRingOpacity)}
              />
              
              {/* Inner ring glow effect that follows progress */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={brighterInnerColor}
                strokeWidth={innerStrokeWidth + 6}
                fill="none"
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerStrokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
                opacity={innerRingGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.4],
                })}
              />
              
              {/* Inner ring glow effect with more blur */}
              <AnimatedCircle
                cx={size / 2}
                cy={size / 2}
                r={innerRadius}
                stroke={brighterInnerColor}
                strokeWidth={innerStrokeWidth + 12}
                fill="none"
                strokeDasharray={innerCircumference}
                strokeDashoffset={innerStrokeDashoffset}
                strokeLinecap="round"
                rotation="-90"
                origin={`${size / 2}, ${size / 2}`}
                opacity={innerRingGlow.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.2],
                })}
              />
            </>
          )}
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
      

    </View>
  );
};

// Helper function to ensure readable text color
const getReadableTextColor = (ringColor: string, isNeonTheme: boolean, colorScheme: string) => {
  // For neon theme, use the ring color with high opacity for good visibility
  if (isNeonTheme) {
    return ringColor;
  }
  
  // For light theme, use the ring color but ensure it's dark enough
  if (colorScheme === 'light') {
    // Convert hex to RGB to check brightness
    const hex = ringColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate brightness (0-255)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // If color is too light, darken it for better contrast on light background
    if (brightness > 180) {
      return `rgba(${Math.max(0, r - 80)}, ${Math.max(0, g - 80)}, ${Math.max(0, b - 80)}, 0.9)`;
    }
    
    return ringColor;
  }
  
  // For dark theme, use the ring color with good opacity
  return ringColor;
};

// Helper function to intelligently split topic names for display
const splitTopicForDisplay = (topic: string): string[] => {
  // Split by spaces first
  const words = topic.split(' ');
  
  // If we have 2 or fewer words, return as is
  if (words.length <= 2) {
    return words;
  }
  
  // Look for "&" and combine it with the following word
  const result: string[] = [];
  let i = 0;
  
  while (i < words.length && result.length < 2) {
    const currentWord = words[i];
    
    // If current word is "&" and there's a next word, combine them
    if (currentWord === '&' && i + 1 < words.length) {
      result.push(`${currentWord} ${words[i + 1]}`);
      i += 2; // Skip the next word since we combined it
    } else {
      result.push(currentWord);
      i++;
    }
  }
  
  return result;
};

const styles = StyleSheet.create({
  mainContainer: {
    position: 'relative',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align rings to top to match profile button
    justifyContent: 'flex-start',
    overflow: 'visible', // Ensure glow effects aren't clipped
  },
  ringWrapper: {
    alignItems: 'center',
    overflow: 'visible', // Ensure glow effects aren't clipped
    // Add padding to accommodate glow effects on iOS
    ...(Platform.OS === 'ios' && {
      paddingHorizontal: 4,
      paddingVertical: 0, // Remove vertical padding to prevent upward shift
    }),
  },
  ringLabelContainer: {
    alignItems: 'center',
    marginTop: 8,
    minWidth: 50,
  },
  ringLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
    // Add subtle text shadow for better readability on any background
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
    // Ensure glow effects aren't clipped
    overflow: 'visible',
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
    marginBottom: 12,
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
  // Add styles for sub-topic elements
  parentTopicLabel: {
    fontSize: 14,
    opacity: 0.7,
    fontStyle: 'italic',
    flex: 1,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  // Popover styles
  popoverOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    pointerEvents: 'box-none', // Allow interactions to pass through
  },
  popoverContainer: {
    position: 'absolute',
    minWidth: 220,
    maxWidth: 300,
    backgroundColor: 'white',
    borderRadius: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
    zIndex: 1000, // Ensure it appears above other content
    pointerEvents: 'box-none', // Allow interactions to pass through except for interactive elements
  },
  popoverArrow: {
    position: 'absolute',
    top: -10,
    left: '50%',
    marginLeft: -10,
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#00FF88', // Will be overridden by style prop
  },
  popoverContent: {
    padding: 16,
  },
  popoverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  popoverTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginLeft: 8,
  },
  popoverClose: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  popoverText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  modalRingContainer: {
    alignItems: 'center',
    marginBottom: 20,
    // Ensure glow effects aren't clipped
    overflow: 'visible',
  },
}); 