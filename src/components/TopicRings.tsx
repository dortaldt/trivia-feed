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
import Svg, { Circle } from 'react-native-svg';
import { Animated as RNAnimated } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

interface TopicRingsProps {
  config?: RingConfig;
  size?: number;
  userId?: string;
  onRingComplete?: (topic: string, newLevel: number) => void;
}

interface SingleRingProps {
  ringData: TopicRingProgress;
  size: number;
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
const SingleRing: React.FC<SingleRingProps> = ({ ringData, size, onPress }) => {
  // Ensure all values are valid numbers before calculations
  const safeCurrentProgress = typeof ringData.currentProgress === 'number' && !isNaN(ringData.currentProgress) ? ringData.currentProgress : 0;
  const safeTargetAnswers = typeof ringData.targetAnswers === 'number' && !isNaN(ringData.targetAnswers) && ringData.targetAnswers > 0 ? ringData.targetAnswers : 1;
  
  const progressPercentage = Math.min(Math.max(safeCurrentProgress / safeTargetAnswers, 0), 1);

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={[styles.singleRingContainer, { width: size, height: size }]}
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
      />
    </TouchableOpacity>
  );
};

// Main TopicRings Component
export const TopicRings: React.FC<TopicRingsProps> = ({
  config,
  size = 50,
  userId,
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

  return (
    <View style={styles.container}>
      {validRings.map((ring, index) => (
        <View key={ring.topic} style={[styles.ringWrapper, { marginLeft: index > 0 ? 8 : 0 }]}>
          <SingleRing
            ringData={ring}
            size={size}
            onPress={() => handleRingPress(ring)}
          />
        </View>
      ))}
      
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

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size}>
          {/* Background ring */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color + '33'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
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
          />
        </Svg>
        {/* Center icon */}
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
          <Feather name={icon as any} size={size * 0.32} color={color} />
        </View>
      </View>
      {/* Level below */}
      <View style={{ marginTop: 4 }}>
        <ThemedText style={{ color, fontWeight: 'bold', fontSize: size * 0.16 }}>L{level}</ThemedText>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  ringWrapper: {
    alignItems: 'center',
    marginBottom: 8,
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
}); 