import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedItem } from '../lib/triviaService';
import { dbEventEmitter } from '../lib/syncService';
import { WeightChange } from '../types/trackerTypes';
import { fetchWeightChanges } from '../lib/syncService';
import { loadUserDataThunk } from '../store/thunks';
import { useAuth } from '../context/AuthContext';
import { getDatabaseInfo, attemptDatabaseFix } from '../lib/databaseDebugger';

interface InteractionLog {
  timestamp: number;
  type: 'correct' | 'incorrect' | 'skipped';
  questionId: string;
  timeSpent: number; // in ms
  questionText: string;
}

interface ProfileChange {
  timestamp: number;
  attribute: string;
  oldValue: any;
  newValue: any;
  questionId: string;
}

interface FeedChange {
  timestamp: number;
  type: 'added' | 'removed';
  itemId: string;
  questionText: string;
  explanations: string[];
  weightFactors?: {
    category: string;
    topicWeight?: number;
    subtopicWeight?: number;
    preferenceReason?: string;
    selectionMethod?: string;
  };
}

// Database operation log interface
interface DbOperation {
  timestamp: number;
  direction: 'sent' | 'received';
  table: string;
  operation: 'insert' | 'update' | 'select' | 'upsert';
  records: number;
  data: any;
  userId?: string;
  status: 'success' | 'error';
  error?: string;
}

interface InteractionTrackerProps {
  feedData?: FeedItem[];
}

export function InteractionTracker({ feedData = [] }: InteractionTrackerProps) {
  // Don't render the component in production to avoid infinite loops
  if (!__DEV__) {
    return null;
  }

  const [visible, setVisible] = useState(false);
  const [interactions, setInteractions] = useState<InteractionLog[]>([]);
  const [profileChanges, setProfileChanges] = useState<ProfileChange[]>([]);
  const [feedChanges, setFeedChanges] = useState<FeedChange[]>([]);
  const [dbOperations, setDbOperations] = useState<DbOperation[]>([]);
  const [weightChanges, setWeightChanges] = useState<WeightChange[]>([]);
  const [activeTab, setActiveTab] = useState<'interactions' | 'feed' | 'feedList' | 'dbLog' | 'weights'>('interactions');
  const [expandedExplanations, setExpandedExplanations] = useState<{[id: string]: boolean}>({});
  const [expandedData, setExpandedData] = useState<string | null>(null);
  const [lastWeightUpdateTime, setLastWeightUpdateTime] = useState<number>(0);
  const [isLoadingWeights, setIsLoadingWeights] = useState<boolean>(false);
  const [visibleDbRecords, setVisibleDbRecords] = useState<number>(100); // Default show 100 records
  const [showAllRecords, setShowAllRecords] = useState<boolean>(false); // State to track if showing all records
  const [tableFilter, setTableFilter] = useState<string>(''); // Filter records by table name
  const [summary, setSummary] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    totalTime: 0,
    avgTime: 0,
  });
  
  // Get auth context
  const { user } = useAuth();
  const dispatch = useAppDispatch();
  
  // Get state from Redux store
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);
  const feedExplanations = useAppSelector(state => state.trivia.feedExplanations);
  const syncedWeightChanges = useAppSelector(state => state.trivia.syncedWeightChanges);
  const lastSyncTime = useAppSelector(state => state.trivia.lastSyncTime);
  
  // Store previous profile and feed to track changes
  const prevProfileRef = useRef(userProfile);
  const prevFeedRef = useRef<string[]>([]);
  
  // Function to load weights from database
  const loadWeightsFromDB = async () => {
    if (user?.id) {
      try {
        setIsLoadingWeights(true);
        console.log('InteractionTracker: Fetching user data from database for user:', user.id);
        
        // Log current profile state
        console.log('InteractionTracker: Before fetch - current user profile state:', {
          topicCount: Object.keys(userProfile.topics || {}).length,
          lastRefreshed: userProfile.lastRefreshed,
          coldStartComplete: userProfile.coldStartComplete,
          totalQuestionsAnswered: userProfile.totalQuestionsAnswered,
        });
        
        // Fetch the latest data by dispatching the thunk - store the result directly for verification
        const userData = await dispatch(loadUserDataThunk(user.id)) as any;
        // The result may be directly available, or inside a fulfilled property depending on thunk middleware version
        const result = userData.payload || userData;
        
        console.log('InteractionTracker: Data received from loadUserDataThunk:', {
          profileReceived: !!(result.profile),
          weightChangesCount: result.weightChanges?.length || 0,
          interactionsCount: result.interactions?.length || 0,
          feedChangesCount: result.feedChanges?.length || 0,
        });
        
        if (result.profile) {
          // Check if topics is null or undefined, and provide a default empty object
          const topics = result.profile.topics || {};
          console.log('InteractionTracker: Profile data from DB:', {
            topicCount: Object.keys(topics).length,
            topicsIsNull: result.profile.topics === null,
            topicsIsUndefined: result.profile.topics === undefined,
            topicsDataType: typeof result.profile.topics,
            lastRefreshed: result.profile.lastRefreshed,
            coldStartComplete: result.profile.coldStartComplete,
            totalQuestionsAnswered: result.profile.totalQuestionsAnswered,
          });
          
          // If topics is empty in result.profile but we have local topics, consider pushing local data to server
          if (Object.keys(topics).length === 0 && Object.keys(userProfile.topics || {}).length > 0) {
            console.log('InteractionTracker: DB topics empty but local topics exist. Consider syncing local to server.');
            
            // Import the required function
            const { syncUserProfile } = await import('../lib/syncService');
            
            // Force sync local profile to server
            try {
              await syncUserProfile(user.id, userProfile);
              console.log('InteractionTracker: Force synced local topics to server');
            } catch (syncError) {
              console.error('InteractionTracker: Error syncing local topics to server:', syncError);
            }
          }
        }
        
        // Direct fetch from API if we need a backup approach
        if (!result.profile || !result.profile.topics || Object.keys(result.profile.topics || {}).length === 0) {
          console.log('InteractionTracker: No profile data from thunk, trying direct fetch...');
          
          // Import the required function
          const { fetchUserProfile, fetchWeightChanges } = await import('../lib/syncService');
          
          // Direct API calls as backup
          const directProfile = await fetchUserProfile(user.id);
          const directWeightChanges = await fetchWeightChanges(user.id);
          
          console.log('InteractionTracker: Direct API fetch results:', {
            profileReceived: !!directProfile,
            topicCount: directProfile ? Object.keys(directProfile.topics || {}).length : 0,
            weightChangesCount: directWeightChanges.length
          });
        }
        
        // Update our timestamp regardless
        setLastWeightUpdateTime(Date.now());
        
        // Log the current state of Redux store after thunk
        const currentProfileState = userProfile;
        console.log('InteractionTracker: After fetch - Redux profile state:', {
          topicCount: Object.keys(currentProfileState.topics || {}).length,
          lastRefreshed: currentProfileState.lastRefreshed,
          syncedWeightChangesCount: syncedWeightChanges.length
        });
        
        console.log('InteractionTracker: Successfully loaded user data from database');
      } catch (error) {
        console.error('InteractionTracker: Error loading user data:', error);
      } finally {
        setIsLoadingWeights(false);
      }
    } else {
      console.log('InteractionTracker: No user logged in, skipping data fetch');
    }
  };
  
  // Toggle explanation visibility
  const toggleExplanation = (itemId: string) => {
    setExpandedExplanations(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Manually process feed changes - disable automatic tracking to prevent infinite loops
  const processFeedChanges = () => {
    if (personalizedFeed.length > 0) {
      const now = Date.now();
      const currentFeedIds = personalizedFeed.map(item => item.id);
      
      // Find added items
      const addedItems = personalizedFeed.filter(item => !prevFeedRef.current.includes(item.id));
      
      // Process new items
      if (addedItems.length > 0) {
        const newChanges: FeedChange[] = addedItems.map(item => {
          // Get explanations for this item
          const itemExplanations = feedExplanations[item.id] || [];
          
          // Extract weight-based selection info
          const weightFactors: FeedChange['weightFactors'] = {
            category: item.category,
          };
          
          // Check if there's a topic weight in user profile for this category
          if (userProfile.topics && userProfile.topics[item.category]) {
            weightFactors.topicWeight = userProfile.topics[item.category].weight;
            
            // Check if there's a subtopic weight
            const subtopic = item.tags?.[0] || 'General';
            if (userProfile.topics[item.category].subtopics?.[subtopic]) {
              weightFactors.subtopicWeight = userProfile.topics[item.category].subtopics[subtopic].weight;
            }
          }
          
          // Determine selection method based on explanations
          if (itemExplanations.some(exp => exp.includes("Cold Start"))) {
            weightFactors.selectionMethod = "Cold Start Algorithm";
            
            // Further analyze the cold start phase
            const phaseMatch = itemExplanations.find(exp => exp.includes("Phase"))?.match(/Phase (\d+)/);
            if (phaseMatch) {
              const phase = parseInt(phaseMatch[1]);
              weightFactors.preferenceReason = phase === 1 ? "Initial exploration phase" :
                phase === 2 ? "Building on initial preferences" :
                phase === 3 ? "Refining based on correct answers" :
                "Transitioning to personalized feed";
            }
          } else if (itemExplanations.some(exp => exp.includes("Exploration"))) {
            weightFactors.selectionMethod = "Exploration Selection";
            weightFactors.preferenceReason = itemExplanations.find(exp => 
              exp.includes("Exploration"))?.replace("Exploration: ", "");
          } else if (itemExplanations.some(exp => exp.includes("maintain feed continuity"))) {
            weightFactors.selectionMethod = "Feed Continuity";
            weightFactors.preferenceReason = "Added after answering to maintain feed";
          } else if (itemExplanations.some(exp => exp.includes("extend feed"))) {
            weightFactors.selectionMethod = "Feed Extension";
            weightFactors.preferenceReason = "Added proactively while approaching feed end";
          }
          
          return {
            timestamp: now,
            type: 'added',
            itemId: item.id,
            questionText: item.question || `Question ${item.id.substring(0, 5)}...`,
            explanations: itemExplanations,
            weightFactors
          };
        });
        
        setFeedChanges(prev => [...prev, ...newChanges]);
      }
      
      // Update previous feed reference
      prevFeedRef.current = currentFeedIds;
    }
  };
  
  // Initialize refs on mount only
  useEffect(() => {
    prevFeedRef.current = personalizedFeed.map(item => item.id);
    // Initial process once on mount only
    processFeedChanges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once
  
  // Fetch weight changes from database on component mount
  useEffect(() => {
    loadWeightsFromDB();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only run when user changes
  
  // Track last sync time changes
  useEffect(() => {
    if (lastSyncTime > 0) {
      setLastWeightUpdateTime(lastSyncTime);
    }
  }, [lastSyncTime]);
  
  // Watch for changes in the userProfile
  useEffect(() => {
    // Skip the initial render
    if (prevProfileRef.current === userProfile) return;
    
    // Find what changed in the profile
    const now = Date.now();
    const changes: ProfileChange[] = [];
    
    // Check topics
    if (userProfile.topics && prevProfileRef.current.topics) {
      Object.entries(userProfile.topics).forEach(([topic, topicData]) => {
        const prevTopicData = prevProfileRef.current.topics[topic];
        if (!prevTopicData || topicData.weight !== prevTopicData.weight) {
          changes.push({
            timestamp: now,
            attribute: `Topic: ${topic}`,
            oldValue: prevTopicData?.weight || 0,
            newValue: topicData.weight,
            questionId: 'unknown' // We don't know which question caused this change
          });
        }
        
        // Check subtopics
        if (topicData.subtopics) {
          Object.entries(topicData.subtopics).forEach(([subtopic, subtopicData]) => {
            const prevSubtopicData = prevTopicData?.subtopics?.[subtopic];
            if (!prevSubtopicData || subtopicData.weight !== prevSubtopicData.weight) {
              changes.push({
                timestamp: now,
                attribute: `Subtopic: ${topic}/${subtopic}`,
                oldValue: prevSubtopicData?.weight || 0,
                newValue: subtopicData.weight,
                questionId: 'unknown'
              });
            }
          });
        }
      });
    }
    
    // Check cold start status changes
    if (userProfile.coldStartComplete !== prevProfileRef.current.coldStartComplete) {
      changes.push({
        timestamp: now,
        attribute: 'Cold Start Status',
        oldValue: prevProfileRef.current.coldStartComplete ? 'Complete' : 'In Progress',
        newValue: userProfile.coldStartComplete ? 'Complete' : 'In Progress',
        questionId: 'unknown'
      });
    }
    
    // Get questionId that caused the change
    if (changes.length > 0 && interactions.length > 0) {
      const latestInteraction = interactions[interactions.length - 1];
      changes.forEach(change => {
        change.questionId = latestInteraction.questionId;
      });
    }
    
    // Add to profile changes list
    if (changes.length > 0) {
      setProfileChanges(prev => [...prev, ...changes]);
    }
    
    // Update previous profile
    prevProfileRef.current = userProfile;
  }, [userProfile]); // Remove interactions dependency
  
  // Listen for database operations
  useEffect(() => {
    // Add listener for database operations
    const handleDbOperation = (operation: DbOperation) => {
      // Filter operations for user_feed_changes table to reduce noise
      if (operation.table === 'user_feed_changes') {
        // Only track operations with significant record count for feed changes
        if (operation.records > 5 || operation.operation !== 'insert') {
          setDbOperations(prev => [operation, ...prev].slice(0, 50)); // Limit to 50 operations for feed changes
        }
      } else {
        // For other tables: keep more detailed history
        setDbOperations(prev => [operation, ...prev].slice(0, 100));
      }
    };
    
    dbEventEmitter.on('db-operation', handleDbOperation);
    
    // Clean up the listener when component unmounts
    return () => {
      dbEventEmitter.removeListener('db-operation', handleDbOperation);
    };
  }, []);
  
  // Watch for changes in the questions state
  useEffect(() => {
    // Find the most recent question that's changed
    const questionIds = Object.keys(questions);
    if (questionIds.length === 0) return;
    
    // Process all answered or skipped questions that we haven't logged yet
    const now = Date.now();
    const newInteractions: InteractionLog[] = [];
    
    questionIds.forEach(id => {
      const question = questions[id];
      if (!question) return;
      
      // Skip if already processed
      if (interactions.some(log => log.questionId === id)) return;
      
      // Only process answered or skipped questions
      if (question.status !== 'unanswered') {
        const timeSpent = question.timeSpent || 0;
        
        // Determine if correct or incorrect for answered questions
        let type: 'correct' | 'incorrect' | 'skipped' = 'skipped';
        if (question.status === 'answered' && question.answerIndex !== undefined) {
          // Find the feed item to determine if the answer was correct
          const feedItem = feedData.find(item => item.id === id);
          const isCorrect = feedItem?.answers?.[question.answerIndex]?.isCorrect || false;
          type = isCorrect ? 'correct' : 'incorrect';
        }
        
        // Find the question text if possible
        const questionText = getQuestionText(id);
        
        // Create a new interaction log
        const newInteraction: InteractionLog = {
          timestamp: now,
          type,
          questionId: id,
          timeSpent,
          questionText
        };
        
        // Add to new interactions array
        newInteractions.push(newInteraction);
      }
    });
    
    // Update state once with all new interactions
    if (newInteractions.length > 0) {
      setInteractions(prev => [...prev, ...newInteractions]);
      
      // Update summary based on new interactions
      setSummary(prev => {
        const newSummary = { ...prev };
        newInteractions.forEach(interaction => {
          newSummary[interaction.type]++;
          newSummary.totalTime += interaction.timeSpent;
        });
        newSummary.avgTime = newSummary.totalTime / 
          (newSummary.correct + newSummary.incorrect + newSummary.skipped || 1);
        return newSummary;
      });
    }
  }, [questions, feedData]);
  
  // Track weight changes
  useEffect(() => {
    // Check if there are new weight changes
    if (syncedWeightChanges.length > 0) {
      const existingIds = new Set(weightChanges.map(wc => `${wc.timestamp}-${wc.questionId}`));
      
      // Filter only new weight changes
      const newWeightChanges = syncedWeightChanges.filter(
        wc => !existingIds.has(`${wc.timestamp}-${wc.questionId}`)
      );
      
      if (newWeightChanges.length > 0) {
        setWeightChanges(prev => [...prev, ...newWeightChanges]);
      }
    }
  }, [syncedWeightChanges]);
  
  // Helper to get question text
  const getQuestionText = (questionId: string): string => {
    // If we have the feed item for this question, get its text
    const feedItem = feedData.find(item => item.id === questionId);
    if (feedItem) {
      const text = feedItem.question || 'Unknown question';
      return text.substring(0, 30) + (text.length > 30 ? '...' : '');
    }
    return `Question ${questionId.substring(0, 5)}...`;
  };
  
  // Get personalization information
  const getPersonalizationInfo = () => {
    // Top 3 interests (using topics as interests)
    const topInterests = Object.entries(userProfile.topics || {})
      .sort(([, a], [, b]) => b.weight - a.weight)
      .slice(0, 3)
      .map(([topic, data]) => ({ topic, score: data.weight }));
    
    // Cold start information
    const totalQuestionsAnswered = userProfile.totalQuestionsAnswered || 0;
    const inColdStart = !userProfile.coldStartComplete && totalQuestionsAnswered < 20;
    
    let coldStartPhase = 0;
    if (inColdStart) {
      if (totalQuestionsAnswered >= 12) {
        coldStartPhase = 3;
      } else if (totalQuestionsAnswered >= 3) {
        coldStartPhase = 2;
      } else {
        coldStartPhase = 1;
      }
    }
    
    return {
      topInterests,
      totalQuestionsAnswered,
      inColdStart,
      coldStartPhase,
      personalizedFeedSize: personalizedFeed.length
    };
  };
  
  // Helper function to get weight trend based on recent weight changes
  const getWeightTrend = (
    name: string, 
    type: 'topic' | 'subtopic' | 'branch', 
    parentTopic?: string, 
    parentSubtopic?: string
  ): number => {
    // Look at the most recent weight changes (last 5)
    const recentChanges = weightChanges
      .filter(change => {
        if (type === 'topic') {
          return change.category === name;
        } else if (type === 'subtopic') {
          return change.category === parentTopic && change.subtopic === name;
        } else {
          return change.category === parentTopic && 
                change.subtopic === parentSubtopic && 
                change.branch === name;
        }
      })
      .slice(-5); // Get the most recent 5 changes
    
    if (recentChanges.length === 0) return 0;
    
    // Calculate the trend as the sum of recent changes
    let trend = 0;
    recentChanges.forEach(change => {
      if (type === 'topic') {
        trend += change.newWeights.topicWeight - change.oldWeights.topicWeight;
      } else if (type === 'subtopic' && change.newWeights.subtopicWeight !== undefined && 
        change.oldWeights.subtopicWeight !== undefined) {
        trend += change.newWeights.subtopicWeight - change.oldWeights.subtopicWeight;
      } else if (type === 'branch' && change.newWeights.branchWeight !== undefined && 
        change.oldWeights.branchWeight !== undefined) {
        trend += change.newWeights.branchWeight - change.oldWeights.branchWeight;
      }
    });
    
    // Round to 2 decimal places to avoid tiny floating point differences
    return Math.round(trend * 100) / 100;
  };
  
  const renderInteractionsTab = () => (
    <ScrollView style={styles.tabScrollView}>
      <View style={styles.summaryContainer}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{summary.correct}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: '#4CAF50' }]}>Correct</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{summary.incorrect}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: '#F44336' }]}>Incorrect</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{summary.skipped}</ThemedText>
          <ThemedText style={[styles.statLabel, { color: '#FF9800' }]}>Skipped</ThemedText>
        </View>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>
            {Math.round(summary.avgTime / 1000)}s
          </ThemedText>
          <ThemedText style={styles.statLabel}>Avg Time</ThemedText>
        </View>
      </View>
      
      <ThemedText type="subtitle">Recent Interactions</ThemedText>
      
      <View style={styles.interactionsContainer}>
        {interactions.length === 0 ? (
          <ThemedText style={styles.emptyText}>
            No interactions logged yet. Answer some questions!
          </ThemedText>
        ) : (
          interactions.slice().reverse().map((log, index) => (
            <View 
              key={index} 
              style={[
                styles.logItem, 
                log.type === 'correct' ? styles.correctLog : 
                log.type === 'incorrect' ? styles.incorrectLog : styles.skippedLog
              ]}
            >
              <View style={styles.logHeader}>
                <ThemedText style={styles.logType}>
                  {log.type.toUpperCase()}
                </ThemedText>
                <ThemedText style={styles.logTime}>
                  {new Date(log.timestamp).toLocaleTimeString()}
                </ThemedText>
              </View>
              <ThemedText style={styles.logQuestion}>{log.questionText}</ThemedText>
              <ThemedText style={styles.logTimeSpent}>
                Time: {(log.timeSpent / 1000).toFixed(1)}s
              </ThemedText>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
  
  const renderFeedStatusTab = () => {
    const info = getPersonalizationInfo();
    
    return (
      <ScrollView style={styles.tabScrollView}>
        <View style={styles.feedStatusContainer}>
          {/* Cold Start Status */}
          <View style={styles.statusSection}>
            <ThemedText style={styles.statusLabel}>Profile Status:</ThemedText>
            <ThemedText style={styles.statusValue}>
              {info.inColdStart ? `Cold Start Phase ${info.coldStartPhase}` : 'Personalized'}
            </ThemedText>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${Math.min(info.totalQuestionsAnswered * 5, 100)}%` },
                  info.inColdStart ? styles.coldStartProgress : styles.personalizedProgress
                ]} 
              />
            </View>
            <ThemedText style={styles.statusSubtext}>
              {info.totalQuestionsAnswered}/20 Questions Answered
            </ThemedText>
          </View>
          
          {/* Top Interests */}
          <View style={styles.statusSection}>
            <ThemedText style={styles.statusLabel}>Top Topics:</ThemedText>
            {info.topInterests.length > 0 ? (
              info.topInterests.map((interest, index) => (
                <View key={index} style={styles.interestItem}>
                  <ThemedText style={styles.interestName}>{interest.topic}</ThemedText>
                  <View style={styles.interestBar}>
                    <View style={[styles.interestFill, { width: `${Math.min(interest.score * 100, 100)}%` }]} />
                  </View>
                  <ThemedText style={styles.interestScore}>{interest.score.toFixed(1)}</ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={styles.emptyText}>No topics detected yet</ThemedText>
            )}
          </View>
          
          {/* Interactions Count */}
          <View style={styles.statusSection}>
            <ThemedText style={styles.statusLabel}>Stats:</ThemedText>
            <View style={styles.preferenceItem}>
              <ThemedText style={styles.preferenceName}>Interactions:</ThemedText>
              <ThemedText style={styles.preferenceValue}>
                {Object.keys(userProfile.interactions || {}).length}
              </ThemedText>
            </View>
          </View>
        </View>
        
        <ThemedText type="subtitle">Profile Updates</ThemedText>
        
        <View style={styles.profileChangesContainer}>
          {profileChanges.length === 0 ? (
            <ThemedText style={styles.emptyText}>
              No profile changes detected yet
            </ThemedText>
          ) : (
            profileChanges.slice().reverse().map((change, index) => (
              <View key={index} style={styles.profileChangeItem}>
                <View style={styles.logHeader}>
                  <ThemedText style={styles.logType}>{change.attribute}</ThemedText>
                  <ThemedText style={styles.logTime}>
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </ThemedText>
                </View>
                <ThemedText style={styles.changeText}>
                  {typeof change.oldValue === 'number' && typeof change.newValue === 'number' 
                    ? `${change.oldValue.toFixed(1)} → ${change.newValue.toFixed(1)} (${change.newValue > change.oldValue ? '+' : ''}${(change.newValue - change.oldValue).toFixed(1)})`
                    : `${change.oldValue} → ${change.newValue}`
                  }
                </ThemedText>
                <ThemedText style={styles.logTimeSpent}>Question: {getQuestionText(change.questionId)}</ThemedText>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };
  
  const renderFeedListTab = () => {
    return (
      <ScrollView style={styles.tabScrollView}>
        <View style={styles.feedListContainer}>
          <View style={styles.statusSection}>
            <ThemedText style={styles.statusLabel}>Current Feed:</ThemedText>
            <View style={styles.feedHeaderRow}>
              <ThemedText style={styles.statusValue}>
                {personalizedFeed.length} Questions
              </ThemedText>
              <TouchableOpacity 
                style={styles.refreshButton}
                onPress={() => processFeedChanges()}
              >
                <Feather name="refresh-cw" size={16} color="#0A7EA4" />
                <ThemedText style={styles.refreshText}>Refresh</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Recent Feed Changes */}
          <ThemedText type="subtitle">Recent Feed Changes</ThemedText>
          
          <View style={styles.feedChangesContainer}>
            {feedChanges.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No feed changes detected yet. Press refresh to check for changes.
              </ThemedText>
            ) : (
              feedChanges.slice().reverse().slice(0, 5).map((change, index) => (
                <View key={index} style={styles.feedChangeItem}>
                  <View style={styles.logHeader}>
                    <ThemedText style={styles.logType}>
                      {change.type === 'added' ? 'ADDED TO FEED' : 'REMOVED FROM FEED'}
                    </ThemedText>
                    <ThemedText style={styles.logTime}>
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.logQuestion}>{change.questionText}</ThemedText>
                  
                  {change.explanations.length > 0 && (
                    <View style={styles.explanationContainer}>
                      <ThemedText style={styles.explanationHeader}>Why:</ThemedText>
                      {change.explanations.map((explanation, i) => (
                        <ThemedText key={i} style={styles.explanationText}>• {explanation}</ThemedText>
                      ))}
                    </View>
                  )}
                  
                  {/* Add weight-based selection explanation */}
                  {change.weightFactors && (
                    <View style={styles.weightFactorsContainer}>
                      <ThemedText style={styles.explanationHeader}>Selection Factors:</ThemedText>
                      <ThemedText style={styles.weightFactorText}>
                        • Category: <ThemedText style={styles.weightValue}>{change.weightFactors.category}</ThemedText>
                      </ThemedText>
                      
                      {change.weightFactors.topicWeight !== undefined && (
                        <ThemedText style={styles.weightFactorText}>
                          • Topic Weight: <ThemedText style={styles.weightValue}>
                            {change.weightFactors.topicWeight.toFixed(2)}
                          </ThemedText>
                        </ThemedText>
                      )}
                      
                      {change.weightFactors.subtopicWeight !== undefined && (
                        <ThemedText style={styles.weightFactorText}>
                          • Subtopic Weight: <ThemedText style={styles.weightValue}>
                            {change.weightFactors.subtopicWeight.toFixed(2)}
                          </ThemedText>
                        </ThemedText>
                      )}
                      
                      {change.weightFactors.selectionMethod && (
                        <ThemedText style={styles.weightFactorText}>
                          • Method: <ThemedText style={styles.weightValue}>
                            {change.weightFactors.selectionMethod}
                          </ThemedText>
                        </ThemedText>
                      )}
                      
                      {change.weightFactors.preferenceReason && (
                        <ThemedText style={styles.weightFactorText}>
                          • Reason: <ThemedText style={styles.weightValue}>
                            {change.weightFactors.preferenceReason}
                          </ThemedText>
                        </ThemedText>
                      )}
                    </View>
                  )}
                </View>
              ))
            )}
          </View>
          
          {/* All Feed Items */}
          <ThemedText type="subtitle" style={styles.sectionHeader}>All Feed Items</ThemedText>
          
          <View style={styles.allFeedItemsContainer}>
            {personalizedFeed.length === 0 ? (
              <ThemedText style={styles.emptyText}>No feed items available</ThemedText>
            ) : (
              personalizedFeed.map((item, index) => (
                <View key={index} style={styles.feedItem}>
                  <View style={styles.feedItemHeader}>
                    <ThemedText style={styles.feedItemNumber}>#{index + 1}</ThemedText>
                    <ThemedText style={styles.feedItemCategory}>{item.category || 'Unknown'}</ThemedText>
                  </View>
                  <ThemedText style={styles.feedItemText}>{item.question || `Question ${item.id.substring(0, 5)}...`}</ThemedText>
                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {item.tags.map((tag, i) => (
                        <View key={i} style={styles.tag}>
                          <ThemedText style={styles.tagText}>{tag}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {feedExplanations[item.id] && (
                    <>
                      <TouchableOpacity 
                        style={styles.explanationButton}
                        onPress={() => toggleExplanation(item.id)}
                      >
                        <ThemedText style={styles.explanationButtonText}>
                          {expandedExplanations[item.id] ? 'Hide Explanation' : 'Show Explanation +'}
                        </ThemedText>
                      </TouchableOpacity>
                      
                      {expandedExplanations[item.id] && (
                        <View style={styles.explanationContainer}>
                          <ThemedText style={styles.explanationHeader}>Why this question:</ThemedText>
                          {feedExplanations[item.id].map((explanation, i) => (
                            <ThemedText key={i} style={styles.explanationText}>• {explanation}</ThemedText>
                          ))}
                          
                          {/* Add weight-based info for each feed item */}
                          {userProfile.topics && userProfile.topics[item.category] && (
                            <>
                              <ThemedText style={[styles.explanationHeader, {marginTop: 8}]}>
                                Weight Factors:
                              </ThemedText>
                              <ThemedText style={styles.explanationText}>
                                • Topic weight: {userProfile.topics[item.category].weight.toFixed(2)}
                              </ThemedText>
                              
                              {item.tags && item.tags[0] && 
                               userProfile.topics[item.category].subtopics && 
                               userProfile.topics[item.category].subtopics[item.tags[0]] && (
                                <ThemedText style={styles.explanationText}>
                                  • Subtopic weight: {
                                    userProfile.topics[item.category].subtopics[item.tags[0]].weight.toFixed(2)
                                  }
                                </ThemedText>
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    );
  };
  
  // Calculate database operation stats
  const getDbStats = () => {
    const totalOperations = dbOperations.length;
    const sentOperations = dbOperations.filter(op => op.direction === 'sent').length;
    const receivedOperations = dbOperations.filter(op => op.direction === 'received').length;
    const successOperations = dbOperations.filter(op => op.status === 'success').length;
    const errorOperations = dbOperations.filter(op => op.status === 'error').length;
    
    // Count operations by table
    const tableStats: {[table: string]: number} = {};
    dbOperations.forEach(op => {
      tableStats[op.table] = (tableStats[op.table] || 0) + 1;
    });
    
    // Count operations by operation type
    const operationStats: {[operation: string]: number} = {};
    dbOperations.forEach(op => {
      operationStats[op.operation] = (operationStats[op.operation] || 0) + 1;
    });
    
    return {
      totalOperations,
      sentOperations,
      receivedOperations,
      successOperations,
      errorOperations,
      tableStats,
      operationStats
    };
  };

  // Render the database operations log tab
  const renderDbLogTab = () => {
    const stats = getDbStats();
    
    // Filter operations by table name if filter is set
    const filteredOperations = tableFilter 
      ? dbOperations.filter(op => op.table.includes(tableFilter)) 
      : dbOperations;
    
    // Calculate how many records to display
    const recordsToDisplay = showAllRecords 
      ? filteredOperations 
      : filteredOperations.slice(0, visibleDbRecords);
    
    return (
      <ScrollView style={styles.scrollView}>
        {/* Summary statistics */}
        <ThemedView style={styles.statsCard}>
          <ThemedText style={styles.statsCardTitle}>Database Operations Summary</ThemedText>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statValue}>{stats.totalOperations}</ThemedText>
              <ThemedText style={styles.statLabel}>Total</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, styles.sentText]}>{stats.sentOperations}</ThemedText>
              <ThemedText style={styles.statLabel}>Sent</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, styles.receivedText]}>{stats.receivedOperations}</ThemedText>
              <ThemedText style={styles.statLabel}>Received</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, styles.successText]}>{stats.successOperations}</ThemedText>
              <ThemedText style={styles.statLabel}>Success</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={[styles.statValue, styles.errorText]}>{stats.errorOperations}</ThemedText>
              <ThemedText style={styles.statLabel}>Errors</ThemedText>
            </View>
          </View>
          
          {/* Table statistics */}
          <View style={styles.detailedStats}>
            <ThemedText style={styles.detailedStatsTitle}>By Table:</ThemedText>
            <View style={styles.detailedStatsContent}>
              {Object.entries(stats.tableStats).map(([table, count]) => (
                <TouchableOpacity 
                  key={table} 
                  style={[
                    styles.detailedStatItem,
                    tableFilter === table && styles.selectedTableFilter
                  ]}
                  onPress={() => setTableFilter(tableFilter === table ? '' : table)}
                >
                  <ThemedText style={[
                    styles.detailedStatLabel,
                    tableFilter === table && styles.selectedTableFilterText
                  ]}>
                    {table}:
                  </ThemedText>
                  <ThemedText style={[
                    styles.detailedStatValue,
                    tableFilter === table && styles.selectedTableFilterText
                  ]}>
                    {count}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {/* Operation statistics */}
          <View style={styles.detailedStats}>
            <ThemedText style={styles.detailedStatsTitle}>By Operation:</ThemedText>
            <View style={styles.detailedStatsContent}>
              {Object.entries(stats.operationStats).map(([operation, count]) => (
                <View key={operation} style={styles.detailedStatItem}>
                  <ThemedText style={styles.detailedStatLabel}>{operation}:</ThemedText>
                  <ThemedText style={styles.detailedStatValue}>{count}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      
        {/* Record count info */}
        <View style={styles.recordsInfo}>
          <ThemedText style={styles.recordsInfoText}>
            Showing {recordsToDisplay.length} of {filteredOperations.length} records
            {tableFilter && ` (filtered by "${tableFilter}")`}
          </ThemedText>
          
          {tableFilter && (
            <TouchableOpacity 
              style={styles.clearFilterButton}
              onPress={() => setTableFilter('')}
            >
              <ThemedText style={styles.clearFilterText}>Clear Filter</ThemedText>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Common table filter shortcuts */}
        <View style={styles.filterShortcutsContainer}>
          <TouchableOpacity 
            style={[
              styles.filterShortcutButton,
              tableFilter === 'user_feed_changes' && styles.activeFilterShortcut
            ]}
            onPress={() => setTableFilter(tableFilter === 'user_feed_changes' ? '' : 'user_feed_changes')}
          >
            <ThemedText style={styles.filterShortcutText}>Feed Changes</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterShortcutButton,
              tableFilter === 'user_interactions' && styles.activeFilterShortcut
            ]}
            onPress={() => setTableFilter(tableFilter === 'user_interactions' ? '' : 'user_interactions')}
          >
            <ThemedText style={styles.filterShortcutText}>Interactions</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.filterShortcutButton,
              tableFilter === 'user_weight_changes' && styles.activeFilterShortcut
            ]}
            onPress={() => setTableFilter(tableFilter === 'user_weight_changes' ? '' : 'user_weight_changes')}
          >
            <ThemedText style={styles.filterShortcutText}>Weight Changes</ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* Operations table */}
        <ThemedView style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <ThemedText style={[styles.headerCell, styles.timeCell]}>Time</ThemedText>
            <ThemedText style={[styles.headerCell, styles.directionCell]}>Direction</ThemedText>
            <ThemedText style={[styles.headerCell, styles.tableCell]}>Table</ThemedText>
            <ThemedText style={[styles.headerCell, styles.operationCell]}>Operation</ThemedText>
            <ThemedText style={[styles.headerCell, styles.recordsCell]}>Records</ThemedText>
            <ThemedText style={[styles.headerCell, styles.statusCell]}>Status</ThemedText>
            <ThemedText style={[styles.headerCell, styles.dataCell]}>Data</ThemedText>
          </View>
          
          <ScrollView style={styles.tableScrollView} nestedScrollEnabled={true}>
            {recordsToDisplay.map((operation, index) => (
              <React.Fragment key={`${operation.timestamp}-${index}`}>
                <TouchableOpacity 
                  style={styles.tableRow}
                  onPress={() => console.log('DB Operation Details:', operation)}
                >
                  <ThemedText style={[styles.cell, styles.timeCell]}>
                    {formatTimestamp(operation.timestamp)}
                  </ThemedText>
                  <ThemedText 
                    style={[
                      styles.cell, 
                      styles.directionCell, 
                      operation.direction === 'sent' ? styles.sentText : styles.receivedText
                    ]}
                  >
                    {operation.direction === 'sent' ? '↑' : '↓'} {operation.direction}
                  </ThemedText>
                  <ThemedText style={[styles.cell, styles.tableCell]}>
                    {operation.table}
                  </ThemedText>
                  <ThemedText style={[styles.cell, styles.operationCell]}>
                    {operation.operation}
                  </ThemedText>
                  <ThemedText style={[styles.cell, styles.recordsCell]}>
                    {operation.records}
                  </ThemedText>
                  <ThemedText 
                    style={[
                      styles.cell, 
                      styles.statusCell, 
                      operation.status === 'success' ? styles.successText : styles.errorText
                    ]}
                  >
                    {operation.status}
                  </ThemedText>
                  <TouchableOpacity 
                    style={styles.dataCell}
                    onPress={() => {
                      setExpandedData(prev => 
                        prev === `${operation.timestamp}-${index}` 
                          ? null 
                          : `${operation.timestamp}-${index}`
                      );
                    }}
                  >
                    <ThemedText style={styles.cell}>
                      {expandedData === `${operation.timestamp}-${index}` ? 'Hide' : 'View'}
                    </ThemedText>
                  </TouchableOpacity>
                </TouchableOpacity>
                {expandedData === `${operation.timestamp}-${index}` && (
                  <View style={styles.expandedDataContainer}>
                    <ScrollView style={styles.dataScrollView} horizontal={true}>
                      <ThemedText style={styles.dataText}>
                        {JSON.stringify(operation.data, null, 2)}
                      </ThemedText>
                    </ScrollView>
                  </View>
                )}
              </React.Fragment>
            ))}
            
            {filteredOperations.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyText}>
                  {tableFilter ? `No records found for table "${tableFilter}"` : 'No database operations logged yet'}
                </ThemedText>
              </View>
            )}
          </ScrollView>
          
          {/* Load more / Show all buttons */}
          {filteredOperations.length > visibleDbRecords && !showAllRecords && (
            <View style={styles.loadMoreContainer}>
              <TouchableOpacity 
                style={styles.loadMoreButton}
                onPress={() => setVisibleDbRecords(prev => prev + 100)}
              >
                <ThemedText style={styles.loadMoreText}>Load 100 More</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.showAllButton}
                onPress={() => setShowAllRecords(true)}
              >
                <ThemedText style={styles.showAllText}>Show All ({filteredOperations.length})</ThemedText>
              </TouchableOpacity>
            </View>
          )}
          
          {/* Show fewer button when showing all records */}
          {showAllRecords && filteredOperations.length > 100 && (
            <TouchableOpacity 
              style={styles.showFewerButton}
              onPress={() => {
                setShowAllRecords(false);
                setVisibleDbRecords(100);
              }}
            >
              <ThemedText style={styles.showFewerText}>Show Fewer (100)</ThemedText>
            </TouchableOpacity>
          )}
        </ThemedView>
      </ScrollView>
    );
  };
  
  // Add state for database debugging
  const [dbDebugResults, setDbDebugResults] = useState<any>(null);
  const [isFixingDb, setIsFixingDb] = useState<boolean>(false);

  // Add function to debug database
  const debugDatabase = async () => {
    if (user?.id) {
      try {
        console.log('InteractionTracker: Debugging database');
        const dbInfo = await getDatabaseInfo();
        setDbDebugResults(dbInfo);
        console.log('InteractionTracker: Database debug results:', dbInfo);
      } catch (error) {
        console.error('InteractionTracker: Error debugging database:', error);
      }
    }
  };
  
  // Add function to attempt database fix
  const fixDatabase = async () => {
    if (user?.id) {
      try {
        setIsFixingDb(true);
        console.log('InteractionTracker: Attempting to fix database');
        const fixResult = await attemptDatabaseFix(user.id);
        console.log('InteractionTracker: Database fix result:', fixResult);
        
        // Re-run debugger to see changes
        await debugDatabase();
        
        // Refresh weights from database
        await loadWeightsFromDB();
      } catch (error) {
        console.error('InteractionTracker: Error fixing database:', error);
      } finally {
        setIsFixingDb(false);
      }
    }
  };
  
  // Render the weights tab
  const renderWeightsTab = () => {
    return (
      <ScrollView style={styles.tabScrollView}>
        <ThemedView style={styles.statsCard}>
          <ThemedText style={styles.statsCardTitle}>Topic Weights Tracking</ThemedText>
          <ThemedText style={styles.statsSubtitle}>
            See how topic weights change as you interact with questions
          </ThemedText>
        </ThemedView>

        {/* Add Current Weights section */}
        <ThemedView style={styles.currentWeightsContainer}>
          <View style={styles.currentWeightsHeader}>
            <ThemedText style={styles.sectionTitle}>Current Weights from Database</ThemedText>
            <View style={{flexDirection: 'row'}}>
              <TouchableOpacity 
                style={[styles.refreshButton, {marginRight: 8}]}
                onPress={async () => {
                  if (!isLoadingWeights && user?.id) {
                    await loadWeightsFromDB();
                  }
                }}
                disabled={isLoadingWeights || !user?.id}
              >
                {isLoadingWeights ? (
                  <ThemedText style={styles.refreshingText}>Loading...</ThemedText>
                ) : (
                  <>
                    <Feather name="refresh-cw" size={16} color="rgba(255, 255, 255, 0.8)" />
                    <ThemedText style={styles.refreshText}>Refresh</ThemedText>
                  </>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.refreshButton, {backgroundColor: '#5b6ae8'}]}
                onPress={debugDatabase}
                disabled={!user?.id}
              >
                <Feather name="database" size={16} color="rgba(255, 255, 255, 0.8)" />
                <ThemedText style={styles.refreshText}>Debug DB</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
          
          {dbDebugResults && (
            <ThemedView style={styles.debugResultsContainer}>
              <View style={styles.debugResultsHeader}>
                <ThemedText style={styles.debugResultsTitle}>Database Debug Results</ThemedText>
                <TouchableOpacity
                  style={[styles.refreshButton, {backgroundColor: '#e85b5b'}]}
                  onPress={() => setDbDebugResults(null)}
                >
                  <Feather name="x" size={16} color="rgba(255, 255, 255, 0.8)" />
                  <ThemedText style={styles.refreshText}>Close</ThemedText>
                </TouchableOpacity>
              </View>
              
              <View style={styles.tableExistsContainer}>
                <ThemedText style={styles.debugSectionTitle}>Tables Exist:</ThemedText>
                {Object.entries(dbDebugResults.tablesExist || {}).map(([tableName, exists]) => (
                  <View key={tableName} style={styles.tableExistsRow}>
                    <ThemedText style={styles.tableNameText}>{tableName}:</ThemedText>
                    <ThemedText style={[
                      styles.tableExistsText, 
                      (exists ? styles.tableExistsTrue : styles.tableExistsFalse)
                    ]}>
                      {exists ? 'YES' : 'NO'}
                    </ThemedText>
                  </View>
                ))}
              </View>
              
              {dbDebugResults.error && (
                <View style={styles.debugDetailRow}>
                  <ThemedText style={styles.debugErrorText}>
                    Error: {dbDebugResults.error}
                  </ThemedText>
                </View>
              )}
              
              {/* Show column information for each table that exists */}
              {dbDebugResults.tableColumns && Object.keys(dbDebugResults.tableColumns).length > 0 && (
                <View>
                  <ThemedText style={styles.debugSectionTitle}>Table Structure:</ThemedText>
                  {Object.entries(dbDebugResults.tableColumns).map(([tableName, columns]) => (
                    <View key={`columns-${tableName}`} style={styles.columnInfoContainer}>
                      <ThemedText style={styles.columnInfoTitle}>{tableName}</ThemedText>
                      {Array.isArray(columns) && columns.map((column: any, index: number) => (
                        <View key={`column-${tableName}-${index}`} style={styles.columnRow}>
                          <ThemedText style={styles.columnName}>{column.column_name}</ThemedText>
                          <ThemedText style={styles.columnType}>
                            {column.data_type}{column.is_nullable === 'YES' ? ' (nullable)' : ''}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  ))}
                </View>
              )}
              
              {!Object.values(dbDebugResults.tablesExist || {}).some(Boolean) && (
                <TouchableOpacity
                  style={[
                    styles.refreshButton, 
                    {backgroundColor: '#4CAF50', alignSelf: 'center', marginTop: 12}
                  ]}
                  onPress={fixDatabase}
                  disabled={isFixingDb}
                >
                  {isFixingDb ? (
                    <ThemedText style={styles.refreshingText}>Fixing...</ThemedText>
                  ) : (
                    <>
                      <Feather name="tool" size={16} color="rgba(255, 255, 255, 0.8)" />
                      <ThemedText style={styles.refreshText}>Fix Missing Tables</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
              
              {isFixingDb && (
                <ThemedText style={styles.refreshProgressText}>
                  Creating missing tables and initializing data...
                </ThemedText>
              )}
              
              {/* Add additional debug information button */}
              <TouchableOpacity
                style={[
                  styles.refreshButton, 
                  {backgroundColor: '#5b6ae8', alignSelf: 'center', marginTop: 12}
                ]}
                onPress={debugDatabase}
                disabled={isFixingDb}
              >
                <Feather name="refresh-cw" size={16} color="rgba(255, 255, 255, 0.8)" />
                <ThemedText style={styles.refreshText}>Refresh Debug Info</ThemedText>
              </TouchableOpacity>
              
              {/* Add specific fix button for topics data */}
              {(dbDebugResults.tablesExist?.user_profile_data && 
                (!Object.keys(userProfile.topics || {}).length || userProfile.topics === null)) && (
                <TouchableOpacity
                  style={[
                    styles.refreshButton, 
                    {backgroundColor: '#f39c12', alignSelf: 'center', marginTop: 12}
                  ]}
                  onPress={() => fixDatabase()}
                  disabled={isFixingDb}
                >
                  {isFixingDb ? (
                    <ThemedText style={styles.refreshingText}>Initializing...</ThemedText>
                  ) : (
                    <>
                      <Feather name="database" size={16} color="rgba(255, 255, 255, 0.8)" />
                      <ThemedText style={styles.refreshText}>Initialize Topics Data</ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </ThemedView>
          )}
          
          {Object.keys(userProfile.topics || {}).length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No topic weights in user profile yet</ThemedText>
            </View>
          ) : (
            // Sort topics by weight descending
            Object.entries(userProfile.topics)
              .sort(([, topicA], [, topicB]) => topicB.weight - topicA.weight)
              .map(([topicName, topic]) => {
                // Calculate trend by looking at recent weight changes
                const topicTrend = getWeightTrend(topicName, 'topic');
                const topicPercentage = Math.round(topic.weight * 100);
                
                return (
                <View key={topicName} style={styles.topicWeightItem}>
                  <View style={styles.weightHeaderRow}>
                    <ThemedText style={styles.topicName}>{topicName}</ThemedText>
                    <View style={styles.weightValueContainer}>
                      <ThemedText style={styles.weightValue}>{topic.weight.toFixed(2)}</ThemedText>
                      {topicTrend !== 0 && (
                        <View style={styles.trendContainer}>
                          <Feather 
                            name={topicTrend > 0 ? "trending-up" : "trending-down"} 
                            size={16} 
                            color={topicTrend > 0 ? '#4CAF50' : '#F44336'} 
                          />
                        </View>
                      )}
                    </View>
                  </View>
                  
                  <View style={styles.weightInfoRow}>
                    <View style={styles.percentageContainer}>
                      <ThemedText style={styles.percentageText}>{topicPercentage}%</ThemedText>
                    </View>
                    <ThemedText style={styles.trendsText}>
                      {topicTrend > 0 ? `+${topicTrend.toFixed(2)} recently` : 
                       topicTrend < 0 ? `${topicTrend.toFixed(2)} recently` : 
                       'No recent changes'}
                    </ThemedText>
                  </View>
                  
                  {/* Sort subtopics by weight descending */}
                  {Object.entries(topic.subtopics)
                    .sort(([, subtopicA], [, subtopicB]) => subtopicB.weight - subtopicA.weight)
                    .map(([subtopicName, subtopic]) => {
                      // Calculate trend for subtopic
                      const subtopicTrend = getWeightTrend(subtopicName, 'subtopic', topicName);
                      const subtopicPercentage = Math.round(subtopic.weight * 100);
                      
                      return (
                      <View key={`${topicName}-${subtopicName}`} style={styles.subtopicWeightItem}>
                        <View style={styles.weightHeaderRow}>
                          <ThemedText style={styles.subtopicName}>{subtopicName}</ThemedText>
                          <View style={styles.weightValueContainer}>
                            <ThemedText style={styles.weightValue}>{subtopic.weight.toFixed(2)}</ThemedText>
                            {subtopicTrend !== 0 && (
                              <View style={styles.trendContainer}>
                                <Feather 
                                  name={subtopicTrend > 0 ? "trending-up" : "trending-down"} 
                                  size={14} 
                                  color={subtopicTrend > 0 ? '#4CAF50' : '#F44336'} 
                                />
                              </View>
                            )}
                          </View>
                        </View>
                        
                        <View style={styles.weightInfoRow}>
                          <View style={[styles.percentageContainer, styles.subtopicPercentage]}>
                            <ThemedText style={styles.percentageText}>{subtopicPercentage}%</ThemedText>
                          </View>
                          <ThemedText style={styles.trendsText}>
                            {subtopicTrend > 0 ? `+${subtopicTrend.toFixed(2)} recently` : 
                             subtopicTrend < 0 ? `${subtopicTrend.toFixed(2)} recently` : 
                             'No recent changes'}
                          </ThemedText>
                        </View>
                        
                        {/* Only show branches if there are more than just the default "General" branch */}
                        {Object.keys(subtopic.branches).length > 1 && 
                          // Sort branches by weight descending
                          Object.entries(subtopic.branches)
                            .sort(([, branchA], [, branchB]) => branchB.weight - branchA.weight)
                            .map(([branchName, branch]) => {
                              // Calculate trend for branch
                              const branchTrend = getWeightTrend(branchName, 'branch', topicName, subtopicName);
                              const branchPercentage = Math.round(branch.weight * 100);
                              
                              return (
                              <View key={`${topicName}-${subtopicName}-${branchName}`} style={styles.branchWeightItem}>
                                <View style={styles.weightHeaderRow}>
                                  <ThemedText style={styles.branchName}>{branchName}</ThemedText>
                                  <View style={styles.weightValueContainer}>
                                    <ThemedText style={styles.weightValue}>{branch.weight.toFixed(2)}</ThemedText>
                                    {branchTrend !== 0 && (
                                      <View style={styles.trendContainer}>
                                        <Feather 
                                          name={branchTrend > 0 ? "trending-up" : "trending-down"} 
                                          size={12} 
                                          color={branchTrend > 0 ? '#4CAF50' : '#F44336'} 
                                        />
                                      </View>
                                    )}
                                  </View>
                                </View>
                                
                                <View style={styles.weightInfoRow}>
                                  <View style={[styles.percentageContainer, styles.branchPercentage]}>
                                    <ThemedText style={styles.percentageText}>{branchPercentage}%</ThemedText>
                                  </View>
                                  <ThemedText style={styles.trendsText}>
                                    {branchTrend > 0 ? `+${branchTrend.toFixed(2)} recently` : 
                                     branchTrend < 0 ? `${branchTrend.toFixed(2)} recently` : 
                                     'No recent changes'}
                                  </ThemedText>
                                </View>
                              </View>
                            );
                          })
                        }
                      </View>
                    );
                  })}
                </View>
              );
            })
          )}
          
          <ThemedText style={styles.lastUpdatedText}>
            {lastWeightUpdateTime > 0 ? (
              <>
                <Feather name="database" size={12} color="rgba(255, 255, 255, 0.5)" style={{marginRight: 4}} />
                Last pulled from DB: {new Date(lastWeightUpdateTime).toLocaleString()}
              </>
            ) : user?.id ? (
              "Weights not yet synced with database"
            ) : (
              "Sign in to sync weights with database"
            )}
          </ThemedText>
        </ThemedView>
        
        <ThemedText style={styles.sectionTitle}>Weight Change History</ThemedText>
        
        <ThemedView style={styles.weightChangesContainer}>
          {weightChanges.length === 0 ? (
            <View style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>No weight changes recorded yet</ThemedText>
            </View>
          ) : (
            weightChanges.slice().reverse().map((change, index) => (
              <View key={index} style={styles.weightChangeItem}>
                <View style={styles.weightChangeHeader}>
                  <ThemedText style={styles.weightChangeCategory}>
                    {change.category} {change.subtopic ? `> ${change.subtopic}` : ''}
                    {change.branch ? `> ${change.branch}` : ''}
                  </ThemedText>
                  <View style={styles.weightChangeInfo}>
                    <ThemedText style={[
                      styles.weightChangeType, 
                      change.interactionType === 'correct' ? styles.correctText : 
                      change.interactionType === 'incorrect' ? styles.incorrectText : 
                      styles.skippedText
                    ]}>
                      {change.interactionType.toUpperCase()}
                    </ThemedText>
                    <ThemedText style={styles.weightChangeTime}>
                      {new Date(change.timestamp).toLocaleTimeString()}
                    </ThemedText>
                  </View>
                </View>
                
                <ThemedText style={styles.weightChangeQuestion}>
                  {change.questionText || `Question ${change.questionId.substring(0, 8)}...`}
                </ThemedText>
                
                <View style={styles.weightTable}>
                  <View style={styles.weightTableHeader}>
                    <ThemedText style={[styles.weightTableCell, styles.weightTableHeaderText]}>Weight Type</ThemedText>
                    <ThemedText style={[styles.weightTableCell, styles.weightTableHeaderText]}>Before</ThemedText>
                    <ThemedText style={[styles.weightTableCell, styles.weightTableHeaderText]}>After</ThemedText>
                    <ThemedText style={[styles.weightTableCell, styles.weightTableHeaderText]}>Change</ThemedText>
                  </View>
                  
                  <View style={styles.weightTableRow}>
                    <ThemedText style={styles.weightTableCell}>Topic</ThemedText>
                    <ThemedText style={styles.weightTableCell}>
                      {change.oldWeights.topicWeight.toFixed(2)}
                    </ThemedText>
                    <ThemedText style={styles.weightTableCell}>
                      {change.newWeights.topicWeight.toFixed(2)}
                    </ThemedText>
                    <ThemedText 
                      style={[
                        styles.weightTableCell, 
                        change.newWeights.topicWeight > change.oldWeights.topicWeight 
                          ? styles.weightIncreaseText 
                          : styles.weightDecreaseText
                      ]}
                    >
                      {(change.newWeights.topicWeight - change.oldWeights.topicWeight) > 0 ? '+' : ''}
                      {(change.newWeights.topicWeight - change.oldWeights.topicWeight).toFixed(2)}
                    </ThemedText>
                  </View>
                  
                  {change.oldWeights.subtopicWeight !== undefined && 
                   change.newWeights.subtopicWeight !== undefined && (
                    <View style={styles.weightTableRow}>
                      <ThemedText style={styles.weightTableCell}>Subtopic</ThemedText>
                      <ThemedText style={styles.weightTableCell}>
                        {change.oldWeights.subtopicWeight.toFixed(2)}
                      </ThemedText>
                      <ThemedText style={styles.weightTableCell}>
                        {change.newWeights.subtopicWeight.toFixed(2)}
                      </ThemedText>
                      <ThemedText 
                        style={[
                          styles.weightTableCell, 
                          change.newWeights.subtopicWeight > change.oldWeights.subtopicWeight 
                            ? styles.weightIncreaseText 
                            : styles.weightDecreaseText
                        ]}
                      >
                        {(change.newWeights.subtopicWeight - change.oldWeights.subtopicWeight) > 0 ? '+' : ''}
                        {(change.newWeights.subtopicWeight - change.oldWeights.subtopicWeight).toFixed(2)}
                      </ThemedText>
                    </View>
                  )}
                  
                  {change.oldWeights.branchWeight !== undefined && 
                   change.newWeights.branchWeight !== undefined && (
                    <View style={styles.weightTableRow}>
                      <ThemedText style={styles.weightTableCell}>Branch</ThemedText>
                      <ThemedText style={styles.weightTableCell}>
                        {change.oldWeights.branchWeight.toFixed(2)}
                      </ThemedText>
                      <ThemedText style={styles.weightTableCell}>
                        {change.newWeights.branchWeight.toFixed(2)}
                      </ThemedText>
                      <ThemedText 
                        style={[
                          styles.weightTableCell, 
                          change.newWeights.branchWeight > change.oldWeights.branchWeight 
                            ? styles.weightIncreaseText 
                            : styles.weightDecreaseText
                        ]}
                      >
                        {(change.newWeights.branchWeight - change.oldWeights.branchWeight) > 0 ? '+' : ''}
                        {(change.newWeights.branchWeight - change.oldWeights.branchWeight).toFixed(2)}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </ThemedView>
      </ScrollView>
    );
  };
  
  // Helper function to format timestamp
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return `${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}.${date.getMilliseconds()}`;
  };
  
  if (!visible) {
    return (
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={() => setVisible(true)}
      >
        <Feather name="activity" size={24} color="white" />
      </TouchableOpacity>
    );
  }
  
  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle">What This</ThemedText>
        <TouchableOpacity onPress={() => setVisible(false)}>
          <Feather name="x" size={24} color="#FF5C5C" />
        </TouchableOpacity>
      </View>
      
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'interactions' && styles.activeTab]} 
          onPress={() => setActiveTab('interactions')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'interactions' && styles.activeTabText]}>
            Interactions
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feed' && styles.activeTab]} 
          onPress={() => setActiveTab('feed')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'feed' && styles.activeTabText]}>
            Feed Status
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feedList' && styles.activeTab]} 
          onPress={() => setActiveTab('feedList')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'feedList' && styles.activeTabText]}>
            Feed List
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dbLog' && styles.activeTab]} 
          onPress={() => setActiveTab('dbLog')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'dbLog' && styles.activeTabText]}>
            DB Log
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'weights' && styles.activeTab]} 
          onPress={() => setActiveTab('weights')}
        >
          <ThemedText style={[styles.tabText, activeTab === 'weights' && styles.activeTabText]}>
            Weights
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'interactions' ? renderInteractionsTab() : 
       activeTab === 'feed' ? renderFeedStatusTab() : 
       activeTab === 'feedList' ? renderFeedListTab() : 
       activeTab === 'dbLog' ? renderDbLogTab() :
       renderWeightsTab()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    right: 10,
    width: '95%',
    maxWidth: 500,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 10,
    padding: 10,
    maxHeight: '80%',
    zIndex: 1000,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabs: {
    flexDirection: 'row',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    color: 'white',
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  toggleButton: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  interactionRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  feedRow: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  explanations: {
    marginTop: 5,
    paddingLeft: 10,
  },
  explanationText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    marginBottom: 2,
  },
  correctText: {
    color: '#2ecc71',
  },
  incorrectText: {
    color: '#e74c3c',
  },
  skippedText: {
    color: '#f39c12',
  },
  itemId: {
    color: 'white',
    fontWeight: 'bold',
    marginBottom: 2,
  },
  questionText: {
    color: 'white',
    marginBottom: 5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  infoLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    width: 80,
  },
  infoValue: {
    color: 'white',
    fontSize: 12,
    flex: 1,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 10,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 5,
    marginBottom: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
  },
  // Table styles for database log
  tableContainer: {
    marginBottom: 10,
    borderRadius: 5,
    overflow: 'hidden',
    maxHeight: 2000, // Remove any height constraint
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  headerCell: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 5,
  },
  cell: {
    color: 'white',
    fontSize: 11,
  },
  timeCell: {
    width: 80,
  },
  directionCell: {
    width: 70,
    textAlign: 'center',
  },
  tableCell: {
    width: 100,
  },
  operationCell: {
    width: 70,
  },
  recordsCell: {
    width: 50,
    textAlign: 'center',
  },
  statusCell: {
    flex: 1,
    textAlign: 'center',
  },
  sentText: {
    color: '#f39c12', // Orange for sent
  },
  receivedText: {
    color: '#3498db', // Blue for received
  },
  successText: {
    color: '#2ecc71', // Green for success
  },
  errorText: {
    color: '#e74c3c', // Red for error
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginVertical: 5,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0A7EA4',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  interactionsContainer: {
    marginBottom: 20,
  },
  logItem: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
  },
  correctLog: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  incorrectLog: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#F44336',
  },
  skippedLog: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  logType: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  logTime: {
    fontSize: 12,
    opacity: 0.7,
  },
  profileChangesContainer: {
    marginBottom: 20,
  },
  profileChangeItem: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#0A7EA4',
  },
  changeText: {
    fontSize: 14,
    marginBottom: 4,
  },
  feedListContainer: {
    marginBottom: 20,
  },
  feedChangesContainer: {
    marginBottom: 20,
  },
  feedChangeItem: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#0A7EA4',
  },
  explanationContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.2)',
  },
  explanationHeader: {
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 12,
    color: '#0A7EA4',
  },
  weightFactorsContainer: {
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    padding: 10,
    borderRadius: 8,
    marginTop: 8,
  },
  weightFactorText: {
    fontSize: 12,
    marginBottom: 4,
    color: '#444',
  },
  weightValue: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  allFeedItemsContainer: {
    marginBottom: 20,
  },
  feedItem: {
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#0A7EA4',
  },
  feedItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  feedItemNumber: {
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedItemCategory: {
    fontSize: 12,
  },
  feedItemText: {
    fontSize: 14,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tag: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    marginRight: 4,
  },
  tagText: {
    fontSize: 12,
  },
  explanationButton: {
    marginTop: 8,
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 126, 164, 0.15)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.3)',
  },
  explanationButtonText: {
    color: '#0A7EA4',
    fontWeight: 'bold',
    fontSize: 12,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(10, 126, 164, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 126, 164, 0.5)',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  refreshingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginLeft: 4,
  },
  statusSection: {
    marginBottom: 16,
  },
  statusLabel: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
  },
  statusSubtext: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  coldStartProgress: {
    backgroundColor: '#FF9800',
  },
  personalizedProgress: {
    backgroundColor: '#4CAF50',
  },
  interestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  interestName: {
    width: 90,
    fontSize: 13,
  },
  interestBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 4,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  interestFill: {
    height: '100%',
    backgroundColor: '#0A7EA4',
    borderRadius: 4,
  },
  interestScore: {
    width: 30,
    fontSize: 12,
    textAlign: 'right',
  },
  preferenceItem: {
    flexDirection: 'row',
    marginVertical: 4,
  },
  preferenceName: {
    width: 90,
    fontSize: 13,
  },
  preferenceValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  statsCard: {
    margin: 10,
    padding: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(10, 126, 164, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statsCardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  statsSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  detailedStats: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  detailedStatsTitle: {
    color: 'white',
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  detailedStatsContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  detailedStatItem: {
    flexDirection: 'row',
    width: '50%',
    marginBottom: 3,
  },
  detailedStatLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 11,
    marginRight: 5,
  },
  detailedStatValue: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dataCell: {
    width: 60,
    alignItems: 'center',
  },
  expandedDataContainer: {
    padding: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dataScrollView: {
    maxHeight: 200,
  },
  dataText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabScrollView: {
    flex: 1,
  },
  logQuestion: {
    fontSize: 14,
    marginBottom: 4,
  },
  logTimeSpent: {
    fontSize: 12,
    opacity: 0.7,
  },
  feedStatusContainer: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginVertical: 10,
  },
  weightChangesContainer: {
    marginTop: 10,
    marginBottom: 15,
  },
  weightChangeItem: {
    marginBottom: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderLeftWidth: 3,
    borderLeftColor: '#0A7EA4',
    borderWidth: 1,
    borderTopColor: 'transparent',
    borderRightColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  weightChangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weightChangeCategory: {
    fontWeight: 'bold',
    fontSize: 14,
    color: 'white',
  },
  weightChangeInfo: {
    flexDirection: 'row',
  },
  weightChangeType: {
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 8,
  },
  weightChangeTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  weightChangeQuestion: {
    fontSize: 13,
    marginBottom: 10,
    fontStyle: 'italic',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  weightTable: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weightTableHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  weightTableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  weightTableCell: {
    padding: 6,
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  weightTableHeaderText: {
    fontWeight: 'bold',
    color: 'white',
  },
  weightIncreaseText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  weightDecreaseText: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  currentWeightsContainer: {
    marginVertical: 15,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
    color: 'white',
  },
  topicWeightItem: {
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
    paddingLeft: 10,
  },
  topicName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  subtopicWeightItem: {
    marginLeft: 15,
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#2196F3',
    paddingLeft: 10,
  },
  subtopicName: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 3,
  },
  branchWeightItem: {
    marginLeft: 15,
    marginBottom: 4,
    paddingLeft: 10,
  },
  branchName: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginTop: 10,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  weightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  weightValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weightInfoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  percentageContainer: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginRight: 8,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: 'white',
  },
  trendsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  subtopicPercentage: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginRight: 8,
  },
  branchPercentage: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginRight: 8,
  },
  trendContainer: {
    marginLeft: 8,
  },
  currentWeightsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  debugResultsContainer: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  debugResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  debugResultsTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tableExistsContainer: {
    marginBottom: 10,
  },
  tableExistsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tableNameText: {
    color: 'white',
    fontSize: 12,
  },
  tableExistsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tableExistsTrue: {
    color: '#4CAF50',
  },
  tableExistsFalse: {
    color: '#F44336',
  },
  debugSectionTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  debugDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 10,
  },
  debugDetailText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  debugErrorText: {
    fontSize: 12,
    color: '#ff6b6b',
  },
  debugSuccessText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  debugInfoMessage: {
    fontSize: 13,
    color: '#5b6ae8',
    margin: 10,
    textAlign: 'center',
  },
  columnInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 6,
  },
  columnInfoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 6,
  },
  columnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  columnName: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  columnType: {
    fontSize: 12,
    color: '#f1c40f',
  },
  refreshProgressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    fontStyle: 'italic',
    alignSelf: 'center',
    margin: 8,
  },
  tableScrollView: {
    maxHeight: 500, // Allow the table to scroll with a reasonable height 
  },
  recordsInfo: {
    padding: 8,
    marginBottom: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 5,
    alignItems: 'center',
  },
  recordsInfoText: {
    fontSize: 12,
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadMoreButton: {
    padding: 8,
    backgroundColor: '#0A7EA4',
    borderRadius: 4,
    flex: 1,
    marginRight: 4,
    alignItems: 'center',
  },
  loadMoreText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  showAllButton: {
    padding: 8,
    backgroundColor: '#555',
    borderRadius: 4,
    flex: 1,
    marginLeft: 4,
    alignItems: 'center',
  },
  showAllText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  showFewerButton: {
    padding: 10,
    backgroundColor: '#555',
    borderRadius: 4,
    marginVertical: 8,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  showFewerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  selectedTableFilter: {
    backgroundColor: 'rgba(10, 126, 164, 0.3)',
    borderRadius: 4,
    padding: 2,
  },
  selectedTableFilterText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  clearFilterButton: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 87, 87, 0.3)',
    borderRadius: 4,
  },
  clearFilterText: {
    fontSize: 11,
    color: '#ff5757',
  },
  filterShortcutsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  filterShortcutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(30, 30, 30, 0.5)',
    borderRadius: 4,
  },
  activeFilterShortcut: {
    backgroundColor: 'rgba(10, 126, 164, 0.5)',
  },
  filterShortcutText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.9)',
  },
}); 