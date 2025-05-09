/**
 * Error Handling Utilities
 * 
 * This file provides utilities for consistent error handling across the application.
 */

/**
 * Types of errors that can occur in the application
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  RATE_LIMIT = 'RATE_LIMIT',
  OPENAI = 'OPENAI',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Structure of an application error
 */
export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
}

/**
 * Process OpenAI-related errors into a consistent format
 * 
 * @param error The original error
 * @returns A structured AppError with appropriate type and message
 */
export function handleOpenAIError(error: any): AppError {
  console.error('OpenAI Error:', error);
  
  // Check for network connectivity
  if (!globalThis.navigator?.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'No internet connection. Please check your network and try again.',
      originalError: error,
    };
  }
  
  const errorMessage = error?.message || 'Unknown error occurred';
  
  // Authentication errors
  if (errorMessage.includes('Unauthorized') || 
      errorMessage.includes('Authentication') || 
      errorMessage.includes('auth') || 
      errorMessage.includes('log in')) {
    return {
      type: ErrorType.AUTHENTICATION,
      message: 'Please log in to use this feature',
      originalError: error,
    };
  }
  
  // Rate limiting errors
  if (errorMessage.includes('limit exceeded') || 
      errorMessage.includes('rate limit') || 
      errorMessage.includes('too many requests')) {
    return {
      type: ErrorType.RATE_LIMIT,
      message: 'You have reached your usage limit for today. Please try again tomorrow.',
      originalError: error,
    };
  }
  
  // OpenAI-specific errors
  if (errorMessage.includes('OpenAI') || 
      errorMessage.includes('model') || 
      errorMessage.includes('completion') || 
      errorMessage.includes('prompt')) {
    return {
      type: ErrorType.OPENAI,
      message: 'An error occurred with the AI service. Please try again later.',
      originalError: error,
    };
  }
  
  // Default unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: 'Something went wrong. Please try again later.',
    originalError: error,
  };
}

/**
 * Format error message for display based on error type
 * 
 * @param error The AppError to format
 * @returns A user-friendly error message
 */
export function formatErrorMessage(error: AppError): string {
  switch (error.type) {
    case ErrorType.NETWORK:
      return 'Network error: Please check your internet connection.';
    
    case ErrorType.AUTHENTICATION:
      return 'Authentication error: Please log in to use this feature.';
    
    case ErrorType.RATE_LIMIT:
      return 'Usage limit reached: Please try again later.';
    
    case ErrorType.OPENAI:
      return 'AI service error: The AI service is currently unavailable. Please try again later.';
    
    case ErrorType.UNKNOWN:
    default:
      return 'An unexpected error occurred. Please try again later.';
  }
} 