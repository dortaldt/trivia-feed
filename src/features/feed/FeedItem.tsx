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
  SafeAreaView,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { QuestionState } from '../../store/triviaSlice';
import { FeatherIcon } from '@/components/FeatherIcon';
import { ThemedText } from '@/components/ThemedText';
import { useIOSAnimations } from '@/hooks/useIOSAnimations';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useColorScheme } from '@/hooks/useColorScheme';
import Leaderboard from '../../components/Leaderboard';
import { useAuth } from '../../context/AuthContext';

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

// Simple ProfileView component to show in the modal
const ProfileView = () => {
  const { user, signOut } = useAuth();
  
  // Generate initials for the avatar placeholder
  const getInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const handleSignOut = () => {
    if (signOut) {
      signOut();
    }
  };
  
  // Define styles within the component
  const profileStyles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#1a1a1a',
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
    },
    emptyText: {
      fontSize: 16,
      textAlign: 'center',
      color: 'rgba(255, 255, 255, 0.7)',
    },
    scrollView: {
      flex: 1,
    },
    userInfoSection: {
      alignItems: 'center',
      padding: 20,
      paddingBottom: 30,
      borderBottomWidth: 0,
    },
    avatarContainer: {
      marginBottom: 10,
    },
    avatarPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#ffc107',
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarText: {
      color: 'black',
      fontSize: 36,
      fontWeight: 'bold',
    },
    emailText: {
      fontSize: 14,
      color: 'rgba(255, 255, 255, 0.7)',
      marginTop: 5,
    },
    detailsSection: {
      paddingHorizontal: 20,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 15,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    detailLabel: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: 16,
    },
    detailValue: {
      color: 'white',
      fontSize: 16,
      fontWeight: '500',
    },
    editButton: {
      backgroundColor: '#ffc107',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignSelf: 'center',
      marginTop: 25,
      marginBottom: 25,
    },
    editButtonText: {
      color: 'black',
      fontSize: 16,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: 'white',
      marginTop: 25,
      marginBottom: 15,
      paddingHorizontal: 20,
    },
    menuItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    menuItemText: {
      color: 'white',
      fontSize: 16,
    },
    headerContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerTitle: {
      fontSize: 18,
      color: 'white',
      fontWeight: '600',
    },
  });

  if (!user) {
    return (
      <View style={profileStyles.emptyState}>
        <ThemedText style={profileStyles.emptyText}>
          You need to sign in to view your profile
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={profileStyles.container}>
      {/* Add back the header */}
      <View style={profileStyles.headerContainer}>
        <ThemedText style={profileStyles.headerTitle}>Profile</ThemedText>
      </View>

      <ScrollView style={profileStyles.scrollView}>
        {/* User avatar and email */}
        <View style={profileStyles.userInfoSection}>
          <View style={profileStyles.avatarContainer}>
            <View style={profileStyles.avatarPlaceholder}>
              <ThemedText style={profileStyles.avatarText}>{getInitials()}</ThemedText>
            </View>
          </View>
          <ThemedText style={profileStyles.emailText}>{user.email}</ThemedText>
        </View>

        {/* User details section */}
        <View style={profileStyles.detailsSection}>
          <View style={profileStyles.detailRow}>
            <ThemedText style={profileStyles.detailLabel}>Username</ThemedText>
            <ThemedText style={profileStyles.detailValue}>Animal Junk</ThemedText>
          </View>
          <View style={profileStyles.detailRow}>
            <ThemedText style={profileStyles.detailLabel}>Full Name</ThemedText>
            <ThemedText style={profileStyles.detailValue}>Not set</ThemedText>
          </View>
          <View style={profileStyles.detailRow}>
            <ThemedText style={profileStyles.detailLabel}>Country</ThemedText>
            <ThemedText style={profileStyles.detailValue}>Anguilla</ThemedText>
          </View>
        </View>

        {/* Edit Profile button */}
        <TouchableOpacity style={profileStyles.editButton}>
          <ThemedText style={profileStyles.editButtonText}>Edit Profile</ThemedText>
        </TouchableOpacity>

        {/* Account section */}
        <ThemedText style={profileStyles.sectionTitle}>Account</ThemedText>
        
        <TouchableOpacity style={profileStyles.menuItem}>
          <ThemedText style={profileStyles.menuItemText}>Privacy & Security</ThemedText>
          <FeatherIcon name="chevron-right" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={profileStyles.menuItem}>
          <ThemedText style={profileStyles.menuItemText}>Notification Settings</ThemedText>
          <FeatherIcon name="chevron-right" size={20} color="white" />
        </TouchableOpacity>
        
        <TouchableOpacity style={profileStyles.menuItem}>
          <ThemedText style={profileStyles.menuItemText}>Change Password</ThemedText>
          <FeatherIcon name="chevron-right" size={20} color="white" />
        </TouchableOpacity>

        {/* Sign out button at the bottom */}
        <TouchableOpacity 
          style={[profileStyles.editButton, { marginTop: 40, backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}
          onPress={handleSignOut}
        >
          <ThemedText style={[profileStyles.editButtonText, { color: '#ff5c5c' }]}>Sign Out</ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const FeedItem: React.FC<FeedItemProps> = ({ item, onAnswer, showExplanation, onNextQuestion }) => {
  const [liked, setLiked] = useState(false);
  const [showLearningCapsule, setShowLearningCapsule] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [hoveredAnswerIndex, setHoveredAnswerIndex] = useState<number | null>(null);
  const [hoveredAction, setHoveredAction] = useState<string | null>(null);
  const renderCount = useRef(0);
  
  // Calculate responsive font size based on question length
  const calculateFontSize = useMemo(() => {
    const textLength = item.question.length;
    const lineBreaks = (item.question.match(/\n/g) || []).length;
    
    // Default max font size - different for mobile web vs other platforms
    const isMobileWeb = Platform.OS === 'web' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    let fontSize = isMobileWeb ? 24 : 42;
    
    if (textLength > 60 || lineBreaks > 0) {
      fontSize = isMobileWeb ? 22 : 36;
    }
    
    if (textLength > 100 || lineBreaks > 1) {
      fontSize = isMobileWeb ? 20 : 32;
    }
    
    if (textLength > 140 || lineBreaks > 2) {
      fontSize = isMobileWeb ? 18 : 28;
    }
    
    if (textLength > 180 || lineBreaks > 3) {
      fontSize = isMobileWeb ? 16 : 24;
    }
    
    // Added more conditions for very long content
    if (textLength > 220 || lineBreaks > 4) {
      fontSize = isMobileWeb ? 14 : 20;
    }
    
    if (textLength > 260 || lineBreaks > 5) {
      fontSize = isMobileWeb ? 14 : 16;
    }
    
    if (textLength > 300 || lineBreaks > 6) {
      fontSize = 14; // Minimum font size for all platforms
    }
    
    return fontSize;
  }, [item.question]);
  
  // Add lineHeight calculation for more condensed text
  const lineHeight = useMemo(() => {
    // Use a more condensed line height ratio (1.2 instead of default 1.5)
    return Math.round(calculateFontSize * 1.2);
  }, [calculateFontSize]);
  
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
  const textColor = useThemeColor({}, 'text');
  const colorScheme = useColorScheme() ?? 'light';

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
      
      // Automatically show learning capsule if answer is incorrect
      if (!item.answers[index].isCorrect) {
        setShowLearningCapsule(true);
        // Animate in after state update
        setTimeout(() => {
          animateIn();
        }, 10);
      }
    }
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

  const toggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
  };

  const toggleProfile = () => {
    setShowProfile(!showProfile);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Solid color background instead of image */}
        <View style={dynamicStyles.backgroundColor} />
        
        <View style={[styles.overlay, {zIndex: 1}]} />

        <View style={[styles.content, {zIndex: 2}]}>
          <View style={styles.header}>
            <Text style={styles.category}>{item.category}</Text>
            <View style={[styles.difficulty, { 
              backgroundColor: 
                item.difficulty?.toLowerCase() === 'easy' ? '#8BC34A' :  // Light green for easy
                item.difficulty?.toLowerCase() === 'medium' ? '#FFEB3B' : // Yellow for medium
                '#9C27B0'  // Purple for hard
            }]}>
              <Text style={[styles.difficultyText, { 
                color: 
                  item.difficulty?.toLowerCase() === 'easy' ? '#507523' :  // Darker green for text
                  item.difficulty?.toLowerCase() === 'medium' ? '#806F00' : // Darker yellow for text
                  '#4A1158'  // Darker purple for text
              }]}>{item.difficulty}</Text>
            </View>
          </View>

          <View style={styles.questionContainer}>
            {/* Using ThemedText with question type for DM Serif and dynamic font size */}
            <ThemedText type="question" style={[styles.questionText, { 
              fontSize: calculateFontSize,
              lineHeight: lineHeight 
            }]}>
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
                    <ThemedText 
                      type="default"
                      style={[
                        styles.answerText, 
                        isAnswered() && questionState?.answerIndex === index && styles.selectedAnswerText,
                        isSkipped() && styles.skippedAnswerText
                      ]}
                    >
                      {answer.text}
                    </ThemedText>
                    
                    {(isAnswered() && questionState?.answerIndex === index && (
                      answer.isCorrect ? 
                      <FeatherIcon name="check-square" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} /> : 
                      <FeatherIcon name="x-circle" size={24} color="#F44336" style={{marginLeft: 8} as TextStyle} />
                    )) || (isAnswered() && !isSelectedAnswerCorrect() && answer.isCorrect && (
                      <FeatherIcon name="square" size={24} color="#4CAF50" style={{marginLeft: 8} as TextStyle} />
                    ))}
                  </TouchableOpacity>
                ))}
                
                {isAnswered() && (
                  <>
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
                name={liked ? "heart" : "heart"} 
                size={20} 
                color={liked ? '#F44336' : 'white'} 
                style={[styles.icon, liked ? {} : {opacity: 0.8}]} 
              />
              <ThemedText style={styles.actionText}>
                {liked ? item.likes + 1 : item.likes}
              </ThemedText>
            </TouchableOpacity>
            
            {/* Leaderboard button */}
            <TouchableOpacity
              onPress={toggleLeaderboard}
              style={[
                styles.actionButton,
                Platform.OS === 'web' && hoveredAction === 'leaderboard' && styles.hoveredActionButton
              ]}
              {...(Platform.OS === 'web' ? {
                onMouseEnter: () => handleActionMouseEnter('leaderboard'),
                onMouseLeave: handleActionMouseLeave
              } : {})}
            >
              <FeatherIcon 
                name="award" 
                size={20} 
                color="white" 
                style={styles.icon} 
              />
              <ThemedText style={styles.actionText}>Leaderboard</ThemedText>
            </TouchableOpacity>
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

        {/* Leaderboard Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showLeaderboard}
          onRequestClose={toggleLeaderboard}
          statusBarTranslucent={true}
        >
          <View style={styles.leaderboardModalContainer}>
            <View style={styles.leaderboardModalContent}>
              <View style={styles.leaderboardModalHeader}>
                <ThemedText style={styles.leaderboardModalTitle}>Leaderboard</ThemedText>
                <TouchableOpacity 
                  onPress={toggleLeaderboard} 
                  style={styles.leaderboardCloseButton}
                >
                  <View style={styles.leaderboardCloseButtonCircle}>
                    <FeatherIcon name="x" size={20} color="black" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.leaderboardModalBody}>
                <Leaderboard limit={10} />
              </View>
            </View>
          </View>
        </Modal>

        {/* Profile Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showProfile}
          onRequestClose={toggleProfile}
          statusBarTranslucent={true}
        >
          <View style={styles.profileModalContainer}>
            <View style={styles.profileModalContent}>
              <View style={styles.profileModalHeader}>
                <ThemedText style={styles.profileModalTitle}>Profile</ThemedText>
                <TouchableOpacity 
                  onPress={toggleProfile} 
                  style={styles.profileCloseButton}
                >
                  <View style={styles.profileCloseButtonCircle}>
                    <FeatherIcon name="x" size={20} color="black" />
                  </View>
                </TouchableOpacity>
              </View>
              <View style={styles.profileModalBody}>
                <ProfileView />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

export default FeedItem;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    width: '100%',
    height: '100%',
    flex: 1,
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
    ...(Platform.OS === 'web' ? {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    } : {})
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
    fontWeight: 'bold',
    marginBottom: 20,
    ...(Platform.OS === 'web' ? { textShadow: '0px 2px 4px rgba(0, 0, 0, 0.5)' } as any : {}),
    // fontSize is now applied dynamically
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
    top: 100, // Position near the top of the screen
    alignSelf: 'center',
    width: '90%',
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
    maxHeight: '40%', // Limit height to avoid covering too much
    zIndex: 1000,
    ...(Platform.OS === 'web' ? {
      maxWidth: 600, // Max width for web to match question content
      width: '80%',
    } : {})
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
    lineHeight: 20,
  },
  disabledActionButton: {
    opacity: 0.5,
  },
  disabledIcon: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.5,
  },
  leaderboardModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  leaderboardModalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: '#1a1a1a', // Darker background for better contrast
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
    ...(Platform.OS === 'web' ? {
      maxWidth: 800,
    } : {})
  },
  leaderboardModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#121212', // Darker header background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  leaderboardModalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  leaderboardModalBody: {
    flex: 1,
  },
  leaderboardCloseButton: {
    padding: 5,
  },
  leaderboardCloseButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffc107', // Yellow close button like in the image
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileModalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  profileModalContent: {
    height: '90%',
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },
  profileModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.2)',
  },
  profileModalTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileModalBody: {
    flex: 1,
  },
  profileCloseButton: {
    padding: 5,
  },
  profileCloseButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
  },
});