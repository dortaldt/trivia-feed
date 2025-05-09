# OpenAI Service Integration

This directory contains the TypeScript services for interfacing with OpenAI capabilities through our Supabase Edge Function.

## Overview

The OpenAI service integration provides:

- Secure access to OpenAI capabilities without exposing API keys in the client
- Automatic authentication handling through Supabase
- Robust error handling with typed error responses
- Caching to improve performance and reduce API calls
- Retry logic with exponential backoff for resilience

## Setup

### Prerequisites

1. Make sure you have the required dependencies:

```bash
# Install dependencies
npm install @supabase/supabase-js @react-native-async-storage/async-storage crypto-js
npm install --save-dev @types/crypto-js
```

2. Ensure your Supabase configuration is set up in `src/lib/supabase.ts`. If not, create this file with your Supabase URL and anon key.

3. Make sure the "openai-proxy" Edge Function is deployed to your Supabase project, and the OpenAI API key is set up as a secret.

## Usage

### Generate Text

```typescript
import { openAIService } from '../services/openai.service';
import { handleOpenAIError } from '../utils/error-handling';

async function generateText() {
  try {
    const generatedText = await openAIService.generateText({
      prompt: 'Write a brief description of React Native',
      model: 'gpt-4-turbo', // Optional, defaults to Supabase config
      temperature: 0.7, // Optional, defaults to Supabase config
      max_tokens: 150, // Optional, defaults to Supabase config
    });
    
    console.log('Generated text:', generatedText);
    return generatedText;
  } catch (error) {
    // error is already processed by the service
    console.error('Error generating text:', error.message);
    // Show error to the user or handle appropriately
  }
}
```

### Generate Related Questions

```typescript
import { openAIService } from '../services/openai.service';
import { GeneratedQuestion } from '../services/openai.service';

async function getRelatedQuestions() {
  try {
    const questions: GeneratedQuestion[] = await openAIService.generateQuestions({
      currentQuestion: 'What is the capital of France?',
      topic: 'Geography',
      difficulty: 'medium',
    });
    
    console.log('Generated questions:', questions);
    // questions will have the following structure:
    // [
    //   { 
    //     question: "What are the five most populous cities in the EU?", 
    //     difficulty: "harder", 
    //     explanation: "..." 
    //   },
    //   { 
    //     question: "Is Paris in the north or south of France?", 
    //     difficulty: "easier", 
    //     explanation: "..." 
    //   },
    //   // etc.
    // ]
    
    return questions;
  } catch (error) {
    console.error('Error generating questions:', error.message);
    // Show error to the user or handle appropriately
  }
}
```

### Handling Errors

The service uses the error-handling utilities in `src/utils/error-handling.ts` to provide consistent error handling.

```typescript
import { handleOpenAIError, ErrorType, formatErrorMessage } from '../utils/error-handling';

try {
  // Call OpenAI service
} catch (error) {
  const appError = handleOpenAIError(error);
  
  switch (appError.type) {
    case ErrorType.AUTHENTICATION:
      // Prompt user to login
      break;
    case ErrorType.NETWORK:
      // Show offline message
      break;
    case ErrorType.RATE_LIMIT:
      // Show usage limit reached message
      break;
    default:
      // Show generic error message
      break;
  }
  
  // Or use the formatErrorMessage helper:
  const errorMessage = formatErrorMessage(appError);
  // Display the error message to the user
}
```

### Caching

The OpenAI service uses caching for the `generateQuestions` method to improve performance and reduce API calls. Cached responses are stored for 24 hours by default.

If you need to clear the cache:

```typescript
import { cacheService } from '../services/cache.service';

// Clear all cached OpenAI responses
await cacheService.invalidateAll();

// Or clear a specific cache entry
const cacheKey = cacheService.createCacheKey('generateQuestions', {
  currentQuestion: 'What is the capital of France?',
  topic: 'Geography',
  difficulty: 'medium',
});
await cacheService.invalidate(cacheKey);
``` 