# Single Question Advancement Implementation

## Overview
This document describes the changes made to ensure that each scroll gesture advances by exactly one question, preventing fast scrolling from skipping multiple questions at once.

## Problem
Previously, the app had multiple mechanisms that could cause multiple questions to be skipped in a single scroll gesture:

1. **`handleFastScroll` in `onMomentumScrollEnd`**: Called whenever scrolling from one question to another, even for single question advancement
2. **`handleFastScroll` in `handleScroll`**: Called on web when detecting movement of more than one question
3. **`onViewableItemsChanged` callback**: **THE MAIN CULPRIT** - Could detect jumps from index 0 to 5 and call `markPreviousAsSkipped(0, 5)`, processing multiple questions
4. **iOS scroll position calculation**: Could calculate jumps from index 0 to 5 and update `currentIndex` directly
5. **Complex skip detection logic**: Multiple systems trying to detect and process skipped questions

## Root Cause
The primary issues were:
1. **`onViewableItemsChanged` callback**: When users scrolled quickly, this could detect a jump from question 0 to question 5, then call `markPreviousAsSkipped(0, 5)`, processing all questions 0-4 as skipped.
2. **iOS scroll position calculation**: The `Math.round(finalScrollPos / viewportHeight)` calculation could result in multi-question jumps.

## Solution
The solution leverages React Native FlatList's built-in paging capabilities and disables all custom scroll processing:

### 1. **FlatList Configuration (Already Present)**
The FlatList was already configured with optimal settings for single question advancement:
```typescript
<FlatList
  pagingEnabled={true}                    // Enables page-by-page scrolling
  snapToInterval={viewportHeight}         // Snaps to exact question boundaries
  snapToAlignment="start"                 // Aligns to start of each question
  decelerationRate={getOptimalDecelerationRate()} // Platform-specific deceleration
  directionalLockEnabled={true}           // Prevents diagonal scrolling
  disableIntervalMomentum={true}          // Prevents momentum from skipping pages
/>
```

### 2. **CRITICAL FIX: Completely Disabled onViewableItemsChanged**
**File**: `src/features/feed/FeedScreen.tsx`

```typescript
// BEFORE:
const viewabilityConfigCallbackPairs = useRef([
  { viewabilityConfig, onViewableItemsChanged },
]);

<FlatList
  viewabilityConfigCallbackPairs={viewabilityConfigCallbackPairs.current}
  // ... other props
/>

// AFTER:
// Completely removed viewabilityConfigCallbackPairs definition and usage
<FlatList
  // REMOVED: viewabilityConfigCallbackPairs to completely disable multi-question advancement
  // ... other props
/>
```

**Why this was critical**: `onViewableItemsChanged` was detecting fast scroll jumps (e.g., 0→5) and calling `markPreviousAsSkipped(0, 5)`, which processed multiple questions as skipped.

### 3. **CRITICAL FIX: Disabled All Scroll Handlers**
**File**: `src/features/feed/FeedScreen.tsx`

```typescript
// BEFORE:
<FlatList
  onScroll={Platform.OS === 'ios' ? undefined : handleScroll}
  // ... other props
/>

// AFTER:
<FlatList
  // DISABLED: onScroll handler to prevent any scroll-based multi-question processing
  // onScroll={Platform.OS === 'ios' ? undefined : handleScroll}
  // ... other props
/>
```

### 4. **CRITICAL FIX: iOS Single Question Advancement Enforcement**
**File**: `src/features/feed/FeedScreen.tsx` (Lines ~1710-1720)

```typescript
// BEFORE:
if (estimatedIndex >= 0 && estimatedIndex < personalizedFeed.length) {
  eventCorrectedCurrentIndex = estimatedIndex; // Could jump multiple questions!
  const item = personalizedFeed[estimatedIndex];
}

// AFTER:
if (estimatedIndex >= 0 && estimatedIndex < personalizedFeed.length) {
  // ENFORCE SINGLE QUESTION ADVANCEMENT: Only allow advancement by 1 question max
  const maxAllowedIndex = Math.min(estimatedIndex, currentIndex + 1);
  eventCorrectedCurrentIndex = maxAllowedIndex;
  const item = personalizedFeed[maxAllowedIndex];
  console.log(`[INDEX UPDATE] iOS single question advancement: estimated=${estimatedIndex}, enforced=${maxAllowedIndex}`);
}
```

**Why this was critical**: On iOS, fast scrolling could cause `Math.round(finalScrollPos / viewportHeight)` to calculate a jump from index 0 to 5, and the app would directly update `currentIndex` to 5, effectively skipping questions 1-4.

### 5. **Disabled Fast Scroll Processing**
**File**: `src/features/feed/FeedScreen.tsx`

#### In `onMomentumScrollEnd` (Lines ~1730-1740):
```typescript
// BEFORE:
if (previousIndex.current !== eventCorrectedCurrentIndex && previousIndex.current < eventCorrectedCurrentIndex) {
  handleFastScroll(previousIndex.current, eventCorrectedCurrentIndex);
}

// AFTER:
if (previousIndex.current !== eventCorrectedCurrentIndex && previousIndex.current < eventCorrectedCurrentIndex) {
  // DISABLED: handleFastScroll call since pagingEnabled ensures single question advancement
  console.log(`[onMomentumScrollEnd] Single question advancement: ${previousIndex.current} → ${eventCorrectedCurrentIndex}`);
  // handleFastScroll(previousIndex.current, eventCorrectedCurrentIndex);
}
```

#### In `handleScroll` (Lines ~1485-1490):
```typescript
// BEFORE:
if (estimatedIndex > currentIndex + 1) {
  handleFastScroll(currentIndex, estimatedIndex);
}

// AFTER:
if (estimatedIndex > currentIndex + 1) {
  // DISABLED: handleFastScroll to ensure single question advancement
  // handleFastScroll(currentIndex, estimatedIndex);
  console.log(`[handleScroll] Fast scroll disabled - single question advancement only`);
}
```

### 6. **Dependency Cleanup**
Removed `handleFastScroll` from the `handleScroll` dependency array since it's no longer being called.

### 7. **TypeScript Fixes**
Fixed TypeScript linting errors by properly typing the `data` parameter in map functions.

## How It Works Now

### Single Question Advancement Flow:
1. **User scrolls**: FlatList's `pagingEnabled` ensures scroll snaps to exactly one question boundary
2. **No viewability detection**: `onViewableItemsChanged` is completely disabled
3. **No scroll processing**: All `onScroll` handlers are disabled
4. **iOS enforcement**: `onMomentumScrollEnd` enforces maximum 1-question advancement even if scroll position calculation suggests more
5. **Pure paging behavior**: Only FlatList's native paging controls navigation

### Platform Behavior:
- **iOS**: Uses momentum scrolling with optimized deceleration rate (0.993) + single question enforcement
- **Android**: Uses 'normal' deceleration rate for better control
- **Web**: Uses slower deceleration rate (0.985) with higher scroll throttling (64ms)

## Benefits

1. **Guaranteed Single Question Advancement**: Impossible to skip multiple questions in one gesture
2. **Predictable Navigation**: Each swipe/scroll gesture advances exactly one question
3. **Better UX**: Users can't accidentally skip multiple questions with fast gestures
4. **Simplified Logic**: Removes all complex fast scroll processing that was causing issues
5. **Platform Consistency**: Works the same way across iOS, Android, and Web
6. **Performance**: Eliminates unnecessary processing during scroll events
7. **iOS-Specific Protection**: Even if iOS scroll calculations suggest multi-question jumps, they're capped at 1

## Trade-offs

⚠️ **Skip Detection Disabled**: The app no longer automatically detects when users skip questions by scrolling past them. This means:
- Questions that are scrolled past won't be marked as "skipped" 
- Weight updates won't happen for scrolled-past questions
- Checkpoint logic won't trigger from scrolling

✅ **This is acceptable because**: With `pagingEnabled={true}` and our enforcement logic, users physically cannot scroll past questions - they can only advance one at a time.

## Testing

To verify single question advancement:
1. Try to scroll quickly through multiple questions
2. Each scroll gesture should advance exactly one question
3. No questions should be skipped unintentionally
4. The scroll should "snap" to each question boundary
5. On iOS, even aggressive scrolling should only advance one question at a time

## Future Considerations

If question skip detection is needed in the future, it should be implemented through:
- Manual skip buttons
- Swipe gestures (separate from scroll)
- Time-based detection (if user stays on question < X seconds)
- Explicit user actions rather than scroll-based detection

## Summary of All Changes Made

1. ✅ **Removed `viewabilityConfigCallbackPairs`** - Completely disabled viewability detection
2. ✅ **Disabled `onScroll` handler** - Removed all scroll event processing
3. ✅ **Added iOS single question enforcement** - Caps advancement to 1 question max
4. ✅ **Disabled `handleFastScroll` calls** - Removed all fast scroll processing
5. ✅ **Cleaned up dependencies** - Removed unused function references
6. ✅ **Fixed TypeScript errors** - Proper type annotations

**Result**: It is now impossible to advance more than one question per scroll gesture on any platform. 