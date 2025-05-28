# React Native Web Compatibility

This document explains the React Native Web warnings you might see in your browser console and how we've addressed them.

## Common Warnings

### 1. `collapsable` Prop Warning

```
Received `false` for a non-boolean attribute `collapsable`.
If you want to write it to the DOM, pass a string instead: collapsable="false" or collapsable={value.toString()}.
```

**What it is**: The `collapsable` prop is a React Native optimization for Android that prevents unnecessary View nesting. When React Native components are rendered on the web, this prop becomes an invalid DOM attribute.

**Where it comes from**: 
- `FlatList` components automatically add this prop
- Some `View` components in React Native libraries
- Third-party React Native components

### 2. `transform-origin` vs `transformOrigin` Warning

```
Invalid DOM property `transform-origin`. Did you mean `transformOrigin`?
```

**What it is**: CSS properties in React Native use camelCase (`transformOrigin`), but sometimes kebab-case CSS properties (`transform-origin`) leak through to the DOM.

**Where it comes from**:
- Animated components with transform styles
- Third-party animation libraries
- Manual style objects with CSS property names

## Our Solutions

### 1. Warning Suppression

We've implemented a warning suppression system in `src/utils/webCompatibility.ts` that filters out these specific warnings in development:

```typescript
// Automatically initialized in app/_layout.tsx
suppressWebWarnings();
```

This prevents console spam while preserving other important warnings.

### 2. WebSafeView Component

For components where you need guaranteed web compatibility, use our `WebSafeView`:

```typescript
import { WebSafeView } from '@/src/components/ui/WebSafeView';

// Instead of:
<View collapsable={false} style={someStyle}>
  {children}
</View>

// Use:
<WebSafeView style={someStyle}>
  {children}
</WebSafeView>
```

The `WebSafeView` automatically:
- Removes React Native-specific props on web
- Converts CSS property names to web-compatible format
- Passes through all props unchanged on mobile platforms

### 3. Utility Functions

For manual prop cleaning:

```typescript
import { cleanPropsForWeb, webCompatibleTransform } from '@/src/utils/webCompatibility';

// Clean props
const safeProps = cleanPropsForWeb(props);

// Convert styles
const safeStyle = webCompatibleTransform(style);
```

## When to Use Each Solution

### Use Warning Suppression When:
- You're using third-party libraries that generate these warnings
- The warnings are from React Native core components (FlatList, etc.)
- You want to reduce console noise during development

### Use WebSafeView When:
- You're creating new components that need web compatibility
- You have control over the component implementation
- You want guaranteed prop safety

### Use Manual Utilities When:
- You're working with existing components that can't be easily changed
- You need fine-grained control over prop cleaning
- You're building reusable component libraries

## Performance Impact

These solutions have minimal performance impact:

- **Warning suppression**: Only runs on web platform, adds ~1ms to console.warn calls
- **WebSafeView**: Only processes props on web platform, negligible overhead
- **Manual utilities**: Only run when explicitly called, no automatic overhead

## Browser Compatibility

These warnings and solutions are specific to:
- **Chrome/Edge**: Shows both warnings clearly
- **Firefox**: Shows similar warnings with slightly different wording
- **Safari**: May show warnings in different format
- **Mobile browsers**: Generally don't show these warnings

## Future Considerations

As React Native Web evolves, some of these warnings may be resolved upstream. Our solution is designed to be:

1. **Non-intrusive**: Doesn't break existing functionality
2. **Removable**: Can be easily disabled or removed when no longer needed
3. **Selective**: Only suppresses known, harmless warnings

## Debugging

If you need to see these warnings for debugging:

```typescript
// Temporarily disable suppression
// Comment out this line in app/_layout.tsx:
// suppressWebWarnings();
```

Or check the browser's Network tab for any actual functionality issues, as these warnings are purely cosmetic and don't affect app behavior. 