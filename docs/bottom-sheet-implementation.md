# Bottom Sheet Implementation Documentation

## Architecture Overview

The implementation uses a three-tier approach for bottom sheets:

1. **Base Component**: A reusable `BottomSheet` component that handles core functionality.
2. **Feature-Specific Components**: Custom components like `ProfileBottomSheet` and `LeaderboardBottomSheet` that wrap the base component.
3. **Root Integration**: Bottom sheets are mounted at the root level of the app for proper z-index layering.

## Component Hierarchy

```
FeedScreen (Root Container)
│
├─ FlatList (Scrollable Content)
│  └─ FeedItem (Content Items)
│
├─ ProfileBottomSheet (Mounted at root level)
│  └─ BottomSheet (Base component)
│     └─ ProfileView (Content)
│
└─ LeaderboardBottomSheet (Mounted at root level)
   └─ BottomSheet (Base component)
      └─ Leaderboard (Content)
```

## Implementation Details

### 1. Base BottomSheet Component

- Uses `@gorhom/bottom-sheet` for the core functionality
- Handles state tracking to prevent double-close bugs
- Properly integrates with gesture handling
- Provides consistent UI across platforms

```jsx
// src/components/BottomSheet.tsx
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import BottomSheetCore, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type BottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
  children: React.ReactNode;
  initialSnapPoint?: number;
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  snapPoints: customSnapPoints,
  children,
  initialSnapPoint = 0
}) => {
  const bottomSheetRef = useRef<BottomSheetCore>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  
  // Add refs to track state
  const isClosingRef = useRef(false);
  const isManualClose = useRef(false);
  
  const snapPoints = useMemo(() => 
    customSnapPoints || ['50%', '80%', '100%'], 
    [customSnapPoints]
  );

  // Reset flags when visibility changes
  useEffect(() => {
    if (isVisible) {
      isClosingRef.current = false;
      isManualClose.current = false;
    }
  }, [isVisible]);

  // Handle sheet expansion/closing based on visibility prop
  useEffect(() => {
    if (isVisible) {
      // Using a slight delay to avoid animation conflicts on iOS
      const timer = setTimeout(() => {
        bottomSheetRef.current?.expand();
      }, Platform.OS === 'ios' ? 100 : 0);
      
      return () => clearTimeout(timer);
    } else if (!isManualClose.current) {
      // Only close if not already manually closing
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1 && !isManualClose.current) {
      // Only call onClose if this isn't a result of pressing the X button
      // This prevents double toggling
      if (!isClosingRef.current) {
        onClose();
      }
      isClosingRef.current = false;
    }
  }, [onClose]);

  const handleManualClose = useCallback(() => {
    // Mark that we're manually closing to prevent duplicate onClose calls
    isManualClose.current = true;
    isClosingRef.current = true;
    
    // First close the sheet
    bottomSheetRef.current?.close();
    
    // After a slight delay, call onClose and reset the flag
    setTimeout(() => {
      onClose();
      isManualClose.current = false;
      isClosingRef.current = false;
    }, 100);
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.7}
        enableTouchThrough={false}
      />
    ),
    []
  );

  return (
    <BottomSheetCore
      ref={bottomSheetRef}
      index={isVisible ? initialSnapPoint : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? Colors.dark.text : Colors.light.text,
        opacity: 0.5,
      }}
      onChange={handleSheetChanges}
      enableContentPanningGesture={true}
      handleStyle={styles.handleStyle}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      {...(Platform.OS === 'ios' ? {
        enableOverDrag: true,
        animateOnMount: true
      } : {})}
    >
      <BottomSheetView style={styles.contentContainer}>
        {title && (
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity 
              onPress={handleManualClose} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <View style={styles.closeButtonCircle}>
                <FeatherIcon name="x" size={20} color="black" />
              </View>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.bodyContainer, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetCore>
  );
};
```

### 2. Feature Components

Both `ProfileBottomSheet` and `LeaderboardBottomSheet`:
- Accept consistent props: `isVisible` and `onClose`
- Use `useCallback` to prevent unnecessary re-renders
- Adapt snap points based on platform
- Handle safe area insets

Example of a feature-specific bottom sheet component:

```jsx
// src/components/ProfileBottomSheet.tsx
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import BottomSheet from './BottomSheet';
import ProfileView from '../features/profile/ProfileView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileBottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
};

const ProfileBottomSheet: React.FC<ProfileBottomSheetProps> = ({ 
  isVisible, 
  onClose 
}) => {
  const insets = useSafeAreaInsets();
  
  // Use a proper callback for closing to prevent re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // Determine appropriate snap points based on platform
  const snapPoints = Platform.OS === 'ios' 
    ? ['65%', '90%'] 
    : ['70%', '90%'];

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      title="Profile"
      snapPoints={snapPoints}
    >
      <View style={[
        styles.container,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }
      ]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileView />
        </ScrollView>
      </View>
    </BottomSheet>
  );
};
```

### 3. State Management

- State is managed at the root level (FeedScreen)
- Toggle functions are passed down to child components
- Bottom sheets are rendered as siblings to the main content

```jsx
// src/features/feed/FeedScreen.tsx (partial)
const FeedScreen: React.FC = () => {
  // Bottom sheet visibility state
  const [showProfile, setShowProfile] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  // Toggle functions
  const toggleProfile = useCallback(() => {
    setShowProfile(prev => !prev);
  }, []);
  
  const toggleLeaderboard = useCallback((itemId?: string) => {
    setShowLeaderboard(prev => !prev);
  }, []);
  
  return (
    <View style={styles.container}>
      {/* Main content */}
      <FlatList
        // ... flatlist props
        renderItem={({ item }) => (
          <FeedItem 
            item={item}
            // Pass toggle function to children
            onToggleLeaderboard={() => toggleLeaderboard(item.id)}
          />
        )}
      />
      
      {/* Bottom sheets at root level */}
      <ProfileBottomSheet isVisible={showProfile} onClose={toggleProfile} />
      <LeaderboardBottomSheet isVisible={showLeaderboard} onClose={toggleLeaderboard} />
    </View>
  );
};
```

## Best Practices

1. **Mounting Location**: Always mount bottom sheets at the root level of a screen to ensure proper z-index stacking and prevent scrollable content underneath.

2. **State Management**: Keep visibility state and toggle handlers at the highest component level where multiple children need access.

3. **Consistent API**: Maintain the same props interface (`isVisible`, `onClose`) across all bottom sheet components.

4. **Platform Adaptations**: Use platform-specific adjustments for better UX:
   ```javascript
   const snapPoints = Platform.OS === 'ios' 
     ? ['65%', '90%'] 
     : ['70%', '90%'];
   ```

5. **Gesture Handling**: Ensure GestureHandlerRootView wraps the entire app, not individual components:
   ```jsx
   // app/_layout.tsx
   import { GestureHandlerRootView } from 'react-native-gesture-handler';

   export default function Layout() {
     return (
       <GestureHandlerRootView style={{ flex: 1 }}>
         <App />
       </GestureHandlerRootView>
     );
   }
   ```

6. **Performance**: Use `useCallback` for event handlers to prevent unnecessary re-renders.

## Common Issues to Avoid

1. **Nested Bottom Sheets**: Never render a bottom sheet inside another component that might scroll or have a varying z-index.

2. **Multiple Toggle Sources**: When components at different levels can trigger the same bottom sheet, maintain a single source of truth for state.

3. **Gesture Conflicts**: Bottom sheets may conflict with other gesture-based components if not properly structured.

4. **Z-Index Problems**: If the bottom sheet appears behind other components, check it's mounted at the root level of the screen.

5. **Double Toggle**: Handle close events properly to prevent the issue where clicking the 'X' button closes and immediately reopens the sheet. 