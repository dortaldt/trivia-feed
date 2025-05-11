# Question Generation Feature

## Overview
The Question Generation feature uses the OpenAI API to automatically create new trivia questions based on user interests and activity. This helps maintain a fresh content pipeline and personalized experience.

## How It Works

### Trigger Conditions
Question generation only runs when:
- User has answered at least 5 questions
- At least one topic from recent questions has fewer than 10 questions in the database

### Topic Selection Logic
We select topics to guide question generation:

1. **Primary Topics**
   - Topics from the user's last 5 answered questions
   - Topics with a user score > 0.5 (their personal favorites)

2. **Adjacent Topics**
   - 1-2 related topics for each primary topic
   - Maintains relevance while introducing variety

### Generation Process
When triggered, the system:
- Generates 20 new questions from primary topics
- Generates 10 new questions from adjacent topics
- Filters out duplicates using a question fingerprint system
- Saves to database with source and timestamp

### Feed Integration
Generated questions are:
- Tagged with `source: "generated"` 
- Boosted in the feed ranking for 48 hours
- Tracked for performance analytics

## Technical Components

- `src/lib/openaiService.ts` - Handles OpenAI API communication
- `src/lib/questionGeneratorService.ts` - Main generation logic
- `src/lib/topicMapperService.ts` - Topic relationship mapping
- `src/hooks/useQuestionGenerator.ts` - React hook for easy component integration

## Configuration

Add your OpenAI API key to the `.env` file:

```
OPENAI_API_KEY=your_api_key_here
```

## Monitoring & Logging

The generation process logs:
- When generation is triggered
- How many questions were generated
- Which topics were used
- Any errors or issues

Check the app logs to monitor this activity.

## Future Improvements

Potential enhancements:
- Automatic performance analysis of generated questions
- Configuration UI for generation parameters
- Topic mapper expansion with ML-based relationships
- More sophisticated duplication detection 