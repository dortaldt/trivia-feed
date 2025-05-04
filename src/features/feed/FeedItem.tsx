import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
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
    backgroundImage: string;
    learningCapsule: string;
    tags?: string[];
  };
  onAnswer?: (answerIndex: number, isCorrect: boolean) => void;
  showExplanation?: () => void;
  onNextQuestion?: () => void;
};

// Preload images by their URLs to avoid flicker
const preloadImage = (url: string): Promise<void> => {
  if (Platform.OS !== 'web') {
    return Promise.resolve(); // Only relevant for web
  }
  
  return new Promise((resolve, reject) => {
    // Use the browser's Image constructor for web platform
    // @ts-ignore - Using browser Image constructor
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      console.log(`[DEBUG] Successfully preloaded image: ${url}`);
      resolve();
    };
    // @ts-ignore - Browser-specific error event handling
    img.onerror = (error) => {
      console.log(`[DEBUG] Failed to preload image: ${url}`, error);
      reject(new Error(`Failed to load image: ${url}`));
    };
  });
};

// Create a memoized background image component with debugging
const BackgroundImage = memo(({ imageUrl, fallbackImage, onImageError, itemId }: {
  imageUrl: string, 
  fallbackImage: any,
  onImageError: (error: NativeSyntheticEvent<ImageErrorEventData>) => void,
  itemId: string
}) => {
  console.log(`[DEBUG] Rendering BackgroundImage component for item ${itemId} with URL: ${imageUrl}`);
  
  const onLoad = useCallback(() => {
    console.log(`[DEBUG] Background image successfully loaded for item ${itemId}: ${imageUrl}`);
  }, [imageUrl, itemId]);
  
  const onError = useCallback((error: NativeSyntheticEvent<ImageErrorEventData>) => {
    console.log(`[DEBUG] Image error occurred for item ${itemId}: ${error.nativeEvent.error}`);
    onImageError(error);
  }, [onImageError, itemId]);

  return (
    <Image
      source={{ uri: imageUrl }}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0, 
        width: '100%', 
        height: '100%',
        // Add caching props
        ...(Platform.OS === 'web' ? { 
          // @ts-ignore - Web-specific caching property
          imageCachePolicy: 'force-cache'
        } : {})
      }}
      onError={onError}
      onLoad={onLoad}
      defaultSource={fallbackImage}
      resizeMode="cover"
    />
  );
}, (prevProps, nextProps) => {
  // Add custom comparison for memo
  const areEqual = prevProps.imageUrl === nextProps.imageUrl;
  console.log(`[DEBUG] BackgroundImage memo comparison: ${areEqual ? 'Equal (not rerendering)' : 'Not equal (rerendering)'}`);
  return areEqual;
});

const FeedItem: React.FC<FeedItemProps> = ({ item, onAnswer, showExplanation, onNextQuestion }) => {
  const [liked, setLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const renderCount = useRef(0);
  const imageUrl = useRef<string | null>(null);
  
  // Add debounce timer refs
  const mouseEnterTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mouseLeaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a stable image URL reference that doesn't change across renders
  const stableImageUrl = useMemo(() => item.backgroundImage, [item.id]);
  
  // Pre-load the image on mount
  useEffect(() => {
    if (Platform.OS === 'web' && stableImageUrl) {
      console.log(`[DEBUG] Starting image preload for: ${stableImageUrl}`);
      // Store the current URL we're trying to load
      imageUrl.current = stableImageUrl;
      const currentUrl = stableImageUrl;
      
      // Set status to loading
      setImageStatus('loading');
      
      // Preload the image
      preloadImage(stableImageUrl)
        .then(() => {
          console.log(`[DEBUG] Preload successful - current URL: ${imageUrl.current}, loaded URL: ${currentUrl}`);
          // Only update state if the URL hasn't changed
          if (imageUrl.current === currentUrl) {
            setImageStatus('loaded');
            setImageLoadError(false);
          }
        })
        .catch((error) => {
          console.log(`[DEBUG] Preload failed - current URL: ${imageUrl.current}, failed URL: ${currentUrl}`, error);
          // Only update state if the URL hasn't changed
          if (imageUrl.current === currentUrl) {
            setImageStatus('error');
            setImageLoadError(true);
          }
        });
    }
  }, [stableImageUrl]);
  
  // Log component renders
  useEffect(() => {
    renderCount.current += 1;
    console.log(`[DEBUG] FeedItem component render #${renderCount.current} for item ${item.id}`);
    console.log(`[DEBUG] Current state - imageLoadError: ${imageLoadError}, imageStatus: ${imageStatus}, hoveredAnswerIndex: ${hoveredAnswerIndex}, hoveredAction: ${hoveredAction}`);
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
  const cardBackgroundColor = useThemeColor({}, 'background');
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
    if (!isAnswered() || questionState?.answerIndex === undefined) return false;
    return item.answers[questionState.answerIndex].isCorrect;
  };

  // Use useCallback for hover handlers to stabilize function references
  const handleMouseEnter = useCallback((index: number) => {
    if (Platform.OS === 'web' && !isAnswered() && !isSkipped()) {
      console.log(`[DEBUG] handleMouseEnter called for answer index ${index}`);
      
      // Clear any pending leave timer
      if (mouseLeaveTimerRef.current) {
        clearTimeout(mouseLeaveTimerRef.current);
        mouseLeaveTimerRef.current = null;
      }
      
      // Set enter timer with a small delay
      mouseEnterTimerRef.current = setTimeout(() => {
        console.log(`[DEBUG] Setting hoveredAnswerIndex to ${index}`);
        setHoveredAnswerIndex(index);
      }, 5);
    }
  }, [isAnswered, isSkipped]);

  const handleMouseLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      console.log(`[DEBUG] handleMouseLeave called`);
      
      // Clear any pending enter timer
      if (mouseEnterTimerRef.current) {
        clearTimeout(mouseEnterTimerRef.current);
        mouseEnterTimerRef.current = null;
      }
      
      // Set leave timer with a small delay
      mouseLeaveTimerRef.current = setTimeout(() => {
        console.log(`[DEBUG] Setting hoveredAnswerIndex to null`);
        setHoveredAnswerIndex(null);
      }, 5);
    }
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (mouseEnterTimerRef.current) {
        clearTimeout(mouseEnterTimerRef.current);
      }
      if (mouseLeaveTimerRef.current) {
        clearTimeout(mouseLeaveTimerRef.current);
      }
    };
  }, []);

  // Handle action button hover events with useCallback
  const handleActionMouseEnter = useCallback((action: string) => {
    if (Platform.OS === 'web') {
      console.log(`[DEBUG] handleActionMouseEnter called for action: ${action}`);
      setHoveredAction(action);
    }
  }, []);

  const handleActionMouseLeave = useCallback(() => {
    if (Platform.OS === 'web') {
      console.log(`[DEBUG] handleActionMouseLeave called`);
      setHoveredAction(null);
    }
  }, []);

  // Handle image loading error with better debugging
  const handleImageError = (error: NativeSyntheticEvent<ImageErrorEventData>) => {
    console.log(`[DEBUG] handleImageError called for item ${item.id}, current imageStatus: ${imageStatus}`);
    console.error('Image loading error:', error.nativeEvent.error);
    setImageStatus('error');
    setImageLoadError(true);
  };
  
  // New handler for successful image loading
  const handleImageLoad = useCallback(() => {
    console.log(`[DEBUG] handleImageLoad called for item ${item.id}, current imageStatus: ${imageStatus}`);
    setImageStatus('loaded');
    setImageLoadError(false);
  }, [item.id, imageStatus]);

  // Correct the typo in the web result text rendering
  const getResultText = () => {
    if (Platform.OS === 'web') {
      return isSelectedAnswerCorrect() ? 'Correct!' : 'Incorrect!';
    } else {
      // Keep the original for mobile
      return isSelectedAnswerCorrect() ? 'Correct!' : 'Incorrect!';
    }
  };

  // Fix TypeScript error in styles by defining the specific ImageStyle
  const imageStyles = StyleSheet.create({
    backgroundImage: {
      ...StyleSheet.absoluteFillObject,
      width: Platform.OS === 'web' ? '100%' : '100%',
      height: '100%',
      left: Platform.OS === 'web' ? '50%' : 0,
      transform: Platform.OS === 'web' ? [{ translateX: '-50%' }] : []
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

  // Prevent background image from reloading when hovering elements
  const backgroundImageComponent = useMemo(() => {
    console.log(`[DEBUG] Creating backgroundImageComponent, imageLoadError: ${imageLoadError}`);
    if (imageLoadError) {
      return (
        <Image
          source={fallbackImage}
          style={{ 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100%', 
            height: '100%',
            zIndex: 1, // Ensure proper layering
          }}
          resizeMode="cover"
          onLoad={() => console.log(`[DEBUG] Fallback image loaded for item ${item.id}`)}
        />
      );
    } else {
      return (
        <BackgroundImage 
          imageUrl={stableImageUrl}
          fallbackImage={fallbackImage}
          onImageError={handleImageError}
          itemId={item.id}
        />
      );
    }
  }, [imageLoadError, stableImageUrl, item.id, handleImageError]);

  return (
    <View style={styles.container}>
      {backgroundImageComponent}
      
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
            <FeatherIcon name="info" size={20} color="white" style={styles.icon} />
            <ThemedText style={styles.actionText}>Learn More</ThemedText>
          </TouchableOpacity>
          
          {/* Add explain button for debug */}
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
              <FeatherIcon name="bar-chart-2" size={20} color="white" style={styles.icon} />
              <ThemedText style={styles.actionText}>Why this?</ThemedText>
            </TouchableOpacity>
          )}
          
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
    transition: Platform.OS === 'web' ? 'background-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease' : undefined,
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
  nextQuestionButton: {
    marginTop: 20,
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 3,
    }),
  },
  nextQuestionButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
    marginRight: 8,
  },
});

export default FeedItem;