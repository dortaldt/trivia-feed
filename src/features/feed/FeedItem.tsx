import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  TextStyle,
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
  Pressable,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { QuestionState } from '../../store/triviaSlice';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import Leaderboard from '../../components/Leaderboard';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '@/src/context/ThemeContext';
import NeonGradientBackground from '../../components/NeonGradientBackground';
import { NeonTopicColors, getTopicColor } from '@/constants/NeonColors';

const { width, height } = Dimensions.get('window');

// Updated type to support multiple answers and add new props
type FeedItemProps = {
  item: {
    id: string;
    question: string;
    answers: {
      text: string;
      isCorrect: boolean;
    }[];
    difficulty: string;
    likes: number;
    views: number;
    backgroundColor: string; // Changed from backgroundImage to backgroundColor
    learningCapsule: string;
    tags?: string[];
    topic: string;
    // category is now optional since we've migrated to using topic
    category?: string;
  };
  nextTopic?: string; // Add the next item's topic prop
  onAnswer?: (answerIndex: number, isCorrect: boolean) => void;
  showExplanation?: () => void;
  onNextQuestion?: () => void;
  onToggleLeaderboard?: () => void;
};

const FeedItem: React.FC<FeedItemProps> = ({ 
  item, 
  nextTopic, 
  onAnswer, 
  showExplanation, 
  onNextQuestion, 
  onToggleLeaderboard 
}) => {
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  // Animation values for buttons
  const answerAnimations = useRef(item.answers.map(() => new Animated.Value(1))).current;
  const fadeInAnims = useRef(item.answers.map(() => new Animated.Value(0))).current;
  
  const mouseEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderCount = useRef(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const colorScheme = useColorScheme();
  const { isNeonTheme } = useTheme();
  
  const questionState = useAppSelector(state => 
    state.trivia.questions[item.id] as QuestionState | undefined
  );
  
  const dispatch = useAppDispatch();
  
  const { 
    animateIn, 
    animateOut, 
    resetAnimations, 
    getPopupAnimatedStyle,
    springAnimation,
    isIOS
  } = useIOSAnimations();

  // Run animations when component mounts
  useEffect(() => {
    // Stagger fade-in animations for answer options
    item.answers.forEach((_, index) => {
      Animated.timing(fadeInAnims[index], {
        toValue: 1,
        duration: 250,
        delay: 150 + (index * 70),
        useNativeDriver: true
      }).start();
    });
  }, []);

  // Press animation for answer buttons
  const animateAnswerPress = (index: number, pressed: boolean) => {
    Animated.spring(answerAnimations[index], {
      toValue: pressed ? 0.98 : 1,
      friction: 8,
      tension: 100,
      useNativeDriver: true
    }).start();
  };

  const calculateFontSize = useMemo(() => {
    const textLength = item.question.length;
    const lineBreaks = (item.question.match(/\n/g) || []).length;
    
    const isMobileWeb = Platform.OS === 'web' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let fontSize = isMobileWeb ? 24 : 38;
    
    if (textLength > 50 || lineBreaks > 1) {
      fontSize = isMobileWeb ? 20 : 32;
    }
    
    if (textLength > 100 || lineBreaks > 2) {
      fontSize = isMobileWeb ? 18 : 24;
    }
    
    if (textLength > 130 || lineBreaks > 3) {
      fontSize = isMobileWeb ? 16 : 20;
    }
    
    if (textLength > 180 || lineBreaks > 4) {
      fontSize = isMobileWeb ? 14 : 18;
    }
    
    if (textLength > 200 || lineBreaks > 6) {
      fontSize = 14;
    }
    
    return fontSize;
  }, [item.question]);
  
  const lineHeight = useMemo(() => {
    return Math.round(calculateFontSize * 1.2);
  }, [calculateFontSize]);
  
  useEffect(() => {
    console.log(`[DEBUG] FeedItem component render #${renderCount.current} for item ${item.id}`);
    console.log(`[DEBUG] Current state - hoveredAnswerIndex: ${hoveredAnswerIndex}, hoveredAction: ${hoveredAction}`);
  });
  
  const textColor = useThemeColor({}, 'text');

  const selectAnswer = (index: number) => {
    // Trigger gentle haptic feedback when selecting an answer
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        .catch(err => console.log('Haptics not supported', err));
    }
    
    if (isIOS) {
      springAnimation();
    }

    // Animate selected answer with a bounce effect
    Animated.sequence([
      Animated.timing(answerAnimations[index], {
        toValue: 0.96,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.spring(answerAnimations[index], {
        toValue: 1,
        friction: 5,
        tension: 40,
        useNativeDriver: true
      })
    ]).start();
    
    if (onAnswer && !isAnswered()) {
      onAnswer(index, item.answers[index].isCorrect);
      
      if (!item.answers[index].isCorrect) {
        setShowLearningCapsule(true);
        setTimeout(() => {
          animateIn();
        }, 10);
      }
    }
  };

  const toggleLike = () => {
    // Add subtle haptic for like button too
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync()
        .catch(err => console.log('Haptics not supported', err));
    }
    
    if (isIOS) {
      springAnimation();
    }
    
    setIsLiked(!isLiked);
  };

  const toggleLearningCapsule = () => {
    if (showLearningCapsule) {
      animateOut(() => {
        setShowLearningCapsule(false);
        resetAnimations();
      });
    } else {
      setShowLearningCapsule(true);
      setTimeout(() => {
        animateIn();
      }, 10);
    }
  };

  const toggleLeaderboard = useCallback(() => {
    if (onToggleLeaderboard) {
      onToggleLeaderboard();
    }
  }, [onToggleLeaderboard]);

  const isAnswered = () => {
    return questionState?.status === 'answered' && questionState?.answerIndex !== undefined;
  };
  
  const isSkipped = () => {
    return questionState?.status === 'skipped';
  };

  const isSelectedAnswerCorrect = () => {
    if (!isAnswered() || questionState?.answerIndex === undefined) {
      return false;
    }
    return item.answers[questionState.answerIndex].isCorrect;
  };

  const handleMouseEnter = (index: number) => {
    if (mouseEnterTimerRef.current) {
      clearTimeout(mouseEnterTimerRef.current);
    }
    mouseEnterTimerRef.current = setTimeout(() => {
      setHoveredAnswerIndex(index);
    }, 30);
  };

  const handleMouseLeave = () => {
    if (mouseLeaveTimerRef.current) {
      clearTimeout(mouseLeaveTimerRef.current);
    }
    mouseLeaveTimerRef.current = setTimeout(() => {
      setHoveredAnswerIndex(null);
    }, 30);
  };

  const handleActionMouseEnter = (action: string) => {
    setHoveredAction(action);
  };

  const handleActionMouseLeave = () => {
    setHoveredAction(null);
  };

  const dynamicStyles = StyleSheet.create({
    backgroundColor: {
      flex: 1,
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: item.backgroundColor
    }
  });

  // Get answer option style with animations
  const getAnswerOptionStyle = (index: number) => {
    const isSelected = isAnswered() && questionState?.answerIndex === index;
    const isCorrect = item.answers[index].isCorrect;
    const isSelectedCorrect = isSelected && isCorrect;
    const isSelectedIncorrect = isSelected && !isCorrect;
    const shouldShowCorrectAnswer = isAnswered() && !isSelectedAnswerCorrect() && isCorrect;
    const isNotSelected = isAnswered() && questionState?.answerIndex !== index && !shouldShowCorrectAnswer;

    // Base styles for all themes
    const baseStyles = [
      styles.answerOption,
      { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
      isSelected && styles.selectedAnswerOption,
      isSelectedCorrect && styles.correctAnswerOption,
      isSelectedIncorrect && styles.incorrectAnswerOption,
      shouldShowCorrectAnswer && styles.correctAnswerOption,
      // Make non-selected answers semi-transparent after selection
      isNotSelected && styles.nonSelectedAnswerOption,
      Platform.OS === 'web' && hoveredAnswerIndex === index && styles.hoveredAnswerOption,
      isSkipped() && styles.skippedAnswerOption,
    ];
    
    // Add neon-specific styles when neon theme is active
    if (isNeonTheme) {
      const neonStyle: any = {
        borderWidth: 1,
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 5,
      };
      
      // Get the topic neon color
      const topicNeonColor = getTopicNeonColor();
      
      // Set background color based on answer state
      if (isSelectedCorrect) {
        // Correct answer selected
        neonStyle.backgroundColor = 'rgba(0, 255, 0, 0.15)';
        neonStyle.borderColor = '#4CAF50';
        neonStyle.shadowColor = '#4CAF50';
        neonStyle.shadowOpacity = 0.8;
        if (Platform.OS === 'web') {
          neonStyle.boxShadow = '0 0 10px #4CAF50, 0 0 5px rgba(76, 175, 80, 0.5)';
        }
      } else if (isSelectedIncorrect) {
        // Incorrect answer selected
        neonStyle.backgroundColor = 'rgba(255, 0, 0, 0.15)';
        neonStyle.borderColor = '#F44336';
        neonStyle.shadowColor = '#F44336';
        neonStyle.shadowOpacity = 0.8;
        if (Platform.OS === 'web') {
          neonStyle.boxShadow = '0 0 10px #F44336, 0 0 5px rgba(244, 67, 54, 0.5)';
        }
      } else if (shouldShowCorrectAnswer) {
        // This is the correct answer but user selected a different one
        neonStyle.backgroundColor = 'rgba(0, 255, 0, 0.15)';
        neonStyle.borderColor = '#4CAF50';
        neonStyle.borderStyle = 'dashed';
        neonStyle.shadowColor = '#4CAF50';
        neonStyle.shadowOpacity = 0.5;
        if (Platform.OS === 'web') {
          neonStyle.boxShadow = '0 0 8px rgba(76, 175, 80, 0.5)';
        }
      } else {
        // Default neon style for unanswered or non-relevant answers
        neonStyle.backgroundColor = 'rgba(0, 0, 0, 0.6)';
        neonStyle.borderColor = hoveredAnswerIndex === index ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)';
        neonStyle.shadowColor = topicNeonColor;
        neonStyle.shadowOpacity = 0.5;
        if (Platform.OS === 'web') {
          const hexColor = topicNeonColor.replace('#', '');
          const r = parseInt(hexColor.substring(0, 2), 16);
          const g = parseInt(hexColor.substring(2, 4), 16);
          const b = parseInt(hexColor.substring(4, 6), 16);
          const rgbaColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
          neonStyle.boxShadow = hoveredAnswerIndex === index 
            ? `0 0 10px ${topicNeonColor}, 0 0 5px ${rgbaColor}` 
            : `0 0 5px ${rgbaColor}`;
          neonStyle.transition = 'all 0.2s ease';
        }
      }
      
      baseStyles.push(neonStyle);
    }
    
    return baseStyles;
  };

  // Get topic color for the current topic
  const getTopicTitleColor = () => {
    if (!isNeonTheme) return 'white'; // Default color for non-neon theme
    const topicColor = getTopicColor(item.topic);
    return topicColor.hex;
  };

  // Get adjusted topic color for UI elements like shadows and borders
  const getTopicNeonColor = () => {
    if (!isNeonTheme) return '#00FFFF'; // Default cyan
    const topicColor = getTopicColor(item.topic);
    return topicColor.hex;
  };

  // Get the topic color with alpha for backgrounds
  const getTopicBackgroundColor = (alpha: number = 0.15) => {
    if (!isNeonTheme) return 'rgba(0, 0, 0, 0.6)';
    const topicColor = getTopicColor(item.topic);
    const hex = topicColor.hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {isNeonTheme ? (
          // Use NeonGradientBackground for neon theme - pass the nextTopic
          <NeonGradientBackground topic={item.topic} nextTopic={nextTopic} />
        ) : (
          // Use regular background color for other themes
          <View style={dynamicStyles.backgroundColor} />
        )}
        
        <View style={[styles.overlay, {zIndex: 1}]} />

        <View style={[styles.content, {zIndex: 2}]}>
          <View style={styles.header}>
            <Text style={[
              styles.topicLabel, 
              isNeonTheme && { 
                color: getTopicTitleColor()
              }
            ]}>{item.topic}</Text>
            <View style={[styles.difficulty, { 
              backgroundColor: 
                item.difficulty?.toLowerCase() === 'easy' ? '#8BC34A' :
                item.difficulty?.toLowerCase() === 'medium' ? '#FFEB3B' :
                '#9C27B0'
            }]}>
              <Text style={[styles.difficultyText, { 
                color: 
                  item.difficulty?.toLowerCase() === 'easy' ? '#507523' :
                  item.difficulty?.toLowerCase() === 'medium' ? '#806F00' :
                  '#4A1158'
              }]}>{item.difficulty}</Text>
            </View>
          </View>

          <View style={styles.questionContainer}>
            <ThemedText type="question" style={[
              styles.questionText, 
              { 
                fontSize: calculateFontSize,
                lineHeight: lineHeight 
              },
              isNeonTheme && {
                color: '#FFFFFF'
              }
            ]}>
              {item.question}
            </ThemedText>

            {isSkipped() && (
              <View style={styles.skippedContainer}>
                <FeatherIcon name="skip-forward" size={24} color="#FFC107" style={styles.skippedIcon} />
                <ThemedText style={styles.skippedText}>
                  You skipped this question
                </ThemedText>
              </View>
            )}
            
            <View style={styles.answersContainer}>
              <>
                {item.answers.map((answer, index) => (
                  <Animated.View key={`${item.id}-answer-container-${index}`}
                    style={{
                      transform: [{ scale: answerAnimations[index] }],
                      opacity: fadeInAnims[index],
                    }}
                  >
                    <Pressable
                      key={`${item.id}-answer-${index}`}
                      style={({ pressed }) => [
                        ...getAnswerOptionStyle(index),
                        pressed && styles.pressedAnswerOption
                      ]}
                      onPress={() => selectAnswer(index)}
                      onPressIn={() => animateAnswerPress(index, true)}
                      onPressOut={() => animateAnswerPress(index, false)}
                      disabled={isAnswered()}
                      {...(Platform.OS === 'web' ? {
                        onMouseEnter: () => handleMouseEnter(index),
                        onMouseLeave: handleMouseLeave
                      } : {})}
                    >
                      <ThemedText 
                        type="default"
                        style={[
                          styles.answerText,
                          // Basic selection styling 
                          isAnswered() && questionState?.answerIndex === index && styles.selectedAnswerText,
                          isSkipped() && styles.skippedAnswerText,
                          
                          // Apply color based on answer correctness after selection
                          // Selected answer - correct (green) or incorrect (red)
                          isAnswered() && questionState?.answerIndex === index && (
                            answer.isCorrect ? styles.correctAnswerText : styles.incorrectAnswerText
                          ),
                          
                          // Highlight correct answer when user selected wrong
                          isAnswered() && !isSelectedAnswerCorrect() && answer.isCorrect && styles.correctAnswerText,
                          
                          // Base color for neon theme
                          !isAnswered() && isNeonTheme && { color: '#FFFFFF' }
                        ]}
                      >
                        {answer.text}
                      </ThemedText>
                      
                      {(isAnswered() && questionState?.answerIndex === index && (
                        answer.isCorrect ? 
                        <FeatherIcon name="check-square" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} /> : 
                        <FeatherIcon name="x-circle" size={24} color="#F44336" style={{marginLeft: 8} as TextStyle} />
                      )) || (isAnswered() && !isSelectedAnswerCorrect() && answer.isCorrect && (
                        <FeatherIcon name="square" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} />
                      ))}
                    </Pressable>
                  </Animated.View>
                ))}
                
                {isAnswered() && (
                  <>
                  </>
                )}
              </>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity 
              onPress={toggleLike} 
              style={[
                styles.actionButton,
                Platform.OS === 'web' && hoveredAction === 'like' && styles.hoveredActionButton,
                isNeonTheme && {
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                  ...(Platform.OS === 'web' ? {
                    boxShadow: 'none'
                  } : {
                    shadowColor: 'transparent',
                  })
                }
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('like'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name={isLiked ? "heart" : "heart"} 
                size={22} 
                color={isLiked ? '#FF4C65' : 'white'} 
                style={[styles.icon, isLiked ? {} : {opacity: 0.9}]} 
              />
              <ThemedText style={[
                styles.actionText, 
                isNeonTheme && {
                  color: 'white',
                  ...(Platform.OS === 'web' ? {
                    textShadow: 'none'
                  } : {
                    textShadowColor: 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 0,
                  })
                }
              ]}>
                {isLiked ? item.likes + 1 : item.likes}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={toggleLeaderboard}
              style={[
                styles.actionButton,
                Platform.OS === 'web' && hoveredAction === 'leaderboard' && styles.hoveredActionButton,
                isNeonTheme && {
                  borderWidth: 0,
                  backgroundColor: 'transparent',
                  ...(Platform.OS === 'web' ? {
                    boxShadow: 'none'
                  } : {
                    shadowColor: 'transparent',
                  })
                }
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('leaderboard'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name="award" 
                size={22} 
                color="white" 
                style={styles.icon} 
              />
              <ThemedText style={[
                styles.actionText, 
                isNeonTheme && {
                  color: 'white',
                  ...(Platform.OS === 'web' ? {
                    textShadow: 'none'
                  } : {
                    textShadowColor: 'transparent',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 0,
                  })
                }
              ]}>Leaderboard</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {showLearningCapsule && (
          <Animated.View style={[
            styles.learningCapsule, 
            isNeonTheme && styles.neonLearningCapsule,
            getPopupAnimatedStyle()
          ]}>
            <View style={styles.learningCapsuleHeader}>
              <ThemedText style={styles.learningCapsuleTitle}>Learn More</ThemedText>
              <TouchableOpacity onPress={toggleLearningCapsule} style={styles.closeButton}>
                <FeatherIcon name="x" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.learningCapsuleText}>
              {item.learningCapsule}
            </ThemedText>
          </Animated.View>
        )}
      </View>
    </SafeAreaView>
  );
};

export default FeedItem;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    width: '100%',
    height: '100%',
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'column',
    justifyContent: 'flex-end',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
    ...(Platform.OS === 'web' ? {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    } : {})
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  topicLabel: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  difficulty: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  difficultyText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)' } as any : {}),
  },
  answersContainer: {
    marginTop: 10,
  },
  answerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  selectedAnswerOption: {
    borderWidth: 2,
    borderColor: 'white',
  },
  correctAnswerOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  incorrectAnswerOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#F44336',
  },
  hoveredAnswerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{scale: 1.02}],
  },
  skippedAnswerOption: {
    opacity: 0.7,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  answerText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  selectedAnswerText: {
    fontWeight: 'bold',
  },
  skippedAnswerText: {
    opacity: 0.7,
  },
  skippedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  skippedIcon: {
    marginRight: 8,
  },
  skippedText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 20,
  },
  neonActionButton: {
    backgroundColor: 'transparent',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 0,
    ...(Platform.OS === 'web' ? {
      boxShadow: 'none'
    } as any : {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    })
  },
  hoveredActionButton: {
    backgroundColor: 'transparent',
  },
  icon: {
    marginRight: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
  },
  neonActionText: {
    ...(Platform.OS === 'web' ? {
      textShadow: '0 0 5px rgba(255, 255, 255, 0.7)'
    } as any : {
      textShadowColor: '#FFFFFF',
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: 2,
    })
  },
  learningCapsule: {
    position: 'absolute',
    top: 100,
    alignSelf: 'center',
    width: '90%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: '40%',
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      maxWidth: 600,
      width: '80%',
    } : {})
  },
  neonLearningCapsule: {
    borderColor: '#00BBFF',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 10px #00BBFF, 0 0 20px rgba(0, 187, 255, 0.5), inset 0 0 8px rgba(0, 187, 255, 0.3)'
    } : {
      borderWidth: 2,
      shadowColor: '#00BBFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
    })
  },
  learningCapsuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  learningCapsuleTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 5,
  },
  learningCapsuleText: {
    color: 'white',
    fontSize: 16,
    lineHeight: 20,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  pressedAnswerOption: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  correctAnswerText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  incorrectAnswerText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  nonSelectedAnswerOption: {
    opacity: 0.5,
  },
});