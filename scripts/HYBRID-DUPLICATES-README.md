# Hybrid Duplicate Detector for Trivia Questions

This script implements an advanced approach to detect duplicate trivia questions by combining multiple strategies:

## Key Features

1. **Question Text Similarity** - Uses Levenshtein distance to measure how similar questions are textually
2. **Answer Matching** - Compares answers to verify that similar questions have similar answers
3. **Enhanced Fingerprinting** - Distinguishes truly different questions even when answers match

## Example Use Cases

The hybrid approach solves issues with previous duplicate detection methods:

### Previous False Positives Now Correctly Handled

1. **Different monuments with similar question structure:**
   - "What ancient monument was built by the Inca civilization in Peru?" (Answer: Machu Picchu)
   - "What ancient monument is located in Egypt with the body of a lion?" (Answer: Sphinx)

2. **Oscar award questions:**
   - "Which film won the Oscar for Best Picture in 2020?" (Answer: Parasite)
   - "Which actor won the Oscar for Best Actor in 2020?" (Answer: Joaquin Phoenix)

3. **Magna Carta questions:**
   - "In what year was the Magna Carta signed?" (Answer: 1215)
   - "In which country was the Magna Carta signed?" (Answer: England)

4. **Different Vincent van Gogh questions:**
   - "Which artist is known for cutting off his ear?" (Answer: Vincent van Gogh)
   - "Who painted 'Starry Night'?" (Answer: Vincent van Gogh)

## How It Works

The script uses a multi-phase approach:

### Phase 1: Answer-based Grouping

Questions with the same answer are grouped, but then further analyzed with:
- Question intent detection (date, location, person)
- Fingerprint similarity (entities, properties, context)
- Property context analysis (what aspect of the subject is being asked)

### Phase 2: Question Similarity Detection

Questions with very similar wording are grouped, but only if:
- Their answers are also very similar
- They share similar fingerprints

### Enhanced Fingerprinting

The script creates rich fingerprints for each question that capture:
- Question words (what, who, when, etc.)
- Quoted entities (like 'Starry Night')
- Property words (painted, wrote, directed, etc.)
- Subjective vs. objective framing
- Temporal, spatial and numerical indicators
- Creation types (novel, painting, film, etc.)

## Interactive Usage

The script displays potential duplicate groups with highlighting of differences and allows users to:
- Keep all questions in a group
- Remove all duplicates (keeping one question per group)
- Skip a group entirely

## Running the Script

```bash
# Make sure the script is executable
chmod +x scripts/run-hybrid-duplicate-detector.sh

# Run the script
./scripts/run-hybrid-duplicate-detector.sh
```

## Configuration

Key parameters can be adjusted in the CONFIG object at the top of the script:

```javascript
const CONFIG = {
  // Question text similarity thresholds
  QUESTION_SIMILARITY_HIGH: 0.85,  // Questions are almost certainly duplicates
  QUESTION_SIMILARITY_MEDIUM: 0.70, // Questions might be duplicates
  
  // Answer similarity thresholds  
  ANSWER_MATCH_REQUIRED: 0.90,     // Answers must be very similar
  
  // Fingerprint similarity thresholds
  FINGERPRINT_DIFFERENCE_THRESHOLD: 0.35, // Below this, questions likely asking different things
  
  // Skip certain generic answers that would create false positives
  SKIP_GENERIC_ANSWERS: [
    "true", "false", "yes", "no", 
    "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", 
    "unknown", "none"
  ]
};
``` 