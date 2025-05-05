import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAppSelector } from '../store/hooks';
import { Feather } from '@expo/vector-icons';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeedItem } from '../lib/triviaService';

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
  const [activeTab, setActiveTab] = useState<'interactions' | 'feed' | 'feedList'>('interactions');
  const [expandedExplanations, setExpandedExplanations] = useState<{[id: string]: boolean}>({});
  const [summary, setSummary] = useState({
    correct: 0,
    incorrect: 0,
    skipped: 0,
    totalTime: 0,
    avgTime: 0,
  });
  
  // Get state from Redux store
  const questions = useAppSelector(state => state.trivia.questions);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);
  const feedExplanations = useAppSelector(state => state.trivia.feedExplanations);
  
  // Store previous profile and feed to track changes
  const prevProfileRef = useRef(userProfile);
  const prevFeedRef = useRef<string[]>([]);
  
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
      </View>
      
      {activeTab === 'interactions' ? renderInteractionsTab() : 
       activeTab === 'feed' ? renderFeedStatusTab() : 
       renderFeedListTab()}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: 10,
    width: 300,
    maxHeight: 500,
    borderRadius: 12,
    padding: 16,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#0A7EA4',
  },
  tabText: {
    fontSize: 12,
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
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
  },
  logContainer: {
    maxHeight: 200,
  },
  tabScrollView: {
    flex: 1,
    height: 350, // Fixed height to ensure proper scrolling
  },
  profileChangesContainer: {
    marginBottom: 20, // Add bottom margin to ensure space at the end
  },
  interactionsContainer: {
    marginBottom: 20, // Add bottom margin to ensure space at the end
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
  logQuestion: {
    fontSize: 14,
    marginBottom: 4,
  },
  logTimeSpent: {
    fontSize: 12,
    opacity: 0.7,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 20,
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
  // Feed status styles
  feedStatusContainer: {
    marginBottom: 12,
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
  explanationText: {
    marginBottom: 4,
    fontSize: 12,
    paddingLeft: 4,
  },
  sectionHeader: {
    fontWeight: 'bold',
    marginBottom: 12,
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
    padding: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(10, 126, 164, 0.1)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
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
    color: '#0A7EA4',
  },
}); 