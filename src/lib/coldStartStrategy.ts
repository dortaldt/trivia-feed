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
  topicsShown: Set<Category>;
  subtopicsShown: Map<Category, Set<Subtopic>>;
  correctlyAnsweredTopics: Map<Category, number>;
  correctlyAnsweredSubtopics: Map<string, number>; // format: "category/subtopic"
  answeredQuickly: Map<string, boolean>; // format: "category/subtopic"
  preferredTopics: string[];
  skippedTopics: Set<Category>;
}

// Initialize cold start state
function initColdStartState(): ColdStartState {
  return {
    phase: 1,
    questionsShown: 0,
    topicsShown: new Set(),
    subtopicsShown: new Map(),
    correctlyAnsweredTopics: new Map(),
    correctlyAnsweredSubtopics: new Map(),
    answeredQuickly: new Map(),
    preferredTopics: [],
    skippedTopics: new Set()
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
function getPhase1Questions(allQuestions: FeedItem[], groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  const highInterestTopics = getHighInterestTopics();
  
  // Try to get one medium difficulty question from each high-interest topic
  for (const topic of highInterestTopics) {
    if (groupedQuestions.has(topic)) {
      const topicQuestions = Array.from(groupedQuestions.get(topic)!.values()).flat();
      
      // Find medium difficulty questions first
      const mediumQuestions = topicQuestions.filter(q => 
        q.difficulty === 'Medium' || q.difficulty === 'medium'
      );
      
      if (mediumQuestions.length > 0) {
        // Select random medium question from this topic
        const selectedQuestion = mediumQuestions[Math.floor(Math.random() * mediumQuestions.length)];
        selectedQuestions.push(selectedQuestion);
      } else if (topicQuestions.length > 0) {
        // If no medium questions, just take any question from this topic
        const selectedQuestion = topicQuestions[Math.floor(Math.random() * topicQuestions.length)];
        selectedQuestions.push(selectedQuestion);
      }
    }
  }
  
  // If we couldn't find enough questions from high-interest topics, add more from general pool
  if (selectedQuestions.length < 3) {
    // Get random questions from topics not already selected, avoiding niche topics
    const usedTopics = new Set(selectedQuestions.map(q => q.category));
    const remainingQuestions = allQuestions.filter(q => !usedTopics.has(q.category));
    
    while (selectedQuestions.length < 3 && remainingQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      const question = remainingQuestions[randomIndex];
      selectedQuestions.push(question);
      remainingQuestions.splice(randomIndex, 1); // Remove the selected question
      usedTopics.add(question.category); // Avoid duplicate topics
    }
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
  const selectedQuestions: FeedItem[] = [];
  
  // Calculate how many 4-question segments we need (2-3 segments)
  const segmentsNeeded = Math.ceil((12 - 3) / 4); // Questions 4-12 = 9 questions
  
  for (let segment = 0; segment < segmentsNeeded; segment++) {
    // For each segment, get:
    // - 2 questions from preferred subtopics
    // - 2 questions from unexplored topics
    
    // 1. Get questions from preferred subtopics
    const preferredQuestions = getPreferredTopicQuestions(
      allQuestions,
      groupedQuestions, 
      state,
      userProfile,
      2 // We want 2 questions from preferred topics
    );
    selectedQuestions.push(...preferredQuestions);
    
    // 2. Get questions from unexplored topics
    const unexploredQuestions = getUnexploredTopicQuestions(
      allQuestions,
      groupedQuestions,
      state,
      2 // We want 2 questions from unexplored topics
    );
    selectedQuestions.push(...unexploredQuestions);
  }
  
  // Limit to exactly the number we need
  return selectedQuestions.slice(0, 9); // 9 questions for phase 2
}

// Select questions for Phase 3: Adaptive Personalization (Questions 13-20)
function getPhase3Questions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  const questionsNeeded = 8; // Questions 13-20 = 8 questions
  
  // Get the top preferred topics based on user performance
  const preferredTopics = getPreferredTopics(state, userProfile);
  
  // For each 4-question segment:
  // - 2 questions from preferred topics
  // - 1 question from familiar but lower-ranked topic
  // - 1 question from new or less-sampled topic
  
  const segmentsNeeded = Math.ceil(questionsNeeded / 4);
  
  for (let segment = 0; segment < segmentsNeeded; segment++) {
    // 1. Get 2 questions from preferred topics
    const preferredQuestions = getPreferredTopicQuestions(
      allQuestions,
      groupedQuestions,
      state,
      userProfile,
      2
    );
    selectedQuestions.push(...preferredQuestions);
    
    // 2. Get 1 question from familiar but lower-ranked topic
    const lowerRankedQuestions = getLowerRankedTopicQuestions(
      allQuestions,
      groupedQuestions,
      state,
      userProfile,
      1
    );
    selectedQuestions.push(...lowerRankedQuestions);
    
    // 3. Get 1 question from new or less-sampled topic
    const newTopicQuestions = getNewOrLessSampledTopicQuestions(
      allQuestions,
      groupedQuestions,
      state,
      1
    );
    selectedQuestions.push(...newTopicQuestions);
  }
  
  // Ensure we include adjacent branch exploration
  tryAddAdjacentBranchQuestion(
    selectedQuestions,
    allQuestions,
    groupedQuestions,
    state,
    userProfile
  );
  
  // Limit to exactly the number we need
  return selectedQuestions.slice(0, questionsNeeded);
}

// Select questions for Phase 4: Steady State (Questions 21+)
function getPhase4Questions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  
  // For Steady State, we want:
  // - 60% from preferred topics
  // - 20% from similar branches
  // - 20% from wildcard/unknown topics
  
  const preferredCount = Math.round(count * 0.6);
  const similarCount = Math.round(count * 0.2);
  const wildcardCount = count - preferredCount - similarCount;
  
  // 1. Get questions from preferred topics (60%)
  const preferredQuestions = getPreferredTopicQuestions(
    allQuestions,
    groupedQuestions,
    state,
    userProfile,
    preferredCount
  );
  selectedQuestions.push(...preferredQuestions);
  
  // 2. Get questions from similar branches (20%)
  const similarBranchQuestions = getSimilarBranchQuestions(
    allQuestions,
    groupedQuestions,
    state,
    userProfile,
    similarCount
  );
  selectedQuestions.push(...similarBranchQuestions);
  
  // 3. Get wildcard questions (20%)
  const wildcardQuestions = getWildcardQuestions(
    allQuestions,
    groupedQuestions,
    state,
    wildcardCount
  );
  selectedQuestions.push(...wildcardQuestions);
  
  return selectedQuestions;
}

// Helper function to get questions from preferred topics
function getPreferredTopicQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
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
    if (groupedQuestions.has(category) && groupedQuestions.get(category)!.has(subtopic)) {
      const questions = groupedQuestions.get(category)!.get(subtopic)!
        .filter(q => !state.topicsShown.has(q.id)); // Avoid showing the same question twice
      
      if (questions.length > 0) {
        const question = questions[Math.floor(Math.random() * questions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // Then get questions from topics answered correctly
  for (const topic of preferredTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      const allSubtopicQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.topicsShown.has(q.id)); // Avoid showing the same question twice
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we still need more, get random questions from any topic
  if (selectedQuestions.length < count) {
    const remainingQuestions = allQuestions
      .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
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
  const unsuccessfulTopics = Array.from(state.skippedTopics);
  
  // Prioritize completely unseen topics
  const candidateTopics = [...unseenTopics, ...unsuccessfulTopics];
  
  for (const topic of candidateTopics) {
    if (selectedQuestions.length >= count) break;
    
    if (groupedQuestions.has(topic)) {
      const topicMap = groupedQuestions.get(topic)!;
      const allSubtopicQuestions = Array.from(topicMap.values()).flat()
        .filter(q => !state.topicsShown.has(q.id)); // Avoid showing the same question twice
      
      if (allSubtopicQuestions.length > 0) {
        const question = allSubtopicQuestions[Math.floor(Math.random() * allSubtopicQuestions.length)];
        selectedQuestions.push(question);
      }
    }
  }
  
  // If we still need more, get random questions from any topic
  if (selectedQuestions.length < count) {
    const remainingQuestions = allQuestions
      .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
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
        .filter(q => !state.topicsShown.has(q.id)); // Avoid showing the same question twice
      
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
      .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
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
          .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
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
        .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
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
      .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    while (selectedQuestions.length < count && remainingQuestions.length > 0) {
      const randomIndex = Math.floor(Math.random() * remainingQuestions.length);
      selectedQuestions.push(remainingQuestions[randomIndex]);
      remainingQuestions.splice(randomIndex, 1);
    }
  }
  
  return selectedQuestions;
}

// Helper function to get wildcard/random questions
function getWildcardQuestions(
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  count: number
): FeedItem[] {
  const selectedQuestions: FeedItem[] = [];
  
  // Get completely random questions from the pool
  const candidates = allQuestions
    .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
    .sort(() => Math.random() - 0.5); // Shuffle
  
  // Take the first 'count' questions
  return candidates.slice(0, count);
}

// Helper function to try adding a question from an adjacent branch
function tryAddAdjacentBranchQuestion(
  selectedQuestions: FeedItem[],
  allQuestions: FeedItem[],
  groupedQuestions: Map<Category, Map<Subtopic, FeedItem[]>>,
  state: ColdStartState,
  userProfile: UserProfile
): void {
  // Find the user's most preferred topic
  const preferredTopics = getPreferredTopics(state, userProfile);
  if (preferredTopics.length === 0) return;
  
  const topPreferredTopic = preferredTopics[0];
  
  // Branch adjacency map (similar to getSimilarBranchQuestions)
  const adjacencyMap: Record<string, string[]> = {
    'Modern Cinema': ['Television Shows', 'Musicals', 'Animation'],
    'Science': ['Technology', 'Nature', 'Medicine'],
    'History': ['Politics', 'Geography', 'Military History'],
    'Pop Culture': ['Media', 'Celebrities', 'Fashion'],
    // Add more mappings as needed
  };
  
  const adjacentBranches = adjacencyMap[topPreferredTopic] || [];
  if (adjacentBranches.length === 0) return;
  
  // Try to find a question from an adjacent branch
  for (const branch of adjacentBranches) {
    const questions = allQuestions
      .filter(q => q.category === branch || q.tags?.includes(branch))
      .filter(q => !state.topicsShown.has(q.id)) // Avoid showing the same question twice
      .filter(q => !selectedQuestions.some(sq => sq.id === q.id)); // Avoid duplicates
    
    if (questions.length > 0) {
      const question = questions[Math.floor(Math.random() * questions.length)];
      
      // Replace a random question in the second half of the selection
      if (selectedQuestions.length >= 4) {
        const replaceIndex = Math.floor(selectedQuestions.length / 2) + 
                            Math.floor(Math.random() * (selectedQuestions.length / 2));
        selectedQuestions[replaceIndex] = question;
      } else {
        selectedQuestions.push(question);
      }
      
      return; // Successfully added an adjacent branch question
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
      if (topicKey.startsWith(topic + '/') && state.answeredQuickly.get(topicKey)) {
        score += 0.5; // Bonus for quick answers
      }
    }
    
    topicScores.push([topic, score]);
  }
  
  // Sort by score in descending order
  topicScores.sort((a, b) => b[1] - a[1]);
  
  // Return just the topic names
  return topicScores.map(([topic]) => topic);
}

// Function to update the cold start state based on user interaction
function updateColdStartState(
  state: ColdStartState,
  userProfile: UserProfile,
  question: FeedItem,
  interaction: { wasCorrect?: boolean; wasSkipped: boolean; timeSpent: number }
): ColdStartState {
  // Clone the state to avoid modifying the original
  const newState: ColdStartState = {
    ...state,
    questionsShown: state.questionsShown + 1,
    topicsShown: new Set(state.topicsShown),
    subtopicsShown: new Map(state.subtopicsShown),
    correctlyAnsweredTopics: new Map(state.correctlyAnsweredTopics),
    correctlyAnsweredSubtopics: new Map(state.correctlyAnsweredSubtopics),
    answeredQuickly: new Map(state.answeredQuickly),
    preferredTopics: [...state.preferredTopics],
    skippedTopics: new Set(state.skippedTopics)
  };
  
  const category = question.category;
  const subtopic = question.tags?.[0] || 'General';
  const subtopicKey = `${category}/${subtopic}`;
  
  // Track that this topic and subtopic have been shown
  newState.topicsShown.add(category);
  
  if (!newState.subtopicsShown.has(category)) {
    newState.subtopicsShown.set(category, new Set());
  }
  newState.subtopicsShown.get(category)!.add(subtopic);
  
  // Update based on interaction
  if (interaction.wasCorrect) {
    // Track correct answers by topic and subtopic
    newState.correctlyAnsweredTopics.set(
      category, 
      (newState.correctlyAnsweredTopics.get(category) || 0) + 1
    );
    
    newState.correctlyAnsweredSubtopics.set(
      subtopicKey,
      (newState.correctlyAnsweredSubtopics.get(subtopicKey) || 0) + 1
    );
    
    // Track if answered quickly (< 5 seconds)
    if (interaction.timeSpent < 5000) {
      newState.answeredQuickly.set(subtopicKey, true);
    }
  } else if (interaction.wasSkipped) {
    // Track skipped topics
    newState.skippedTopics.add(category);
  }
  
  // Update the phase based on questions shown
  if (newState.questionsShown >= 20) {
    newState.phase = 4; // Steady State
  } else if (newState.questionsShown >= 12) {
    newState.phase = 3; // Adaptive Personalization
  } else if (newState.questionsShown >= 3) {
    newState.phase = 2; // Initial Branching
  }
  
  // Recalculate preferred topics if we've shown enough questions
  if (newState.questionsShown >= 6) {
    newState.preferredTopics = getPreferredTopics(newState, userProfile);
  }
  
  return newState;
}

// Main function to get the cold start feed
export function getColdStartFeed(
  allQuestions: FeedItem[],
  userProfile: UserProfile,
  count: number = 20
): { items: FeedItem[], explanations: { [questionId: string]: string[] }, state: ColdStartState } {
  // Initialize or retrieve cold start state from user profile
  const state: ColdStartState = initColdStartState();
  
  // Group questions by topic and subtopic for easier selection
  const groupedQuestions = groupQuestionsByTopic(allQuestions);
  
  // Select questions based on current phase
  let selectedQuestions: FeedItem[] = [];
  const explanations: { [questionId: string]: string[] } = {};
  
  // Phase 1: Seeding (Questions 1-3)
  const phase1Questions = getPhase1Questions(allQuestions, groupedQuestions);
  phase1Questions.forEach(q => {
    explanations[q.id] = [
      `PHASE 1: SEEDING - Showing high-interest topic "${q.category}" to detect preferences.`,
      `Difficulty: ${q.difficulty}, Topic: ${q.category}, Subtopic: ${q.tags?.[0] || 'General'}`
    ];
  });
  
  // Phase 2: Initial Branching (Questions 4-12)
  const phase2Questions = getPhase2Questions(allQuestions, groupedQuestions, state, userProfile);
  phase2Questions.forEach(q => {
    const isPreferred = state.correctlyAnsweredTopics.has(q.category);
    explanations[q.id] = [
      `PHASE 2: INITIAL BRANCHING - ${isPreferred ? 'Preferred topic based on performance' : 'Exploration of new/unexplored topic'}`,
      `Topic: ${q.category}, Subtopic: ${q.tags?.[0] || 'General'}`,
      isPreferred ? 'Selected because you showed interest in this topic' : 'Selected to discover new interests'
    ];
  });
  
  // Phase 3: Adaptive Personalization (Questions 13-20)
  const phase3Questions = getPhase3Questions(allQuestions, groupedQuestions, state, userProfile);
  phase3Questions.forEach(q => {
    const isPreferred = state.preferredTopics.includes(q.category);
    const isLowerRanked = state.topicsShown.has(q.category) && !state.preferredTopics.includes(q.category);
    const isNew = !state.topicsShown.has(q.category);
    
    let phaseDescription = 'Unknown selection reason';
    if (isPreferred) {
      phaseDescription = 'Preferred topic based on your previous engagement';
    } else if (isLowerRanked) {
      phaseDescription = 'Familiar but lower-ranked topic for exploration';
    } else if (isNew) {
      phaseDescription = 'New or less-sampled topic for discovery';
    }
    
    explanations[q.id] = [
      `PHASE 3: ADAPTIVE PERSONALIZATION - ${phaseDescription}`,
      `Topic: ${q.category}, Subtopic: ${q.tags?.[0] || 'General'}`
    ];
  });
  
  // Phase 4: Steady State (Questions 21+)
  const phase4Questions = getPhase4Questions(allQuestions, groupedQuestions, state, userProfile, count - (phase1Questions.length + phase2Questions.length + phase3Questions.length));
  phase4Questions.forEach(q => {
    const isPreferred = state.preferredTopics.includes(q.category);
    const isSimilar = getSimilarBranchQuestions([q], groupedQuestions, state, userProfile, 1).length > 0;
    const isWildcard = !isPreferred && !isSimilar;
    
    let categoryDescription = 'Unknown category';
    if (isPreferred) {
      categoryDescription = 'Weighted preferred topic (60%)';
    } else if (isSimilar) {
      categoryDescription = 'Similar branch exploration (20%)';
    } else if (isWildcard) {
      categoryDescription = 'Wild card/unknown topic (20%)';
    }
    
    explanations[q.id] = [
      `PHASE 4: STEADY STATE - ${categoryDescription}`,
      `Topic: ${q.category}, Subtopic: ${q.tags?.[0] || 'General'}`
    ];
  });
  
  // Combine questions from all phases
  selectedQuestions = [
    ...phase1Questions,
    ...phase2Questions,
    ...phase3Questions,
    ...phase4Questions
  ].slice(0, count);
  
  return {
    items: selectedQuestions,
    explanations,
    state
  };
} 