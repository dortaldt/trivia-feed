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
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { QuestionState } from '../../store/triviaSlice';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import Leaderboard from '../../components/Leaderboard';
import { useAuth } from '../../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Updated type to support multiple answers and add new props
type FeedItemProps = {
  item: {
    id: string;
    category: string;
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
  };
  onAnswer?: (answerIndex: number, isCorrect: boolean) => void;
  showExplanation?: () => void;
  onNextQuestion?: () => void;
  onToggleLeaderboard?: () => void;
};

const FeedItem: React.FC<FeedItemProps> = ({ item, onAnswer, showExplanation, onNextQuestion, onToggleLeaderboard }) => {
  const [selectedAnswerIndex, setSelectedAnswerIndex] = useState<number | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  
  const mouseEnterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mouseLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renderCount = useRef(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const colorScheme = useColorScheme();
  
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
    if (isIOS) {
      springAnimation();
    }
    
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={dynamicStyles.backgroundColor} />
        
        <View style={[styles.overlay, {zIndex: 1}]} />

        <View style={[styles.content, {zIndex: 2}]}>
          <View style={styles.header}>
            <Text style={styles.category}>{item.category}</Text>
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
            <ThemedText type="question" style={[styles.questionText, { 
              fontSize: calculateFontSize,
              lineHeight: lineHeight 
            }]}>
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
                  <TouchableOpacity
                    key={`${item.id}-answer-${index}`}
                    style={[
                      styles.answerOption,
                      { backgroundColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.2)' },
                      isAnswered() && questionState?.answerIndex === index && styles.selectedAnswerOption,
                      isAnswered() && 
                      questionState?.answerIndex === index && 
                      answer.isCorrect && 
                      styles.correctAnswerOption,
                      isAnswered() && 
                      questionState?.answerIndex === index && 
                      !answer.isCorrect && 
                      styles.incorrectAnswerOption,
                      isAnswered() && 
                      questionState?.answerIndex !== index && 
                      answer.isCorrect && 
                      !isSelectedAnswerCorrect() && 
                      styles.correctAnswerOption,
                      Platform.OS === 'web' && hoveredAnswerIndex === index && styles.hoveredAnswerOption,
                      isSkipped() && styles.skippedAnswerOption,
                    ]}
                    onPress={() => selectAnswer(index)}
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
                        isAnswered() && questionState?.answerIndex === index && styles.selectedAnswerText,
                        isSkipped() && styles.skippedAnswerText
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
                  </TouchableOpacity>
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
                Platform.OS === 'web' && hoveredAction === 'like' && styles.hoveredActionButton
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('like'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name={isLiked ? "heart" : "heart"} 
                size={20} 
                color={isLiked ? '#F44336' : 'white'} 
                style={[styles.icon, isLiked ? {} : {opacity: 0.8}]} 
              />
              <ThemedText style={styles.actionText}>
                {isLiked ? item.likes + 1 : item.likes}
              </ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={toggleLeaderboard}
              style={[
                styles.actionButton,
                Platform.OS === 'web' && hoveredAction === 'leaderboard' && styles.hoveredActionButton
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('leaderboard'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name="award" 
                size={20} 
                color="white" 
                style={styles.icon} 
              />
              <ThemedText style={styles.actionText}>Leaderboard</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        {showLearningCapsule && (
          <Animated.View style={[styles.learningCapsule, getPopupAnimatedStyle()]}>
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
  category: {
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
  hoveredActionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  icon: {
    marginRight: 5,
  },
  actionText: {
    color: 'white',
    fontSize: 14,
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
});