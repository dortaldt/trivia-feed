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
  GestureResponderEvent,
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
  getPersonalizedFeed,
  UserProfile,
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
import { runQuestionGeneration } from '../../lib/questionGeneratorService';
import { useQuestionGenerator } from '../../hooks/useQuestionGenerator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoadingBar } from '../../components/ui';
import { QuestionInteraction } from '../../lib/personalizationService';
import { recordUserAnswer } from '../../lib/leaderboardService';

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
  
  // Add state for debug panel visibility
  const [debugPanelVisible, setDebugPanelVisible] = useState(false);
  
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
  // Add this near the top of the component with other refs
  const lastVisibleIndexRef = useRef<number | null>(null);
  // Add ref to prevent duplicate profile button clicks
  const lastProfileClickTime = useRef<number | null>(null);

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
  
  // Add state for profile username at component level
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  
  // Add state to track skipped questions that need processing
  const [pendingSkips, setPendingSkips] = useState<Set<string>>(new Set());
  
  // Fetch username from the database when user changes
  useEffect(() => {
    const fetchUsername = async () => {
      if (user?.id) {
        try {
          const { data } = await supabase
            .from('user_profiles')
            .select('full_name')
            .eq('id', user?.id)
            .single();
          
          if (data?.full_name) {
            setProfileUsername(data.full_name);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      }
    };
    
    fetchUsername();
  }, [user?.id]);

  // Get user initials for the profile button
  const getInitials = () => {
    // Use the fetched full_name if available
    if (profileUsername) {
      return profileUsername.substring(0, 2).toUpperCase();
    }
    
    // Fallback to email if available
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    
    // Ultimate fallback
    return 'ZT';
  };

  // Load user data when component mounts if user is logged in
  useEffect(() => {
    if (user?.id) {
      console.log('User is logged in, loading user data');
      
      // Dispatch the thunk to load all user data
      dispatch(loadUserDataThunk(user?.id))
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
              userId: user?.id
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

  // Add a ref to track skip count
  const skipCountRef = useRef<number>(0);

  const allowedTopics = [
    'Music',
    'Science',
    'Arts',
    'Technology',
    'Pop Culture',
    'Literature',
    'Entertainment',
    'Miscellaneous',
    'Geography'
  ];

  // Simple function to check if we should add questions at current position
  const shouldAddQuestionsAtPosition = useCallback((position: number) => {
    // Add questions at positions 4, 8, 12, 16, 20 (after every 4 questions in cold start)
    const isCheckpoint = position % 4 === 0 && position <= 20 && position > 0;
    console.log(`[Feed] Checking position ${position} for checkpoint: ${isCheckpoint ? 'YES' : 'NO'}`);
    return isCheckpoint;
  }, []);

  // Helper function to add questions at checkpoints
  const addQuestionsAtCheckpoint = useCallback((checkpointPosition: number, updatedProfile: UserProfile) => {
    if (feedData.length > personalizedFeed.length) {
      console.log(`[Feed] Adding questions at checkpoint position ${checkpointPosition}`);
      console.log(`[Feed] Current user profile state:`, JSON.stringify(updatedProfile.topics, null, 2));
      
      // Create a set of IDs that are already in our feed
      const currentFeed = [...personalizedFeed];
      const existingIds = new Set(currentFeed.map(item => item.id));
      
      // NEW: Track topics already in the feed to ensure diversity
      const topicsInCurrentFeed = new Set(currentFeed.map(item => item.topic));
      console.log(`[Feed] Topics already in current feed: ${Array.from(topicsInCurrentFeed).join(', ')}`);
      
      // Get questions that aren't already in our feed
      const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
      
      // Force cold start strategy during cold start phase (position <= 20)
      const totalInteractions = Object.keys(updatedProfile.interactions || {}).length;
      const totalQuestionsAnswered = updatedProfile.totalQuestionsAnswered || 0;
      const forceColdStart = checkpointPosition <= 20; // Always use cold start logic for checkpoints <= 20
      
      console.log(`[Feed] Checkpoint ${checkpointPosition}: Using ${forceColdStart ? 'cold start' : 'personalized'} logic`);
      console.log(`[Feed] Current state: totalInteractions=${totalInteractions}, totalQuestionsAnswered=${totalQuestionsAnswered}`);
      
      // Set temporary flag to ensure cold start logic is used
      if (forceColdStart) {
        // Make a deep copy to avoid modifying the original
        const tempProfile = JSON.parse(JSON.stringify(updatedProfile));
        
        // Make sure coldStartComplete is false to trigger cold start logic
        tempProfile.coldStartComplete = false;
        
        // NEW: Update the cold start state to include the already shown topics in this session
        if (tempProfile.coldStartState) {
          try {
            const coldStartState = JSON.parse(JSON.stringify(tempProfile.coldStartState));
            
            // Make sure topicsShown includes all topics we've shown in this session
            if (Array.isArray(coldStartState.topicsShown)) {
              const existingTopicsShown = new Set(coldStartState.topicsShown);
              
              // Add current feed topics to the topics shown
              topicsInCurrentFeed.forEach(topic => {
                if (!existingTopicsShown.has(topic)) {
                  coldStartState.topicsShown.push(topic);
                  console.log(`[Feed] Added topic ${topic} to cold start state topicsShown`);
                }
              });
            }
            
            // NEW: Update the recentTopics array to include the most recent topics
            if (Array.isArray(coldStartState.recentTopics)) {
              // Get the 5 most recent topics from current feed (last 5 items)
              const recentFeedTopics = currentFeed.slice(-5).map(item => item.topic).reverse();
              
              // Create a new recentTopics array with the most recent feed topics first
              coldStartState.recentTopics = [...recentFeedTopics, 
                ...coldStartState.recentTopics.filter((t: string) => !recentFeedTopics.includes(t))
              ].slice(0, 5);
              
              console.log(`[Feed] Updated recentTopics in cold start state: ${coldStartState.recentTopics.join(', ')}`);
            }
            
            // NEW: Update the lastSelectedTopics array to include the most recent topics
            if (Array.isArray(coldStartState.lastSelectedTopics)) {
              // Get the 4 most recent topics from current feed (last 4 items)
              const lastSelectedFeedTopics = currentFeed.slice(-4).map(item => item.topic).reverse();
              
              // Create a new lastSelectedTopics array with the most recent feed topics first
              coldStartState.lastSelectedTopics = [...lastSelectedFeedTopics, 
                ...coldStartState.lastSelectedTopics.filter((t: string) => !lastSelectedFeedTopics.includes(t))
              ].slice(0, 4);
              
              console.log(`[Feed] Updated lastSelectedTopics in cold start state: ${coldStartState.lastSelectedTopics.join(', ')}`);
            }
            
            // Update the temp profile with the modified cold start state
            tempProfile.coldStartState = coldStartState;
          } catch (e) {
            console.error('[Feed] Error updating cold start state:', e);
          }
        }
        
        // Force the client-side weights to be used instead of any potentially stale weights
        // Ensure the topics from Redux userProfile are properly included
        if (userProfile && userProfile.topics) {
          console.log(`[Feed] Using latest client-side weights from userProfile`);
          // Log each topic weight for debugging
          Object.entries(userProfile.topics).forEach(([topic, data]) => {
            console.log(`[Feed] Topic '${topic}' weight: ${data.weight}`);
            // Ensure tempProfile has the latest weights from redux store
            if (!tempProfile.topics[topic]) {
              tempProfile.topics[topic] = { ...data };
            } else {
              tempProfile.topics[topic].weight = data.weight;
            }
          });
        }
        
        // Log the complete profile for debugging
        console.log(`[Feed] Final profile for question selection: ${JSON.stringify(tempProfile.topics, null, 2)}`);
        
        // Determine the correct phase based on checkpoint position
        let forcedPhase: 'exploration' | 'branching' | 'normal' | undefined;
        
        if (checkpointPosition < 5) {
          forcedPhase = 'exploration'; // Positions 1-4 use exploration phase
          console.log(`[Feed] Forcing exploration phase at position ${checkpointPosition}`);
        } else if (checkpointPosition < 20) {
          forcedPhase = 'branching'; // Positions 5-19 use branching phase
          console.log(`[Feed] Forcing branching phase at position ${checkpointPosition}`);
        } else {
          forcedPhase = 'normal'; // Position 20+ use normal phase
          console.log(`[Feed] Forcing normal phase at position ${checkpointPosition}`);
        }
        
        // Import getColdStartFeed from the coldStartStrategy
        const { getColdStartFeed } = require('../../lib/coldStartStrategy');
        
        // Use the cold start feed generator with the forced phase
      const { items: personalizedItems, explanations: personalizedExplanations } = 
          getColdStartFeed(availableQuestions, tempProfile, undefined, forcedPhase);
        
      // Take only questions we don't already have
        const newQuestions = personalizedItems.filter((item: FeedItemType) => !existingIds.has(item.id)).slice(0, 4);
      
      if (newQuestions.length > 0) {
          console.log(`[Feed] Appending ${newQuestions.length} cold start questions at checkpoint position ${checkpointPosition}`);
          
          // Log which topics were selected for debugging
          const selectedTopics = newQuestions.map((q: FeedItemType) => q.topic);
          console.log(`[Feed] Selected topics at checkpoint ${checkpointPosition}: ${selectedTopics.join(', ')}`);
          
          // NEW: Log how many unique topics we have for diversity check
          const allTopicsAfterAddition = new Set([...topicsInCurrentFeed, ...selectedTopics]);
          console.log(`[Feed] Feed will have ${allTopicsAfterAddition.size} unique topics after addition`);
          
          // Log if these are exploration or branching questions
          const isExploration = checkpointPosition === 4; // First checkpoint is exploration
          const isBranching = checkpointPosition > 4 && checkpointPosition <= 20; // 8, 12, 16, 20 are branching
          console.log(`[Feed] Question type: ${isExploration ? 'Exploration' : isBranching ? 'Branching' : 'Normal'}`);
        
        // Create a new feed with existing + new questions
        const updatedFeed = [...currentFeed, ...newQuestions];
        
        // Add additional explanation about why we added them
        const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
        
        // Add the explanations from the personalization system plus our position message
        newQuestions.forEach((item: FeedItemType) => {
          combinedExplanations[item.id] = [
            ...(personalizedExplanations[item.id] || []),
            `Added at cold start checkpoint position ${checkpointPosition}`
          ];
        });
        
        // Update the feed in Redux with the combined feed
        dispatch(setPersonalizedFeed({
          items: updatedFeed,
          explanations: combinedExplanations,
            userId: user?.id || undefined // Handle nullable user
        }));
      } else {
        console.log(`[Feed] No new questions were found to add at checkpoint ${checkpointPosition}`);
        }
      } else {
        // Use standard personalization logic for positions > 20
        const { items: personalizedItems, explanations: personalizedExplanations } = 
          getPersonalizedFeed(availableQuestions, updatedProfile, 4);
        
        // Take only questions we don't already have
        const newQuestions = personalizedItems.filter((item: FeedItemType) => !existingIds.has(item.id)).slice(0, 4);
        
        if (newQuestions.length > 0) {
          console.log(`[Feed] Appending ${newQuestions.length} personalized questions at checkpoint position ${checkpointPosition}`);
          
          // Create a new feed with existing + new questions
          const updatedFeed = [...currentFeed, ...newQuestions];
          
          // Add additional explanation about why we added them
          const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
          
          // Add the explanations from the personalization system plus our position message
          newQuestions.forEach((item: FeedItemType) => {
            combinedExplanations[item.id] = [
              ...(personalizedExplanations[item.id] || []),
              `Added at normal checkpoint position ${checkpointPosition}`
            ];
          });
          
          // Update the feed in Redux with the combined feed
          dispatch(setPersonalizedFeed({
            items: updatedFeed,
            explanations: combinedExplanations,
            userId: user?.id || undefined // Handle nullable user
          }));
        } else {
          console.log(`[Feed] No new questions were found to add at checkpoint ${checkpointPosition}`);
        }
      }
    } else {
      console.log('[Feed] No additional questions available in feedData for checkpoint');
    }
  }, [feedData, personalizedFeed, feedExplanations, dispatch, user, userProfile]);

  // Add debug logs to markPreviousAsSkipped to identify if it's being called correctly
  const markPreviousAsSkipped = useCallback((prevIndex: number, newIndex: number) => {
    // Only mark as skipped when explicitly scrolling down past a question and if we have feed data
    console.log(`[DEBUG] markPreviousAsSkipped called with prevIndex=${prevIndex}, newIndex=${newIndex}`);
    
    if (prevIndex >= 0 && prevIndex < personalizedFeed.length && newIndex > prevIndex) {
      const previousQuestion = personalizedFeed[prevIndex];
      const previousQuestionId = previousQuestion.id;
      
      // Add this ID to pending skips for reliable processing
      setPendingSkips(current => {
        const updated = new Set(current);
        updated.add(previousQuestionId);
        return updated;
      });
      
      // Add special logging for first question
      if (prevIndex === 0) {
        console.log(`[Feed] FIRST QUESTION being marked as skipped: ID ${previousQuestionId}, question "${previousQuestion.question?.substring(0, 30)}..."`)
      } else {
        console.log(`[Feed] Marking question #${prevIndex + 1} as skipped: ID ${previousQuestionId}, question "${previousQuestion.question?.substring(0, 30)}..."`);
      }
      
      // Skip if the question is already marked as skipped or answered
      if (questions[previousQuestionId] && 
          (questions[previousQuestionId].status === 'skipped' || 
           questions[previousQuestionId].status === 'answered')) {
        console.log(`[Feed] Question ${previousQuestionId} already processed (${questions[previousQuestionId].status}), skipping`);
        return;
      }
      
      // Get interaction start time if it exists
      const startTime = interactionStartTimes[previousQuestionId];
      let timeSpent = 0;
      
      if (startTime) {
        timeSpent = Date.now() - startTime;
      }
      
      // Special case for the first question - force longer timeSpent to ensure it's registered
      if (prevIndex === 0) {
        // Force at least 1 second to ensure weight changes register
        timeSpent = Math.max(timeSpent, 1000);
        console.log(`[Feed] FIRST QUESTION: Ensuring minimum timeSpent of 1000ms (actual: ${timeSpent}ms)`);
      }
      
      // Mark question as skipped in Redux
      dispatch(skipQuestion({ 
        questionId: previousQuestionId,
        userId: user?.id
      }));
      
      console.log(`[Feed] Dispatched skipQuestion action for question ${previousQuestionId}`);
      
      // Update user profile with new weight changes
      if (user && user.id) {
        // Create interaction for this skip
        const interaction: Partial<QuestionInteraction> = {
          wasSkipped: true,
          timeSpent
        };
        
        console.log(`[Feed] Updating user profile for skipped question ${previousQuestionId}`);
        console.log(`[Feed] Before skip - topic weights:`, JSON.stringify(userProfile.topics, null, 2));
        
        // Use the personalization service to update the profile
        const result = updateUserProfile(
        userProfile,
        previousQuestionId,
          interaction,
        previousQuestion
      );
      
        console.log(`[Feed] After skip - topic weights:`, JSON.stringify(result.updatedProfile.topics, null, 2));
        console.log(`[Feed] User profile updated, weight change: ${result.weightChange ? 'YES' : 'NO'}`);
        
        if (result.weightChange) {
          console.log(`[Feed] Weight change details: Topic=${result.weightChange.topic}, ${result.weightChange.oldWeights.topicWeight.toFixed(2)} -> ${result.weightChange.newWeights.topicWeight.toFixed(2)}`);
        }
        
        // Save updated profile to Redux BEFORE checkpoint checking
      dispatch(updateUserProfileAction({ 
          profile: result.updatedProfile, 
        userId: user?.id,
          weightChange: result.weightChange || undefined  // Convert null to undefined
      }));

      // Increment skip count
      skipCountRef.current += 1;
      
      // Simple check for adding questions
      // Check if current position (1-indexed) is a checkpoint
      const currentPosition = prevIndex + 1;
      
        // After updating the profile with the skipped question, check for checkpoint
      if (currentPosition <= 20 && shouldAddQuestionsAtPosition(currentPosition)) {
          // IMPORTANT: Using the UPDATED profile with latest weights
          console.log(`[Feed] At checkpoint position ${currentPosition}, adding 4 questions - using UPDATED profile with latest weights`);
        addQuestionsAtCheckpoint(currentPosition, result.updatedProfile);
      } else if (currentPosition > 20) {
        // After position 20 (past cold start) - add 1 question
        console.log('[Feed] Past cold start, adding one question after skip');
        
        // Only proceed if we have feedData to choose from
        if (feedData.length > personalizedFeed.length) {
          // Create a set of IDs that are already in our feed
          const currentFeed = [...personalizedFeed];
          const existingIds = new Set(currentFeed.map(item => item.id));
          
          // Get questions that aren't already in our feed
          const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
          
          if (availableQuestions.length > 0) {
            // Use personalization logic to select new questions
              // IMPORTANT: Use the UPDATED profile here too
            const { items: personalizedItems, explanations: personalizedExplanations } = 
              getPersonalizedFeed(availableQuestions, result.updatedProfile, 1); // Only get 1 question
          
            // Take only the first question
            const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 1);
        
            if (newQuestions.length > 0) {
              console.log(`[Feed] Adding 1 personalized question to feed after skip`);
              
              // Create a new feed with existing + new question
              const updatedFeed = [...currentFeed, ...newQuestions];
          
              // Add additional explanation about why we added this question
              const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
          
              // Add the explanations from the personalization system
              newQuestions.forEach((item: FeedItemType) => {
                combinedExplanations[item.id] = [
                  ...(personalizedExplanations[item.id] || []),
                  `Added after question skip`
                ];
              });
          
              // Update the feed in Redux - log dispatch for debugging
              console.log(`[Feed] Dispatching setPersonalizedFeed with ${updatedFeed.length} items`);
              dispatch(setPersonalizedFeed({
                items: updatedFeed,
                explanations: combinedExplanations,
                userId: user?.id || undefined // Handle null user case
              }));
            }
          }
        }
      } else {
        console.log(`[Feed] Not at a checkpoint position (${currentPosition}), not adding questions`);
      }
      } else {
        console.log('[Feed] User not logged in, skipping add question logic');
      }
    } else {
      console.log(`[Feed] Not marking as skipped - invalid indices or not moving forward: prevIndex=${prevIndex}, newIndex=${newIndex}, personalizedFeed.length=${personalizedFeed.length}`);
    }
  }, [personalizedFeed, dispatch, userProfile, user, questions, interactionStartTimes, feedData, feedExplanations, shouldAddQuestionsAtPosition, addQuestionsAtCheckpoint]);

  // Helper function to log feed state for debugging
  const logFeedState = useCallback(() => {
    console.log("===== CURRENT FEED STATE =====");
    console.log(`Feed length: ${personalizedFeed.length} questions`);
    console.log(`Current index: ${currentIndex}`);
    
    // Count topics in feed
    const topicCounts = new Map<string, number>();
    personalizedFeed.forEach(item => {
      const topic = item.topic;
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
    
    console.log("Topics in feed:");
    topicCounts.forEach((count, topic) => {
      console.log(`  ${topic}: ${count} questions`);
    });
    
    // Count interactions by type
    let answeredCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;
    
    personalizedFeed.forEach(item => {
      const state = questions[item.id];
      if (!state || state.status === 'unanswered') {
        pendingCount++;
      } else if (state.status === 'skipped') {
        skippedCount++;
      } else if (state.status === 'answered') {
        answeredCount++;
      }
    });
    
    console.log(`Interaction breakdown: ${answeredCount} answered, ${skippedCount} skipped, ${pendingCount} pending`);
    
    // Check user profile
    const totalInteractions = Object.keys(userProfile.interactions || {}).length;
    const totalQuestionsAnswered = userProfile.totalQuestionsAnswered || 0;
    const inColdStart = !userProfile.coldStartComplete && totalQuestionsAnswered < 20;
    
    console.log(`User profile: ${totalInteractions} interactions, ${totalQuestionsAnswered} questions answered`);
    console.log(`Cold start: ${inColdStart ? 'active' : 'complete'}`);
    
    if (inColdStart) {
      // Identify cold start phase
      let phase = 'unknown';
      if (totalQuestionsAnswered < 5) {
        phase = 'exploration (1-5)';
      } else if (totalQuestionsAnswered < 20) {
        phase = 'branching (6-20)';
      }
      console.log(`Cold start phase: ${phase}`);
    }
    
    console.log("===========================");
    
    return { inColdStart, totalInteractions, totalQuestionsAnswered };
  }, [personalizedFeed, currentIndex, questions, userProfile]);

  // Update handleFastScroll to forcibly add questions after a skip
  const handleFastScroll = useCallback((startIndex: number, endIndex: number) => {
    // Don't process if start and end are the same or if scrolling up
    if (startIndex >= endIndex || !personalizedFeed.length) {
      console.log(`[FastScroll] Skipping processing: startIndex=${startIndex}, endIndex=${endIndex}, moving up or same position`);
      return;
    }
    
    console.log(`[FastScroll] Processing fast scroll: ${startIndex} → ~${endIndex}`);
    console.log(`[FastScroll] Before processing, checking feed state:`);
    const { inColdStart, totalInteractions, totalQuestionsAnswered } = logFeedState();
    
    const totalSkipped = Math.min(endIndex - startIndex, 5); // Limit to 5 max questions skipped
    console.log(`[FastScroll] Will attempt to process ${totalSkipped} skipped questions`);

    // Process the skips first
    let skippedCount = 0;
    let highestProcessedIndex = -1;
    
    // Special handling for first question - always check it
    const firstQuestionId = personalizedFeed[0]?.id;
    if (firstQuestionId) {
      const firstQuestionState = questions[firstQuestionId];
      if (!firstQuestionState || firstQuestionState.status === 'unanswered') {
        console.log(`[FastScroll] First question not yet processed, marking as skipped: ${firstQuestionId}`);
        console.log(`[FastScroll] First question topic: ${personalizedFeed[0]?.topic}`);
        markPreviousAsSkipped(0, 1);
        skippedCount++;
        highestProcessedIndex = 0;
      }
    }
    
    // Process remaining questions that aren't already marked
    for (let i = Math.max(1, startIndex); i < endIndex && i < personalizedFeed.length; i++) {
        const question = personalizedFeed[i];
        const questionState = questions[question.id];
        
        // Skip questions that are already processed (answers or skipped)
        if (questionState && (questionState.status === 'answered' || questionState.status === 'skipped')) {
          console.log(`[FastScroll] Question at index ${i} (${question.id}) already processed as ${questionState.status}, skipping`);
          continue;
        }
        
      // Mark as skipped
      console.log(`[FastScroll] Marking question at index ${i} (${question.id}) as skipped`);
      console.log(`[FastScroll] Question topic: ${question.topic}`);
      markPreviousAsSkipped(i, i+1); // Mark this specific question as skipped
      skippedCount++;
      if (i > highestProcessedIndex) {
        highestProcessedIndex = i;
      }
    }
    
    // Now check if we need to add questions - simplified logic
    if (skippedCount > 0) {
      // Check if current position is a checkpoint (4, 8, 12, 16, 20)
      // We use position + 1 because our checkpoints are 1-indexed but array is 0-indexed
      const currentPosition = highestProcessedIndex + 1;
      
      console.log(`[FastScroll] Skipped ${skippedCount} questions, highest index was ${highestProcessedIndex}`);
      console.log(`[FastScroll] Checking if position ${currentPosition} is a checkpoint`);
      
      if (currentPosition <= 20 && shouldAddQuestionsAtPosition(currentPosition)) {
        // At a checkpoint position in cold start - add 4 questions
        console.log(`[FastScroll] At checkpoint position ${currentPosition}, adding 4 questions`);
        addQuestionsAtCheckpoint(currentPosition, userProfile);
      } else if (currentPosition > 20) {
        // After position 20 (past cold start) - add 1 question
        console.log(`[FastScroll] Past cold start (position ${currentPosition}), adding 1 question`);
        
        // Only proceed if we have feedData to choose from
        if (feedData.length > personalizedFeed.length) {
          // Create a set of IDs that are already in our feed
          const currentFeed = [...personalizedFeed];
          const existingIds = new Set(currentFeed.map(item => item.id));
          
          // Get questions that aren't already in our feed
          const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
          
          if (availableQuestions.length > 0) {
            // Use personalization logic to select new questions
            const { items: personalizedItems, explanations: personalizedExplanations } = 
              getPersonalizedFeed(availableQuestions, userProfile, 1); // Only get 1 question
          
            // Take only the first question
            const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 1);
        
            if (newQuestions.length > 0) {
              console.log(`[FastScroll] Adding 1 personalized question to feed`);
              console.log(`[FastScroll] Selected topic: ${newQuestions[0].topic}`);
              
              // Create a new feed with existing + new question
              const updatedFeed = [...currentFeed, ...newQuestions];
          
              // Add additional explanation about why we added this question
              const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
          
              // Add the explanations from the personalization system
              newQuestions.forEach((item: FeedItemType) => {
                combinedExplanations[item.id] = [
                  ...(personalizedExplanations[item.id] || []),
                  `Added after skip (past cold start)`
                ];
              });
          
              // Update the feed in Redux - log dispatch for debugging
              console.log(`[FastScroll] Dispatching setPersonalizedFeed with ${updatedFeed.length} items`);
              dispatch(setPersonalizedFeed({
                items: updatedFeed,
                explanations: combinedExplanations,
                userId: user?.id || undefined // Handle nullable user
              }));
            }
          }
        }
      } else {
        console.log(`[FastScroll] Not at a checkpoint position (${currentPosition}), not adding questions`);
      }
      
      // Log feed state after processing
      console.log(`[FastScroll] After processing, checking updated feed state:`);
      logFeedState();
    }
  }, [personalizedFeed, questions, markPreviousAsSkipped, feedData, userProfile, feedExplanations, dispatch, user, addQuestionsAtCheckpoint, shouldAddQuestionsAtPosition, logFeedState]);

  // This should be near the top of your component
  // Use a more precise method to detect iOS
  const isIOS = Platform.OS === 'ios';
  const isAndroid = Platform.OS === 'android';
  const isWeb = Platform.OS === 'web';
  
  // Pre-rendering configuration for smooth TikTok-like scroll
  const PRE_RENDER_COUNT = 2; // Pre-render 2 items ahead
  const RENDER_WINDOW = 5; // Keep 5 items in memory (current + 2 before + 2 after)
  
  // Add this ref to track pre-rendered items
  const preRenderedItems = useRef(new Set<string>());
  
  // Optimize scrolling on iOS by preventing handling during momentum
  const isMomentumScrolling = useRef(false);
  
  // Add optimal deceleration rate for different platforms
  const getOptimalDecelerationRate = useCallback(() => {
    if (isIOS) {
      // TikTok-like feel: slightly faster than normal but not too fast
      return 0.993; // Further refined for more natural TikTok-like feel
    } else if (isAndroid) {
      return 'fast';
    } else {
      return 'fast';
    }
  }, [isIOS, isAndroid]);

  // Add a function to preload the next items - this will ensure they're ready
  const preloadNextItems = useCallback((currentIdx: number) => {
    if (!personalizedFeed || personalizedFeed.length === 0) return;
    
    // Define the range of items to preload (current + PRE_RENDER_COUNT ahead)
    const startIdx = currentIdx;
    const endIdx = Math.min(currentIdx + PRE_RENDER_COUNT, personalizedFeed.length - 1);
    
    // Add items to the preRendered set
    for (let i = startIdx; i <= endIdx; i++) {
      const itemId = personalizedFeed[i].id;
      if (!preRenderedItems.current.has(itemId)) {
        console.log(`Preloading item ${i} (${itemId})`);
        preRenderedItems.current.add(itemId);
      }
    }
  }, [personalizedFeed]);

  // Optimize handleScroll for iOS specifically
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Early return for tooltips - hide only on first scroll
    if (event.nativeEvent.contentOffset.y !== 0 && showTooltip) {
      hideTooltip();
      return; // Early return after hiding tooltip
    }
    
    // Special iOS optimization: skip all processing during momentum scrolling
    if (isIOS && isMomentumScrolling.current) {
      return;
    }
    
    // Skip all processing if already actively scrolling
    if (isActivelyScrolling) {
      return;
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
    
    // Track scroll direction but with minimal processing
    const currentScrollPos = event.nativeEvent.contentOffset.y;
    const scrollDirection = currentScrollPos > lastScrollPosition.current ? 'down' : 'up';
    lastScrollPosition.current = currentScrollPos;
    
    // For iOS, calculate the current index based on scroll position
    // and update if it's significantly different from the current index
    if (isIOS && scrollDirection === 'down' && !isActivelyScrolling) {
      const estimatedIndex = Math.round(currentScrollPos / viewportHeight);
      
      // Only update if we've moved to a clearly different question
      if (estimatedIndex > currentIndex + 0.5) {
        console.log(`[handleScroll] On iOS: Updating currentIndex from ${currentIndex} to ${estimatedIndex}`);
        setCurrentIndex(estimatedIndex);
      }
    }
    
    // Only process "skipped" logic on desktop or when scrolling has ended
    // This significantly reduces processing during actual scroll animation
    if (scrollDirection === 'down' && Platform.OS === 'web' && !isActivelyScrolling) {
      // Use requestAnimationFrame to process after current frame is complete
      requestAnimationFrame(() => {
        // Calculate the approximate index based on scroll position
        const estimatedIndex = Math.round(currentScrollPos / viewportHeight);
        
        // Only process if we've moved more than one question
        if (estimatedIndex > currentIndex + 1) {
          handleFastScroll(currentIndex, estimatedIndex);
        }
      });
    }
  }, [currentIndex, viewportHeight, showTooltip, hideTooltip, isActivelyScrolling, handleFastScroll, isIOS, setCurrentIndex]);

  // Enhanced onViewableItemsChanged with preloading
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null && personalizedFeed.length > 0) {
        const newIndex = viewableItems[0].index;
        const currentItem = personalizedFeed[newIndex];
        
        // Start preloading next items immediately when a new item becomes visible
        preloadNextItems(newIndex);
        
        if (currentItem && currentItem.id) {
          const currentItemId = currentItem.id;
          const prevIndex = lastVisibleIndexRef.current;
          
          // Enhanced logging to track what's happening
          console.log(`[ViewableItemsChanged] Moving from index ${prevIndex} to ${newIndex}, item ${currentItemId}`);
          
          // Special case for first question skip detection
          if (newIndex === 1 && (prevIndex === null || prevIndex === 0)) {
            // We've moved directly to the second question - check if first question was processed
            const firstQuestionId = personalizedFeed[0].id;
            const firstQuestionState = questions[firstQuestionId];
            
            // Only mark as skipped if it hasn't been processed yet
            if (!firstQuestionState || firstQuestionState.status === 'unanswered') {
              console.log(`[ViewableItemsChanged] First question not yet processed, marking as skipped`);
              markPreviousAsSkipped(0, 1);
            } else {
              console.log(`[ViewableItemsChanged] First question already processed as ${firstQuestionState?.status}`);
            }
          }
          
          // Only process if we've actually moved to a new question
          if (prevIndex !== newIndex) {
            // Check if we're moving forward AND if prevIndex is not null (handles first question case)
            if (prevIndex !== null && newIndex > prevIndex) {
              console.log(`[ViewableItemsChanged] Skipping detected: ${prevIndex} → ${newIndex}`);
              markPreviousAsSkipped(prevIndex, newIndex);
            } else if (prevIndex === null && newIndex > 0) {
              // Handle case where first question was skipped and prevIndex hasn't been set yet
              console.log(`[ViewableItemsChanged] First question possibly skipped, marking index 0`);
              markPreviousAsSkipped(0, newIndex);
            } else {
              console.log(`[ViewableItemsChanged] Moving backwards or special case, not marking as skipped`);
            }
            
            // Update last visible index
            lastVisibleIndexRef.current = newIndex;
            lastVisibleItemId.current = currentItemId;
            
            // Update currentIndex state to match the visible item
            // This is critical for iOS to correctly detect skipped questions in onMomentumScrollEnd
            setCurrentIndex(newIndex);
            
            // Start tracking interaction with new question
            dispatch(startInteraction({ questionId: currentItemId }));
            
            // Set current explanation for debugging
            if (debugPanelVisible && feedExplanations[currentItemId]) {
              setCurrentExplanation(feedExplanations[currentItemId]);
            }
          } else {
            console.log(`[ViewableItemsChanged] Index didn't change, not marking as skipped`);
          }
        }
      }
    },
    [personalizedFeed, questions, preloadNextItems, markPreviousAsSkipped, dispatch, 
     debugPanelVisible, feedExplanations, setCurrentIndex]
  );

  useEffect(() => {
    if (personalizedFeed.length > 0) {
      const firstQuestionId = personalizedFeed[0].id;
      lastVisibleItemId.current = firstQuestionId;
      lastVisibleIndexRef.current = 0; // Explicitly initialize this ref to 0
      
      // Start tracking interaction with first question
      console.log(`Starting initial interaction tracking for question ${firstQuestionId}`);
      
      // Dispatch action to start tracking this question's interaction time
      dispatch(startInteraction({ questionId: firstQuestionId }));
    }
  // Remove interactionStartTimes from dependencies to prevent infinite loop
  }, [personalizedFeed, dispatch]);
  
  // Add a new effect to keep lastVisibleIndexRef and currentIndex synchronized
  useEffect(() => {
    // When currentIndex changes, also update lastVisibleIndexRef if needed
    if (currentIndex !== lastVisibleIndexRef.current) {
      console.log(`[Sync] Updating lastVisibleIndexRef from ${lastVisibleIndexRef.current} to match currentIndex ${currentIndex}`);
      lastVisibleIndexRef.current = currentIndex;
    }
  }, [currentIndex]);

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

  // Add effect to process pending skips reliably across platforms
  useEffect(() => {
    if (pendingSkips.size > 0 && feedData.length > 0 && personalizedFeed.length > 0) {
      console.log(`[Feed] Processing ${pendingSkips.size} pending skips in effect`);
      const skipsToProcessArray = Array.from(pendingSkips);
      const newPendingSkipsState = new Set(pendingSkips); // Create a mutable copy for this run

      // It's important to use the latest userProfile for checkpoint decisions.
      // The userProfile from the hook's closure (dependencies) should be up-to-date enough for this batch.

      skipsToProcessArray.forEach(skipToProcessId => {
        const skipIndex = personalizedFeed.findIndex(item => item.id === skipToProcessId);
        
        if (skipIndex >= 0) {
          const currentPosition = skipIndex + 1; // 1-indexed position of the skipped item
          
          // The question status should ideally be 'skipped' here due to earlier dispatches.
          // This useEffect is for post-skip actions like adding questions.
          // We proceed with checkpoint logic assuming the skip was validly recorded.
          
          console.log(`[Feed] Pending skip effect: Processing checkpoint logic for item at index ${skipIndex} (ID: ${skipToProcessId}), position ${currentPosition}`);

          if (currentPosition <= 20 && shouldAddQuestionsAtPosition(currentPosition)) {
            console.log(`[Feed] Pending skip effect: At checkpoint position ${currentPosition}, adding 4 questions.`);
            addQuestionsAtCheckpoint(currentPosition, userProfile); // userProfile from hook dependency
          } else if (currentPosition > 20 && feedData.length > personalizedFeed.length) {
            console.log('[Feed] Pending skip effect: Past cold start, adding one question.');
            const currentFeed = [...personalizedFeed];
            const existingIds = new Set(currentFeed.map(item => item.id));
            const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
            
            if (availableQuestions.length > 0) {
              const { items: personalizedItems, explanations: personalizedExplanations } = 
                getPersonalizedFeed(availableQuestions, userProfile, 1); // userProfile from hook dependency
              
              const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 1);
              
              if (newQuestions.length > 0) {
                const updatedFeed = [...currentFeed, ...newQuestions];
                const combinedExplanations = { ...feedExplanations };
                newQuestions.forEach(item => {
                  combinedExplanations[item.id] = [
                    ...(personalizedExplanations[item.id] || []),
                    `Added after pending skip processing (batch)`
                  ];
                });
                dispatch(setPersonalizedFeed({
                  items: updatedFeed,
                  explanations: combinedExplanations,
                  userId: user?.id || undefined
                }));
              }
            }
          }
        } else {
          console.log(`[Feed] Pending skip effect: Skipped item ${skipToProcessId} not found in personalizedFeed.`);
        }
        newPendingSkipsState.delete(skipToProcessId); // Remove from the copy as it's processed
      });
      
      // Update the state with all processed skips removed
      setPendingSkips(newPendingSkipsState);
    }
  }, [pendingSkips, feedData, personalizedFeed, userProfile, questions, 
      addQuestionsAtCheckpoint, shouldAddQuestionsAtPosition, dispatch, 
      feedExplanations, user?.id, getPersonalizedFeed]); // Added getPersonalizedFeed to dependencies

  // Enhance the viewability configuration for smoother detection
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100, // Reduced from 300ms for faster detection
  };

  // Custom onLayout handler to start preloading after initial layout
  const handleInitialLayout = useCallback(() => {
    // Preload the first few items immediately on layout
    preloadNextItems(0);
  }, [preloadNextItems]);

  const viewabilityConfigCallbackPairs = useRef([
    { viewabilityConfig, onViewableItemsChanged },
  ]);

  const onMomentumScrollBegin = useCallback(() => {
    lastInteractionTime.current = Date.now();
    if (showTooltip) {
      hideTooltip();
    }
    
    // For iOS, mark that we are in momentum scrolling to skip heavy processing
    if (isIOS) {
      isMomentumScrolling.current = true;
    }
    
    // Log scroll movement for debugging
    console.log(`Scroll movement started from question ${currentIndex}`);
  }, [showTooltip, currentIndex, isIOS, hideTooltip]);

  const onMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollTime = Date.now() - lastInteractionTime.current;
    let eventCorrectedCurrentIndex = currentIndex; // Start with the current state from closure

    if (isIOS) {
      isMomentumScrolling.current = false; // Mark momentum as ended for iOS
      
      const finalScrollPos = event.nativeEvent.contentOffset.y;
      const estimatedIndex = Math.round(finalScrollPos / viewportHeight);
      console.log(`[onMomentumScrollEnd] iOS: finalScrollPos from event: ${finalScrollPos}, estimatedIndex: ${estimatedIndex}`);

      if (estimatedIndex >= 0 && estimatedIndex < personalizedFeed.length) {
        // This estimatedIndex is the most accurate representation of where the scroll ended.
        eventCorrectedCurrentIndex = estimatedIndex;
      } else {
        console.warn(`[onMomentumScrollEnd] iOS: Estimated index ${estimatedIndex} is out of bounds. Falling back to state currentIndex: ${currentIndex}`);
        eventCorrectedCurrentIndex = currentIndex; // Fallback if calculation is odd
      }
    } else {
      // For non-iOS, onMomentumScrollEnd might not be triggered by this exact callback signature from FlatList if not defined to take an event,
      // or we might rely on onViewableItemsChanged for index updates.
      // For safety, use the current state index if not iOS.
      eventCorrectedCurrentIndex = currentIndex;
    }

    console.log(`[onMomentumScrollEnd] Effective currentIndex for this event: ${eventCorrectedCurrentIndex}. Previous index was: ${previousIndex.current}. Scroll time: ${scrollTime}ms.`);

    // Perform skip logic using the eventCorrectedCurrentIndex
    if (previousIndex.current !== eventCorrectedCurrentIndex && previousIndex.current < eventCorrectedCurrentIndex) {
      console.log(`[onMomentumScrollEnd] Skip condition met: previousIndex=${previousIndex.current}, newIndex=${eventCorrectedCurrentIndex}. Calling handleFastScroll.`);
      handleFastScroll(previousIndex.current, eventCorrectedCurrentIndex);
    } else {
      console.log(`[onMomentumScrollEnd] Skip condition NOT met: previousIndex=${previousIndex.current}, newIndex=${eventCorrectedCurrentIndex}.`);
    }

    // Update previousIndex.current to reflect the index used for THIS event's logic.
    previousIndex.current = eventCorrectedCurrentIndex;

    // If the eventCorrectedCurrentIndex is different from the actual current state, or other refs are out of sync, update.
    if (eventCorrectedCurrentIndex !== currentIndex || lastVisibleIndexRef.current !== eventCorrectedCurrentIndex) {
      console.log(`[onMomentumScrollEnd] Updating state: currentIndex from ${currentIndex} to ${eventCorrectedCurrentIndex}.`);
      setCurrentIndex(eventCorrectedCurrentIndex);
      
      if (personalizedFeed[eventCorrectedCurrentIndex]) {
        const currentItemId = personalizedFeed[eventCorrectedCurrentIndex].id;
        if (lastVisibleItemId.current !== currentItemId) { // Avoid redundant dispatches
            lastVisibleItemId.current = currentItemId;
            dispatch(startInteraction({ questionId: currentItemId }));
            console.log(`[onMomentumScrollEnd] Dispatched startInteraction for item ${currentItemId} at index ${eventCorrectedCurrentIndex}.`);
        }
        lastVisibleIndexRef.current = eventCorrectedCurrentIndex; // Sync ref
      } else {
        console.warn(`[onMomentumScrollEnd] No item in personalizedFeed at eventCorrectedCurrentIndex ${eventCorrectedCurrentIndex} to start interaction.`);
      }
    } else {
       // If currentIndex state already matches eventCorrectedCurrentIndex, ensure interaction for the current item is dispatched if it's new.
       if (personalizedFeed[eventCorrectedCurrentIndex]) {
        const currentItemId = personalizedFeed[eventCorrectedCurrentIndex].id;
        if (lastVisibleItemId.current !== currentItemId) {
             console.log(`[onMomentumScrollEnd] currentIndex matches, but dispatching startInteraction for new item ${currentItemId}.`);
             lastVisibleItemId.current = currentItemId;
             lastVisibleIndexRef.current = eventCorrectedCurrentIndex;
             dispatch(startInteraction({ questionId: currentItemId }));
        }
      } else {
        console.warn(`[onMomentumScrollEnd] (Else branch) No item in personalizedFeed at eventCorrectedCurrentIndex ${eventCorrectedCurrentIndex}.`);
      }
    }
  }, [currentIndex, setCurrentIndex, handleFastScroll, isIOS, viewportHeight, personalizedFeed, dispatch]);

  // Add this hook to handle question generation
  const { triggerQuestionGeneration, trackQuestionInteraction } = useQuestionGenerator();

  // Find the function that handles answering questions (might be called handleAnswerQuestion)
  // Add the question generation trigger at the end of that function
  
  // For example:
  const handleAnswer = useCallback(async (questionId: string, answerIndex: number, isCorrect: boolean) => {
    const questionItem = personalizedFeed.find(item => item.id === questionId);
    if (!questionItem) return;
    
    // Find the current position/index in the feed (0-indexed)
    const currentIndex = personalizedFeed.findIndex(item => item.id === questionId);
    // Convert to 1-indexed position for our checkpoints
    const currentPosition = currentIndex + 1;
    
    // Get interaction start time if it exists
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
    
    // Record the answer for leaderboard tracking if user is logged in
    if (userId) {
      try {
        // This directly calls the Supabase database to update leaderboard stats
        await recordUserAnswer(userId, questionId, isCorrect, answerIndex);
      } catch (error) {
        console.error('Error recording answer for leaderboard:', error);
      }
    }
    
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
    dispatch(answerQuestion({ 
      questionId, 
      answerIndex, 
      isCorrect,
      userId: user?.id // Pass user ID if available
    }));
    
    // Save updated profile to Redux
    // Let the Redux action handle the syncing with Supabase
    dispatch(updateUserProfileAction({ 
      profile: updatedProfile, 
      userId: user?.id,
      weightChange: weightChange || undefined // Convert null to undefined to match expected type
    }));
    
    // Simple logic for adding questions based on position
    if (feedData.length > currentFeed.length) {
      if (currentPosition <= 20 && shouldAddQuestionsAtPosition(currentPosition)) {
        // At a checkpoint position in cold start - add 4 questions
        console.log(`[Feed] At checkpoint position ${currentPosition}, adding 4 questions`);
        addQuestionsAtCheckpoint(currentPosition, updatedProfile);
      } else if (currentPosition > 20) {
        // After position 20 (past cold start) - add 1 question
        console.log(`[Feed] Past cold start (position ${currentPosition}), adding 1 question`);
        
        // Create a set of IDs that are already in our feed
        const existingIds = new Set(currentFeed.map(item => item.id));
        
        // Get questions that aren't already in our feed
        const availableQuestions = feedData.filter(item => !existingIds.has(item.id));
        
        // Use personalization logic to select new questions
        const { items: personalizedItems, explanations: personalizedExplanations } = 
          getPersonalizedFeed(availableQuestions, updatedProfile, 1); // Only get 1 question in normal state
          
        // Take only one question
        const newQuestions = personalizedItems.filter(item => !existingIds.has(item.id)).slice(0, 1);
        
        if (newQuestions.length > 0) {
          console.log(`[Feed] Appending 1 personalized question after interaction`);
          
          // Create a new feed with existing + new questions
          const updatedFeed = [...currentFeed, ...newQuestions];
          
          // Add additional explanation about why we added them
          const combinedExplanations: Record<string, string[]> = { ...feedExplanations };
          
          // Add the explanations from the personalization system
          newQuestions.forEach((item: FeedItemType) => {
            combinedExplanations[item.id] = [
              ...(personalizedExplanations[item.id] || []),
              `Added after question interaction`
            ];
          });
          
          // Update the feed in Redux
          dispatch(setPersonalizedFeed({
            items: updatedFeed,
            explanations: combinedExplanations,
            userId: user?.id || undefined // Handle nullable user
          }));
        }
      } else {
        console.log(`[Feed] Not at a checkpoint position (${currentPosition}), not adding questions`);
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

    // Track this question interaction in client-side storage for better topic generation
    if (user?.id) {
      // Debug: log the full question item to see what properties are available
      console.log('\n\n====================== ANSWER TRACKING LOGS ======================');
      console.log('[FEED] Question properties available:');
      Object.keys(questionItem).forEach(key => {
        console.log(`  - ${key}: ${JSON.stringify((questionItem as any)[key])}`);
      });
      
      // Track client-side interaction data for personalized topic generation
      trackQuestionInteraction(
        user.id, 
        questionId, 
        questionItem.topic || 'Unknown',
        // Handle optional properties safely
        (questionItem as any).subtopic || undefined,
        (questionItem as any).branch || undefined,
        questionItem.tags || [],
        questionItem.question // Pass the question text
      );
      
      // Log the client-side data being tracked
      console.log('[FEED] Tracked client-side interaction data:', {
        questionId,
        topic: questionItem.topic || 'Unknown',
        subtopic: (questionItem as any).subtopic || undefined,
        branch: (questionItem as any).branch || undefined,
        tags: questionItem.tags || [],
        questionText: questionItem.question
      });
      console.log('====================== END ANSWER TRACKING LOGS ======================\n\n');
    }

    // Use a short timeout to prevent multiple rapid calls
    console.log('[FEED] Attempting to trigger question generation for user:', user?.id);
    // Only call once, with a slight delay to ensure Redux state is updated
    setTimeout(() => {
      // This will now use our client-side counter to determine if generation is needed
      if (user?.id) {
        triggerQuestionGeneration(user?.id).catch(error => {
          console.error('Error triggering question generation:', error);
        });
      }
    }, 300);
  }, [dispatch, personalizedFeed, userProfile, interactionStartTimes, feedData, feedExplanations, user, triggerQuestionGeneration, trackQuestionInteraction, addQuestionsAtCheckpoint, shouldAddQuestionsAtPosition]);

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
    
    // Get the next item's topic for gradient transition (if any)
    const nextItemTopic = index < personalizedFeed.length - 1 ? personalizedFeed[index + 1].topic : undefined;
    
    return (
      <View style={[styles.itemContainer, { width, height: viewportHeight }]}>
        <FeedItem 
          item={item} 
          nextTopic={nextItemTopic}
          onAnswer={(answerIndex, isCorrect) => 
            handleAnswer(item.id, answerIndex, isCorrect)
          }
          showExplanation={() => {
            // Show explanation only when debug panel is visible
            if (debugPanelVisible && feedExplanations[item.id]) {
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
    // Note: No tracking here - we'll use a ref to prevent duplicate tracking
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
          .eq('id', user?.id)
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

  // Check URL parameters for debug mode
  useEffect(() => {
    // Function to check URL parameters
    const checkUrlParams = () => {
      if (Platform.OS === 'web') {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const debugParam = urlParams.get('debug');
          console.log('URL Params check - debug param:', debugParam);
          
          // Only enable if exact parameter match
          if (debugParam === 'trivia-debug-panel') {
            console.log('Debug panel enabled via URL parameter');
            setDebugPanelVisible(true);
          } else {
            console.log('Debug panel hidden (no valid URL param)');
            // Only reset debug panel visibility if not on iOS (where gesture can toggle it)
            setDebugPanelVisible(false);
          }
        } catch (error) {
          console.error('Error parsing URL parameters:', error);
        }
      }
    };
    
    // Check URL parameters immediately
    checkUrlParams();
    
    // Set up listener for URL changes in web platform
    if (Platform.OS === 'web') {
      // Use the History API to detect changes
      const handlePopState = () => {
        console.log('URL changed, rechecking parameters');
        checkUrlParams();
      };
      
      // Listen for URL changes
      window.addEventListener('popstate', handlePopState);
      window.addEventListener('hashchange', handlePopState);
      
      // Also track the current URL to detect any changes
      let previousUrl = window.location.href;
      
      // Set up an interval to check for URL changes (handles programmatic changes)
      const intervalId = setInterval(() => {
        const currentUrl = window.location.href;
        if (previousUrl !== currentUrl) {
          previousUrl = currentUrl;
          console.log('URL changed programmatically, rechecking parameters');
          checkUrlParams();
        }
      }, 500); // Check every 500ms
      
      // Clean up listeners when component unmounts
      return () => {
        window.removeEventListener('popstate', handlePopState);
        window.removeEventListener('hashchange', handlePopState);
        clearInterval(intervalId);
      };
    }
  }, []);
  
  // Add state for debug toast visibility
  const [showDebugToast, setShowDebugToast] = useState(false);
  const debugToastOpacity = useRef(new Animated.Value(0)).current;
  
  // Handle 3-finger tap for iOS
  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    // Check if it's a 3-finger tap on iOS
    if (Platform.OS === 'ios' && 
        event.nativeEvent.touches && 
        event.nativeEvent.touches.length === 3) {
      console.log('3-finger tap detected on iOS, toggling debug panel');
      
      // Toggle debug panel
      setDebugPanelVisible(prev => !prev);
      
      // Show visual feedback toast
      setShowDebugToast(true);
      Animated.sequence([
        Animated.timing(debugToastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(debugToastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowDebugToast(false);
      });
    }
  }, [debugPanelVisible]);

  // Function to toggle debug mode via URL parameter on web
  const toggleDebugModeViaUrl = useCallback(() => {
    if (Platform.OS === 'web') {
      const currentUrl = new URL(window.location.href);
      const params = new URLSearchParams(currentUrl.search);
      
      if (params.has('debug') && params.get('debug') === 'trivia-debug-panel') {
        // Remove debug parameter if it exists
        params.delete('debug');
        console.log('Removing debug parameter from URL');
      } else {
        // Add debug parameter
        params.set('debug', 'trivia-debug-panel');
        console.log('Adding debug parameter to URL');
      }
      
      // Update URL without reloading the page
      currentUrl.search = params.toString();
      window.history.pushState({}, '', currentUrl.toString());
      
      // Manually trigger a check of URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const debugParam = urlParams.get('debug');
      
      if (debugParam === 'trivia-debug-panel') {
        setDebugPanelVisible(true);
      } else {
        setDebugPanelVisible(false);
      }
      
      // Show visual feedback
      setShowDebugToast(true);
      Animated.sequence([
        Animated.timing(debugToastOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(1500),
        Animated.timing(debugToastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowDebugToast(false);
      });
    }
  }, [debugToastOpacity]);

  // Show debug instructions on web after component mounts
  useEffect(() => {
    if (Platform.OS === 'web' && __DEV__) {
      // Wait a moment before showing the tip
      const timerId = setTimeout(() => {
        console.log('%cTIP: Use ?debug=trivia-debug-panel in the URL to enable debug mode', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
        console.log('%cOr use Alt+D keyboard shortcut to toggle debug mode', 'color: #2196F3; font-size: 14px;');
      }, 2000);
      
      return () => clearTimeout(timerId);
    }
  }, []);

  // Add keyboard shortcut for toggling debug mode on web
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleKeyDown = (event: KeyboardEvent) => {
        // Alt+D shortcut to toggle debug mode
        if (event.altKey && event.key === 'd') {
          event.preventDefault();
          toggleDebugModeViaUrl();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [toggleDebugModeViaUrl]);

  // Add this at the top of the component, near other useState hooks
  const [needMoreQuestions, setNeedMoreQuestions] = useState(false);

  // Then, add a useEffect to handle the needMoreQuestions state
  useEffect(() => {
    if (needMoreQuestions && personalizedFeed.length > 0) {
      console.log('[Feed] Need more questions triggered, fetching...');
      // Reset the flag
      setNeedMoreQuestions(false);
      
      // Logic to add more questions to the feed
      const remainingQuestions = personalizedFeed.length - currentIndex;
      if (remainingQuestions < 5 && feedData.length > personalizedFeed.length) {
        // Create a set of IDs that are already in our feed
        const currentFeed = [...personalizedFeed];
        const existingIds = new Set(currentFeed.map(item => item.id));
        
        // Get questions that aren't already in our feed
        const availableQuestions = feedData.filter((item) => !existingIds.has(item.id));
        
        // Take only a few new questions
        const newQuestions = availableQuestions.slice(0, 2);
        
        if (newQuestions.length > 0) {
          // Create a new feed with existing + new questions
          const updatedFeed = [...currentFeed, ...newQuestions];
          
          // Update the feed in Redux
          dispatch(setPersonalizedFeed({
            items: updatedFeed,
            explanations: feedExplanations,
            userId: user?.id
          }));
          
          console.log(`[Feed] Added ${newQuestions.length} new questions to the feed`);
        }
      }
    }
  }, [needMoreQuestions, personalizedFeed, currentIndex, feedData, dispatch, user?.id, feedExplanations]);

  // Loading state
  if (isLoading) {
    return (
      <Surface style={[styles.container, { backgroundColor, justifyContent: 'center', alignItems: 'center' }]}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Image 
            source={require('../../../assets/images/app-icon.png')} 
            style={styles.loadingIcon}
            resizeMode="contain"
          />
        </Animated.View>
        
        <LoadingBar 
          duration={3000}
          height={10}
          style={{ width: '70%', marginTop: 30 }}
          color={colors.accent}
        />
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
    <View 
      style={styles.container}
      onTouchStart={handleTouchStart}
      onLayout={handleInitialLayout}
    >
      {/* Profile Button with User Avatar */}
      <TouchableOpacity 
        style={styles.profileButton} 
        onPress={() => {
          // Track the profile button click directly here 
          // This avoids duplicate tracking with the tab navigation
          const now = Date.now();
          if (!lastProfileClickTime.current || now - lastProfileClickTime.current > 500) {
            // Only track if it's been at least 500ms since the last click
            lastProfileClickTime.current = now;
            import('../../lib/mixpanelAnalytics').then(({ trackButtonClick }) => {
              trackButtonClick('Profile Icon', {
                location: 'FeedScreen',
                isGuest: isGuest,
                hasAvatar: !!avatarUrl
              });
            }).catch(err => console.error('Failed to track profile button click:', err));
          }
          toggleProfile();
        }}
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
      
      {/* Debug toast notification */}
      {showDebugToast && (
        <Animated.View style={[styles.debugToast, { opacity: debugToastOpacity }]}>
          <ThemedText style={styles.debugToastText}>
            Debug Mode: {debugPanelVisible ? 'ON' : 'OFF'}
          </ThemedText>
        </Animated.View>
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
        scrollEventThrottle={isIOS ? 16 : 16} // Lower for more responsive tracking (16 = 60fps)
        snapToAlignment="start"
        decelerationRate={getOptimalDecelerationRate()}
        snapToInterval={viewportHeight}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        removeClippedSubviews={false} // Keep for iOS to prevent rendering issues
        maxToRenderPerBatch={isIOS ? 2 : 2} // Render 2 items per batch on iOS for smooth transitions
        windowSize={RENDER_WINDOW} // Keep 5 items in memory (current + 2 before + 2 after)
        initialNumToRender={3} // Render 3 items initially (current + 2 next)
        updateCellsBatchingPeriod={isIOS ? 50 : 100} // More frequent updates on iOS
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10
        }}
        onEndReached={() => {
          // Preload more when nearing the end
          if (currentIndex < personalizedFeed.length - 3) {
            preloadNextItems(currentIndex + 1);
          }
        }}
        onEndReachedThreshold={0.5} // Trigger when halfway through the last item
        directionalLockEnabled={true}
        disableIntervalMomentum={true}
        legacyImplementation={false}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      {/* InteractionTracker Component */}
      <InteractionTracker 
        feedData={personalizedFeed.length > 0 ? personalizedFeed : feedData} 
        debugEnabled={debugPanelVisible}
      />

      {/* Profile Bottom Sheet */}
      <ProfileBottomSheet isVisible={showProfile} onClose={toggleProfile} />

      {/* Leaderboard Bottom Sheet */}
      <LeaderboardBottomSheet isVisible={showLeaderboard} onClose={toggleLeaderboard} />

      {/* Debugging Modal for Personalization Explanations - Only visible when debug panel is enabled */}
      {debugPanelVisible && showExplanationModal && (
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

      {/* Debug Panel Button - Only visible when debug panel is explicitly enabled */}
      {debugPanelVisible && (
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={() => {
            console.log('Debug button pressed');
            if (currentIndex < personalizedFeed.length) {
              const currentItemId = personalizedFeed[currentIndex].id;
              setCurrentExplanation(feedExplanations[currentItemId] || ['No explanation available for this question']);
              setShowExplanationModal(true);
            }
          }}
        >
          <View style={styles.debugButtonInner}>
            <ThemedText style={styles.debugButtonText}>DEBUG</ThemedText>
          </View>
        </TouchableOpacity>
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
            Swipe up for next question!
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
  itemContainer: {
    width: '100%',
    // Height is dynamically set in renderItem using viewportHeight
    // This ensures each item takes exactly one screen
    overflow: 'hidden', // Prevent content from affecting parent dimensions
  },
  tooltip: {
    position: 'absolute',
    bottom: 80,
    // Centered tooltip for all platforms
    left: '50%',
    marginLeft: -100, // Half the width for better position
    backgroundColor: colors.card,
    borderRadius: borderRadius.xl,
    padding: spacing[4],
    width: 200, // Slightly wider for better text fit
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
    ...(Platform.OS === 'web' 
      ? {
          left: '50%',
          marginLeft: -8, // Half of the arrow width to center it
        }
      : {
          left: '50%',
          marginLeft: -8, // Half of the arrow width to center it
        }
    ),
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
  loadingTip: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 30,
    color: colors.secondary,
    maxWidth: 320,
    fontStyle: 'italic',
  },
  // Add debug button styles
  debugButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    right: 20,
    width: 60,
    height: 30,
    borderRadius: 15,
    zIndex: 100, // Increase zIndex to ensure it's above all content
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  debugButtonInner: {
    width: 60,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ff5722',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugToast: {
    position: 'absolute',
    top: '40%',
    left: '10%',
    right: '10%',
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 10,
    padding: 16,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugToastText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FeedScreen;