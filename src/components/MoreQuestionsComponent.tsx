import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useThemeColor } from '@/hooks/useThemeColor';
import { openAIService, GeneratedQuestion, GenerateQuestionsParams } from '../services/openai.service';
import Card from './ui/Card';
import Button from './ui/Button';
import { handleOpenAIError } from '../utils/error-handling';

// Update the GeneratedQuestion interface to include options
interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

interface MultipleChoiceQuestion extends GeneratedQuestion {
  options: QuestionOption[];
}

interface MoreQuestionsComponentProps {
  currentQuestion: string;
  topic: string;
  difficulty?: string;
  onSelectQuestion?: (question: string, options?: QuestionOption[]) => void;
}

/**
 * Component that displays AI-generated related questions based on the current question
 */
const MoreQuestionsComponent: React.FC<MoreQuestionsComponentProps> = ({
  currentQuestion,
  topic,
  difficulty = 'medium',
  onSelectQuestion,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<MultipleChoiceQuestion[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  
  // Get theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const cardBgColor = useThemeColor({}, 'background');
  
  const generateMoreQuestions = async () => {
    setLoading(true);
    setError(null);
    
    // Clear previous questions to ensure we don't show old data
    setQuestions([]);
    
    try {
      const params: GenerateQuestionsParams = {
        currentQuestion,
        topic,
        difficulty,
        _timestamp: Date.now() // Add timestamp to prevent caching
      };
      
      console.log('PARAMS BEING SENT TO API:', JSON.stringify(params));
      
      const generatedQuestions = await openAIService.generateQuestions(params);
      
      console.log('Raw response from API:', JSON.stringify(generatedQuestions));
      
      // Extract questions from the nested response structure
      let questionsArray: any[] = [];
      
      // Handle different response formats
      if (Array.isArray(generatedQuestions)) {
        // Direct array
        questionsArray = generatedQuestions;
      } else if (typeof generatedQuestions === 'object' && generatedQuestions !== null) {
        // Type assertion to avoid TypeScript errors with dynamic properties
        const dataObject = generatedQuestions as any;
        
        if (dataObject.data) {
          // Handle nested data property
          if (Array.isArray(dataObject.data)) {
            questionsArray = dataObject.data;
          } else if (typeof dataObject.data === 'object' && dataObject.data !== null) {
            // Handle data.questions format
            if (Array.isArray(dataObject.data.questions)) {
              questionsArray = dataObject.data.questions;
            } else {
              // Try to find any array in the data object
              const dataKeys = Object.keys(dataObject.data || {});
              for (const key of dataKeys) {
                if (Array.isArray(dataObject.data[key])) {
                  questionsArray = dataObject.data[key];
                  break;
                }
              }
            }
          }
        } else {
          // Try to find questions at top level
          if (Array.isArray(dataObject.questions)) {
            questionsArray = dataObject.questions;
          } else {
            // Try to find any array at top level
            const topKeys = Object.keys(dataObject);
            for (const key of topKeys) {
              if (Array.isArray(dataObject[key])) {
                questionsArray = dataObject[key];
                break;
              }
            }
          }
        }
      }
      
      console.log('Extracted questions array:', JSON.stringify(questionsArray));
      
      // Check if we have incomplete question format (just options)
      // This handles cases where the API returns options directly instead of questions
      if (questionsArray.length > 0 && questionsArray[0].hasOwnProperty('text') && questionsArray[0].hasOwnProperty('isCorrect')) {
        console.log('Detected options array instead of questions - converting to a single question');
        // This looks like an options array - convert to a single question
        questionsArray = [
          {
            question: `Related to: "${currentQuestion}"`,
            difficulty: "similar",
            explanation: "Generated from the original question",
            options: questionsArray.map(opt => ({
              text: opt.text,
              isCorrect: opt.isCorrect
            }))
          }
        ];
      }
      
      // Ensure all questions have options
      const formattedQuestions = questionsArray.map((q: any) => {
        if (!q.question) {
          // If missing question text, use a default format
          return {
            question: q.text || `Related question about ${topic}`,
            difficulty: q.difficulty || "similar",
            explanation: q.explanation || "Generated question",
            options: q.options || [
              { text: "Option A (correct)", isCorrect: true },
              { text: "Option B", isCorrect: false },
              { text: "Option C", isCorrect: false },
              { text: "Option D", isCorrect: false }
            ]
          };
        }
        
        // Normal question but missing options
        if (!q.options || !Array.isArray(q.options)) {
          return {
            ...q,
            options: [
              { text: "Option A (correct)", isCorrect: true },
              { text: "Option B", isCorrect: false },
              { text: "Option C", isCorrect: false },
              { text: "Option D", isCorrect: false }
            ]
          };
        }
        
        return q;
      });
      
      console.log('Processed questions array:', JSON.stringify(formattedQuestions));
      
      setQuestions(formattedQuestions);
      setExpanded(true);
    } catch (err) {
      console.error('Error in generateMoreQuestions:', err);
      const appError = handleOpenAIError(err);
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuestionSelect = (question: MultipleChoiceQuestion) => {
    if (onSelectQuestion) {
      onSelectQuestion(question.question, question.options);
    }
    setExpanded(false);
  };
  
  /**
   * Get the appropriate color for the difficulty level
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'harder': return '#e74c3c';
      case 'easier': return '#2ecc71';
      case 'similar': return '#3498db';
      default: return '#95a5a6';
    }
  };
  
  /**
   * Get the appropriate icon for the difficulty level
   */
  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'harder': return 'trending-up';
      case 'easier': return 'trending-down';
      case 'similar': return 'minus';
      default: return 'help-circle';
    }
  };

  const renderOptions = (question: MultipleChoiceQuestion, index: number) => {
    if (!question.options || !Array.isArray(question.options)) {
      return null;
    }

    return (
      <View style={styles.optionsContainer}>
        {question.options.map((option, optIndex) => (
          <TouchableOpacity 
            key={optIndex}
            style={[styles.optionItem, 
              option.isCorrect ? styles.correctOption : null,
              selectedQuestion === index ? {} : styles.hiddenCorrect
            ]}
            disabled={true}
          >
            <ThemedText style={styles.optionText}>
              {String.fromCharCode(65 + optIndex)}. {option.text}
            </ThemedText>
            {option.isCorrect && selectedQuestion === index && (
              <View style={styles.correctBadge}>
                <FeatherIcon name="check" size={12} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  // If the component hasn't been expanded yet, show the "Get More Questions" button
  if (!expanded) {
    return (
      <TouchableOpacity 
        style={[styles.button, { backgroundColor: '#3498db', borderColor: '#2980b9' }]}
        onPress={generateMoreQuestions}
        disabled={loading}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#fff" style={styles.loader} />
            <ThemedText style={styles.buttonText}>Generating Questions...</ThemedText>
          </View>
        ) : (
          <>
            <FeatherIcon name="plus-circle" size={16} color="#fff" style={styles.buttonIcon} />
            <ThemedText style={styles.buttonText}>Get More Questions</ThemedText>
          </>
        )}
      </TouchableOpacity>
    );
  }
  
  // If loading, show a loading indicator
  if (loading) {
    return (
      <View style={[styles.loadingFullContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color="#3498db" />
        <ThemedText style={styles.loadingText}>Generating related questions...</ThemedText>
      </View>
    );
  }
  
  // If there's an error, show an error message with a retry button
  if (error) {
    return (
      <View style={[styles.errorContainer, { backgroundColor, borderColor: '#e74c3c' }]}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <Button
          onPress={generateMoreQuestions}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  }
  
  // Show the generated questions
  return (
    <Card style={styles.container}>
      <Card.Header title="Related Questions" />
      <View style={styles.headerControls}>
        <TouchableOpacity onPress={() => setExpanded(false)}>
          <FeatherIcon name="x" size={20} color={textColor} />
        </TouchableOpacity>
      </View>
      <Card.Content>
        <ScrollView style={styles.scrollContainer}>
          {Array.isArray(questions) && questions.length > 0 ? (
            questions.map((question, index) => (
              <View 
                key={index}
                style={[styles.questionItem, { borderColor: '#ddd', backgroundColor: cardBgColor }]}
              >
                <View style={styles.questionHeader}>
                  <View style={styles.difficultyBadge}>
                    <FeatherIcon 
                      name={getDifficultyIcon(question.difficulty)} 
                      size={14} 
                      color="#fff" 
                      style={styles.difficultyIcon} 
                    />
                    <ThemedText style={[
                      styles.difficultyText, 
                      { color: '#fff', backgroundColor: getDifficultyColor(question.difficulty) }
                    ]}>
                      {question.difficulty}
                    </ThemedText>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setSelectedQuestion(selectedQuestion === index ? null : index)}
                    style={styles.showAnswerBtn}
                  >
                    <ThemedText style={styles.showAnswerText}>
                      {selectedQuestion === index ? "Hide Answer" : "Show Answer"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
                <ThemedText style={styles.questionText}>{question.question}</ThemedText>
                
                {renderOptions(question, index)}
                
                <View style={styles.actionButtons}>
                  <Button
                    onPress={() => handleQuestionSelect(question)}
                    style={styles.useQuestionButton}
                  >
                    Use This Question
                  </Button>
                </View>
              </View>
            ))
          ) : (
            <ThemedText style={styles.noQuestionsText}>No questions available</ThemedText>
          )}
        </ScrollView>
      </Card.Content>
      <Card.Footer>
        <Button 
          onPress={() => setExpanded(false)}
          style={styles.closeButton}
        >
          Close
        </Button>
      </Card.Footer>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  headerControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  scrollContainer: {
    maxHeight: 500,
  },
  questionItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  questionText: {
    fontSize: 16,
    marginVertical: 12,
    fontWeight: '500',
  },
  difficultyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyIcon: {
    marginRight: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    textTransform: 'capitalize',
  },
  errorContainer: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 12,
  },
  retryButton: {
    backgroundColor: '#3498db',
  },
  closeButton: {
    backgroundColor: '#95a5a6',
  },
  noQuestionsText: {
    textAlign: 'center',
    marginTop: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFullContainer: {
    padding: 24,
    margin: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  loader: {
    marginRight: 8,
  },
  optionsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  optionItem: {
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    flex: 1,
  },
  correctOption: {
    borderColor: '#2ecc71',
  },
  hiddenCorrect: {
    borderColor: '#ddd',
  },
  correctBadge: {
    backgroundColor: '#2ecc71',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showAnswerBtn: {
    padding: 4,
  },
  showAnswerText: {
    fontSize: 12,
    color: '#3498db',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  useQuestionButton: {
    backgroundColor: '#3498db',
    paddingHorizontal: 16,
  },
});

export default MoreQuestionsComponent; 