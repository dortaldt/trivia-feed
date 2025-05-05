# Design System

This design system provides a comprehensive, scalable, and sustainable approach to styling your React Native application. It is cross-platform compatible and follows modern design principles.

## Structure

The design system is organized into the following key components:

### 1. Design Tokens (`/src/design/index.ts`)

The core design tokens are defined in a centralized file:

- **Colors**: A complete color system with light/dark themes and semantic color definitions
- **Typography**: Font families, sizes, weights, line heights, and predefined text styles
- **Spacing**: A consistent scale for margins, padding, and layout
- **Borders & Shapes**: Border radius and width values
- **Shadows**: Platform-specific shadow definitions
- **Transitions**: Animation timing and easing functions
- **Breakpoints**: Responsive layout breakpoints

### 2. Component Library (`/src/components/ui/`)

Built on top of the design tokens, these components provide consistent UI elements:

- **Text**: Typography component supporting all text styles
- **View**: Layout component with built-in spacing, border and shadow props
- **Button**: Flexible button component with multiple variants and states
- *(More components can be added as needed)*

### 3. Hooks (`/src/hooks/useDesignSystem.ts`)

The `useDesignSystem` hook provides access to the design system with theme-awareness:

```jsx
// Example usage
import { useDesignSystem } from '../hooks/useDesignSystem';

function MyComponent() {
  const { colors, typography, spacing } = useDesignSystem();
  
  return (
    <View style={{ 
      backgroundColor: colors.background,
      padding: spacing[4]
    }}>
      {/* Component content */}
    </View>
  );
}
```

## Usage Guidelines

### Using the UI Components

The UI components are designed to be used throughout your application:

```jsx
import { Text, View, Button } from '../components/ui';

function MyScreen() {
  return (
    <View p="4" rounded="md" shadow="sm">
      <Text variant="h2">Welcome</Text>
      <Text variant="body1">This is a styled component using our design system.</Text>
      <Button 
        label="Click Me" 
        variant="primary" 
        onPress={() => console.log('Button pressed')}
      />
    </View>
  );
}
```

### Extending the Design System

To extend the design system:

1. Add new tokens to `/src/design/index.ts`
2. Create new UI components in `/src/components/ui/`
3. Export components from `/src/components/ui/index.ts`

## Best Practices

1. **Consistency**: Use the design system tokens rather than hardcoding values
2. **Theme-awareness**: Use the `useDesignSystem` hook to access theme-aware values
3. **Component-first**: Prefer using the UI components over direct styling when possible
4. **Documentation**: Document new components and tokens as they are added

## Example

See `/src/components/DesignSystemExample.tsx` for a complete demonstration of the design system elements.