# Mobile Browser Optimization Plan

## Overview

This document outlines the optimization strategy for addressing performance issues in the mobile browser version of the TriviaFeed application. The current implementation suffers from significant delays and lag when running on mobile browsers, impacting user experience and engagement.

## Root Causes

Through code analysis, we've identified several performance bottlenecks:

1. **Heavy animations and UI effects**
   - Complex animation sequences with nested Animated components
   - Continuous loop animations (TikTok-style scrolling demo)
   - Multiple animated values for individual UI elements
   - Staggered animations for all answer options

2. **Inefficient rendering patterns**
   - Frequent component re-renders
   - Multiple state updates triggering render cascades
   - Insufficient memoization of expensive calculations
   - Debug logging in production code

3. **Suboptimal asset handling**
   - Multiple custom fonts loading at startup
   - Dynamic CSS injection at runtime
   - Large images without proper optimization

4. **React Native Web limitations**
   - Complex gesture handling
   - Virtualization issues with scrolling content
   - Platform-specific performance differences

5. **Viewport and layout handling**
   - Frequent viewport recalculations
   - Non-passive event listeners
   - Fixed positioning with complex calculations

## Optimization Priorities

Tasks are organized in priority order, focusing on highest-impact improvements first:

### Phase 1: Critical Performance Improvements
- [ ] Optimize animations and reduce animation complexity
- [ ] Fix rendering inefficiencies
- [ ] Implement mobile-specific detection and optimizations

### Phase 2: Asset Optimization
- [ ] Optimize font loading strategy
- [ ] Implement image optimization
- [ ] Reduce initial bundle size

### Phase 3: Advanced Optimizations
- [ ] Implement virtualized lists
- [ ] Add progressive enhancement
- [ ] Optimize data fetching and caching

## Detailed Implementation Plan

### Phase 1: Critical Performance Improvements

#### 1.1 Optimize Animations

**Target files:**
- `src/features/feed/FeedScreen.tsx`
- `src/features/feed/FeedItem.tsx`
- `src/hooks/useIOSAnimations.ts` (if exists)

**Steps:**
1. Add a performance mode setting to disable animations on low-power devices:
   ```javascript
   // In a new file: src/utils/performanceUtils.ts
   export const isLowPowerDevice = () => {
     if (Platform.OS !== 'web') return false;
     // Basic heuristic - can be refined
     return window.navigator.userAgent.includes('Mobile') || 
            (/iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream);
   };
   ```

2. Modify the TikTok-style animation in `FeedScreen.tsx`:
   ```javascript
   const createTikTokAnimation = () => {
     // Don't create expensive animations on low-power devices
     if (isLowPowerDevice()) {
       return null;
     }
     
     // Original animation code...
   };
   ```

3. Simplify staggered animations in `FeedItem.tsx`:
   ```javascript
   // Instead of animating each answer separately
   useEffect(() => {
     // Skip or simplify on low-power devices
     if (isLowPowerDevice()) {
       // Simple fade in all at once
       Animated.timing(fadeAnim, {
         toValue: 1,
         duration: 300,
         useNativeDriver: true
       }).start();
       return;
     }
     
     // Original staggered animation code for powerful devices...
   }, []);
   ```

4. Reduce animation frame rate for mobile web:
   ```javascript
   if (Platform.OS === 'web' && isLowPowerDevice()) {
     // Use simpler CSS transitions instead of JS animations for mobile web
     return <div style={{transition: 'opacity 0.3s ease'}} className={isVisible ? 'fade-in' : ''}>...</div>;
   }
   ```

#### 1.2 Fix Rendering Inefficiencies

**Target files:**
- `src/features/feed/FeedItem.tsx`
- `src/features/feed/FeedScreen.tsx`

**Steps:**
1. Wrap the FeedItem component with React.memo:
   ```javascript
   const FeedItem: React.FC<FeedItemProps> = React.memo(({ 
     item, 
     nextTopic, 
     onAnswer, 
     showExplanation, 
     onNextQuestion, 
     onToggleLeaderboard 
   }) => {
     // Component code...
   });
   ```

2. Apply useCallback for all event handlers:
   ```javascript
   // Instead of:
   const selectAnswer = (index: number) => { /* ... */ };
   
   // Use:
   const selectAnswer = useCallback((index: number) => {
     // Function body...
   }, [dependencies]);
   ```

3. Remove debug logging in production:
   ```javascript
   // Add conditional logging
   if (process.env.NODE_ENV !== 'production') {
     console.log(`[DEBUG] FeedItem component render #${renderCount.current} for item ${item.id}`);
   }
   ```

4. Optimize expensive calculations with proper dependencies:
   ```javascript
   const calculateFontSize = useMemo(() => {
     // Calculation logic...
   }, [item.question]); // Ensure proper dependencies
   ```

5. Batch state updates to reduce renders:
   ```javascript
   // Instead of multiple setState calls
   const handleAnswer = (index) => {
     setSelectedAnswerIndex(index);
     setShowLearningCapsule(true);
   };
   ```

#### 1.3 Implement Mobile Detection and Specific Optimizations

**Target files:**
- `app/_layout.tsx`
- `src/hooks/useMobileOptimization.ts` (new)

**Steps:**
1. Create a custom hook for detecting mobile browsers:
   ```javascript
   // src/hooks/useMobileOptimization.ts
   import { useState, useEffect } from 'react';
   import { Platform } from 'react-native';
   
   export const useMobileOptimization = () => {
     const [isMobileBrowser, setIsMobileBrowser] = useState(false);
     const [isLowPowerDevice, setIsLowPowerDevice] = useState(false);
     
     useEffect(() => {
       if (Platform.OS === 'web') {
         // Check if mobile browser
         const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
           navigator.userAgent
         );
         setIsMobileBrowser(isMobile);
         
         // Simple performance detection (can be improved)
         const isLowPower = isMobile || window.navigator.hardwareConcurrency <= 4;
         setIsLowPowerDevice(isLowPower);
       }
     }, []);
     
     return { isMobileBrowser, isLowPowerDevice };
   };
   ```

2. Update viewport meta to improve performance:
   ```javascript
   // In app/_layout.tsx
   useEffect(() => {
     if (Platform.OS === 'web') {
       // Better viewport settings for performance
       const viewportMeta = document.createElement('meta');
       viewportMeta.name = 'viewport';
       viewportMeta.content = 'width=device-width, initial-scale=1.0, viewport-fit=cover';
       document.head.appendChild(viewportMeta);
       
       // Remove existing viewport meta if present
       const existingMeta = document.querySelector('meta[name="viewport"]');
       if (existingMeta && existingMeta !== viewportMeta) {
         existingMeta.remove();
       }
     }
   }, []);
   ```

3. Add passive event listeners for scroll events:
   ```javascript
   // Update in relevant components like FeedScreen
   useEffect(() => {
     const options = { passive: true };
     window.addEventListener('scroll', handleScroll, options);
     return () => window.removeEventListener('scroll', handleScroll);
   }, []);
   ```

### Phase 2: Asset Optimization

#### 2.1 Optimize Font Loading

**Target files:**
- `app/_layout.tsx`

**Steps:**
1. Preload critical fonts only:
   ```javascript
   // Reduce number of fonts loaded initially
   const [loaded, error] = useFonts({
     'Inter-Regular': require('../assets/fonts/inter/Inter-Regular.ttf'),
     // Only load essential fonts first
   });
   ```

2. Update web font loading strategy:
   ```javascript
   // In app/_layout.tsx web styles
   const style = document.createElement('style');
   style.textContent = `
     @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap&display=swap');
     
     /* Add font-display property */
     @font-face {
       font-family: 'Inter';
       src: url('/assets/fonts/inter/Inter-Regular.woff2') format('woff2');
       font-weight: 400;
       font-display: swap; /* Show system font while custom font loads */
     }
   `;
   ```

3. Implement dynamic font loading for non-critical fonts:
   ```javascript
   // Load additional fonts only after initial render
   useEffect(() => {
     if (appIsReady && Platform.OS === 'web') {
       // Load non-critical fonts after app is initialized
       const fontLink = document.createElement('link');
       fontLink.rel = 'preload';
       fontLink.as = 'font';
       fontLink.href = '/assets/fonts/additional-font.woff2';
       fontLink.type = 'font/woff2';
       fontLink.crossOrigin = 'anonymous';
       document.head.appendChild(fontLink);
     }
   }, [appIsReady]);
   ```

#### 2.2 Implement Image Optimization

**Target files:**
- New utility file: `src/utils/imageOptimization.ts`
- Components using images

**Steps:**
1. Create image optimization utility:
   ```javascript
   // src/utils/imageOptimization.ts
   import { Platform, Image } from 'react-native';
   
   export const getOptimizedImageSource = (originalSrc: string, width?: number) => {
     if (Platform.OS !== 'web') return originalSrc;
     
     // For web platform, use responsive images
     if (width && originalSrc.startsWith('/')) {
       // Add sizing parameter for server-side resizing (if implemented)
       return `${originalSrc}?w=${width}`;
     }
     
     return originalSrc;
   };
   ```

2. Use responsive images in components:
   ```javascript
   import { getOptimizedImageSource } from '../utils/imageOptimization';
   
   // In a component
   const imageSrc = getOptimizedImageSource('/social-preview.png', 600);
   ```

3. Add lazy loading for images (web only):
   ```jsx
   {Platform.OS === 'web' ? (
     <img 
       src={imageSrc} 
       alt={imageAlt} 
       loading="lazy" 
       width={dimensions.width} 
       height={dimensions.height} 
     />
   ) : (
     <Image source={{uri: imageSrc}} style={styles.image} />
   )}
   ```

#### 2.3 Reduce Initial Bundle Size

**Target files:**
- `webpack.config.js` (if exists)
- `metro.config.js`

**Steps:**
1. Implement code splitting (if using webpack for web):
   ```javascript
   // Sample webpack configuration addition
   module.exports = {
     // existing config...
     optimization: {
       splitChunks: {
         chunks: 'all',
         maxInitialRequests: Infinity,
         minSize: 0,
         cacheGroups: {
           vendor: {
             test: /[\\/]node_modules[\\/]/,
             name(module) {
               const packageName = module.context.match(/[\\/]node_modules[\\/](.*?)([\\/]|$)/)[1];
               return `npm.${packageName.replace('@', '')}`;
             },
           },
         },
       },
     },
   };
   ```

2. Add bundle analysis capability:
   ```bash
   # Install bundle analyzer
   npm install --save-dev webpack-bundle-analyzer
   ```

3. Update production build process:
   ```javascript
   // In webpack config
   const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
   
   plugins: [
     process.env.ANALYZE && new BundleAnalyzerPlugin(),
   ].filter(Boolean)
   ```

### Phase 3: Advanced Optimizations

#### 3.1 Implement Virtualized Lists

**Target files:**
- `src/features/feed/FeedScreen.tsx`

**Steps:**
1. Replace standard FlatList with optimized version:
   ```javascript
   import { FlatList } from 'react-native';
   import { useMobileOptimization } from '../../hooks/useMobileOptimization';
   
   const FeedScreen = () => {
     const { isMobileBrowser } = useMobileOptimization();
     
     // Optimize FlatList for mobile browsers
     return (
       <FlatList
         data={feedData}
         renderItem={renderItem}
         keyExtractor={keyExtractor}
         initialNumToRender={isMobileBrowser ? 2 : 4}
         maxToRenderPerBatch={isMobileBrowser ? 1 : 2}
         windowSize={isMobileBrowser ? 3 : 5}
         removeClippedSubviews={true}
         // Other props...
       />
     );
   };
   ```

2. Implement windowing for web platform:
   ```jsx
   // For web platform, consider using react-window
   // npm install react-window
   
   import { FixedSizeList as List } from 'react-window';
   
   // Within component
   if (Platform.OS === 'web') {
     return (
       <List
         height={viewportHeight}
         itemCount={feedData.length}
         itemSize={viewportHeight}
         width="100%"
       >
         {({ index, style }) => (
           <div style={style}>
             {renderItem({ item: feedData[index], index })}
           </div>
         )}
       </List>
     );
   }
   ```

#### 3.2 Progressive Enhancement

**Target files:**
- `src/components/ProgressiveEnhancement.tsx` (new)
- Various component files

**Steps:**
1. Create a progressive enhancement component:
   ```jsx
   // src/components/ProgressiveEnhancement.tsx
   import React from 'react';
   import { Platform } from 'react-native';
   import { useMobileOptimization } from '../hooks/useMobileOptimization';
   
   type EnhancementLevel = 'base' | 'enhanced' | 'full';
   
   interface ProgressiveEnhancementProps {
     renderBase: () => React.ReactNode;
     renderEnhanced?: () => React.ReactNode;
     renderFull?: () => React.ReactNode;
   }
   
   export const ProgressiveEnhancement: React.FC<ProgressiveEnhancementProps> = ({
     renderBase,
     renderEnhanced,
     renderFull,
   }) => {
     const { isMobileBrowser, isLowPowerDevice } = useMobileOptimization();
     
     // Determine enhancement level
     const level: EnhancementLevel = isLowPowerDevice
       ? 'base'
       : isMobileBrowser
       ? 'enhanced'
       : 'full';
       
     // Render appropriate level
     switch (level) {
       case 'full':
         return <>{renderFull ? renderFull() : renderEnhanced ? renderEnhanced() : renderBase()}</>;
       case 'enhanced':
         return <>{renderEnhanced ? renderEnhanced() : renderBase()}</>;
       case 'base':
       default:
         return <>{renderBase()}</>;
     }
   };
   ```

2. Use the progressive enhancement component:
   ```jsx
   // In a component file
   import { ProgressiveEnhancement } from '../components/ProgressiveEnhancement';
   
   // In render function
   return (
     <ProgressiveEnhancement
       renderBase={() => (
         // Simplest version with minimal animations and effects
         <SimpleQuestionCard item={item} onAnswer={handleAnswer} />
       )}
       renderEnhanced={() => (
         // Medium complexity with some animations
         <EnhancedQuestionCard item={item} onAnswer={handleAnswer} />
       )}
       renderFull={() => (
         // Full version with all animations and effects
         <FullQuestionCard item={item} onAnswer={handleAnswer} />
       )}
     />
   );
   ```

#### 3.3 Optimize Data Fetching and Caching

**Target files:**
- `src/lib/triviaService.ts`
- `src/store/triviaSlice.ts`

**Steps:**
1. Implement data prefetching:
   ```javascript
   // In a service file
   export const prefetchNextQuestions = async (count = 5) => {
     try {
       const questions = await fetchTriviaQuestions(count);
       // Store in cache
       return questions;
     } catch (error) {
       console.error('Failed to prefetch questions:', error);
       return [];
     }
   };
   ```

2. Add caching mechanisms:
   ```javascript
   // Simple cache utility
   const cache = new Map();
   
   export const fetchWithCache = async (key, fetchFn) => {
     if (cache.has(key)) {
       return cache.get(key);
     }
     
     const data = await fetchFn();
     cache.set(key, data);
     return data;
   };
   ```

3. Optimize Redux store updates:
   ```javascript
   // In slice file
   const triviaSlice = createSlice({
     name: 'trivia',
     initialState,
     reducers: {
       // Batch multiple updates
       batchUpdateState: (state, action) => {
         const { questions, userProfile, personalizedFeed } = action.payload;
         if (questions) state.questions = questions;
         if (userProfile) state.userProfile = userProfile;
         if (personalizedFeed) state.personalizedFeed = personalizedFeed;
       },
     },
   });
   ```

## Progress Tracking

### Implementation Status

| Task | Status | Date | Notes |
|------|--------|------|-------|
| 1.1 Optimize Animations | Not Started | | |
| 1.2 Fix Rendering Inefficiencies | Not Started | | |
| 1.3 Mobile Detection | Not Started | | |
| 2.1 Font Loading | Not Started | | |
| 2.2 Image Optimization | Not Started | | |
| 2.3 Bundle Size Reduction | Not Started | | |
| 3.1 Virtualized Lists | Not Started | | |
| 3.2 Progressive Enhancement | Not Started | | |
| 3.3 Data Fetching/Caching | Not Started | | |

### Performance Metrics

We'll track the following metrics before and after optimization:

1. **First Contentful Paint (FCP)**: Time until first content appears
2. **Time to Interactive (TTI)**: When the app becomes fully interactive
3. **Frame Rate**: Target 60fps during animations
4. **Memory Usage**: Peak memory consumption
5. **Bundle Size**: Total JS bundle size

## Next Steps

1. Implement Phase 1 optimizations first
2. Measure performance improvements
3. Proceed to Phase 2 if necessary
4. Document progress in this file as we go 