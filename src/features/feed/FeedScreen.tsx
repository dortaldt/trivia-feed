import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  ViewToken,
  Animated,
  Easing,
  TouchableOpacity,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal as RNModal,
  SafeAreaView,
  ScrollView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { 
  Text, 
  IconButton,
  Surface, 
  Portal, 
  Modal, 
  Button as PaperButton 
} from 'react-native-paper';
import { Card } from '../../components/ui/Card';
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
  answerQuestion,
  QuestionState
} from '../../store/triviaSlice';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
// Fix the import path
import { fetchTriviaQuestions, FeedItem as FeedItemType, analyzeCorrectAnswers } from '../../lib/triviaService';
import { useThemeColor } from '@/hooks/useThemeColor';
import { 
  updateUserProfile, 
  getPersonalizedFeed
} from '../../lib/personalizationService';
import { InteractionTracker } from '../../components/InteractionTracker';
import { useAuth } from '../../context/AuthContext';
import { colors, spacing, borderRadius } from '../../theme';
import { syncWeightChanges } from '../../lib/syncService';
import { loadUserDataThunk } from '../../store/thunks';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useColorScheme } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabaseClient';
import { countries } from '../../data/countries';
import ProfileBottomSheet from '../../components/ProfileBottomSheet';
import LeaderboardBottomSheet from '../../components/LeaderboardBottomSheet';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const FeedScreen: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isAnimationError, setIsAnimationError] = useState(false);
  // Add state for feed data
  const [feedData, setFeedData] = useState<FeedItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  // Add state for selection explanations 
  const [showExplanationModal, setShowExplanationModal] = useState(false);
  const [currentExplanation, setCurrentExplanation] = useState<string[]>([]);
  // Add state for profile modal
  const [showProfile, setShowProfile] = useState(false);
  // Add a state variable for the leaderboard visibility
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [currentLeaderboardItemId, setCurrentLeaderboardItemId] = useState<string | null>(null);
  
  // Get user from auth context
  const { user, isGuest } = useAuth();
  
  // Add a new state for the avatar URL
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  
  const flatListRef = useRef<FlatList>(null);
  const lastInteractionTime = useRef(Date.now());
  const lastVisibleItemId = useRef<string | null>(null);
  const previousIndex = useRef<number>(0);
  // Add ref to track previous userProfile for cold start updates
  const previousUserProfileRef = useRef<typeof userProfile | null>(null);

  // Get a background color for the loading state
  const backgroundColor = useThemeColor({}, 'background');

  // State to track viewport height on web for proper sizing
  const [viewportHeight, setViewportHeight] = useState(
    Platform.OS === 'web' ? window.innerHeight : height
  );

  // Use our custom iOS animations hook
  const { opacity, scale, animateIn, animateOut, resetAnimations } = useIOSAnimations();

  const dispatch = useAppDispatch();
  const hasViewedTooltip = useAppSelector(state => state.trivia.hasViewedTooltip);
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);
  const feedExplanations = useAppSelector(state => state.trivia.feedExplanations);
  const interactionStartTimes = useAppSelector(state => state.trivia.interactionStartTimes);
  const isSyncing = useAppSelector(state => state.trivia.isSyncing);
  const lastSyncTime = useAppSelector(state => state.trivia.lastSyncTime);

  // Add state to track scroll activity
  const [isActivelyScrolling, setIsActivelyScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastScrollPosition = useRef<number>(0);
  
  // Get user initials for the profile button
  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  // Load user data when component mounts if user is logged in
  useEffect(() => {
    if (user?.id) {
      console.log('User is logged in, loading user data');
      
      // Dispatch the thunk to load all user data
      dispatch(loadUserDataThunk(user.id))
        .then((userData) => {
          console.log('User data loaded successfully');
          
          // After loading data, if we have a personalized feed, we may want to
          // rebuild it with the latest user profile data
          if (userData.profile && personalizedFeed.length === 0 && feedData.length > 0) {
            console.log('Generating personalized feed with loaded user profile');
            const { items, explanations } = getPersonalizedFeed(feedData, userData.profile);
            
            // Store the feed items in a stable order
            dispatch(setPersonalizedFeed({ 
              items, 
              explanations,
              userId: user.id
            }));
          }
        })
        .catch(error => {
          console.error('Failed to load user data:', error);
        });
    }
  }, [user?.id, dispatch, personalizedFeed.length, feedData]); // Include all dependencies

  const [loadingProgress] = useState(new Animated.Value(0));
  const [loadingTip, setLoadingTip] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Array of loading tips
  const loadingTips = [
    "Did you know? The average person knows the answer to about 20% of trivia questions on their first attempt!",
    "The world's first trivia contest was held in 1941 at Columbia University.",
    "The word 'trivia' comes from Latin, meaning 'three roads' - places where people would meet and share information.",
    "The longest-running trivia contest in the world has been held annually at the University of Wisconsin since 1969.",
    "Studies show that regularly testing your knowledge with trivia can help maintain cognitive health as you age."
  ];
  
  // With this enhanced useEffect for better animations
  useEffect(() => {
    // Progress animation
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 3000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
    
    // Setup pulsing animation
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnim, {
        toValue: 1.08,
        duration: 1000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.bezier(0.4, 0, 0.2, 1),
        useNativeDriver: true,
      }),
    ]);
    
    // Loop the pulse animation
    Animated.loop(pulseSequence).start();
    
    return () => {
      // Clean up animations when component unmounts
      pulseAnim.stopAnimation();
      loadingProgress.stopAnimation();
    };
  }, []);

  // Fetch trivia questions from Supabase and apply personalization
  useEffect(() => {
    const loadTriviaQuestions = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        // Check cache first
        const cachedData = await AsyncStorage.getItem('cachedTriviaQuestions');
        let allQuestions = [];
        
        if (cachedData) {
          // Use cached data while fetching fresh data
          console.log('Using cached trivia questions');
          allQuestions = JSON.parse(cachedData);
          setFeedData(allQuestions);
          
          // Apply personalization with cached data
          if (allQuestions.length > 0) {
            const { items, explanations } = getPersonalizedFeed(allQuestions, userProfile);
            const uniqueItems = items.filter((item, index, self) => 
              index === self.findIndex(t => t.id === item.id)
            );
            
            const uniqueExplanations: Record<string, string[]> = {};
            uniqueItems.forEach(item => {
              if (explanations[item.id]) {
                uniqueExplanations[item.id] = explanations[item.id];
              }
            });
            
            dispatch(setPersonalizedFeed({ 
              items: uniqueItems, 
              explanations: uniqueExplanations 
            }));
          }
        }
        
        // Fetch fresh data
        const freshQuestions = await fetchTriviaQuestions();
        
        // Check if we got mock data due to a connection error
        if (freshQuestions.length === 3 && freshQuestions[0].id === '1' && freshQuestions[0].question.includes('closest star to Earth')) {
          console.log('Using mock data due to connection error');
          setUsingMockData(true);
        } else {
          // Cache the fresh data
          await AsyncStorage.setItem('cachedTriviaQuestions', JSON.stringify(freshQuestions));
        }
        
        // Filter out duplicates by ID
        const uniqueQuestions = freshQuestions.filter((item, index, self) => 
          index === self.findIndex(t => t.id === item.id)
        );
        
        console.log(`Loaded ${freshQuestions.length} questions, ${uniqueQuestions.length} unique questions after filtering duplicates`);
        setFeedData(uniqueQuestions); // Store unique questions
        
        // Apply personalization if we have questions
        if (uniqueQuestions.length > 0) {
          const { items, explanations } = getPersonalizedFeed(uniqueQuestions, userProfile);
          
          // Ensure items are unique again (personalization might introduce duplicates)
          const uniqueItems = items.filter((item, index, self) => 
            index === self.findIndex(t => t.id === item.id)
          );
          
          // Create explanations object with only unique items
          const uniqueExplanations: Record<string, string[]> = {};
          uniqueItems.forEach(item => {
            if (explanations[item.id]) {
              uniqueExplanations[item.id] = explanations[item.id];
            }
          });
          
          // Store the feed items in a stable order
          dispatch(setPersonalizedFeed({ 
            items: uniqueItems, 
            explanations: uniqueExplanations 
          }));
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

  // Update effect to prevent reordering of feed after initial load
  useEffect(() => {
    // Only refresh personalized feed when userProfile changes and we don't have a feed yet
    if (feedData.length > 0 && personalizedFeed.length === 0) {
      const { items, explanations } = getPersonalizedFeed(feedData, userProfile);
      
      // Filter out any duplicate questions by ID
      const uniqueItems = items.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );
      
      // Generate new explanations object with only unique items
      const uniqueExplanations: Record<string, string[]> = {};
      uniqueItems.forEach(item => {
        if (explanations[item.id]) {
          uniqueExplanations[item.id] = explanations[item.id];
        }
      });
      
      dispatch(setPersonalizedFeed({ 
        items: uniqueItems, 
        explanations: uniqueExplanations 
      }));
      console.log('Initial personalized feed with', uniqueItems.length, 'unique items');
    }
  }, [userProfile, feedData, personalizedFeed.length, dispatch]);

  // Add effect to refresh feed during cold start phase when userProfile changes
  useEffect(() => {
    // Skip if userProfile hasn't changed since last check
    const prevProfile = previousUserProfileRef.current;
    if (prevProfile && 
        prevProfile.totalQuestionsAnswered === userProfile?.totalQuestionsAnswered && 
        prevProfile.coldStartComplete === userProfile?.coldStartComplete) {
      return; // Profile hasn't changed in a way that affects feed ordering
    }
    
    // Only apply this logic during initial loading, not after answering questions
    const totalQuestionsAnswered = userProfile?.totalQuestionsAnswered || 0;
    const inColdStart = !userProfile?.coldStartComplete && totalQuestionsAnswered < 20;
    
    // Only use this effect for initial feed generation
    // Skip if we already have a feed and have answered questions
    if (inColdStart && feedData.length > 0 && personalizedFeed.length === 0) {
      console.log('Initial feed creation during cold start phase');
      const { items, explanations } = getPersonalizedFeed(feedData, userProfile);
      
      // Filter out any duplicate questions by ID
      const uniqueItems = items.filter((item, index, self) => 
        index === self.findIndex(t => t.id === item.id)
      );
      
      // Generate new explanations object with only unique items
      const uniqueExplanations: Record<string, string[]> = {};
      uniqueItems.forEach(item => {
        if (explanations[item.id]) {
          uniqueExplanations[item.id] = explanations[item.id];
        }
      });
      
      dispatch(setPersonalizedFeed({ 
        items: uniqueItems, 
        explanations: uniqueExplanations 
      }));
      console.log('Initial personalized feed with', uniqueItems.length, 'unique items');
    }
    
    // Update ref with current userProfile
    previousUserProfileRef.current = userProfile;
  }, [userProfile, feedData, dispatch, personalizedFeed.length]); // Added personalizedFeed.length to dependencies

  const fingerPosition = useRef(new Animated.Value(0)).current;
  const phoneFrame = useRef(new Animated.Value(0)).current;
  const mockContent1 = useRef(new Animated.Value(0)).current;
  const mockContent2 = useRef(new Animated.Value(100)).current;

  // For web, listen to window resize events to update the viewport height
  useEffect(() => {
    const calculateViewportHeight = () => {
      if (Platform.OS === 'web') {
        // For web, use the full viewport height since we don't have a navbar anymore
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        console.log(`Web viewport height: ${viewportHeight}px`);
        setViewportHeight(viewportHeight);
      } else {
        // For mobile, get the full screen dimensions without navbar deduction
        const windowHeight = Dimensions.get('window').height;
        console.log(`Mobile viewport height: ${windowHeight}px`);
        setViewportHeight(windowHeight);
      }
    };
    
    // Initial calculation
    calculateViewportHeight();
    
    if (Platform.OS === 'web') {
      // Listen for resize on web and visualViewport changes
      window.addEventListener('resize', calculateViewportHeight);
      
      // Listen for visualViewport changes if available (for mobile browsers)
      if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', calculateViewportHeight);
        window.visualViewport.addEventListener('scroll', calculateViewportHeight);
      }
      
      return () => {
        window.removeEventListener('resize', calculateViewportHeight);
        if (window.visualViewport) {
          window.visualViewport.removeEventListener('resize', calculateViewportHeight);
          window.visualViewport.removeEventListener('scroll', calculateViewportHeight);
        }
      };
    } else {
      // For mobile, update on dimension changes
      const dimensionsSubscription = Dimensions.addEventListener('change', () => {
        calculateViewportHeight();
      });
      
      return () => {
        dimensionsSubscription.remove();
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

      // First set state updates before animation
      dispatch(markTooltipAsViewed());
      
      // Create a separate function to handle animation completion
      const handleAnimationComplete = () => {
        resetAnimations();
      };
      
      // Set the state directly first
      setShowTooltip(false);
      
      // Then run animation, state is already updated
      animateOut(handleAnimationComplete);
    } catch (error) {
      console.error('Error hiding tooltip:', error);
    }
  };

  // When scrolling past a question, mark it as skipped if it wasn't answered and update profile
  const markPreviousAsSkipped = useCallback((prevIndex: number, newIndex: number) => {
    // Only mark as skipped when explicitly scrolling down past a question and if we have feed data
    if (newIndex > prevIndex && personalizedFeed.length > 0) {
      const previousQuestion = personalizedFeed[prevIndex];
      const previousQuestionId = previousQuestion.id;
      const questionState = questions[previousQuestionId];
      
      // Early check - don't proceed if already answered or skipped (reduce redundant console logs)
      if (questionState && (questionState.status === 'answered' || questionState.status === 'skipped')) {
        return; // Exit early without logging
      }
      
      console.log('Checking if question should be skipped:', previousQuestionId);
      console.log('Current question state:', questionState);
      
      // Only mark as skipped if the question wasn't answered
      // This ensures that a previously skipped question that gets answered has the answer take precedence
      if (!questionState || questionState.status === 'unanswered') {
        // Calculate time spent if startTime exists but timeSpent hasn't been set yet
        const startTime = interactionStartTimes[previousQuestionId];
        let timeSpent = 0;
        
        if (startTime) {
          timeSpent = Date.now() - startTime;
          console.log(`Time spent on question ${previousQuestionId}: ${timeSpent}ms`);
        } else {
          console.log(`Warning: No start time recorded for question ${previousQuestionId}`);
        }
        
        // Dispatch skip action to mark question as skipped
        dispatch(skipQuestion({ questionId: previousQuestionId, userId: user?.id }));
        
        // IMPORTANT: Save a copy of the current feed before updating the profile
        // This prevents the feed from being regenerated by other useEffects
        const currentFeed = [...personalizedFeed];
        
        // Update user profile for personalization
        const { updatedProfile, weightChange } = updateUserProfile(
          userProfile,
          previousQuestionId,
          { 
            wasSkipped: true,
            timeSpent: timeSpent
          },
          previousQuestion
        );
        
        // Save updated profile to Redux
        // IMPORTANT: Pass weightChange to ensure it's tracked in the weights tab
        dispatch(updateUserProfileAction({ 
          profile: updatedProfile, 
          userId: user?.id,
          weightChange: weightChange || undefined // Convert null to undefined to match expected type
        }));
        
        // Sync weight change with Supabase if user is logged in and weight change exists
        if (user?.id && weightChange) {
          syncWeightChanges(user.id, [weightChange]);
        }

        // Check if we need to append new questions to the feed
        const inColdStart = !updatedProfile?.coldStartComplete && 
                         (updatedProfile?.totalQuestionsAnswered || 0) < 20;
        
        // Always append questions when skipping to avoid running out
        if (feedData.length > currentFeed.length) {
          console.log('Skipped question - maintaining feed continuity');
          
          // Create a set of IDs that are already in our feed
          const existingIds = new Set(currentFeed.map(item => item.id));
          
          // Use the personalization system to get additional questions
          // Get questions that aren't already in our feed
          const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
          
          // Use personalization logic to select new questions instead of sequential selection
          const { items: personalizedItems, explanations: personalizedExplanations } = 
            getPersonalizedFeed(availableQuestions, updatedProfile, 5);
            
          // Take only questions we don't already have
          const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 3);
          
          if (newQuestions.length > 0) {
            console.log(`Appending ${newQuestions.length} personalized questions to feed after skip`);
            
            // Create a new feed with existing + new questions
            const updatedFeed = [...currentFeed, ...newQuestions];
            
            // Add additional explanation about why we added them
            const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
            
            // Add the explanations from the personalization system plus our continuity message
            newQuestions.forEach((item: FeedItemType) => {
              combinedExplanations[item.id] = [
                ...(personalizedExplanations[item.id] || []),
                `Added after skipping a question to maintain feed continuity`
              ];
            });
            
            // Update the feed in Redux
            dispatch(setPersonalizedFeed({
              items: updatedFeed,
              explanations: combinedExplanations,
              userId: user?.id
            }));
          }
        }
        
        console.log('Skipped question:', previousQuestionId, 
          'Time spent:', timeSpent,
          'Tags:', previousQuestion.tags || 'None');
      }
    }
  }, [dispatch, interactionStartTimes, personalizedFeed, questions, user?.id, userProfile, feedData, feedExplanations]);

  // Add optimized fast scroll handler to reduce redundant skipping checks
  const handleFastScroll = useCallback((startIndex: number, endIndex: number) => {
    // Don't process if start and end are the same or if scrolling up
    if (startIndex >= endIndex || !personalizedFeed.length) return;
    
    console.log(`Fast scroll detected: ${startIndex} → ~${endIndex}`);
    
    // Process only questions that aren't already marked
    for (let i = startIndex; i < endIndex; i++) {
      if (i >= 0 && i < personalizedFeed.length) {
        const question = personalizedFeed[i];
        const questionState = questions[question.id];
        
        // Skip questions that are already processed (answers or skipped)
        if (questionState && (questionState.status === 'answered' || questionState.status === 'skipped')) {
          continue;
        }
        
        markPreviousAsSkipped(i, endIndex);
      }
    }
  }, [personalizedFeed, questions, markPreviousAsSkipped]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (event.nativeEvent.contentOffset.y !== 0 && showTooltip) {
      hideTooltip();
    }
    
    // Mark as actively scrolling
    setIsActivelyScrolling(true);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set a timeout to mark as no longer scrolling after a brief period
    scrollTimeoutRef.current = setTimeout(() => {
      setIsActivelyScrolling(false);
    }, 500);
    
    // Check for skipped questions during scroll
    const currentScrollPos = event.nativeEvent.contentOffset.y;
    const scrollDirection = currentScrollPos > lastScrollPosition.current ? 'down' : 'up';
    lastScrollPosition.current = currentScrollPos;
    
    // If scrolling down quickly, check for questions to mark as skipped
    if (scrollDirection === 'down') {
      // Calculate the approximate index based on scroll position
      const estimatedIndex = Math.round(currentScrollPos / viewportHeight);
      
      // If we've moved more than one question, we may have skipped some
      if (estimatedIndex > currentIndex + 1) {
        // Use optimized function to handle fast scroll skipping
        handleFastScroll(currentIndex, estimatedIndex);
      }
    }
  };

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null && personalizedFeed.length > 0) {
        const newIndex = viewableItems[0].index;
        // Make sure newIndex is within bounds
        if (newIndex >= 0 && newIndex < personalizedFeed.length) {
          const currentItem = personalizedFeed[newIndex];
          // Add null check for currentItem
          if (currentItem && currentItem.id) {
            const currentItemId = currentItem.id;

            // Mark previous question as skipped only when scrolling to a new question that is below the previous one
            // This ensures we only mark questions as skipped when explicitly scrolled past them
            if (previousIndex.current !== newIndex && newIndex > previousIndex.current) {
              markPreviousAsSkipped(previousIndex.current, newIndex);
            }

            previousIndex.current = newIndex;
            lastVisibleItemId.current = currentItemId;
            setCurrentIndex(newIndex);
            
            // Start tracking interaction time with this question
            const currentTime = Date.now();
            console.log(`Starting interaction tracking for question ${currentItemId} at ${new Date(currentTime).toISOString()}`);
            dispatch(startInteraction({ questionId: currentItemId }));
            
            // Immediately check if we already have an existing interaction time
            setTimeout(() => {
              const startTime = interactionStartTimes[currentItemId];
              if (startTime) {
                console.log(`Confirmed interaction tracking for ${currentItemId}, start time: ${new Date(startTime).toISOString()}`);
              } else {
                console.warn(`Failed to start interaction tracking for ${currentItemId}`);
              }
            }, 50);
            
            // Set current explanation for debugging
            if (__DEV__ && feedExplanations[currentItemId]) {
              setCurrentExplanation(feedExplanations[currentItemId]);
            }
          } else {
            console.warn(`Invalid feed item at index ${newIndex}: item is undefined or missing ID`);
          }
          
          // Proactively check if we're getting close to the end of the feed (within 3 questions)
          // and append more questions if needed
          if (newIndex >= personalizedFeed.length - 3 && feedData.length > personalizedFeed.length) {
            console.log('Getting close to the end of the feed, preemptively adding more questions');
            
            const currentFeed = [...personalizedFeed];
            const existingIds = new Set(currentFeed.map(item => item.id));
            const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
            
            // Use personalization logic to select new questions instead of sequential selection
            const { items: personalizedItems, explanations: personalizedExplanations } = 
              getPersonalizedFeed(availableQuestions, userProfile, 8);
              
            // Take up to 5 new personalized questions
            const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 5);
            
            if (newQuestions.length > 0) {
              console.log(`Proactively appending ${newQuestions.length} personalized questions to feed`);
              
              // Create a new feed with existing + new questions
              const updatedFeed = [...currentFeed, ...newQuestions];
              
              // Add additional explanation about why we added them
              const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
              
              // Add the explanations from the personalization system plus our message
              newQuestions.forEach((item: FeedItemType) => {
                combinedExplanations[item.id] = [
                  ...(personalizedExplanations[item.id] || []),
                  `Added to extend feed`
                ];
              });
              
              // Update the feed in Redux
              dispatch(setPersonalizedFeed({
                items: updatedFeed,
                explanations: combinedExplanations
              }));
            }
          }
        } else {
          console.warn(`Invalid index ${newIndex}: outside of personalizedFeed bounds (0-${personalizedFeed.length - 1})`);
        }
      }
    },
    [markPreviousAsSkipped, personalizedFeed, feedExplanations, dispatch, interactionStartTimes, feedData, userProfile]
  );

  useEffect(() => {
    if (personalizedFeed.length > 0) {
      const firstQuestionId = personalizedFeed[0].id;
      lastVisibleItemId.current = firstQuestionId;
      
      // Start tracking interaction with first question
      console.log(`Starting initial interaction tracking for question ${firstQuestionId}`);
      
      // Dispatch action to start tracking this question's interaction time
      dispatch(startInteraction({ questionId: firstQuestionId }));
    }
  // Remove interactionStartTimes from dependencies to prevent infinite loop
  }, [personalizedFeed, dispatch]);
  
  // Separate useEffect for verification to prevent infinite loops
  useEffect(() => {
    // Only run once after component mounts to verify first question tracking
    if (personalizedFeed.length > 0) {
      const firstQuestionId = personalizedFeed[0].id;
      
      // Verify after a short delay
      const timer = setTimeout(() => {
        if (interactionStartTimes[firstQuestionId]) {
          console.log(`Confirmed initial interaction tracking for ${firstQuestionId}, start time: ${new Date(interactionStartTimes[firstQuestionId]).toISOString()}`);
        } else {
          console.warn(`Failed to start initial interaction tracking for ${firstQuestionId}`);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [personalizedFeed.length]); // Only run when feed length changes

  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 300, // Question must be visible for at least 300ms to be considered viewed
  };

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const onMomentumScrollBegin = useCallback(() => {
    lastInteractionTime.current = Date.now();
    if (showTooltip) {
      hideTooltip();
    }
    
    // Log scroll movement for debugging
    console.log(`Scroll movement started from question ${currentIndex}`);
  }, [showTooltip, currentIndex]);

  const onMomentumScrollEnd = useCallback(() => {
    const scrollTime = Date.now() - lastInteractionTime.current;
    console.log(`Scroll transition time: ${scrollTime}ms to question ${currentIndex}`);
    
    // Double-check if we need to mark questions as skipped
    if (previousIndex.current !== currentIndex && previousIndex.current < currentIndex) {
      // Use our optimized function to handle any missed skipping
      handleFastScroll(previousIndex.current, currentIndex);
    }
    
    // Update previous index after ensuring skipped questions are marked
    previousIndex.current = currentIndex;
  }, [currentIndex, handleFastScroll]);

  // Add function to handle answering questions
  const handleAnswerQuestion = useCallback((questionId: string, answerIndex: number, isCorrect: boolean) => {
    const questionItem = personalizedFeed.find(item => item.id === questionId);
    if (!questionItem) return;
    
    // Calculate time spent
    const startTime = interactionStartTimes[questionId];
    let timeSpent = 0;
    
    if (startTime) {
      timeSpent = Date.now() - startTime;
      console.log(`Time spent answering question ${questionId}: ${timeSpent}ms`);
    } else {
      console.log(`Warning: No start time recorded for answered question ${questionId}`);
    }
    
    // Get the user ID from auth context
    const userId = user?.id;
    
    // Update user profile for personalization
    const { updatedProfile, weightChange } = updateUserProfile(
      userProfile,
      questionId,
      {
        wasCorrect: isCorrect,
        wasSkipped: false,
        timeSpent: timeSpent
      },
      questionItem
    );
    
    // IMPORTANT: Save a copy of the current feed before updating the profile
    // This prevents the feed from being regenerated by other useEffects
    const currentFeed = [...personalizedFeed];
    
    // Dispatch answer action to mark question as answered
    // IMPORTANT: Do this AFTER we've calculated the updated profile but BEFORE we update it in Redux
    // This ensures the Redux middleware has the correct sequence of actions
    dispatch(answerQuestion({ questionId, answerIndex, isCorrect, userId }));
    
    // Save updated profile to Redux
    // Let the Redux action handle the syncing with Supabase
    dispatch(updateUserProfileAction({ 
      profile: updatedProfile, 
      userId: user?.id,
      weightChange: weightChange || undefined // Convert null to undefined to match expected type
    }));
    
    // Determine if we should append new questions to maintain feed continuity
    const inColdStart = !updatedProfile?.coldStartComplete && 
                        (updatedProfile?.totalQuestionsAnswered || 0) < 20;
    
    if (feedData.length > currentFeed.length) {
      console.log('Cold start active - maintaining feed continuity');
      
      // Create a set of IDs that are already in our feed
      const existingIds = new Set(currentFeed.map(item => item.id));
      
      // Use the personalization system to get additional questions
      // Get questions that aren't already in our feed
      const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
      
      // Use personalization logic to select new questions instead of sequential selection
      const { items: personalizedItems, explanations: personalizedExplanations } = 
        getPersonalizedFeed(availableQuestions, updatedProfile, 5);
        
      // Take only questions we don't already have
      const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 3);
      
      if (newQuestions.length > 0) {
        console.log(`Appending ${newQuestions.length} personalized questions to feed`);
        
        // Create a new feed with existing + new questions
        const updatedFeed = [...currentFeed, ...newQuestions];
        
        // Add additional explanation about why we added them
        const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
        
        // Add the explanations from the personalization system plus our continuity message
        newQuestions.forEach((item: FeedItemType) => {
          combinedExplanations[item.id] = [
            ...(personalizedExplanations[item.id] || []),
            `Added to maintain feed continuity`
          ];
        });
        
        // Update the feed in Redux with the combined feed (old + new questions)
        // This ensures the current question and its state remain in place
        dispatch(setPersonalizedFeed({
          items: updatedFeed,
          explanations: combinedExplanations,
          userId: user?.id // Pass userId to allow Redux to handle synchronization
        }));
      }
    }
    
    // Remove auto-scrolling behavior - let users control when to move to next question
    // The user can swipe up manually when ready to see the next question
    
    console.log(
      'Answered question:', 
      questionId, 
      'Correct:', 
      isCorrect, 
      'Time:', 
      timeSpent,
      'Tags:',
      questionItem.tags || 'None'
    );
  }, [dispatch, personalizedFeed, userProfile, interactionStartTimes, feedData, feedExplanations, user]);

  // Modify handleNextQuestion to be more controlled and prevent unexpected scrolling
  const handleNextQuestion = useCallback(() => {
    // Only scroll to next question when explicitly requested via the button
    if (flatListRef.current && currentIndex < personalizedFeed.length - 1) {
      const targetIndex = currentIndex + 1;
      
      // Use scrollToOffset instead of scrollToIndex for more stable scrolling
      const offset = viewportHeight * targetIndex;
      
      flatListRef.current.scrollToOffset({
        offset,
        animated: true
      });
    } else if (currentIndex >= personalizedFeed.length - 2) {
      // We're near the end of the feed, let's add more questions if available
      console.log('Near end of feed, checking if we can append more questions');
      
      // Find questions we don't already have in our feed
      const existingIds = new Set(personalizedFeed.map(item => item.id));
      const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
      
      // Take up to 5 new questions to append
      const newQuestions = availableQuestions.slice(0, 5);
      
      if (newQuestions.length > 0) {
        console.log(`Appending ${newQuestions.length} more questions to feed`);
        
        // Create a new feed with existing + new questions
        const updatedFeed = [...personalizedFeed, ...newQuestions];
        
        // Create empty explanations for new questions
        const newExplanations: Record<string, string[]> = {};
        newQuestions.forEach((item: FeedItemType) => {
          newExplanations[item.id] = [`Added to extend feed`];
        });
        
        // Combine explanations
        const combinedExplanations = {
          ...feedExplanations,
          ...newExplanations
        };
        
        // Update the feed in Redux
        dispatch(setPersonalizedFeed({
          items: updatedFeed,
          explanations: combinedExplanations
        }));
        
        // After updating feed, scroll to the next question
        setTimeout(() => {
          if (flatListRef.current) {
            const targetIndex = currentIndex + 1;
            const offset = viewportHeight * targetIndex;
            
            flatListRef.current.scrollToOffset({
              offset,
              animated: true
            });
          }
        }, 100);
      }
    }
  }, [currentIndex, personalizedFeed, viewportHeight, feedData, feedExplanations, dispatch]);

  // Add a function to toggle the leaderboard
  const toggleLeaderboard = useCallback((itemId?: string) => {
    if (itemId) {
      setCurrentLeaderboardItemId(itemId);
    }
    setShowLeaderboard(prev => !prev);
  }, []);

  const renderItem = ({ item, index }: { item: FeedItemType; index: number }) => {
    // Add debug logging for duplicate detection and feed stability
    console.log(`Rendering item ${index}: ${item.id} - "${item.question.substring(0, 30)}..."`, 
      questions[item.id] ? `(Question status: ${questions[item.id].status})` : '(No status yet)');
    
    return (
      <View style={[styles.feedItemContainer, { height: viewportHeight }]}>
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
          onNextQuestion={handleNextQuestion}
          onToggleLeaderboard={() => toggleLeaderboard(item.id)}
        />
      </View>
    );
  };

  const keyExtractor = (item: FeedItemType, index: number) => {
    // Ensure key is always unique even if duplicate IDs exist
    return `${item.id}-${index}`;
  };

  // Get item layout with responsive height
  const getItemLayout = (_: any, index: number) => {
    return {
      length: viewportHeight,
      offset: viewportHeight * index,
      index,
    };
  };

  // Add this function inside FeedScreen component to determine if we're in cold start mode
  const getColdStartPhaseInfo = useCallback(() => {
    const totalInteractions = Object.keys(userProfile?.interactions || {}).length;
    const totalQuestionsAnswered = userProfile?.totalQuestionsAnswered || 0;
    
    if (!userProfile?.coldStartComplete && (totalInteractions < 20 || totalQuestionsAnswered < 20)) {
      let phase = 1;
      if (totalQuestionsAnswered >= 12) {
        phase = 3;
      } else if (totalQuestionsAnswered >= 3) {
        phase = 2;
      } else {
        phase = 1;
      }
      
      return {
        inColdStart: true,
        phase,
        questionsInPhase: totalQuestionsAnswered,
        phaseDescription: getPhaseDescription(phase)
      };
    }
    
    // When not in cold start, still return all properties with default values
    return { 
      inColdStart: false,
      phase: 4,  // Assume phase 4 (steady state)
      questionsInPhase: totalQuestionsAnswered,
      phaseDescription: getPhaseDescription(4)
    };
  }, [userProfile]);

  // Helper function to get phase description
  const getPhaseDescription = (phase: number) => {
    switch (phase) {
      case 1:
        return "Seeding: Detecting your preferences";
      case 2:
        return "Initial Branching: Learning your interests";
      case 3:
        return "Adaptive Personalization: Refining your feed";
      case 4:
        return "Steady State: Optimized for you";
      default:
        return "Personalizing your feed";
    }
  };

  // Toggle profile modal
  const toggleProfile = () => {
    setShowProfile(!showProfile);
  };

  // Get user profile when component mounts
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('avatar_url')
          .eq('id', user.id)
          .single();
        
        if (error) {
          console.error('Error fetching user profile:', error);
          return;
        }
        
        if (data && data.avatar_url) {
          setAvatarUrl(data.avatar_url);
        }
      } catch (error) {
        console.error('Error in fetchUserProfile:', error);
      }
    };
    
    fetchUserProfile();
  }, [user]);

  // Loading state
  if (isLoading) {
    // Calculate width for the progress bar
    const progressWidth = loadingProgress.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%']
    });
    
    return (
      <Surface style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image 
            source={require('../../../assets/images/app-icon.png')} 
            style={styles.loadingIcon}
            resizeMode="contain"
          />
        </Animated.View>
        <View style={styles.loadingIndicatorContainer}>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 10 }} />
        </View>
        
        <View style={styles.progressContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </Surface>
    );
  }

  // Error state
  if (loadError) {
    return (
      <Surface style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.errorText}>{loadError}</Text>
        <PaperButton 
          mode="contained"
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
          Retry
        </PaperButton>
      </Surface>
    );
  }

  return (
    <View style={styles.container}>
      {/* Profile Button with User Avatar (only appearing once on the feed level) */}
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={toggleProfile}
      >
        <View style={styles.avatarCircle}>
          {isGuest ? (
            // If in guest mode, use the guest avatar image
            <Image 
              source={require('../../../assets/images/guest-avatar.png')} 
              style={styles.avatar}
              resizeMode="cover"
            />
          ) : avatarUrl ? (
            // If user has an avatar, use it
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            // Otherwise show initials
            <ThemedText style={styles.avatarText}>{getInitials()}</ThemedText>
          )}
        </View>
      </TouchableOpacity>

      {/* Connection error banner */}
      {usingMockData && (
        <Surface style={styles.mockDataBanner}>
          <Text style={styles.mockDataText}>
            Using sample questions due to network connectivity issues. Please check your connection.
          </Text>
        </Surface>
      )}
      
      <FlatList
        ref={flatListRef}
        data={personalizedFeed.length > 0 ? personalizedFeed : feedData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        getItemLayout={getItemLayout}
        viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        snapToAlignment="start"
        decelerationRate="fast" // Use fast deceleration for better snapping
        snapToInterval={viewportHeight}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        removeClippedSubviews={Platform.OS !== 'web'} // Improve performance on mobile but can cause issues on web
        maxToRenderPerBatch={3}
        windowSize={5} // Increase window size for better visibility detection
        initialNumToRender={2}
        updateCellsBatchingPeriod={50} // Optimize batch updates
        maintainVisibleContentPosition={{ // Help maintain position during dynamic content changes
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
      />

      {/* InteractionTracker Component */}
      <InteractionTracker 
        feedData={personalizedFeed.length > 0 ? personalizedFeed : feedData} 
      />

      {/* Profile Bottom Sheet */}
      <ProfileBottomSheet isVisible={showProfile} onClose={toggleProfile} />

      {/* Leaderboard Bottom Sheet */}
      <LeaderboardBottomSheet isVisible={showLeaderboard} onClose={toggleLeaderboard} />

      {/* Debugging Modal for Personalization Explanations (DEV only) */}
      {__DEV__ && showExplanationModal && (
        <Portal>
          <Modal 
            visible={showExplanationModal} 
            onDismiss={() => setShowExplanationModal(false)}
            contentContainerStyle={styles.explanationModal}
          >
            <Card>
              <Card.Header title="Question Selection Logic" />
              <Card.Content>
                {currentExplanation.map((explanation, i) => (
                  <Text key={i} style={styles.explanationText}>{explanation}</Text>
                ))}
              </Card.Content>
              <Card.Footer>
                <PaperButton 
                  mode="contained"
                  onPress={() => setShowExplanationModal(false)}
                >
                  Close
                </PaperButton>
              </Card.Footer>
            </Card>
          </Modal>
        </Portal>
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

          <PaperButton
            mode="contained"
            onPress={hideTooltip}
          >
            Got it
          </PaperButton>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    position: 'relative',
    overflow: 'hidden',
    width: '100%', // Ensure full width
    height: '100%', // Ensure full height
  },
  flatList: {
    width: '100%', // Full width for web and mobile
    height: '100%', // Full height
    flex: 1,
  },
  flatListContent: {
    // No additional padding or spacing that would cause items to overflow
    flexGrow: 1,
  },
  feedItemContainer: {
    width: '100%',
    // Height is dynamically set in renderItem using viewportHeight
    // This ensures each item takes exactly one screen
  },
  tooltip: {
    position: 'absolute',
    bottom: 80,
    right: Platform.OS === 'web' ? '50%' : 20,
    transform: Platform.OS === 'web' ? [{ translateX: 110 }] : [],
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
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
    borderColor: colors.border,
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
    borderTopColor: colors.card,
  },
  tooltipText: {
    color: colors.foreground,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing[2],
  },
  tiktokAnimationContainer: {
    height: 85,
    width: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[2],
  },
  phoneFrame: {
    width: 45,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
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
    borderRadius: borderRadius.sm,
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
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: colors.foreground,
  },
  errorText: {
    color: colors.destructive,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 10,
    backgroundColor: colors.primary,
  },
  explanationModal: {
    margin: spacing[5],
  },
  explanationText: {
    color: colors.foreground,
    marginBottom: spacing[2],
    fontSize: 14,
  },
  mockDataBanner: {
    position: 'absolute',
    top: spacing[5],
    left: spacing[5],
    right: spacing[5],
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    padding: spacing[3],
    borderRadius: borderRadius.md,
    zIndex: 100,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  mockDataText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  // Update profile button styles
  profileButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    zIndex: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  avatarCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  avatarText: {
    color: 'black',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  loadingIcon: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  loadingIndicatorContainer: {
    marginBottom: 30,
  },
  progressContainer: {
    width: '70%',
    height: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.2)',
    borderRadius: 4,
    marginBottom: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  loadingTip: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 30,
    color: colors.secondary,
    maxWidth: 320,
    fontStyle: 'italic',
  },
});

export default FeedScreen;