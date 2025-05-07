import { FeedItem } from './triviaService';
import { UserProfile } from './personalizationService';

// Define types for categorizing questions
type Category = string;
type Subtopic = string;
type Branch = string;

// Track question selection for the cold start phases
interface ColdStartState {
  phase: 1 | 2 | 3 | 4;
  questionsShown: number;
  topicsShown: Set<string>; // Category names
  shownQuestionIds: Set<string>; // Question IDs that have been shown already
  subtopicsShown: Map<Category, Set<Subtopic>>;
  correctlyAnsweredTopics: Map<Category, number>;
  correctlyAnsweredSubtopics: Map<string, number>; // format: "category/subtopic"
  answeredQuickly: Map<string, number>; // format: "category/subtopic"
  preferredTopics: string[];
  skippedTopics: Map<Category, number>;
}

// Initialize cold start state
function initColdStartState(): ColdStartState {
  return {
    phase: 1,
    questionsShown: 0,
    topicsShown: new Set(),
    shownQuestionIds: new Set(),
    subtopicsShown: new Map(),
    correctlyAnsweredTopics: new Map(),
    correctlyAnsweredSubtopics: new Map(),
    answeredQuickly: new Map(),
    preferredTopics: [],
    skippedTopics: new Map()
  };
}

// Group questions by category and subtopic
function groupQuestionsByTopic(allQuestions: FeedItem[]): Map<Category, Map<Subtopic, FeedItem[]>> {
  const groupedQuestions = new Map<Category, Map<Subtopic, FeedItem[]>>();

  allQuestions.forEach(question => {
    const category = question.category;
    const subtopic = question.tags?.[0] || 'General';
    
    if (!groupedQuestions.has(category)) {
      groupedQuestions.set(category, new Map<Subtopic, FeedItem[]>());
    }
    
    const categoryMap = groupedQuestions.get(category)!;
    
    if (!categoryMap.has(subtopic)) {
      categoryMap.set(subtopic, []);
    }
    
    categoryMap.get(subtopic)!.push(question);
  });

  return groupedQuestions;
}

// Get high-interest topics for Phase 1
function getHighInterestTopics(): string[] {
  return ['Pop Culture', 'Science', 'General Knowledge'];
}

// Select questions for Phase 1: Seeding (Questions 1-3)
function getPhase1Questions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  console.log("Getting Phase 1 questions");
  
  // We want to cover different core topics across categories
  const questionsToUse = allQuestions.filter(q => !state.shownQuestionIds.has(q.id));
  
  // Minimum one question from each category for diversity
  // Check if groupedQuestions is actually a Map object
  let categories: string[];
  if (groupedQuestions instanceof Map) {
    categories = Array.from(groupedQuestions.keys());
  } else {
    // Handle the case where groupedQuestions might be a plain object
    console.error("groupedQuestions is not a Map instance", groupedQuestions);
    categories = Object.keys(groupedQuestions as any);
  }
  const selectedQuestions: FeedItem[] = [];
  
  // Try to get one question from each major category first
  for (const category of categories) {
    if (selectedQuestions.length >= 5) break;
    
    // Also check before using Map methods on groupedQuestions
    const topicMap = groupedQuestions instanceof Map 
      ? groupedQuestions.get(category)
      : (groupedQuestions as any)[category];
      
    if (!topicMap) continue;
    
    const allSubtopicQuestions = topicMap instanceof Map
      ? Array.from(topicMap.values()).flat()
      : Object.values(topicMap).flat();
      
    const filteredQuestions = allSubtopicQuestions
      .filter(q => !state.shownQuestionIds.has(q.id))
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id));
    
    if (filteredQuestions.length > 0) {
      const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
      selectedQuestions.push(question);
      state.shownQuestionIds.add(question.id);
    }
  }
  
  // Fill remaining slots with random questions
  while (selectedQuestions.length < 5 && questionsToUse.length > selectedQuestions.length) {
    const remainingQuestions = questionsToUse.filter(q => !selectedQuestions.some(sq => sq.id === q.id));
    if (remainingQuestions.length === 0) break;
    
    const randomQuestion = remainingQuestions[Math.floor(Math.random() * remainingQuestions.length)];
    selectedQuestions.push(randomQuestion);
    state.shownQuestionIds.add(randomQuestion.id);
  }
  
  return selectedQuestions;
}

// Select questions for Phase 2: Initial Branching (Questions 4-12)
function getPhase2Questions(
  allQuestions: FeedItem[], 
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  console.log("Getting Phase 2 questions");
  
  const questionsToUse = allQuestions.filter(q => !state.shownQuestionIds.has(q.id));
  
  // Get 2 questions from preferred topics based on Phase 1 answers
    const preferredQuestions = getPreferredTopicQuestions(
    questionsToUse, 
      groupedQuestions, 
      state,
      userProfile,
    2
  );
  
  // Get 3 questions from a mix of other topics
  const remainingQuestions = questionsToUse
    .filter(q => !preferredQuestions.some(pq => pq.id === q.id));
  
  const randomQuestions: FeedItem[] = [];
  while (randomQuestions.length < 3 && remainingQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    randomQuestions.push(remainingQuestions[randomIndex]);
    state.shownQuestionIds.add(remainingQuestions[randomIndex].id);
    remainingQuestions.splice(randomIndex, 1);
  }
  
  // Mark selected questions as shown
  preferredQuestions.forEach(q => state.shownQuestionIds.add(q.id));
  
  return [...preferredQuestions, ...randomQuestions];
}

// Select questions for Phase 3: Adaptive Personalization (Questions 13-20)
function getPhase3Questions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  console.log("Getting Phase 3 questions");
  
  const questionsToUse = allQuestions.filter(q => !state.shownQuestionIds.has(q.id));
  
  // Get 3 questions from preferred topics
    const preferredQuestions = getPreferredTopicQuestions(
    questionsToUse,
      groupedQuestions,
      state,
      userProfile,
    3
  );
  
  // Get 2 questions from topics that haven't been shown yet
  // Check if groupedQuestions is actually a Map object
  let availableCategories: string[];
  if (groupedQuestions instanceof Map) {
    availableCategories = Array.from(groupedQuestions.keys());
  } else {
    console.error("groupedQuestions is not a Map instance in getPhase3Questions", groupedQuestions);
    availableCategories = Object.keys(groupedQuestions as any);
  }
  
  const unusedCategories = availableCategories.filter(
    category => !Array.from(state.shownQuestionIds).some(id => {
      const question = allQuestions.find(q => q.id === id);
      return question && question.category === category;
    })
  );
  
  const diversityQuestions: FeedItem[] = [];
  if (unusedCategories.length > 0) {
    for (const category of unusedCategories) {
      if (diversityQuestions.length >= 2) break;
      
      // Also check before using Map methods on groupedQuestions
      const topicMap = groupedQuestions instanceof Map 
        ? groupedQuestions.get(category)
        : (groupedQuestions as any)[category];
        
      if (!topicMap) continue;
      
      const allSubtopicQuestions = topicMap instanceof Map
        ? Array.from(topicMap.values()).flat()
        : Object.values(topicMap).flat();
        
      const filteredQuestions = allSubtopicQuestions
        .filter(q => !state.shownQuestionIds.has(q.id))
        .filter(q => !preferredQuestions.some(pq => pq.id === q.id));
      
      if (filteredQuestions.length > 0) {
        const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
        diversityQuestions.push(question);
        state.shownQuestionIds.add(question.id);
      }
    }
  }
  
  // If we still need more questions, get random ones
  const remainingQuestions = questionsToUse
    .filter(q => !preferredQuestions.some(pq => pq.id === q.id))
    .filter(q => !diversityQuestions.some(dq => dq.id === q.id));
  
  while (diversityQuestions.length < 2 && remainingQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    diversityQuestions.push(remainingQuestions[randomIndex]);
    state.shownQuestionIds.add(remainingQuestions[randomIndex].id);
    remainingQuestions.splice(randomIndex, 1);
  }
  
  // Mark selected questions as shown
  preferredQuestions.forEach(q => state.shownQuestionIds.add(q.id));
  
  return [...preferredQuestions, ...diversityQuestions];
}

// Select questions for Phase 4: Steady State (Questions 21+)
function getPhase4Questions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  console.log("Getting Phase 4 questions");
  
  const questionsToUse = allQuestions.filter((q: FeedItem) => !state.shownQuestionIds.has(q.id));
  
  // Get 4 questions from preferred topics
  const preferredQuestions = getPreferredTopicQuestions(
    questionsToUse,
    groupedQuestions,
    state,
    userProfile,
    4
  );
  
  // Get 1 exploration question (from a topic not yet shown or from a random topic)
  const remainingQuestions = questionsToUse
    .filter((q: FeedItem) => !preferredQuestions.some(pq => pq.id === q.id));
  
  let explorationQuestion: FeedItem | null = null;
  
  // Try to find a question from an unused subtopic in a preferred category
  const preferredTopics = getPreferredTopics(state, userProfile);
  for (const topic of preferredTopics) {
    if (explorationQuestion) break;
    
    // Check if groupedQuestions is a Map
    if (groupedQuestions instanceof Map && groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      
      // Find subtopics that haven't been shown yet - handle both Map and Object
      if (topicMap instanceof Map) {
        for (const [subtopic, questions] of topicMap.entries()) {
          const subtopicShown = Array.from(state.shownQuestionIds).some(id => {
            const question = allQuestions.find(q => q.id === id);
            return question && question.category === topic && question.tags?.[0] === subtopic;
          });
          
          if (!subtopicShown) {
            const filteredQuestions = questions
              .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id))
              .filter((q: FeedItem) => !preferredQuestions.some(pq => pq.id === q.id));
            
            if (filteredQuestions.length > 0) {
              explorationQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
              break;
            }
          }
        }
      } else if (typeof topicMap === 'object' && topicMap !== null) {
        // Handle the case where topicMap is an object
        for (const subtopic of Object.keys(topicMap)) {
          const questions = topicMap[subtopic];
          
          const subtopicShown = Array.from(state.shownQuestionIds).some(id => {
            const question = allQuestions.find(q => q.id === id);
            return question && question.category === topic && question.tags?.[0] === subtopic;
          });
          
          if (!subtopicShown && Array.isArray(questions)) {
            const filteredQuestions = questions
              .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id))
              .filter((q: FeedItem) => !preferredQuestions.some(pq => pq.id === q.id));
            
            if (filteredQuestions.length > 0) {
              explorationQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
              break;
            }
          }
        }
      }
    } else if (typeof groupedQuestions === 'object' && groupedQuestions !== null && topic in groupedQuestions) {
      // Handle the case where groupedQuestions is an object
      const topicMap = (groupedQuestions as any)[topic];
      
      if (typeof topicMap === 'object' && topicMap !== null) {
        for (const subtopic of Object.keys(topicMap)) {
          const questions = topicMap[subtopic];
          
          const subtopicShown = Array.from(state.shownQuestionIds).some(id => {
            const question = allQuestions.find(q => q.id === id);
            return question && question.category === topic && question.tags?.[0] === subtopic;
          });
          
          if (!subtopicShown && Array.isArray(questions)) {
            const filteredQuestions = questions
              .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id))
              .filter((q: FeedItem) => !preferredQuestions.some(pq => pq.id === q.id));
            
            if (filteredQuestions.length > 0) {
              explorationQuestion = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
              break;
            }
          }
        }
      }
    }
  }
  
  // If we couldn't find an exploration question from preferred categories,
  // just pick a random question
  if (!explorationQuestion && remainingQuestions.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
    explorationQuestion = remainingQuestions[randomIndex];
  }
  
  // Mark selected questions as shown
  preferredQuestions.forEach((q: FeedItem) => state.shownQuestionIds.add(q.id));
  if (explorationQuestion) {
    state.shownQuestionIds.add(explorationQuestion.id);
  }
  
  return [...preferredQuestions, ...(explorationQuestion ? [explorationQuestion] : [])];
}

// Helper function to get questions from preferred topics
function getPreferredTopicQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>> | Record<string, any>,
  state: ColdStartState,
  userProfile: UserProfile,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  const preferredTopics = getPreferredTopics(state, userProfile);
  
  // First try to get questions answered correctly and quickly
  for (const topicKey of state.answeredQuickly.keys()) {
    if (selectedQuestions.length >= count) break;
    
    const [category, subtopic] = topicKey.split('/');
    
    // Check if we're dealing with a Map or an object
    if (groupedQuestions instanceof Map) {
      if (groupedQuestions.has(category)) {
        const topicMap = groupedQuestions.get(category)!;
        if (topicMap instanceof Map && topicMap.has(subtopic)) {
          const questions = topicMap.get(subtopic)!
            .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id)); // Avoid showing the same question twice
      
      if (questions.length > 0) {
        const question = questions[Math.floor(Math.random() * questions.length)];
        selectedQuestions.push(question);
          }
        }
      }
    } else if (typeof groupedQuestions === 'object' && groupedQuestions !== null) {
      // Handle object format
      if (category in groupedQuestions) {
        const topicMap = (groupedQuestions as any)[category];
        if (typeof topicMap === 'object' && topicMap !== null && subtopic in topicMap) {
          const questions = topicMap[subtopic];
          if (Array.isArray(questions)) {
            const filteredQuestions = questions.filter((q: FeedItem) => !state.shownQuestionIds.has(q.id));
            if (filteredQuestions.length > 0) {
              const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
              selectedQuestions.push(question);
            }
          }
        }
      }
    }
  }
  
  // Then get questions from topics answered correctly
  for (const topic of preferredTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions instanceof Map && groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      
      if (topicMap instanceof Map) {
      const allSubtopicQuestions = Array.from(topicMap.values()).flat()
          .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id)) // Avoid showing the same question twice
          .filter((q: FeedItem) => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
        }
      }
    } else if (typeof groupedQuestions === 'object' && groupedQuestions !== null && topic in groupedQuestions) {
      // Handle object format
      const topicMap = (groupedQuestions as any)[topic];
      
      if (typeof topicMap === 'object' && topicMap !== null) {
        const allSubtopicQuestions: FeedItem[] = [];
        
        // Collect all questions from all subtopics
        for (const subtopic in topicMap) {
          const questions = topicMap[subtopic];
          if (Array.isArray(questions)) {
            allSubtopicQuestions.push(...questions);
          }
        }
        
        // Filter out questions that have already been shown or selected
        const filteredQuestions = allSubtopicQuestions
          .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id))
          .filter((q: FeedItem) => !selectedQuestions.some(sq => sq.id === q.id));
        
        if (filteredQuestions.length > 0) {
          const question = filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
          selectedQuestions.push(question);
        }
      }
    }
  }
  
  // If we still need more, get random questions from any topic
  if (selectedQuestions.length < count) {
    const remainingQuestions = allQuestions
      .filter((q: FeedItem) => !state.shownQuestionIds.has(q.id)) // Avoid showing the same question twice
      .filter((q: FeedItem) => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    while (selectedQuestions.length < count && remainingQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      selectedQuestions.push(remainingQuestions[randomIndex]);
      remainingQuestions.splice(randomIndex, 1);
    }
  }
  
  return selectedQuestions;
}

// Helper function to get questions from unexplored topics
function getUnexploredTopicQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  
  // Find topics not yet shown
  const unseenTopics = Array.from(groupedQuestions.keys())
    .filter(topic => !state.topicsShown.has(topic));
  
  // Also consider topics shown but skipped or answered incorrectly
  const unsuccessfulTopics = Array.from(state.skippedTopics.keys());
  
  // Prioritize completely unseen topics
  const candidateTopics = [...unseenTopics, ...unsuccessfulTopics];
  
  for (const topic of candidateTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      const allSubtopicQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.shownQuestionIds.has(q.id)); // Use shownQuestionIds for filtering
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we still need more, get random questions from any topic
  if (selectedQuestions.length < count) {
    const remainingQuestions = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    while (selectedQuestions.length < count && remainingQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      selectedQuestions.push(remainingQuestions[randomIndex]);
      remainingQuestions.splice(randomIndex, 1);
    }
  }
  
  return selectedQuestions;
}

// Helper function to get questions from familiar but lower-ranked topics
function getLowerRankedTopicQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  const preferredTopics = getPreferredTopics(state, userProfile);
  
  // Get topics that have been shown but aren't in the top preferred list
  const lowerRankedTopics = Array.from(state.topicsShown)
    .filter(topic => !preferredTopics.includes(topic));
  
  for (const topic of lowerRankedTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      const allSubtopicQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.shownQuestionIds.has(q.id)); // Use shownQuestionIds for filtering
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we still need more, get random questions that aren't from preferred topics
  if (selectedQuestions.length < count) {
    const nonPreferredQuestions = allQuestions
      .filter(q => !preferredTopics.includes(q.category))
      .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    while (selectedQuestions.length < count && nonPreferredQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * nonPreferredQuestions.length);
      selectedQuestions.push(nonPreferredQuestions[randomIndex]);
      nonPreferredQuestions.splice(randomIndex, 1);
    }
  }
  
  return selectedQuestions;
}

// Helper function to get questions from new or less-sampled topics
function getNewOrLessSampledTopicQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  
  // Get topics that haven't been shown at all
  const unseenTopics = Array.from(groupedQuestions.keys())
    .filter(topic => !state.topicsShown.has(topic));
  
  // Get a random selection of unseen topics
  const randomUnseenTopics = unseenTopics.sort(() => Math.random() - 0.5).slice(0, count);
  
  for (const topic of randomUnseenTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      const allSubtopicQuestions = Array.from(topicMap.values()).flat();
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we still need more, get questions from topics that have been shown the least
  if (selectedQuestions.length < count) {
    // Count how many times each topic has been shown
    const topicCounts = new Map<string, number>();
    allQuestions.forEach(q => {
      const topic = q.category;
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
    
    // Sort topics by how infrequently they've been shown
    const sortedTopics = Array.from(topicCounts.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);
    
    for (const topic of sortedTopics) {
      if (selectedQuestions.length >= count) break;
      
      if (groupedQuestions.has(topic)) {
        const topicMap = groupedQuestions.get(topic)!;
        const allSubtopicQuestions = Array.from(topicMap.values()).flat()
          .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
          .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
        
        if (allSubtopicQuestions.length > 0) {
          const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
          selectedQuestions.push(question);
        }
      }
    }
  }
  
  return selectedQuestions;
}

// Helper function to get questions from similar branches
function getSimilarBranchQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  
  // Get related topics based on topic branch similarities
  // For example, if user loves "Modern Cinema," try "Television Shows" or "Musicals"
  const similarityMap: Record<string, string[]> = {
    'Modern Cinema': ['Television Shows', 'Musicals', 'Animation'],
    'Science': ['Technology', 'Nature', 'Medicine'],
    'History': ['Politics', 'Geography', 'Military History'],
    'Pop Culture': ['Media', 'Celebrities', 'Fashion'],
    'Sports': ['Olympics', 'Athletics', 'Team Sports'],
    'Music': ['Bands', 'Classical Music', 'Instruments'],
    'Food & Drink': ['Cuisine', 'Beverages', 'Cooking'],
    'Art': ['Museums', 'Classical Art', 'Modern Art'],
    'Literature': ['Books', 'Poetry', 'Authors'],
    'Geography': ['Countries', 'Capitals', 'Landmarks'],
    // Add more mappings as needed
  };
  
  // Get user's preferred topics
  const preferredTopics = getPreferredTopics(state, userProfile);
  
  // For each preferred topic, try to find similar branches
  for (const topic of preferredTopics) {
    if (selectedQuestions.length >= count) break;
    
    const similarBranches = similarityMap[topic] || [];
    for (const similarBranch of similarBranches) {
      if (selectedQuestions.length >= count) break;
      
      // Look for questions in this similar branch
      const questions = allQuestions
        .filter(q => q.category === similarBranch || q.tags?.includes(similarBranch))
        .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
        .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
      
      if (questions.length > 0) {
        const question = questions[Math.floor(Math.random() * questions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we couldn't find enough similar branch questions, fill with random questions
  if (selectedQuestions.length < count) {
    const remainingQuestions = allQuestions
      .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    while (selectedQuestions.length < count && remainingQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      selectedQuestions.push(remainingQuestions[randomIndex]);
      remainingQuestions.splice(randomIndex, 1);
    }
  }
  
  return selectedQuestions;
}

// Helper function to get wildcard questions (completely random)
function getWildcardQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  count: number
): FeedItem[] {
  // Get completely random questions from the pool
  const candidates = allQuestions
    .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
    .sort(() => Math.random() - 0.5); // Shuffle
  
  return candidates.slice(0, count);
}

// Add a question from an adjacent branch if possible
function tryAddAdjacentBranchQuestion(
  selectedQuestions: FeedItem[],
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): void {
  if (selectedQuestions.length === 0) return;
  
  // Get a random question from the selected set
  const randomQuestion = selectedQuestions[Math.floor(Math.random() * selectedQuestions.length)];
  const branch = randomQuestion.tags?.[1] || randomQuestion.tags?.[0] || randomQuestion.category;
  
  // Define adjacent branches (could be customized based on a knowledge graph)
  const adjacentBranches = [
    // If branch is a subject, try related subjects
    ...(branch === 'History' ? ['Politics', 'Geography', 'Anthropology'] : []),
    ...(branch === 'Science' ? ['Technology', 'Medicine', 'Astronomy'] : []),
    ...(branch === 'Arts' ? ['Literature', 'Music', 'Philosophy'] : []),
    
    // If branch is a time period, try adjacent time periods
    ...(branch === 'Modern Era' ? ['Middle Ages', 'Renaissance'] : []),
    ...(branch === 'Ancient History' ? ['Classical Antiquity', 'Middle Ages'] : []),
    
    // If branch is a region, try nearby regions
    ...(branch === 'North America' ? ['South America', 'Europe'] : []),
    ...(branch === 'Asia' ? ['Middle East', 'Oceania'] : []),
    
    // Default adjacent branches
    'General Knowledge',
    'Popular Culture',
  ];
  
  // Try to find a question from an adjacent branch
  for (const adjacentBranch of adjacentBranches) {
    const questions = allQuestions
      .filter(q => q.category === adjacentBranch || q.tags?.includes(adjacentBranch))
      .filter(q => !state.shownQuestionIds.has(q.id)) // Use shownQuestionIds for filtering
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    if (questions.length > 0) {
      const question = questions[Math.floor(Math.random() * questions.length)];
        selectedQuestions.push(question);
      return;
    }
  }
}

// Helper function to get preferred topics based on user performance
function getPreferredTopics(state: ColdStartState, userProfile: UserProfile): string[] {
  // If we have explicit preferred topics, use those
  if (state.preferredTopics.length > 0) {
    return state.preferredTopics;
  }
  
  // Otherwise, determine preferred topics based on correct answers
  const topicScores: [string, number][] = [];
  
  // Score each topic based on correct answers and quick answers
  for (const [topic, count] of state.correctlyAnsweredTopics.entries()) {
    let score = count;
    
    // Check if any subtopics of this topic were answered quickly
    for (const topicKey of state.answeredQuickly.keys()) {
      if (topicKey.startsWith(topic + '/') && state.answeredQuickly.get(topicKey)! > 0) {
        score += 0.5; // Bonus for quick answers
      }
    }
    
    topicScores.push([topic, score]);
  }
  
  // Sort by score in descending order
  topicScores.sort((a, b) => b[1] - a[1]);
  
  // Return just the topic names
  return topicScores.map(entry => entry[0]);
}

// Main function to get the cold start feed
export function getColdStartFeed(
  allQuestions: FeedItem[],
  userProfile: UserProfile,
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>> | Record<string, any> = new Map()
): { items: FeedItem[], state: ColdStartState, explanations: { [questionId: string]: string[] } } {
  // Initialize or update the cold start state based on the user profile
  const state = initColdStartState();
  
  // Calculate actual state from the user profile
  const totalQuestionsAnswered = Object.keys(userProfile?.interactions || {}).length;
  console.log(`Total questions answered: ${totalQuestionsAnswered}`);
  
  // Update the phase based on the number of questions answered
  if (totalQuestionsAnswered >= 15) {
    state.phase = 4;
  } else if (totalQuestionsAnswered >= 10) {
    state.phase = 3;
  } else if (totalQuestionsAnswered >= 5) {
    state.phase = 2;
  } else {
    state.phase = 1;
  }
  
  // Process past interactions to build the cold start state
  Object.entries(userProfile?.interactions || {}).forEach(([questionId, interaction]) => {
    // Find the question related to this interaction
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
      // Mark this question as shown
      state.shownQuestionIds.add(question.id);
      
      // Track the category/topic as shown
      state.topicsShown.add(question.category);
      
      // Process based on interaction type
  if (interaction.wasCorrect) {
        // Add to answered correctly
        if (!state.correctlyAnsweredTopics.has(question.category)) {
          state.correctlyAnsweredTopics.set(question.category, 0);
        }
        state.correctlyAnsweredTopics.set(
          question.category,
          state.correctlyAnsweredTopics.get(question.category)! + 1
        );
        
        // If answered quickly, track it
        if (interaction.timeSpent && interaction.timeSpent < 10000) {
          const topicKey = `${question.category}/${question.tags?.[0] || 'General'}`;
          if (!state.answeredQuickly.has(topicKey)) {
            state.answeredQuickly.set(topicKey, 0);
          }
          state.answeredQuickly.set(
            topicKey,
            state.answeredQuickly.get(topicKey)! + 1
          );
    }
  } else if (interaction.wasSkipped) {
        // Add to skipped topics
        if (!state.skippedTopics.has(question.category)) {
          state.skippedTopics.set(question.category, 0);
        }
        state.skippedTopics.set(
          question.category,
          state.skippedTopics.get(question.category)! + 1
        );
      }
    }
  });
  
  console.log(`Cold start phase: ${state.phase}, Questions shown: ${state.shownQuestionIds.size}`);
  
  // Convert groupedQuestions to a Map if it's not already a Map instance
  let groupedQuestionsMap: Map<Category, Map<Subtopic, FeedItem[]>>;
  if (!(groupedQuestions instanceof Map)) {
    console.warn("groupedQuestions is not a Map instance, converting to Map");
    groupedQuestionsMap = new Map();
    
    // If it's an object with properties, try to convert them
    if (typeof groupedQuestions === 'object' && groupedQuestions !== null) {
      Object.entries(groupedQuestions).forEach(([category, subtopicsMap]) => {
        const newSubtopicsMap = new Map();
        
        if (typeof subtopicsMap === 'object' && subtopicsMap !== null) {
          Object.entries(subtopicsMap).forEach(([subtopic, questions]) => {
            newSubtopicsMap.set(subtopic, Array.isArray(questions) ? questions : []);
          });
        }
        
        groupedQuestionsMap.set(category, newSubtopicsMap);
      });
    }
  } else {
    groupedQuestionsMap = groupedQuestions;
  }
  
  // If we don't have grouped questions, create them
  if (groupedQuestionsMap.size === 0) {
    for (const question of allQuestions) {
      if (!groupedQuestionsMap.has(question.category)) {
        groupedQuestionsMap.set(question.category, new Map());
      }
      
      const categoryMap = groupedQuestionsMap.get(question.category)!;
      const subtopic = question.tags?.[0] || 'General';
      
      if (!categoryMap.has(subtopic)) {
        categoryMap.set(subtopic, []);
      }
      
      categoryMap.get(subtopic)!.push(question);
    }
  }
  
  // Get questions based on the current phase
  let phaseQuestions: FeedItem[];
  switch (state.phase) {
    case 1:
      phaseQuestions = getPhase1Questions(allQuestions, groupedQuestionsMap, state, userProfile);
      break;
    case 2:
      phaseQuestions = getPhase2Questions(allQuestions, groupedQuestionsMap, state, userProfile);
      break;
    case 3:
      phaseQuestions = getPhase3Questions(allQuestions, groupedQuestionsMap, state, userProfile);
      break;
    case 4:
      phaseQuestions = getPhase4Questions(allQuestions, groupedQuestionsMap, state, userProfile);
      break;
    default:
      phaseQuestions = getPhase1Questions(allQuestions, groupedQuestionsMap, state, userProfile);
  }
  
  console.log(`Returning ${phaseQuestions.length} questions for phase ${state.phase}`);
  console.log(`Total unique questions shown: ${state.shownQuestionIds.size}`);
  
  // Create explanations for each question
  const explanations: { [questionId: string]: string[] } = {};
  phaseQuestions.forEach(question => {
    const phase = state.phase;
    explanations[question.id] = [
      `Cold Start - Phase ${phase}`,
      `Based on ${state.shownQuestionIds.size} previously shown questions`,
      `Category: ${question.category}`
    ];
  });
  
  // Return the questions, state, and explanations
  return {
    items: phaseQuestions,
    state,
    explanations
  };
} 