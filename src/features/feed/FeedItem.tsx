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
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { answerQuestion, QuestionState } from '../../store/triviaSlice';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

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
};

const FeedItem: React.FC<FeedItemProps> = ({ item, onAnswer, showExplanation, onNextQuestion }) => {
  const [liked, setLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const renderCount = useRef(0);
  
  // Add debounce timer refs
  const mouseEnterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Log component renders
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[DEBUG] FeedItem component render #${renderCount.current} for item ${item.id}`);
    console.log(`[DEBUG] Current state - hoveredAnswerIndex: ${hoveredAnswerIndex}, hoveredAction: ${hoveredAction}`);
  });
  
  // Use our iOS animations hook for the learning capsule
  const { 
    animateIn, 
    animateOut, 
    resetAnimations, 
    getPopupAnimatedStyle,
    springAnimation,
    isIOS
  } = useIOSAnimations();

  // Get theme colors
  const colorScheme = useColorScheme() ?? 'light';
  const textColor = useThemeColor({}, 'text');

  // Get the question state from Redux store
  const questionState = useAppSelector(
    state => state.trivia.questions[item.id] as QuestionState | undefined
  );
  const dispatch = useAppDispatch();

  const selectAnswer = (index: number) => {
    // Add iOS spring feedback when selecting an answer
    if (isIOS) {
      springAnimation();
    }
    
    // Call the onAnswer prop if provided
    if (onAnswer && !isAnswered()) {
      onAnswer(index, item.answers[index].isCorrect);
    }
    
    // Just pass answerIndex to the reducer, which doesn't use isCorrect
    dispatch(answerQuestion({ 
      questionId: item.id, 
      answerIndex: index,
      isCorrect: item.answers[index].isCorrect
    }));
  };

  const toggleLike = () => {
    // Add iOS spring feedback when liking
    if (isIOS) {
      springAnimation();
    }
    
    setLiked(!liked);
  };

  const toggleLearningCapsule = () => {
    if (showLearningCapsule) {
      // Animate out
      animateOut(() => {
        setShowLearningCapsule(false);
        resetAnimations();
      });
    } else {
      setShowLearningCapsule(true);
      // Animate in after state update
      setTimeout(() => {
        animateIn();
      }, 10);
    }
  };

  // Determine if we have an answer and if it's correct
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

  // Handle mouse enter for hover state (web only)
  const handleMouseEnter = (index: number) => {
    // Use debounce to avoid flickering on fast mouse movement
    if (mouseEnterTimerRef.current) {
      clearTimeout(mouseEnterTimerRef.current);
    }
    mouseEnterTimerRef.current = setTimeout(() => {
      setHoveredAnswerIndex(index);
    }, 30);
  };

  // Handle mouse leave for hover state (web only)
  const handleMouseLeave = () => {
    // Use debounce to avoid flickering on fast mouse movement
    if (mouseLeaveTimerRef.current) {
      clearTimeout(mouseLeaveTimerRef.current);
    }
    mouseLeaveTimerRef.current = setTimeout(() => {
      setHoveredAnswerIndex(null);
    }, 30);
  };

  // Handle mouse enter for action buttons
  const handleActionMouseEnter = (action: string) => {
    setHoveredAction(action);
  };

  // Handle mouse leave for action buttons
  const handleActionMouseLeave = () => {
    setHoveredAction(null);
  };

  const getResultText = () => {
    if (!isAnswered()) {
      return '';
    }
    
    if (isSelectedAnswerCorrect()) {
      const phrases = [
        "That's correct!",
        "Great job!",
        "You got it!",
        "Excellent!",
        "Well done!",
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    } else {
      const phrases = [
        "Not quite!",
        "Good try, but not correct.",
        "That's not right.",
        "Sorry, that's incorrect.",
        "Not the right answer.",
      ];
      return phrases[Math.floor(Math.random() * phrases.length)];
    }
  };

  // Custom styles for background color
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

  // Ensure the Next Question button doesn't trigger scrolling within the component
  const handleNextQuestion = useCallback(() => {
    if (onNextQuestion) {
      // Prevent default behavior
      setTimeout(() => {
        onNextQuestion();
      }, 50);
    }
  }, [onNextQuestion]);

  return (
    <View style={styles.container}>
      {/* Solid color background instead of image */}
      <View style={dynamicStyles.backgroundColor} />
      
      <View style={[styles.overlay, {zIndex: 1}]} />

      <View style={[styles.content, {zIndex: 2}]}>
        <View style={styles.header}>
          <Text style={styles.category}>{item.category}</Text>
          <View style={[styles.difficulty, { 
            backgroundColor: 
              item.difficulty === 'Easy' ? '#4CAF50' :
              item.difficulty === 'Medium' ? '#FFC107' :
              '#F44336'
          }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>

        <View style={styles.questionContainer}>
          {/* Using ThemedText with question type for DM Serif */}
          <ThemedText type="question" style={styles.questionText}>
            {item.question}
          </ThemedText>

          {/* Show "Skipped" banner if question was skipped */}
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
                    // Highlight the correct answer when any wrong answer is selected
                    isAnswered() && 
                    questionState?.answerIndex !== index && 
                    answer.isCorrect && 
                    !isSelectedAnswerCorrect() && 
                    styles.correctAnswerOption,
                    // Add hover state for web
                    Platform.OS === 'web' && hoveredAnswerIndex === index && styles.hoveredAnswerOption,
                    // Add skipped state styling
                    isSkipped() && styles.skippedAnswerOption,
                  ]}
                  onPress={() => selectAnswer(index)}
                  // Don't disable if skipped so user can still answer
                  disabled={isAnswered()}
                  // Add onMouseEnter and onMouseLeave conditionally for web
                  {...(Platform.OS === 'web' ? {
                    onMouseEnter: () => handleMouseEnter(index),
                    onMouseLeave: handleMouseLeave
                  } : {})}
                >
                  {/* Use ThemedText for answers to ensure Inter font */}
                  <ThemedText style={[
                    styles.answerText, 
                    isAnswered() && questionState?.answerIndex === index && styles.selectedAnswerText,
                    isSkipped() && styles.skippedAnswerText
                  ]}>
                    {answer.text}
                  </ThemedText>
                  
                  {(isAnswered() && questionState?.answerIndex === index && (
                    answer.isCorrect ? 
                    <FeatherIcon name="check-circle" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} /> : 
                    <FeatherIcon name="x-circle" size={24} color="#F44336" style={{marginLeft: 8} as TextStyle} />
                  )) || (isAnswered() && !isSelectedAnswerCorrect() && answer.isCorrect && (
                    <FeatherIcon name="check-circle" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} />
                  ))}
                </TouchableOpacity>
              ))}
              
              {isAnswered() && (
                <>
                  <ThemedText style={[
                    styles.resultText, 
                    isSelectedAnswerCorrect() ? styles.correctResultText : styles.incorrectResultText
                  ]}>
                    {getResultText()}
                  </ThemedText>
                  
                  {/* Add Next Question button */}
                  {onNextQuestion && (
                    <TouchableOpacity
                      style={styles.nextQuestionButton}
                      onPress={handleNextQuestion}
                      {...(Platform.OS === 'web' ? {
                        onMouseEnter: () => handleActionMouseEnter('next'),
                        onMouseLeave: handleActionMouseLeave
                      } : {})}
                    >
                      <ThemedText style={styles.nextQuestionButtonText}>Next Question</ThemedText>
                      <FeatherIcon name="chevron-down" size={20} color="white" />
                    </TouchableOpacity>
                  )}
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
              name="heart" 
              size={20} 
              color={liked ? '#F44336' : 'white'} 
              style={styles.icon} 
            />
            <ThemedText style={styles.actionText}>
              {liked ? item.likes + 1 : item.likes}
            </ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={toggleLearningCapsule} 
            style={[
              styles.actionButton,
              Platform.OS === 'web' && hoveredAction === 'learn' && styles.hoveredActionButton
            ]}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => handleActionMouseEnter('learn'),
              onMouseLeave: handleActionMouseLeave
            } : {})}
          >
            <FeatherIcon 
              name="book-open" 
              size={20} 
              color="white" 
              style={styles.icon} 
            />
            <ThemedText style={styles.actionText}>Learn</ThemedText>
          </TouchableOpacity>
          
          {/* Only show explanation button in dev mode */}
          {__DEV__ && showExplanation && (
            <TouchableOpacity
              onPress={showExplanation}
              style={[
                styles.actionButton,
                Platform.OS === 'web' && hoveredAction === 'explain' && styles.hoveredActionButton
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('explain'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name="help-circle" 
                size={20} 
                color="white" 
                style={styles.icon} 
              />
              <ThemedText style={styles.actionText}>Explanations</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Learning Capsule Popup */}
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
  );
};

export default FeedItem;

// Keep all existing styles
const styles = StyleSheet.create({
  container: {
    width: width,
    height: Platform.OS === 'web' ? '100vh' : height,
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
    backgroundColor: 'rgba(0, 0, 0, 0.45)', // Semi-transparent overlay for better text visibility
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 20,
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
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textShadow: Platform.OS === 'web' ? '0px 2px 4px rgba(0, 0, 0, 0.5)' : undefined,
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
    // Add pressed state styles
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
    backgroundColor: 'rgba(76, 175, 80, 0.3)', // Green with opacity for correct
    borderColor: '#4CAF50',
  },
  incorrectAnswerOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)', // Red with opacity for incorrect
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
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 10,
    paddingVertical: 5,
    color: 'white',
    textShadow: Platform.OS === 'web' ? '0px 1px 2px rgba(0, 0, 0, 0.3)' : undefined,
  },
  correctResultText: {
    color: '#4CAF50',
  },
  incorrectResultText: {
    color: '#F44336',
  },
  nextQuestionButton: {
    backgroundColor: '#1976D2',
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  nextQuestionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
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
    bottom: 20,
    left: 20,
    right: 20,
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
    maxHeight: '50%',
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
    lineHeight: 24,
  },
});