# Topic Rings Mixpanel Analytics Implementation

This document outlines the comprehensive Mixpanel tracking that has been implemented for all topic rings user interactions.

## Overview

All topic rings interactions are now tracked with detailed analytics including:
- **App Version**: Every event includes the app version (default/music/science/etc.) from `app-topic-config.js`
- **Ring Details**: Level, progress, colors, icons, and position information
- **User Context**: Whether user is guest/logged-in, current topic, and interaction context

## Tracked Events

### 1. Topic Ring Click (`Topic Ring Click`)

**Triggered**: When a user clicks on any topic ring

**Event Properties**:
```typescript
{
  ringTopic: string,           // The topic of the clicked ring
  appVersion: string,          // App version (default/music/science/etc.)
  ringLevel: number,           // Current level of the ring
  ringProgress: number,        // Progress percentage (0-100)
  totalCorrectAnswers: number, // Total correct answers for this topic
  isSubTopic: boolean,         // Whether this is a sub-topic ring
  parentTopic: string | null,  // Parent topic if this is a sub-topic
  ringColor: string,           // Color of the ring
  ringIcon: string,            // Feather icon name
  isActiveTopic: boolean,      // Whether this ring matches the current active topic
  ringPosition: number,        // Position in the rings display (1-based)
  totalRingsVisible: number,   // Total number of rings currently shown
  platform: string,           // iOS/Android/web
  deviceType: string,          // Device type
  timestamp: string            // ISO timestamp
}
```

### 2. Topic Ring Modal (`Topic Ring Modal`)

**Triggered**: For all modal interactions (open, close, feed control buttons)

**Actions**:
- `opened` - When modal opens
- `closed` - When modal closes
- `feed_control_more` - When "Show more" button is clicked
- `feed_control_less` - When "Show less" button is clicked

**Event Properties**:
```typescript
{
  action: string,              // Action type (opened/closed/feed_control_more/feed_control_less)
  ringTopic: string,           // The topic of the ring
  appVersion: string,          // App version (default/music/science/etc.)
  ringLevel: number,           // Current level of the ring
  ringProgress: number,        // Progress percentage (0-100)
  totalCorrectAnswers: number, // Total correct answers for this topic
  isSubTopic: boolean,         // Whether this is a sub-topic ring
  parentTopic: string | null,  // Parent topic if this is a sub-topic
  ringColor: string,           // Color of the ring (for opened action)
  ringIcon: string,            // Feather icon name (for opened action)
  
  // Additional properties for feed control actions:
  weightChange: number,        // Weight change amount (+0.15 or -0.1)
  currentWeight: number,       // Current topic weight before change
  
  platform: string,           // iOS/Android/web
  deviceType: string,          // Device type
  timestamp: string            // ISO timestamp
}
```

### 3. All Rings Modal (`All Rings Modal`)

**Triggered**: For interactions with the "Show All Rings" modal

**Actions**:
- `show_all_clicked` - When "Show All Rings" button is clicked
- `opened` - When modal opens
- `closed` - When modal closes
- `ring_selected` - When a specific ring is selected in the modal

**Event Properties**:
```typescript
{
  action: string,              // Action type
  appVersion: string,          // App version (default/music/science/etc.)
  
  // For show_all_clicked action:
  location: string,            // 'FeedScreen'
  userId: string,              // User ID
  isGuest: boolean,            // Whether user is in guest mode
  debugMode: boolean,          // Whether debug panel is visible
  
  // For opened/closed actions:
  totalRingsShown: number,     // Total number of rings displayed
  activeRingsShown: number,    // Number of rings with progress
  inactiveRingsShown: number,  // Number of rings without progress
  activeTopic: string | null,  // Current active topic
  
  // For ring_selected action:
  ringTopic: string,           // Selected ring topic
  ringLevel: number,           // Ring level
  ringProgress: number,        // Ring progress percentage
  totalCorrectAnswers: number, // Total correct answers
  isSubTopic: boolean,         // Whether it's a sub-topic
  parentTopic: string | null,  // Parent topic if sub-topic
  ringPosition: number,        // Position in the list
  isActiveTopic: boolean,      // Whether it matches active topic
  
  platform: string,           // iOS/Android/web
  deviceType: string,          // Device type
  timestamp: string            // ISO timestamp
}
```

## Enhanced Global Tracking

### App Version in All Events

All existing Mixpanel events now include the `appVersion` property:

```typescript
// Every trackEvent call now includes:
{
  appVersion: string,          // From app-topic-config.js (default/music/science/etc.)
  platform: string,           // iOS/Android/web
  deviceType: string,          // Device type
  timestamp: string            // ISO timestamp
  // ... other event-specific properties
}
```

This affects:
- `Question Answered` events
- `Question Milestone Reached` events
- `Button Click` events
- `Screen View` events
- All other existing events

## Implementation Details

### New Analytics Functions

Three new specialized tracking functions have been added to `src/lib/mixpanelAnalytics.ts`:

1. **`trackTopicRingClick(ringTopic, properties)`**
   - Tracks individual ring clicks
   - Automatically includes app version

2. **`trackTopicRingModal(action, ringTopic, properties)`**
   - Tracks all ring modal interactions
   - Handles open/close/feed control actions

3. **`trackAllRingsModal(action, properties)`**
   - Tracks "Show All Rings" modal interactions
   - Handles show button, open/close, and ring selection

### Integration Points

1. **TopicRings Component** (`src/components/TopicRings.tsx`)
   - Ring click tracking
   - Modal open/close tracking
   - Feed control button tracking

2. **AllRingsModal Component** (`src/components/AllRingsModal.tsx`)
   - Modal open/close tracking
   - Individual ring selection tracking

3. **FeedScreen Component** (`src/features/feed/FeedScreen.tsx`)
   - "Show All Rings" button tracking

## Usage Analytics Insights

With this tracking implementation, you can analyze:

### User Engagement
- Which rings are clicked most frequently
- Ring engagement by app version (default vs topic-specific)
- Modal interaction patterns

### Topic Performance
- Which topics generate the most interest (ring clicks)
- Topic progression patterns (level advancement)
- Sub-topic vs main topic engagement

### Feed Control Usage
- How often users adjust topic weights
- Whether users prefer more or less content from specific topics
- Impact of feed control on user engagement

### App Version Comparison
- User behavior differences between default and topic-specific apps
- Topic preference patterns by app version
- Engagement metrics by app configuration

## Event Volume Estimation

Based on typical user interaction patterns:

- **High Volume**: `Topic Ring Click` (every time user taps a ring)
- **Medium Volume**: `Topic Ring Modal` (when users explore ring details)
- **Low Volume**: `All Rings Modal` (primarily for power users and debug mode)

All events include comprehensive context to enable deep analytics while maintaining user privacy and providing actionable insights for product optimization. 