# Fix: Already Answered Questions Appearing in Feed After Refresh

## Problem
After implementing Redux persistence for question answers, the app was correctly loading previously answered questions from storage, but the feed generation logic wasn't properly filtering out these already-answered questions when creating the initial feed after a refresh.

**Symptoms:**
- Questions that were already answered/skipped appeared in the feed again after refresh
- FastScroll logic correctly detected these as "already processed" and skipped them
- Ring progress was preserved (working correctly) but feed contained duplicate answered questions

## Root Cause
The feed generation functions (`getPersonalizedFeed` and `getColdStartFeed`) only filtered out questions from their internal state (`shownQuestionIds` in cold start state), but they didn't know about the Redux `questions` state that contains the persisted answer data.

**Timeline of events:**
1. Redux persistence loads answered questions into `state.questions` ✅
2. Feed generation calls `getPersonalizedFeed(feedData, userProfile)` ❌
3. These functions don't check Redux `questions` state ❌
4. Already answered questions get included in the feed ❌
5. FastScroll logic detects them as "already processed" and skips them ✅

## Solution
Added filtering of already answered questions from Redux state **before** passing them to the personalization functions in the initial feed generation effects.

### Changes Made:

1. **Added `questionsLoaded` selector** to `FeedScreen.tsx`
2. **Updated initial feed generation effects** to:
   - Wait for `questionsLoaded` to be true before generating feed
   - Filter out questions with status 'answered' or 'skipped' from Redux state
   - Pass only unanswered questions to personalization functions
3. **Updated dependency arrays** to include `questions` and `questionsLoaded`

### Code Changes:

```typescript
// Added questionsLoaded selector
const questionsLoaded = useAppSelector(state => state.trivia.questionsLoaded);

// Updated effects to filter already answered questions
if (feedData.length > 0 && personalizedFeed.length === 0 && questionsLoaded) {
  // Filter out questions that have already been answered or skipped from Redux state
  const answeredQuestionIds = new Set(
    Object.keys(questions).filter(id => 
      questions[id] && (questions[id].status === 'answered' || questions[id].status === 'skipped')
    )
  );
  
  const unansweredQuestions = feedData.filter(item => !answeredQuestionIds.has(item.id));
  
  const { items, explanations } = getPersonalizedFeed(unansweredQuestions, userProfile);
  // ... rest of feed generation
}
```

## Expected Results
- ✅ Ring progress continues from where it left off after refresh (already working)
- ✅ Feed only contains unanswered questions after refresh
- ✅ No more "already processed" messages in FastScroll logs
- ✅ Clean feed experience after app refresh

## Files Modified
- `src/features/feed/FeedScreen.tsx` - Added filtering logic to initial feed generation effects
- Updated 2 useEffect hooks that handle initial feed generation
- Added `questionsLoaded` dependency to ensure proper timing

## Testing
1. Answer some questions in different topics
2. Refresh the app
3. Verify that only unanswered questions appear in the feed
4. Verify that ring progress is maintained
5. Check console logs for absence of "already processed" messages 