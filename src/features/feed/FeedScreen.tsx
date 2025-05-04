import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
  Text,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ActivityIndicator,
} from 'react-native';
import FeedItem from './FeedItem';
// Remove mock data import
// import { mockFeedData } from '../../data/mockData';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { 
  markTooltipAsViewed, 
  skipQuestion, 
  startInteraction,
  setPersonalizedFeed,
  updateUserProfile as updateUserProfileAction,
  answerQuestion 
} from '../../store/triviaSlice';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
// Fix the import path
import { fetchTriviaQuestions, FeedItem as FeedItemType, analyzeCorrectAnswers } from '../../lib/triviaService';
import { useThemeColor } from '@/hooks/useThemeColor';
import { 
  updateUserProfile, 
  getPersonalizedFeed 
} from '../../lib/personalizationService';

const { width, height } = Dimensions.get('window');

const FeedScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimationError, setIsAnimationError] = useState(false);
  // Add state for feed data
  const [feedData, setFeedData] = useState<FeedItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Add state for selection explanations 
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string[]>([]);
  
  const flatListRef = useRef<FlatList>(null);
  const lastInteractionTime = useRef(Date.now());
  const lastVisibleItemId = useRef<string | null>(null);
  const previousIndex = useRef<number>(0);

  // Get a background color for the loading state
  const backgroundColor = useThemeColor({}, 'background');

  // State to track viewport height on web for proper sizing
  const [viewportHeight, setViewportHeight] = useState(
    Platform.OS === 'web' ? window.innerHeight - 49 : height - 49
  );

  // Use our custom iOS animations hook
  const { opacity, scale, animateIn, animateOut, resetAnimations } = useIOSAnimations();

  const dispatch = useAppDispatch();
  const hasViewedTooltip = useAppSelector(state => state.trivia.hasViewedTooltip);
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);
  const feedExplanations = useAppSelector(state => state.trivia.feedExplanations);

  // Fetch trivia questions from Supabase and apply personalization
  useEffect(() => {
    const loadTriviaQuestions = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const allQuestions = await fetchTriviaQuestions(); // Get all available questions
        setFeedData(allQuestions); // Store all questions
        
        // Apply personalization if we have questions
        if (allQuestions.length > 0) {
          const { items, explanations } = getPersonalizedFeed(allQuestions, userProfile);
          dispatch(setPersonalizedFeed({ items, explanations }));
        }
      } catch (error) {
        console.error('Failed to load trivia questions:', error);
        setLoadError('Failed to load questions. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadTriviaQuestions();
  }, []); // Only run on mount

  const fingerPosition = useRef(new Animated.Value(0)).current;
  const phoneFrame = useRef(new Animated.Value(0)).current;
  const mockContent1 = useRef(new Animated.Value(0)).current;
  const mockContent2 = useRef(new Animated.Value(100)).current;

  // For web, listen to window resize events to update the viewport height
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleResize = () => {
        setViewportHeight(window.innerHeight - 49);
      };

      window.addEventListener('resize', handleResize);

      // Initial size check
      handleResize();

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  const createTikTokAnimation = () => {
    try {
      return Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(mockContent1, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(mockContent2, {
              toValue: 100,
              duration: 100,
              useNativeDriver: true,
            }),
            Animated.timing(fingerPosition, {
              toValue: 0,
              duration: 100,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(fingerPosition, {
            toValue: -5,
            duration: 200,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(100),
          Animated.parallel([
            Animated.timing(fingerPosition, {
              toValue: -35,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(mockContent1, {
              toValue: -80,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(mockContent2, {
              toValue: 0,
              duration: 600,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(350),
          Animated.timing(fingerPosition, {
            toValue: 40,
            duration: 400,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.delay(600),
        ])
      );
    } catch (error) {
      console.error('Error creating animation:', error);
      setIsAnimationError(true);
      return null;
    }
  };

  const tikTokAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!hasViewedTooltip && !showTooltip) {
      // Set up timer to show tooltip after 1.5 seconds of inactivity
      const timer = setTimeout(() => {
        setShowTooltip(true);
        
        // Start the TikTok-style animation
        try {
          tikTokAnimation.current = createTikTokAnimation();
          if (tikTokAnimation.current) {
            tikTokAnimation.current.start();
          }
        } catch (error) {
          console.error('Error starting animation:', error);
          setIsAnimationError(true);
        }
        
        // Add spring animation for the tooltip
        animateIn();
      }, 1500);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [hasViewedTooltip, isAnimationError]);

  const hideTooltip = () => {
    try {
      tikTokAnimation.current?.stop();

      // Use iOS-style animation for tooltip hiding
      animateOut(() => {
        setShowTooltip(false);
        resetAnimations();
      });

      dispatch(markTooltipAsViewed());
    } catch (error) {
      console.error('Error hiding tooltip:', error);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y !== 0 && showTooltip) {
      hideTooltip();
    }
  };

  // When scrolling past a question, mark it as skipped if it wasn't answered and update profile
  const markPreviousAsSkipped = useCallback((prevIndex: number, newIndex: number) => {
    // Only mark as skipped when scrolling down and if we have feed data
    if (newIndex > prevIndex && personalizedFeed.length > 0) {
      const previousQuestion = personalizedFeed[prevIndex];
      const previousQuestionId = previousQuestion.id;
      const questionState = questions[previousQuestionId];
      
      // Only mark as skipped if the question wasn't answered
      if (!questionState || questionState.status === 'unanswered') {
        // Dispatch skip action to mark question as skipped
        dispatch(skipQuestion({ questionId: previousQuestionId }));
        
        // Update user profile for personalization
        const updatedProfile = updateUserProfile(
          userProfile,
          previousQuestionId,
          { 
            wasSkipped: true,
            timeSpent: questionState?.timeSpent || 0
          },
          previousQuestion
        );
        
        // Save updated profile to Redux
        dispatch(updateUserProfileAction(updatedProfile));
        
        console.log('Skipped question:', previousQuestionId, 'Tags:', previousQuestion.tags || 'None');
      }
    }
  }, [dispatch, questions, personalizedFeed, userProfile]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null && personalizedFeed.length > 0) {
        const newIndex = viewableItems[0].index;
        const currentItem = personalizedFeed[newIndex];
        const currentItemId = currentItem.id;

        // Mark previous question as skipped when scrolling to a new question
        if (previousIndex.current !== newIndex) {
          markPreviousAsSkipped(previousIndex.current, newIndex);
        }

        previousIndex.current = newIndex;
        lastVisibleItemId.current = currentItemId;
        setCurrentIndex(newIndex);
        
        // Start tracking interaction time with this question
        dispatch(startInteraction({ questionId: currentItemId }));
        
        // Set current explanation for debugging
        if (__DEV__ && feedExplanations[currentItemId]) {
          setCurrentExplanation(feedExplanations[currentItemId]);
        }
      }
    },
    [markPreviousAsSkipped, personalizedFeed, feedExplanations]
  );

  useEffect(() => {
    if (personalizedFeed.length > 0) {
      lastVisibleItemId.current = personalizedFeed[0].id;
      // Start tracking interaction with first question
      dispatch(startInteraction({ questionId: personalizedFeed[0].id }));
    }
  }, [personalizedFeed, dispatch]);

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
  };

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const onMomentumScrollBegin = useCallback(() => {
    lastInteractionTime.current = Date.now();
    if (showTooltip) {
      hideTooltip();
    }
  }, [showTooltip]);

  const onMomentumScrollEnd = useCallback(() => {
    const scrollTime = Date.now() - lastInteractionTime.current;
    console.log(`Scroll transition time: ${scrollTime}ms`);
  }, []);

  // Add a function to refresh the personalized feed
  const refreshPersonalizedFeed = useCallback(() => {
    if (feedData.length > 0) {
      // Get personalized feed based on updated profile
      const { items, explanations } = getPersonalizedFeed(feedData, userProfile);
      dispatch(setPersonalizedFeed({ items, explanations }));
      console.log('Refreshed personalized feed with', items.length, 'items');
    }
  }, [feedData, userProfile, dispatch]);

  // Update effect to watch for profile changes and refresh feed
  useEffect(() => {
    refreshPersonalizedFeed();
  }, [userProfile, refreshPersonalizedFeed]);

  // Add function to handle answering questions
  const handleAnswerQuestion = useCallback((questionId: string, answerIndex: number, isCorrect: boolean) => {
    // First find the question in our feed
    const questionItem = personalizedFeed.find(item => item.id === questionId);
    if (!questionItem) return;
    
    // Dispatch answer action to mark question as answered
    dispatch(answerQuestion({ questionId, answerIndex, isCorrect }));
    
    // Update user profile for personalization
    const questionState = questions[questionId];
    const updatedProfile = updateUserProfile(
      userProfile,
      questionId,
      {
        wasCorrect: isCorrect,
        wasSkipped: false,
        timeSpent: questionState?.timeSpent || 0
      },
      questionItem
    );
    
    // Save updated profile to Redux
    dispatch(updateUserProfileAction(updatedProfile));
    
    // Scroll to next question after answering
    setTimeout(() => {
      if (flatListRef.current && currentIndex < personalizedFeed.length - 1) {
        flatListRef.current.scrollToIndex({
          index: currentIndex + 1,
          animated: true
        });
      }
    }, 1000);
    
    console.log(
      'Answered question:', 
      questionId, 
      'Correct:', 
      isCorrect, 
      'Time:', 
      questionState?.timeSpent,
      'Tags:',
      questionItem.tags || 'None'
    );
  }, [dispatch, personalizedFeed, questions, userProfile, currentIndex]);

  const renderItem = ({ item }: { item: FeedItemType }) => {
    return (
      <FeedItem 
        item={item} 
        onAnswer={(answerIndex, isCorrect) => 
          handleAnswerQuestion(item.id, answerIndex, isCorrect)
        }
        showExplanation={() => {
          if (__DEV__ && feedExplanations[item.id]) {
            setCurrentExplanation(feedExplanations[item.id]);
            setShowExplanationModal(true);
          }
        }} 
      />
    );
  };

  const keyExtractor = (item: FeedItemType) => item.id;

  // Get item layout with responsive height
  const getItemLayout = (_: any, index: number) => {
    return {
      length: viewportHeight,
      offset: viewportHeight * index,
      index,
    };
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
        <Text style={styles.loadingText}>Loading trivia questions...</Text>
        
        {/* Add debug button for analyzing correct answers */}
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.retryButton, { marginTop: 20 }]}
            onPress={() => {
              analyzeCorrectAnswers().then(() => {
                console.log('Analysis complete. Check console logs for details.');
              });
            }}
          >
            <Text style={styles.retryButtonText}>Analyze Correct Answers</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Error state
  if (loadError) {
    return (
      <View style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => {
            fetchTriviaQuestions().then((questions: FeedItemType[]) => {
              setFeedData(questions);
              setLoadError(null);
            }).catch((err: Error) => {
              console.error('Retry failed:', err);
              setLoadError('Failed to load questions. Please try again later.');
            });
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
        
        {/* Add debug button for analyzing correct answers */}
        {__DEV__ && (
          <TouchableOpacity 
            style={[styles.retryButton, { marginTop: 10, backgroundColor: '#2c3e50' }]}
            onPress={() => {
              analyzeCorrectAnswers().then(() => {
                console.log('Analysis complete. Check console logs for details.');
              });
            }}
          >
            <Text style={styles.retryButtonText}>Analyze Correct Answers</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={personalizedFeed.length > 0 ? personalizedFeed : feedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        getItemLayout={getItemLayout}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="start"
        decelerationRate="fast"
        snapToInterval={viewportHeight}
        style={styles.flatList}
        contentContainerStyle={Platform.OS === 'web' ? { minHeight: '100%' } : undefined}
      />

      {/* Debugging Modal for Personalization Explanations (DEV only) */}
      {__DEV__ && showExplanationModal && (
        <View style={styles.explanationModal}>
          <Text style={styles.explanationHeader}>Question Selection Logic</Text>
          {currentExplanation.map((explanation, i) => (
            <Text key={i} style={styles.explanationText}>{explanation}</Text>
          ))}
          <TouchableOpacity
            style={styles.explanationCloseButton}
            onPress={() => setShowExplanationModal(false)}
          >
            <Text style={styles.explanationCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {showTooltip && (
        <Animated.View
          style={[
            styles.tooltip,
            {
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <View style={styles.tooltipArrow} />
          <Text style={styles.tooltipText}>
            {Platform.OS === 'web' 
              ? 'Use arrow keys to navigate' 
              : 'Swipe up for next question!'}
          </Text>

          <View style={styles.tiktokAnimationContainer}>
            <View style={styles.phoneFrame}>
              <View style={styles.phoneContent}>
                <Animated.View
                  style={[
                    styles.mockScreen,
                    styles.mockScreen1,
                    { transform: [{ translateY: mockContent1 }] },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.mockScreen,
                    styles.mockScreen2,
                    { transform: [{ translateY: mockContent2 }] },
                  ]}
                />
              </View>

              <Animated.View
                style={[
                  styles.finger,
                  {
                    transform: [
                      { translateY: fingerPosition },
                      { translateX: 22 },
                    ],
                  },
                ]}
              >
                <View style={styles.fingerElement}>
                  <View style={styles.fingerTip} />
                </View>
                <View style={styles.fingerShadow} />
              </Animated.View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.tooltipButton} 
            onPress={hideTooltip}
          >
            <Text style={styles.tooltipButtonText}>Got it</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    position: 'relative',
    overflow: 'hidden',
    width: '100%', // Ensure full width
  },
  flatList: {
    width: '100%', // Full width for web and mobile
    height: '100%',
  },
  tooltip: {
    position: 'absolute',
    bottom: 80,
    right: Platform.OS === 'web' ? '50%' : 20,
    transform: Platform.OS === 'web' ? [{ translateX: 110 }] : [],
    backgroundColor: 'rgba(32, 32, 32, 0.85)',
    borderRadius: 16,
    padding: 12,
    width: Platform.OS === 'web' ? 220 : 155,
    alignItems: 'center',
    zIndex: 100,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.35)'
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 6,
    }),
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: 'rgba(32, 32, 32, 0.85)',
  },
  tooltipText: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
  },
  tiktokAnimationContainer: {
    height: 85,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  phoneFrame: {
    width: 45,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  phoneContent: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  mockScreen: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 5,
  },
  mockScreen1: {
    backgroundColor: 'rgba(255, 100, 100, 0.6)',
  },
  mockScreen2: {
    backgroundColor: 'rgba(100, 100, 255, 0.6)',
  },
  finger: {
    position: 'absolute',
    right: -10,
    width: 20,
    height: 30,
    alignItems: 'center',
    zIndex: 3,
  },
  fingerElement: {
    width: 15,
    height: 22,
    borderRadius: 12,
    backgroundColor: 'white',
    transform: [{ rotate: '-20deg' }],
  },
  fingerTip: {
    position: 'absolute',
    bottom: -2,
    right: 3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  fingerShadow: {
    position: 'absolute',
    top: 2,
    width: 18,
    height: 25,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    zIndex: -1,
  },
  tooltipButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 2,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
      transition: 'all 0.2s ease',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 3,
    }),
  },
  tooltipButtonText: {
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
    color: 'white',
    fontSize: 12,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter',
    }),
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 16,
    fontFamily: Platform.select({
      ios: 'System',
      default: 'Inter',
    }),
  },
  retryButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    ...(Platform.OS === 'web' ? {
      cursor: 'pointer',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    }),
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontFamily: Platform.select({
      ios: 'System-Bold',
      default: 'Inter-Bold',
    }),
  },
  explanationModal: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 16,
    padding: 16,
    zIndex: 1000,
    maxHeight: '80%',
  },
  explanationHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
    textAlign: 'center',
  },
  explanationText: {
    color: 'white',
    marginBottom: 8,
    fontSize: 14,
  },
  explanationCloseButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    alignSelf: 'center',
  },
  explanationCloseButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default FeedScreen;