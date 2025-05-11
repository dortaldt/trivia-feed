# Question Fingerprinting System

## Overview

The question fingerprinting system is a mechanism to detect and prevent duplicate trivia questions in the database. It works by creating a normalized representation (fingerprint) of each question based on its text content and tags, which can be used for reliable comparison.

## How It Works

1. **Fingerprint Generation**
   - Question text is normalized (lowercase, punctuation removed, extra spaces trimmed)
   - Tags are sorted alphabetically and joined with pipe separators
   - The normalized question text and tags are combined to create a unique fingerprint

2. **Storage**
   - The fingerprint is stored in a dedicated column in the `trivia_questions` table
   - An index on the fingerprint column enables efficient lookups

3. **Deduplication Process**
   - When generating new questions, each question's fingerprint is checked against the database
   - Questions with matching fingerprints are considered duplicates and are not stored
   - Fallback text-similarity checks provide additional protection if the fingerprint column is not available

## Implementation Details

### Database Schema Update

The `trivia_questions` table includes a `fingerprint` column that stores the normalized question fingerprint:

```sql
ALTER TABLE trivia_questions ADD COLUMN fingerprint TEXT;
CREATE INDEX idx_trivia_fingerprint ON trivia_questions (fingerprint);
```

### Code Components

1. **Fingerprint Generation**: `generateQuestionFingerprint` in `src/lib/openaiService.ts`
   ```typescript
   function generateQuestionFingerprint(question: string, tags: string[]): string {
     const normalizedQuestion = question.toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
     const normalizedTags = [...tags].sort().join('|').toLowerCase();
     return `${normalizedQuestion}|${normalizedTags}`;
   }
   ```

2. **Duplicate Checking**: `checkQuestionExists` in `src/lib/openaiService.ts`
   - Checks for existing questions using the fingerprint
   - Falls back to text comparison if fingerprint checking fails

3. **Question Saving**: `saveUniqueQuestions` in `src/lib/questionGeneratorService.ts`
   - Generates a fingerprint for each new question
   - Checks for duplicates before saving
   - Stores the fingerprint with the question

## Maintenance Scripts

1. **Adding Fingerprint Column**: `scripts/add_fingerprint_column.sql`
   - SQL migration to add the fingerprint column and index

2. **Updating Existing Questions**: `scripts/update_fingerprints.js`
   - Utility script to generate and store fingerprints for existing questions
   - Run this after adding the fingerprint column to populate it for existing data

## Benefits

- More reliable duplicate detection compared to simple text matching
- Improved system performance through proper indexing
- Reduced database size by preventing duplicate storage
- Enhanced user experience by avoiding duplicate questions

## Usage

To activate fingerprinting:

1. Run the SQL migration to add the fingerprint column:
   ```
   psql -U your_user -d your_database -f scripts/add_fingerprint_column.sql
   ```

2. Run the update script to generate fingerprints for existing questions:
   ```
   node scripts/update_fingerprints.js
   ```

The system will automatically use fingerprints for all new questions that are generated. 