# Feature Flag System

## Overview

The trivia app now includes a feature flag system that allows you to control various application features through an admin interface. This system is particularly useful for:

- Toggling experimental features
- Controlling performance-intensive operations
- A/B testing different functionalities
- Debug and development features

## How It Works

### Feature Flag Service

The feature flag service (`src/lib/featureFlagService.ts`) provides:

- **Persistent Storage**: Flags are stored in AsyncStorage and persist across app sessions
- **Default Values**: Each flag has a sensible default value
- **Categories**: Flags are organized into categories for better management
- **Dynamic Updates**: Flags can be changed at runtime through the admin interface

### Admin Interface

Access the feature flag management interface at:
- **URL**: `/admin-config` (web only)
- **Navigation**: Admin Panel → App Configuration

The interface provides:
- Toggle switches for each feature flag
- Visual status indicators (ON/OFF)
- Descriptions explaining what each flag controls
- Category organization
- Reset to defaults functionality

## Available Feature Flags

### Question Similarity Check
- **Key**: `question_similarity_check`
- **Category**: Generator
- **Default**: `false` (disabled)
- **Description**: Enable similarity checking against existing questions during generation to prevent duplicates

When this flag is **disabled**:
- The system logs: `"[GENERATOR] Question similarity check is disabled. You can enable it in the feature flag settings (Admin → App Configuration)."`
- No similarity checking is performed (faster question generation)
- Potential for duplicate questions

When this flag is **enabled**:
- The system checks each new question against all existing questions
- Prevents questions with similar wording from being added
- Logs similarity checking progress: `"[GENERATOR] Checking similarity against X questions..."`

### Debug Logging
- **Key**: `debug_logging`  
- **Category**: Debug
- **Default**: `false`
- **Description**: Enable detailed debug logging throughout the application

### Enhanced Analytics
- **Key**: `enhanced_analytics`
- **Category**: Analytics  
- **Default**: `true`
- **Description**: Enable detailed analytics tracking and performance monitoring

## Usage in Code

### Checking Feature Flags

```typescript
import { isQuestionSimilarityCheckEnabled } from '@/src/lib/featureFlagService';

// In your function
if (isQuestionSimilarityCheckEnabled()) {
  // Perform similarity check
  console.log('Similarity check enabled');
} else {
  console.log('Similarity check disabled');
}
```

### Using the Service Directly

```typescript
import { featureFlagService } from '@/src/lib/featureFlagService';

// Check if a flag is enabled
const isEnabled = featureFlagService.isEnabled('question_similarity_check');

// Set a flag value
await featureFlagService.setFlag('debug_logging', true);

// Get all flags
const allFlags = featureFlagService.getAllFlags();

// Reset all flags to defaults
await featureFlagService.resetToDefaults();
```

## Adding New Feature Flags

1. **Add to DEFAULT_FEATURE_FLAGS** in `src/lib/featureFlagService.ts`:

```typescript
{
  key: 'my_new_feature',
  name: 'My New Feature',
  description: 'Description of what this feature does',
  defaultValue: false,
  category: 'ui', // or 'generator', 'analytics', 'debug'
}
```

2. **Create convenience function** (optional):

```typescript
export const isMyNewFeatureEnabled = (): boolean => {
  return featureFlagService.isEnabled('my_new_feature');
};
```

3. **Use in your code**:

```typescript
import { isMyNewFeatureEnabled } from '@/src/lib/featureFlagService';

if (isMyNewFeatureEnabled()) {
  // Feature-specific logic
}
```

## Security

- Feature flag management is **web-only** for security reasons
- Direct URL access is required (`/admin-config`)
- No sensitive data should be exposed through feature flags
- Flags are stored locally and don't sync across devices

## Best Practices

1. **Use descriptive names** and clear descriptions
2. **Set sensible defaults** that work for most users
3. **Log when features are disabled** to help with debugging
4. **Test both enabled and disabled states** of your features
5. **Remove obsolete flags** once features are stable
6. **Document the impact** of each flag in code comments

## Example: Question Similarity Check Implementation

The question similarity check feature is a perfect example of how feature flags work:

```typescript
async function checkQuestionSimilarity(fingerprint: string): Promise<boolean> {
  // Import feature flag service dynamically to avoid circular dependencies
  const { isQuestionSimilarityCheckEnabled } = await import('./featureFlagService');
  
  // Check if similarity checking feature is enabled
  if (!isQuestionSimilarityCheckEnabled()) {
    console.log('[GENERATOR] Question similarity check is disabled. You can enable it in the feature flag settings (Admin → App Configuration).');
    return false; // Skip similarity check when feature is disabled
  }

  // Feature is enabled, proceed with similarity check
  // ... similarity checking logic ...
}
```

This implementation:
- ✅ Checks the feature flag first
- ✅ Logs helpful message when disabled
- ✅ Directs users to the admin interface
- ✅ Gracefully skips the feature when disabled
- ✅ Uses dynamic import to avoid circular dependencies 