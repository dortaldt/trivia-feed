# Niche App Subtopic Variety Feature

## Overview
This feature ensures variety in question selection for niche apps (single-topic apps) by using subtopics for randomization from the very start of the user experience.

## What's a Niche App?
A niche app is identified by:
- `activeTopic` is set to a specific topic (not 'default')
- `filterContentByTopic` is true
- The topic configuration has `isNiche: true`

Examples: Movies & TV, 90s Culture, Friends TV show apps

## How It Works

### Before (Problem)
- Single topic apps would show questions randomly from the same topic
- Users could get similar types of questions repeatedly
- No variety in subtopic coverage from the start

### After (Solution)
- **Exploration Phase (1-5 questions)**: Selects one question from each different subtopic available
- **Branching Phase (6-20 questions)**: Continues subtopic variety selection
- **Normal Phase (20+ questions)**: Maintains subtopic variety while respecting user preferences

### Implementation Details

1. **Detection**: `isNicheApp()` function checks the app configuration
2. **Selection**: `selectQuestionsWithSubtopicVariety()` ensures diverse subtopic coverage
3. **All Phases**: Applied to exploration, branching, and normal phases for consistency

### Benefits
- ✅ Immediate variety from the first question
- ✅ Better user experience in single-topic apps
- ✅ Maintains existing personalization logic for multi-topic apps
- ✅ Simple and automatic - no configuration needed

### Example
For a "90s Culture" niche app, instead of getting random 90s questions, users will get:
1. Question from "90s Music"
2. Question from "90s Movies" 
3. Question from "90s TV"
4. Question from "90s Sports"
5. Question from "90s Fashion"

This ensures immediate variety and coverage of different subtopics within the niche. 