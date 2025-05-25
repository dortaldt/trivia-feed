# Topic Rings Component

A React Native component that creates Apple Fitness-style rings to track user progress in different trivia topics.

## Features

- 🎯 **Apple Fitness-style design**: Beautiful animated rings that fill as users answer questions correctly
- 📊 **Level progression**: Each ring has levels that increase in difficulty as users progress
- 🎨 **Topic-specific styling**: Each topic has its own color and icon from Feather Icons
- ⚡ **Real-time updates**: Rings automatically update when users answer questions correctly
- 🔧 **Configurable**: Easy to adjust target answers, scaling factors, and maximum levels
- 📱 **Cross-platform**: Works on iOS, Android, and Web

## Installation

The component is already integrated into the app. Just import and use it:

```tsx
import { TopicRings } from '../components/TopicRings';
```

## Basic Usage

```tsx
<TopicRings
  size={50}
  userId={user?.id}
  onRingComplete={(topic, level) => {
    console.log(`🎉 ${topic} reached level ${level}!`);
  }}
/>
```

## Configuration

You can customize the ring behavior by passing a config object:

```tsx
import { DEFAULT_RING_CONFIG } from '../types/topicRings';

<TopicRings
  size={60}
  config={{
    ...DEFAULT_RING_CONFIG,
    baseTargetAnswers: 5,     // Answers needed for level 1
    scalingFactor: 1.2,       // Each level requires 20% more answers
    maxDisplayLevel: 50,      // Show up to level 50
  }}
  onRingComplete={(topic, level) => {
    // Handle level completion
  }}
/>
```

## How It Works

1. **Data Source**: The component automatically tracks correct answers from the Redux store
2. **Topic Selection**: Shows the top 3 topics based on user profile weights
3. **Progress Tracking**: Each correct answer fills the ring progressively
4. **Level Up**: When a ring is completed, the user advances to the next level
5. **Scaling**: Higher levels require more correct answers (configurable)

## Ring Display Logic

- Shows top 3 topics based on user profile weights
- Only displays for logged-in users (not guest mode)
- Requires at least one topic with interactions
- Rings are ordered by topic preference/weight

## Customization

### Topic Colors and Icons

Colors and icons are defined in `src/types/topicRings.ts`:

```tsx
export const TOPIC_COLORS: { [key: string]: string } = {
  'Science': '#00D4FF',
  'History': '#FF6B35',
  'Sports': '#32CD32',
  // ... add more topics
};

export const TOPIC_ICONS: { [key: string]: string } = {
  'Science': 'zap',
  'History': 'book', 
  'Sports': 'activity',
  // ... uses Feather icon names
};
```

### Ring Configuration

Default configuration can be modified:

```tsx
export const DEFAULT_RING_CONFIG: RingConfig = {
  baseTargetAnswers: 5,    // Easy to adjust difficulty
  scalingFactor: 1.2,      // How much harder each level gets
  maxDisplayLevel: 50,     // Maximum level to show
};
```

## Integration Points

### FeedScreen Integration

The rings are positioned next to the profile button:

```tsx
{/* Topic Rings next to profile button */}
{!isGuest && userProfile?.topics && Object.keys(userProfile.topics).length > 0 && (
  <View style={styles.topicRingsContainer}>
    <TopicRings
      size={50}
      userId={user?.id}
      onRingComplete={(topic, level) => {
        console.log(`🎉 ${topic} reached level ${level}!`);
      }}
    />
  </View>
)}
```

### Redux Integration

The component uses a custom hook `useTopicRings` that connects to:
- `state.trivia.questions` - To track correct answers
- `state.trivia.userProfile` - To get topic weights and preferences
- `state.trivia.personalizedFeed` - To map questions to topics

## Styling

The component uses pure React Native components (no external dependencies) with:
- Animated progress rings using `Animated.View`
- Smooth animations with `useNativeDriver: true`
- Platform-agnostic styling
- Responsive sizing based on the `size` prop

## Performance

- **Efficient**: Only updates when questions or user profile changes
- **Memoized**: Uses `useCallback` for expensive operations
- **Client-side**: All data is stored locally (no database calls)
- **Scalable**: Designed to handle many topics and levels

## Example Use Cases

1. **Gamification**: Encourage users to answer more questions in their favorite topics
2. **Progress Tracking**: Visual representation of learning progress
3. **Motivation**: Clear goals and achievements through level progression
4. **Personalization**: Shows most relevant topics to each user

## Future Enhancements

- 🏆 Achievement badges for completing certain levels
- 🎊 Celebration animations when leveling up
- 📈 Statistics and insights about progress
- 🔄 Seasonal themes and special events
- 💾 Persistence to local storage for offline access

## Testing

Use the test component to see the rings in action:

```tsx
import { TopicRingsTest } from '../components/TopicRingsTest';

// Render in your app to test
<TopicRingsTest />
``` 