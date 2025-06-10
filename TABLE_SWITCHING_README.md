# Table Switching with `isNiche` Parameter

This document explains the new `isNiche` parameter that allows the trivia app to seamlessly switch between the `trivia_questions` and `niche_trivia_questions` database tables based on topic configuration.

## Overview

The app now supports two database tables for trivia questions:
- **`trivia_questions`** - Standard trivia questions for general topics
- **`niche_trivia_questions`** - Specialized/niche trivia questions for advanced topics

Both tables have identical structure but contain different content. The app automatically determines which table to use based on the topic's `isNiche` configuration parameter.

## Configuration

### Topic Configuration File: `app-topic-config.js`

Each topic in the configuration now includes an `isNiche` boolean parameter:

```javascript
topics: {
  music: {
    displayName: 'Music Trivia',
    description: 'Test your knowledge about music, artists, and songs',
    dbTopicName: 'Music',
    isNiche: false, // Uses trivia_questions table
  },
  'quantum-physics': {
    displayName: 'Quantum Physics',
    description: 'Advanced quantum mechanics and theoretical physics',
    dbTopicName: 'Quantum Physics',
    isNiche: true, // Uses niche_trivia_questions table
  }
}
```

### Parameters

- **`isNiche: false`** - Uses the standard `trivia_questions` table
- **`isNiche: true`** - Uses the specialized `niche_trivia_questions` table

## Implementation

### Core Utility: `src/utils/tableUtils.ts`

The `tableUtils.ts` file provides functions to determine which table to use:

```typescript
import { getTriviaTableName } from '../utils/tableUtils';

// Returns 'trivia_questions' or 'niche_trivia_questions'
const tableName = getTriviaTableName();

// For a specific topic
const specificTableName = getTriviaTableNameForTopic('quantum-physics');
```

### Updated Services

The following service files have been updated to use dynamic table selection:

1. **`src/lib/triviaService.ts`** - Main trivia data fetching
2. **`src/lib/questionGeneratorService.ts`** - Question generation and storage
3. **`src/lib/openaiService.ts`** - AI question generation and duplicate checking
4. **`src/hooks/useQuestionGenerator.ts`** - Question generation hook

### Database Queries

All database queries now dynamically determine the table name:

```typescript
// Before (hardcoded)
const { data } = await supabase.from('trivia_questions').select('*');

// After (dynamic)
const tableName = getTriviaTableName();
const { data } = await supabase.from(tableName).select('*');
```

## Usage Examples

### Setting up a Standard Topic

```javascript
music: {
  displayName: 'Music Trivia',
  description: 'Test your knowledge about music, artists, and songs',
  dbTopicName: 'Music',
  isNiche: false, // Standard table
  subTopics: {
    // ... subtopic definitions
  }
}
```

### Setting up a Niche Topic

```javascript
'movies-and-tv': {
  displayName: 'Movies & TV',
  description: 'Deep dive into cinema and television culture',
  dbTopicName: 'Movies and TV',
  isNiche: true, // Niche table
  subTopics: {
    'Oscar-Winning Performances': {
      displayName: 'Oscar Winners',
      description: 'Academy Award winning performances',
      icon: 'award'
    },
    'Action Films': {
      displayName: 'Action Films',
      description: 'High-octane cinema adventures',
      icon: 'zap'
    }
    // ... more subtopic definitions
  }
}
```

## Testing

Run the test script to verify table switching functionality:

```bash
# Test with default topic (uses trivia_questions)
node test-table-switching.js

# Test with regular topic (uses trivia_questions)
node test-table-switching.js music

# Test with niche topics (uses niche_trivia_questions)
node test-table-switching.js movies-and-tv
node test-table-switching.js nineties
node test-table-switching.js friends-tv
```

## Database Setup

Ensure both tables exist in your Supabase database:

1. **Standard Table**: `trivia_questions` (already exists)
2. **Niche Table**: `niche_trivia_questions` (created via `scripts/create_niche_table.sql`)

Both tables have identical structure:
- Same columns and data types
- Same indexes and constraints
- Same fingerprint column for deduplication

## Discovering Existing Niche Topics

To automatically discover topics and subtopics from your existing `niche_trivia_questions` table:

```bash
node scripts/discover-niche-topics.js
```

This script will:
- Query the `niche_trivia_questions` table
- Analyze all topics, subtopics, branches, and tags
- Generate topic configuration code ready to paste into `app-topic-config.js`
- Save the configuration to `discovered-niche-topics.json`

The current database contains:
- **Movies & TV** (180 questions) - Cinema and television trivia
- **90s Culture** (128 questions) - 1990s nostalgia and pop culture
- **Friends** (100 questions) - The beloved TV sitcom

## Benefits

1. **Content Separation**: Specialized content doesn't clutter the main trivia experience
2. **Performance**: Smaller table sizes for targeted queries
3. **Flexibility**: Easy to add new niche topics without affecting existing functionality
4. **Scalability**: Can scale different content types independently
5. **Seamless Integration**: No changes needed in the UI components

## Fallback Behavior

- If `isNiche` is not specified, defaults to `false` (standard table)
- If topic configuration is missing, falls back to standard table
- Graceful error handling with console warnings for debugging

## Migration Path

To add a new niche topic:

1. Add the topic configuration with `isNiche: true`
2. Populate the `niche_trivia_questions` table with content
3. Update the active topic in build configuration
4. Deploy the app

The app will automatically start using the niche table for that topic with no code changes required. 