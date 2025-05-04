import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  ImageErrorEventData,
  NativeSyntheticEvent,
  TextStyle,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { answerQuestion, QuestionState } from '../../store/triviaSlice';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';

// Import the fallback image
const fallbackImage = require('@/assets/images/icon.png');

const { width, height } = Dimensions.get('window');

// Updated type to support multiple answers
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
    backgroundImage: string;
    learningCapsule: string;
  };
};

const FeedItem: React.FC<FeedItemProps> = ({ item }) => {
  const [liked, setLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  
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
  const cardBackgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Get the question state from Redux store
  const questionState = useAppSelector(
    state => state.trivia.questions[item.id]
  );
  const dispatch = useAppDispatch();

  const selectAnswer = (index: number) => {
    // Add iOS spring feedback when selecting an answer
    if (isIOS) {
      springAnimation();
    }
    
    dispatch(answerQuestion({ questionId: item.id, answerIndex: index }));
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
    if (!isAnswered() || questionState?.answerIndex === undefined) return false;
    return item.answers[questionState.answerIndex].isCorrect;
  };

  // Handle hover events for web
  const handleMouseEnter = (index: number) => {
    if (Platform.OS === 'web' && !isAnswered() && !isSkipped()) {
      setHoveredAnswerIndex(index);
    }
  };

  const handleMouseLeave = () => {
    if (Platform.OS === 'web') {
      setHoveredAnswerIndex(null);
    }
  };

  // Handle action button hover events
  const handleActionMouseEnter = (action: string) => {
    if (Platform.OS === 'web') {
      setHoveredAction(action);
    }
  };

  const handleActionMouseLeave = () => {
    if (Platform.OS === 'web') {
      setHoveredAction(null);
    }
  };

  // Handle image loading error
  const handleImageError = (error: NativeSyntheticEvent<ImageErrorEventData>) => {
    console.error('Image loading error:', error.nativeEvent.error);
    setImageLoadError(true);
  };

  // Correct the typo in the web result text rendering
  const getResultText = () => {
    if (Platform.OS === 'web') {
      return isSelectedAnswerCorrect() ? 'Correct!' : 'Incorrect!';
    } else {
      // Keep the original for mobile
      return isSelectedAnswerCorrect() ? 'Correct!' : 'Incorrect!';
    }
  };

  return (
    <View style={styles.container}>
      <Image
        source={imageLoadError ? fallbackImage : { uri: item.backgroundImage }}
        style={styles.backgroundImage}
        onError={handleImageError}
        resizeMode="cover"
      />
      
      <View style={styles.overlay} />

      <View style={styles.content}>
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
                  key={index}
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
                <ThemedText style={[
                  styles.resultText, 
                  isSelectedAnswerCorrect() ? styles.correctResultText : styles.incorrectResultText
                ]}>
                  {getResultText()}
                </ThemedText>
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
            <FeatherIcon name="info" size={20} color="white" style={styles.icon} />
            <ThemedText style={styles.actionText}>Learn More</ThemedText>
          </TouchableOpacity>
          
          <View style={styles.viewsContainer}>
            <FeatherIcon name="eye" size={20} color="white" style={styles.icon} />
            <ThemedText style={styles.actionText}>{item.views}</ThemedText>
          </View>
        </View>
      </View>

      {showLearningCapsule && (
        <Animated.View 
          style={[
            styles.learningCapsule,
            {
              backgroundColor: colorScheme === 'dark' 
                ? 'rgba(30, 30, 30, 0.95)' 
                : 'rgba(255, 255, 255, 0.95)'
            },
            getPopupAnimatedStyle()
          ]}
        >
          <View style={styles.learningCapsuleHeader}>
            <ThemedText type="question" style={styles.learningCapsuleTitle}>Did you know?</ThemedText>
            <TouchableOpacity 
              onPress={toggleLearningCapsule}
              style={[
                styles.closeButton,
                Platform.OS === 'web' && hoveredAction === 'close' && styles.hoveredCloseButton
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('close'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon name="x" size={20} color={colorScheme === 'dark' ? '#ccc' : '#333'} />
            </TouchableOpacity>
          </View>
          <ThemedText style={styles.learningCapsuleText}>{item.learningCapsule}</ThemedText>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    // @ts-ignore - Web-specific height value
    height: Platform.OS === 'web' ? 'calc(100vh - 49px)' : height - 49,
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    // @ts-ignore - Web-specific width value
    width: Platform.OS === 'web' ? '100vw' : '100%', // Full viewport width
    height: '100%',
    objectFit: 'cover',
    left: Platform.OS === 'web' ? '50%' : 0, // Center on web
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : [], // Center on web
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark overlay
    // @ts-ignore - Web-specific width value
    width: Platform.OS === 'web' ? '100vw' : '100%', // Full viewport width
    left: Platform.OS === 'web' ? '50%' : 0, // Center on web
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : [], // Center on web
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
    maxWidth: Platform.OS === 'web' ? 600 : '100%', // Limit content width on web
    alignSelf: 'center',
    width: '100%',
    position: 'relative',
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'web' ? 20 : 40,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 0,
    width: '100%',
  },
  category: {
    color: 'white',
    fontSize: 18,
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  difficulty: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  difficultyText: {
    color: 'white',
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter-Regular',
    }),
    fontWeight: '600',
  },
  questionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    maxWidth: Platform.OS === 'web' ? '100%' : '90%',
    alignSelf: 'center',
    marginTop: Platform.OS === 'web' ? 20 : 0,
  },
  questionText: {
    color: 'white',
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 38 : 32,
    fontWeight: '700',
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - Web-specific style
      textShadow: '0 2px 8px rgba(0, 0, 0, 0.75)',
    } : {
      textShadowColor: 'rgba(0, 0, 0, 0.75)',
      textShadowOffset: { width: -1, height: 1 },
      textShadowRadius: 10,
    }),
    marginBottom: 32, // Increased margin to separate question from answers
  },
  skippedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginBottom: 16,
  },
  skippedIcon: {
    marginRight: 8,
  },
  skippedText: {
    color: '#FFC107',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
  },
  answersContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 0,
  },
  answerOption: {
    padding: 16,
    borderRadius: 16,
    width: '100%',
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    // @ts-ignore - Web-specific transition property
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  selectedAnswerOption: {
    borderWidth: 2,
    borderColor: 'white',
  },
  skippedAnswerOption: {
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.5)',
  },
  hoveredAnswerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: Platform.OS === 'web' ? [{ scale: 1.02 }] : [], // slight scale effect on hover for web
    // @ts-ignore - Web-specific cursor property
    cursor: 'pointer',
    // @ts-ignore - Web-specific box-shadow property
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  hoveredActionButton: {
    opacity: 0.8,
    transform: Platform.OS === 'web' ? [{ scale: 1.05 }] : [],
    // @ts-ignore - Web-specific cursor property
    cursor: 'pointer',
  },
  hoveredCloseButton: {
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 20,
    // @ts-ignore - Web-specific cursor property
    cursor: 'pointer',
  },
  correctAnswerOption: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  incorrectAnswerOption: {
    borderColor: '#F44336',
    borderWidth: 2,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  answerText: {
    color: 'white',
    fontSize: 18,
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter-Regular',
    }),
    fontWeight: '600',
    flex: 1,
  },
  skippedAnswerText: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  selectedAnswerText: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
  },
  resultIcon: {
    marginLeft: 8,
  } as TextStyle,
  resultText: {
    marginTop: 12,
    fontSize: 24,
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  correctResultText: {
    color: '#4CAF50',
  },
  incorrectResultText: {
    color: '#F44336',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: Platform.OS === 'web' ? 0 : 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8, // Add padding to increase touch target size
    borderRadius: Platform.OS === 'web' ? 8 : undefined,
    // @ts-ignore - Web-specific transition property
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
  },
  icon: {
    marginRight: 6,
  },
  actionText: {
    color: 'white',
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter-Regular',
    }),
    fontSize: 16,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  learningCapsule: {
    position: 'absolute',
    bottom: Platform.OS === 'web' ? 100 : 80,
    left: Platform.OS === 'web' ? '50%' : 20,
    right: Platform.OS === 'web' ? 'auto' : 20,
    maxWidth: 480,
    // @ts-ignore - Web-specific width calc
    width: Platform.OS === 'web' ? 'calc(100% - 40px)' : undefined,
    transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : [],
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    ...(Platform.OS === 'web' ? {
      // @ts-ignore - Web-specific box-shadow property
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.35)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
    }),
  },
  learningCapsuleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  learningCapsuleTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    // @ts-ignore - Web-specific transition property
    transition: Platform.OS === 'web' ? 'all 0.2s ease' : undefined,
  },
  learningCapsuleText: {
    fontSize: 17,
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter-Regular',
    }),
    lineHeight: 26,
  },
});

export default FeedItem;