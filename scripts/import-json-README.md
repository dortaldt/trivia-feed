# Importing JSON Trivia Questions to Supabase

This guide explains how to import JSON trivia questions into your Supabase database.

## Prerequisites

1. Node.js installed on your system
2. A Supabase project with a `trivia_questions` table
3. The trivia question JSON files ready to import

## Setup

1. Make sure you have the required dependencies installed:

```bash
npm install @supabase/supabase-js dotenv
```

2. Set up your Supabase credentials by either:

   a. Creating a `.env` file in the project root with the following contents:
   
   ```
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   ```
   
   b. Or editing the script directly to add your credentials.

3. Verify your Supabase connection:

```bash
node scripts/verify-supabase-connection.js
```

## Importing JSON Questions

Run the import script specifying the JSON files to import:

```bash
node scripts/import-json-to-supabase.js docs/trivia_entertainment_music_100.json docs/trivia_popculture_miscellaneous_100.json
```

You can import any number of JSON files at once by adding more file paths after the script name.

## JSON Format

The JSON files should contain an array of question objects. Each question should have the following structure:

```json
{
  "id": "unique_id",
  "question_text": "Question text goes here?",
  "answer_choices": [
    "Option 1",
    "Option 2",
    "Option 3",
    "Option 4"
  ],
  "correct_answer": "Option 2",
  "difficulty": "medium",
  "language": "en",
  "topic": "Topic",
  "subtopic": "Subtopic",
  "branch": "Branch",
  "tags": ["tag1", "tag2"],
  "tone": "neutral",
  "format": "text",
  "image_url": "https://example.com/image.jpg",
  "learning_capsule": "A short learning capsule about the answer",
  "source": "Source information",
  "created_at": "2023-01-01T00:00:00Z",
  "updated_at": "2023-01-01T00:00:00Z"
}
```

The script will log the progress and report any errors encountered during the import process. 