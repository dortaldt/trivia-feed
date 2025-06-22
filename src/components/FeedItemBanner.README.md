# FeedItemBanner Component

A modular banner component designed to display informational messages at the bottom of feed items. The component follows the app's UI style and supports dismissal with persistence.

## Features

- **Modular Design**: Can be easily integrated into any feed item
- **Dismissal Logic**: Users can dismiss banners, and this preference is persisted
- **Theme Support**: Automatically adapts to both regular and neon themes
- **Animations**: Smooth fade-in/fade-out animations
- **Accessibility**: Proper touch targets and screen reader support
- **Type Safety**: Full TypeScript support with proper icon type checking

## Usage

### Basic Usage

```tsx
import FeedItemBanner, { BannerContent } from './FeedItemBanner';

const myBanner: BannerContent = {
  id: 'swipe-tip',
  title: "Don't like a question? Swipe down",
  description: "",
  icon: 'arrow-down',
  type: 'tip',
};

<FeedItemBanner
  content={myBanner}
  onDismiss={(bannerId) => {
    console.log('Banner dismissed:', bannerId);
  }}
/>
```

### With Action Button

```tsx
const bannerWithAction: BannerContent = {
  id: 'streak-info',
  title: 'Building Streak',
  description: 'Answer questions daily to maintain your learning streak!',
  icon: 'zap',
  type: 'info',
  actionText: 'Learn More',
  onActionPress: () => {
    // Handle action
    console.log('Action pressed');
  },
};
```

## BannerContent Interface

```tsx
interface BannerContent {
  id: string;                    // Unique identifier for the banner
  title: string;                 // Banner title
  description: string;           // Banner description text
  icon?: FeatherIconName;        // Optional icon (from Feather icons)
  actionText?: string;           // Optional action button text
  onActionPress?: () => void;    // Optional action button handler
  type?: 'tip' | 'info' | 'warning' | 'success'; // Banner type for styling
}
```

## Banner Types

- **tip**: Cyan color, lightbulb icon by default
- **info**: Blue color, info icon by default  
- **warning**: Yellow color, alert-triangle icon by default
- **success**: Green color, check-circle icon by default

## Styling

The component automatically adapts to:
- **Regular Theme**: Semi-transparent backgrounds with subtle shadows
- **Neon Theme**: Vibrant gradient backgrounds with neon borders, glow effects, and dynamic overlays
- **Dark/Light Mode**: Appropriate text colors for each color scheme
- **Dynamic Layout**: Automatically removes description space when no description is provided

## Persistence

Dismissed banners are stored in AsyncStorage with the key `dismissed_banners`. Once dismissed, a banner won't appear again unless the app data is cleared.

## Integration Example

Here's how the swipe tip banner is integrated into FeedItem:

```tsx
// In FeedItem component
const [shouldShowSwipeTip, setShouldShowSwipeTip] = useState(false);

// Check if we should show the swipe tip banner
useEffect(() => {
  const checkSwipeTipEligibility = async () => {
    try {
      const totalAnswered = userProfile?.totalQuestionsAnswered || 0;
      const isUnanswered = !questionState || questionState.status === 'unanswered';
      
      // Get session count from session manager
      const currentSessionCount = await sessionManager.getCurrentSessionCount();
      
      // Check if banner was dismissed
      const dismissedBanners = await AsyncStorage.getItem('dismissed_banners');
      const dismissedIds = dismissedBanners ? JSON.parse(dismissedBanners) : [];
      const wasDismissed = dismissedIds.includes('swipe-tip');
      
      // Check if banner was already shown for specific questions
      const shownForQuestions = await AsyncStorage.getItem('swipe_tip_shown_questions');
      const shownQuestionIds = shownForQuestions ? JSON.parse(shownForQuestions) : [];
      
      // Check if user has ever skipped a question before
      const hasNeverSkipped = !Object.values(allQuestions).some(q => q && q.status === 'skipped');
      
      // Only show if:
      // 1. User is in first or second session
      // 2. User is on exactly the 5th or 25th question
      // 3. Current question is unanswered
      // 4. Banner was not globally dismissed
      // 5. Banner was not already shown for this specific question number
      // 6. User has never skipped a question before
      const isTargetQuestion = currentQuestionNumber === 5 || currentQuestionNumber === 25;
      const isEarlySession = currentSessionCount <= 2;
      const notShownForThisQuestion = !shownQuestionIds.includes(currentQuestionNumber);
      
      const shouldShow = isTargetQuestion && isEarlySession && isUnanswered && !wasDismissed && notShownForThisQuestion && hasNeverSkipped;
      setShouldShowSwipeTip(shouldShow);
      
      // If banner should show, mark this question as shown
      if (shouldShow) {
        const updatedShownQuestions = [...shownQuestionIds, currentQuestionNumber];
        await AsyncStorage.setItem('swipe_tip_shown_questions', JSON.stringify(updatedShownQuestions));
      }
    } catch (error) {
      setShouldShowSwipeTip(false);
    }
  };

  checkSwipeTipEligibility();
}, [userProfile?.totalQuestionsAnswered, questionState?.status]);

const swipeTipBanner: BannerContent = {
  id: 'swipe-tip',
  title: "Don't like a question? Swipe down",
  description: "",
  icon: 'arrow-down',
  type: 'tip',
};

// In JSX
{shouldShowSwipeTip && (
  <FeedItemBanner
    content={swipeTipBanner}
    onDismiss={(bannerId) => {
      console.log('Banner dismissed:', bannerId);
    }}
    style={{ marginTop: 20 }}
  />
)}
```

## Session Management

The banner system includes a session manager (`src/utils/sessionManager.ts`) that tracks user sessions:

- **Session Definition**: A new session starts each day the user opens the app
- **Session Tracking**: Automatically initialized when the app starts
- **Banner Eligibility**: The swipe tip banner only shows during the first 2 sessions
- **Question Targeting**: Shows only once when first reaching the 5th and 25th questions
- **One-Time Display**: Each target question shows the banner only once, tracked separately
- **Skip Detection**: Only shows if user has never skipped a question before (they don't already know the feature)

## Creating New Banners

To create new banner types:

1. Define the banner content with a unique ID
2. Add logic to determine when to show the banner
3. Add the banner to your component's JSX
4. Handle dismissal if needed

## Performance

- Uses `React.memo` optimizations where possible
- Animations use `useNativeDriver` for better performance
- Dismissed banners are immediately hidden to prevent re-renders 