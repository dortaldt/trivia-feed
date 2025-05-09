# OpenAI Service Integration: Implementation Plan

> This document provides the detailed implementation plan for the OpenAI service integration described in the [feature brief](./openai-api-req.md).

## Implementation Progress

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| 1.1 | Database Table Creation | ✅ Completed | Tables created successfully in Supabase |
| 1.2 | Supabase Edge Function Creation | ✅ Completed | Function deployed successfully |
| 1.3 | Supabase Configuration | ✅ Completed | Successfully configured OpenAI service in Supabase |
| 2.1 | OpenAI Service Interface | ✅ Completed | Created TypeScript service with caching and error handling |
| 2.2 | Error Handling Utilities | ✅ Completed | Implemented comprehensive error handling |
| 3.1 | Component Design | 📝 Planned | Next step in our implementation |
| 3.2 | Integration with Question Display | 📝 Planned | |
| 4.1 | Unit Tests | 📝 Planned | |
| 4.2 | Integration Tests | 📝 Planned | |
| 4.3 | Performance Optimization | 📝 Planned | |

**Status Legend:**
- ✅ Completed
- ⏳ In Progress
- 📝 Planned
- ⚠️ Blocked (requires action)

### Phase 1 Status Summary
- Created and deployed database tables for usage tracking and configuration
- Fixed RLS policy syntax to use WITH CHECK instead of USING for INSERT operations
- Successfully deployed the Edge Function to the Supabase project
- Added the necessary API configuration through secrets
- **Phase 1 is now fully complete!**
- Testing tools have been created to verify the implementation

### Phase 2 Status Summary
- Created a client-side TypeScript service for communicating with the OpenAI proxy function
- Implemented robust error handling with typed error responses
- Added caching support to improve performance and reduce API calls
- Integrated retry logic with exponential backoff
- **Phase 2 is now fully complete!**

### Testing the Implementation
- A testing guide is available at [`docs/test-openai-function.md`](./test-openai-function.md)
- A test script is available at [`scripts/test-openai-function.sh`](../scripts/test-openai-function.sh)
- Replace `YOUR_ACCESS_TOKEN` in the script with an actual token from your Supabase auth system

## Next Steps
We're now ready to proceed to Phase 3: "More Questions" Feature Implementation. This will involve creating the React Native component for displaying additional questions related to the current question.

## Implementation Phases

| Phase | Description | Timeline |
|-------|-------------|----------|
| 1 | Supabase Backend Setup | Week 1 |
| 2 | Client Service Layer Development | Week 2 |
| 3 | "More Questions" Feature Implementation | Week 3 |
| 4 | Testing and Optimization | Week 4 |

## Phase 1: Supabase Backend Setup

### 1.1 Database Table Creation

```sql
-- Usage tracking table
CREATE TABLE openai_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL,
  tokens_used INTEGER NOT NULL,
  model TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  request_data JSONB,
  response_status INTEGER,
  error_message TEXT
);

-- Configuration table
CREATE TABLE openai_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parameter_name TEXT NOT NULL UNIQUE,
  parameter_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial configuration values
INSERT INTO openai_config (parameter_name, parameter_value, description)
VALUES 
  ('default_model', 'gpt-4-turbo', 'Default OpenAI model to use'),
  ('max_tokens_per_request', '2000', 'Maximum tokens allowed per request'),
  ('default_temperature', '0.7', 'Default temperature setting'),
  ('user_request_limit_daily', '50', 'Maximum requests per user per day');
```

### 1.2 Supabase Edge Function Creation

Create a new Edge Function in Supabase:

```typescript
// openai-proxy.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.21.0';
import OpenAI from 'https://esm.sh/openai@4.0.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const openaiApiKey = Deno.env.get('OPENAI_API_KEY') || '';

const openai = new OpenAI({
  apiKey: openaiApiKey,
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get request data
    const requestData = await req.json();
    const { action, params } = requestData;

    // Check for rate limiting
    const today = new Date().toISOString().split('T')[0];
    const { data: usageData } = await supabase
      .from('openai_usage')
      .select('COUNT(*)')
      .eq('user_id', user.id)
      .gte('created_at', `${today}T00:00:00Z`);

    const { data: configData } = await supabase
      .from('openai_config')
      .select('parameter_value')
      .eq('parameter_name', 'user_request_limit_daily')
      .single();

    const dailyLimit = parseInt(configData?.parameter_value || '50');
    const currentUsage = usageData?.[0]?.count || 0;

    if (currentUsage >= dailyLimit) {
      return new Response(JSON.stringify({ error: 'Daily usage limit exceeded' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Handle different OpenAI actions
    let result;
    let tokensUsed = 0;

    switch (action) {
      case 'generateText':
        const { prompt, model = 'gpt-4-turbo', temperature = 0.7, max_tokens = 1000 } = params;
        
        const completion = await openai.chat.completions.create({
          model,
          temperature,
          max_tokens,
          messages: [{ role: 'user', content: prompt }],
        });
        
        result = completion.choices[0].message;
        tokensUsed = completion.usage?.total_tokens || 0;
        break;
      
      case 'generateQuestions':
        const { currentQuestion, topic, difficulty } = params;
        
        // Default model and settings
        const { data: modelConfig } = await supabase
          .from('openai_config')
          .select('parameter_value')
          .eq('parameter_name', 'default_model')
          .single();
          
        const defaultModel = modelConfig?.parameter_value || 'gpt-4-turbo';
        
        // Create specialized prompt for question generation
        const questionPrompt = `
          Based on this question: "${currentQuestion}"
          Topic: ${topic}
          Current difficulty: ${difficulty}
          
          Generate three new questions related to this topic:
          1. One harder question
          2. One easier question
          3. One question of similar difficulty
          
          Format your response as a JSON array with objects containing:
          - question: The question text
          - difficulty: "harder", "easier", or "similar"
          - explanation: A brief explanation of why this is a good follow-up question
        `;
        
        const questionCompletion = await openai.chat.completions.create({
          model: defaultModel,
          temperature: 0.8,
          max_tokens: 1500,
          messages: [{ role: 'user', content: questionPrompt }],
          response_format: { type: 'json_object' },
        });
        
        result = JSON.parse(questionCompletion.choices[0].message.content);
        tokensUsed = questionCompletion.usage?.total_tokens || 0;
        break;
        
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }

    // Log usage
    await supabase.from('openai_usage').insert({
      user_id: user.id,
      request_type: action,
      tokens_used: tokensUsed,
      model: params.model || 'gpt-4-turbo',
      request_data: params,
      response_status: 200,
    });

    // Return the result
    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('OpenAI proxy error:', error);
    
    // Log error if authentication was successful
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          await supabase.from('openai_usage').insert({
            user_id: user.id,
            request_type: 'error',
            tokens_used: 0,
            model: 'error',
            response_status: 500,
            error_message: error.message,
          });
        }
      }
    } catch (logError) {
      console.error('Error logging failure:', logError);
    }
    
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 1.3 Supabase Configuration

1. Deploy the edge function:
```bash
supabase functions deploy openai-proxy
```

2. Set environment variables:
```bash
supabase secrets set OPENAI_API_KEY=sk-your-openai-key-here
```

3. Set up appropriate RLS policies for the new tables:

```sql
-- Policy for openai_usage
ALTER TABLE openai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view their own usage"
  ON openai_usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only authenticated users can create usage records (via the function)
CREATE POLICY "Function can insert usage records"
  ON openai_usage
  FOR INSERT
  USING (auth.uid() = user_id);

-- Config table is admin-only
ALTER TABLE openai_config ENABLE ROW LEVEL SECURITY;

-- All users can read config
CREATE POLICY "Users can read config"
  ON openai_config
  FOR SELECT
  USING (true);

-- Only admins can modify config
CREATE POLICY "Only admins can modify config"
  ON openai_config
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM admin_users));
```

## Phase 2: Client Service Layer Development

### 2.1 OpenAI Service Interface

Create a TypeScript service for interfacing with the OpenAI proxy:

```typescript
// src/services/openai.service.ts
import { supabase } from '../lib/supabase';

export interface OpenAITextParams {
  prompt: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface GenerateQuestionsParams {
  currentQuestion: string;
  topic: string;
  difficulty: string;
}

export interface GeneratedQuestion {
  question: string;
  difficulty: 'harder' | 'easier' | 'similar';
  explanation: string;
}

class OpenAIService {
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // ms
  
  /**
   * Generate text using OpenAI models
   */
  async generateText(params: OpenAITextParams): Promise<string> {
    return this.callOpenAIFunction('generateText', params);
  }
  
  /**
   * Generate related questions based on current question
   */
  async generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
    return this.callOpenAIFunction('generateQuestions', params);
  }
  
  /**
   * Generic function to call OpenAI proxy with retry logic
   */
  private async callOpenAIFunction<T, R>(action: string, params: T): Promise<R> {
    let retries = 0;
    
    while (true) {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !sessionData.session) {
          throw new Error('Authentication required');
        }
        
        const { data, error } = await supabase.functions.invoke('openai-proxy', {
          body: {
            action,
            params,
          },
        });
        
        if (error) throw new Error(error.message);
        
        return data;
      } catch (error) {
        if (retries >= this.MAX_RETRIES) {
          throw error;
        }
        
        retries++;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY * retries));
      }
    }
  }
}

export const openAIService = new OpenAIService();
```

### 2.2 Error Handling Utilities

Create utility functions for consistent error handling:

```typescript
// src/utils/error-handling.ts
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  OPENAI = 'OPENAI',
  UNKNOWN = 'UNKNOWN',
}

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
}

export function handleOpenAIError(error: any): AppError {
  console.error('OpenAI Error:', error);
  
  if (!navigator.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'No internet connection',
      originalError: error,
    };
  }
  
  const errorMessage = error?.message || 'Unknown error occurred';
  
  if (errorMessage.includes('Unauthorized') || errorMessage.includes('Authentication')) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: 'Please log in to use this feature',
      originalError: error,
    };
  }
  
  if (errorMessage.includes('limit exceeded') || errorMessage.includes('rate limit')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'You have reached your usage limit for today. Please try again tomorrow.',
      originalError: error,
    };
  }
  
  if (errorMessage.includes('OpenAI')) {
    return {
      type: ErrorType.OPENAI,
      message: 'An error occurred with the AI service. Please try again later.',
      originalError: error,
    };
  }
  
  return {
    type: ErrorType.UNKNOWN,
    message: 'Something went wrong. Please try again later.',
    originalError: error,
  };
}
```

## Phase 3: "More Questions" Feature Implementation

### 3.1 Component Design

Create a new component for the "More Questions" feature:

```tsx
// src/components/MoreQuestions.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { openAIService, GeneratedQuestion } from '../services/openai.service';
import { handleOpenAIError, ErrorType } from '../utils/error-handling';

interface MoreQuestionsProps {
  currentQuestion: string;
  topic: string;
  difficulty: string;
  onSelectQuestion?: (question: string) => void;
}

export const MoreQuestions: React.FC<MoreQuestionsProps> = ({
  currentQuestion,
  topic,
  difficulty,
  onSelectQuestion,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [expanded, setExpanded] = useState(false);
  
  const generateMoreQuestions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const generatedQuestions = await openAIService.generateQuestions({
        currentQuestion,
        topic,
        difficulty,
      });
      
      setQuestions(generatedQuestions);
      setExpanded(true);
    } catch (err) {
      const appError = handleOpenAIError(err);
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleQuestionSelect = (question: string) => {
    if (onSelectQuestion) {
      onSelectQuestion(question);
    }
  };
  
  const difficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'harder': return '#e74c3c';
      case 'easier': return '#2ecc71';
      case 'similar': return '#3498db';
      default: return '#95a5a6';
    }
  };
  
  if (!expanded) {
    return (
      <TouchableOpacity 
        style={styles.button}
        onPress={generateMoreQuestions}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Get More Questions</Text>
        )}
      </TouchableOpacity>
    );
  }
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Related Questions</Text>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={generateMoreQuestions}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.questionsContainer}>
          {questions.map((q, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.questionItem, { borderLeftColor: difficultyColor(q.difficulty) }]}
              onPress={() => handleQuestionSelect(q.question)}
            >
              <Text style={styles.difficultyLabel}>{q.difficulty}</Text>
              <Text style={styles.questionText}>{q.question}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      
      <TouchableOpacity 
        style={styles.closeButton}
        onPress={() => setExpanded(false)}
      >
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginVertical: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  button: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  questionsContainer: {
    marginTop: 8,
  },
  questionItem: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  difficultyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 16,
    color: '#2c3e50',
  },
  errorContainer: {
    backgroundColor: '#fff3f3',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },
  errorText: {
    color: '#e74c3c',
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
  },
  retryText: {
    color: '#3498db',
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 12,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
  },
});
```

### 3.2 Integration with Existing Question Display

Modify your existing question display component to include the "More Questions" feature:

```tsx
// src/screens/QuestionScreen.tsx
import React from 'react';
import { View, ScrollView } from 'react-native';
import { MoreQuestions } from '../components/MoreQuestions';
// Import other components as needed

const QuestionScreen = ({ route, navigation }) => {
  // Existing question screen code...
  
  // Add this to your JSX where you want to display the "More Questions" feature
  return (
    <ScrollView>
      {/* Existing question display components */}
      
      <MoreQuestions 
        currentQuestion={currentQuestion.text}
        topic={currentQuestion.topic}
        difficulty={currentQuestion.difficulty}
        onSelectQuestion={(newQuestion) => {
          // Handle selection of a new question, e.g.,
          // navigate to the new question or replace current
        }}
      />
      
      {/* Other existing components */}
    </ScrollView>
  );
};

export default QuestionScreen;
```

## Phase 4: Testing and Optimization

### 4.1 Unit Tests

Create unit tests for the OpenAI service:

```typescript
// src/services/__tests__/openai.service.test.ts
import { openAIService } from '../openai.service';
import { supabase } from '../../lib/supabase';

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

describe('OpenAI Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'fake-token' } },
      error: null,
    });
  });
  
  test('generateText should call the OpenAI proxy with correct parameters', async () => {
    // Mock successful response
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: 'Generated text response',
      error: null,
    });
    
    const params = {
      prompt: 'Test prompt',
      model: 'gpt-4',
      temperature: 0.5,
    };
    
    const result = await openAIService.generateText(params);
    
    expect(supabase.functions.invoke).toHaveBeenCalledWith('openai-proxy', {
      body: {
        action: 'generateText',
        params,
      },
    });
    
    expect(result).toBe('Generated text response');
  });
  
  test('generateQuestions should call OpenAI proxy with correct parameters', async () => {
    const mockQuestions = [
      { question: 'Harder question', difficulty: 'harder', explanation: 'Explanation 1' },
      { question: 'Easier question', difficulty: 'easier', explanation: 'Explanation 2' },
      { question: 'Similar question', difficulty: 'similar', explanation: 'Explanation 3' },
    ];
    
    (supabase.functions.invoke as jest.Mock).mockResolvedValue({
      data: mockQuestions,
      error: null,
    });
    
    const params = {
      currentQuestion: 'Test question',
      topic: 'Science',
      difficulty: 'medium',
    };
    
    const result = await openAIService.generateQuestions(params);
    
    expect(supabase.functions.invoke).toHaveBeenCalledWith('openai-proxy', {
      body: {
        action: 'generateQuestions',
        params,
      },
    });
    
    expect(result).toEqual(mockQuestions);
  });
  
  test('should retry on failure', async () => {
    // First call fails, second succeeds
    (supabase.functions.invoke as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        data: 'Success after retry',
        error: null,
      });
    
    const result = await openAIService.generateText({ prompt: 'Test' });
    
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    expect(result).toBe('Success after retry');
  });
  
  test('should throw error after max retries', async () => {
    // All calls fail
    (supabase.functions.invoke as jest.Mock).mockRejectedValue(new Error('Persistent error'));
    
    await expect(openAIService.generateText({ prompt: 'Test' }))
      .rejects
      .toThrow('Persistent error');
      
    // 1 initial + 2 retries = 3 calls
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(3);
  });
});
```

### 4.2 Integration Tests

Create integration tests to verify the full pipeline:

```typescript
// src/components/__tests__/MoreQuestions.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MoreQuestions } from '../MoreQuestions';
import { openAIService } from '../../services/openai.service';

// Mock the OpenAI service
jest.mock('../../services/openai.service', () => ({
  openAIService: {
    generateQuestions: jest.fn(),
  },
}));

describe('MoreQuestions Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('renders the initial button', () => {
    const { getByText } = render(
      <MoreQuestions 
        currentQuestion="What is photosynthesis?"
        topic="Biology"
        difficulty="medium"
      />
    );
    
    expect(getByText('Get More Questions')).toBeTruthy();
  });
  
  test('shows loading indicator when generating questions', async () => {
    // Mock a slow response
    (openAIService.generateQuestions as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    const { getByText, getByTestId } = render(
      <MoreQuestions 
        currentQuestion="What is photosynthesis?"
        topic="Biology"
        difficulty="medium"
      />
    );
    
    fireEvent.press(getByText('Get More Questions'));
    
    // Should show loading indicator
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });
  
  test('displays questions when loaded successfully', async () => {
    const mockQuestions = [
      { question: 'Harder question', difficulty: 'harder', explanation: 'Explanation 1' },
      { question: 'Easier question', difficulty: 'easier', explanation: 'Explanation 2' },
      { question: 'Similar question', difficulty: 'similar', explanation: 'Explanation 3' },
    ];
    
    (openAIService.generateQuestions as jest.Mock).mockResolvedValue(mockQuestions);
    
    const { getByText, findByText } = render(
      <MoreQuestions 
        currentQuestion="What is photosynthesis?"
        topic="Biology"
        difficulty="medium"
      />
    );
    
    fireEvent.press(getByText('Get More Questions'));
    
    // Should show the questions
    await findByText('Related Questions');
    expect(await findByText('Harder question')).toBeTruthy();
    expect(await findByText('Easier question')).toBeTruthy();
    expect(await findByText('Similar question')).toBeTruthy();
  });
  
  test('handles error states', async () => {
    (openAIService.generateQuestions as jest.Mock).mockRejectedValue(
      new Error('API error')
    );
    
    const { getByText, findByText } = render(
      <MoreQuestions 
        currentQuestion="What is photosynthesis?"
        topic="Biology"
        difficulty="medium"
      />
    );
    
    fireEvent.press(getByText('Get More Questions'));
    
    // Should show error message
    expect(await findByText(/something went wrong/i)).toBeTruthy();
    expect(await findByText('Retry')).toBeTruthy();
  });
});
```

### 4.3 Performance Optimization

Implement caching for OpenAI responses:

```typescript
// src/services/cache.service.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

class CacheService {
  private readonly CACHE_PREFIX = 'openai_cache_';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const jsonValue = await AsyncStorage.getItem(cacheKey);
      
      if (!jsonValue) return null;
      
      const item: CacheItem<T> = JSON.parse(jsonValue);
      const now = Date.now();
      
      // Check if the cached item is still valid
      if (now - item.timestamp > this.DEFAULT_TTL) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }
  
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(item));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
  
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  async invalidateAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
}

export const cacheService = new CacheService();
```

Modify the OpenAI service to use caching:

```typescript
// src/services/openai.service.ts (modified with caching)
import { supabase } from '../lib/supabase';
import { cacheService } from './cache.service';
import crypto from 'crypto-js';

// ... existing interfaces ...

class OpenAIService {
  private readonly MAX_RETRIES = 2;
  private readonly RETRY_DELAY = 1000; // ms
  
  /**
   * Generate text using OpenAI models
   */
  async generateText(params: OpenAITextParams): Promise<string> {
    // Simple requests are not cached
    return this.callOpenAIFunction('generateText', params);
  }
  
  /**
   * Generate related questions based on current question
   */
  async generateQuestions(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
    // Create a cache key from the parameters
    const cacheKey = this.createCacheKey('questions', params);
    
    // Check cache first
    const cachedResult = await cacheService.get<GeneratedQuestion[]>(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    const result = await this.callOpenAIFunction<GenerateQuestionsParams, GeneratedQuestion[]>(
      'generateQuestions', 
      params
    );
    
    // Cache the result
    await cacheService.set(cacheKey, result);
    
    return result;
  }
  
  /**
   * Generic function to call OpenAI proxy with retry logic
   */
  private async callOpenAIFunction<T, R>(action: string, params: T): Promise<R> {
    // ... existing implementation ...
  }
  
  /**
   * Create a deterministic cache key from action and parameters
   */
  private createCacheKey(action: string, params: any): string {
    // Create a hash of the parameters to use as a cache key
    const paramString = JSON.stringify(params);
    const hash = crypto.SHA256(paramString).toString();
    return `${action}_${hash}`;
  }
}

export const openAIService = new OpenAIService();
```

## Deployment Strategy

1. **Development Environment**
   - Implement and test the Supabase functions and database schema
   - Test the client-side service integration
   - Verify the "More Questions" feature in a development build

2. **Staging Environment**
   - Deploy the Supabase functions to a staging environment
   - Test with simulated production traffic
   - Monitor API usage and performance

3. **Production Rollout**
   - Deploy Supabase functions to production
   - Stage rollout of client updates:
     - Internal testing (10% of users)
     - Limited release (25% of users)
     - Full rollout (100% of users)
   - Monitor error rates and performance

## Monitoring and Maintenance

1. **Usage Analytics**
   - Create a dashboard to monitor:
     - Daily active users of the feature
     - Token consumption
     - Error rates
     - Response times

2. **Cost Management**
   - Implement daily and monthly budgeting
   - Set up alerting for unexpected usage patterns
   - Optimize prompts to reduce token usage

3. **Quality Assurance**
   - Regularly review generated questions for quality
   - Collect user feedback on generated content
   - Refine prompts based on quality metrics

## Risk Assessment and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| OpenAI API outage | Medium | High | Implement graceful degradation, display cached content |
| High API costs | Medium | Medium | Set user quotas, optimize prompts, cache responses |
| Poor quality responses | Low | High | Refine prompts, add post-processing validation, collect user feedback |
| Security breach | Low | Critical | Regular security audits, minimal data exposure, token validation |
| Rate limiting | Medium | Medium | Implement client-side throttling, clear messaging to users |

## Success Criteria

The implementation will be considered successful when:

1. The "More Questions" feature is available to all users
2. API success rate exceeds 99%
3. Average response time is under 3 seconds
4. User engagement with the feature exceeds 20% of active users
5. Generated questions receive positive feedback (>4/5 rating)

## Next Steps After Implementation

1. Collect usage metrics and user feedback
2. Plan for additional OpenAI-powered features
3. Optimize costs and performance
4. Explore additional models and capabilities 