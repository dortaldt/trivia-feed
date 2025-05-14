# Trivia Feed Design Guide

This document outlines the design system for Trivia Feed, including colors, typography, spacing, iconography, and other design elements.

## Brand Identity

Trivia Feed is a modern, engaging trivia application that offers an interactive and visually appealing experience. The design system emphasizes readability, clean visual hierarchy, and an intuitive user experience.

### Logo & App Icons

The primary app icons are located in `assets/images/`:
- icon.png - Main app icon
- splash-icon.png - Splash screen icon
- favicon.png - Web favicon
- adaptive-icon.png - Android adaptive icon

## Color System

### Brand Colors

The primary brand color is teal blue (`#0a7ea4`), which sets the tone for the application. The app uses a comprehensive color palette for both light and dark modes.

#### Primary Color Palette

```
Primary (Teal Blue):
- 50: #e0f3fa
- 100: #b3e1f3
- 200: #80ceeb
- 300: #4dbae3
- 400: #26abdd
- 500: #0a7ea4 (Main brand color)
- 600: #09719a
- 700: #07618e
- 800: #055182
- 900: #03356c
```

#### Neutral Colors

```
Neutral:
- 50: #fafafa
- 100: #f5f5f5
- 200: #e5e5e5
- 300: #d4d4d4
- 400: #a3a3a3
- 500: #737373
- 600: #525252
- 700: #404040
- 800: #262626
- 900: #171717
- 950: #09090b
```

### Semantic Colors

#### Success Colors

```
Success (Green):
- 50: #ecfdf5
- 100: #d1fae5
- 200: #a7f3d0
- 300: #6ee7b7
- 400: #34d399
- 500: #10b981
- 600: #059669
- 700: #047857
- 800: #065f46
- 900: #064e3b
```

#### Warning Colors

```
Warning (Orange):
- 50: #fffbeb
- 100: #fef3c7
- 200: #fde68a
- 300: #fcd34d
- 400: #fbbf24
- 500: #f59e0b
- 600: #d97706
- 700: #b45309
- 800: #92400e
- 900: #78350f
```

#### Error Colors

```
Error (Red):
- 50: #fef2f2
- 100: #fee2e2
- 200: #fecaca
- 300: #fca5a5
- 400: #f87171
- 500: #ef4444
- 600: #dc2626
- 700: #b91c1c
- 800: #991b1b
- 900: #7f1d1d
```

#### Info Colors

```
Info (Blue):
- 50: #eff6ff
- 100: #dbeafe
- 200: #bfdbfe
- 300: #93c5fd
- 400: #60a5fa
- 500: #3b82f6
- 600: #2563eb
- 700: #1d4ed8
- 800: #1e40af
- 900: #1e3a8a
```

### Light Mode Theme Colors

```
- background: #fafafa
- surface: #ffffff
- text: #11181C
- textSecondary: palette.neutral[700]
- textTertiary: palette.neutral[500]
- border: palette.neutral[300]
- icon: #687076
- tabIconDefault: #687076
- tabIconSelected: #0a7ea4
```

### Dark Mode Theme Colors

```
- background: #09090b
- surface: #171717
- text: #ECEDEE
- textSecondary: palette.neutral[300]
- textTertiary: palette.neutral[400]
- border: palette.neutral[700]
- icon: #9BA1A6
- tabIconDefault: palette.neutral[400]
- tabIconSelected: #ffffff
```

### Category-Specific Colors

Trivia Feed uses specific colors to identify different question categories:

```
- Science: #3498db (Blue)
- Technology: #2980b9 (Darker blue)
- History: #8e44ad (Purple)
- Geography: #27ae60 (Green)
- Sports: #e67e22 (Orange)
- Movies: #7f8c8d (Gray)
- Music: #9b59b6 (Light purple)
- Television: #34495e (Dark blue-gray)
- Literature: #c0392b (Dark red)
- Art: #e74c3c (Red)
- Pop Culture: #f39c12 (Yellow-orange)
- Food & Drink: #d35400 (Dark orange)
- General Knowledge: #16a085 (Teal)
- Nature: #2ecc71 (Light green)
- Politics: #95a5a6 (Light gray)
- Celebrities: #f1c40f (Yellow)
- Modern Cinema: #2c3e50 (Navy)
- Mathematics: #1abc9c (Turquoise)
- Language: #3498db (Blue)
- Mythology: #8e44ad (Purple)
- Animals: #27ae60 (Green)
```

## Typography

Trivia Feed uses a dual font system:
- Sans-serif fonts for UI elements and general text
- Serif fonts exclusively for question text to create visual distinction

### Font Families

#### Sans-serif (UI and general text)

```
- iOS: System font (San Francisco)
- Android: Inter
- Web: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif
```

#### Serif (Question text only)

```
- iOS: Georgia
- Android: PlayfairDisplay
- Web: Georgia, Cambria, "Times New Roman", Times, serif
```

### Font Sizes

```
- xs: 12px
- sm: 14px
- md: 16px
- lg: 18px
- xl: 20px
- 2xl: 24px
- 3xl: 30px
- 4xl: 36px
- 5xl: 48px
- 6xl: 64px
```

### Font Weights

```
- light: 300
- normal: 400
- medium: 500
- semibold: 600
- bold: 700
- extrabold: 800
```

### Text Styles

#### Headings (Sans-serif)

- **h1**: 36px, bold, tighter letter spacing (-0.5)
- **h2**: 30px, bold, tighter letter spacing (-0.5)
- **h3**: 24px, bold, tight letter spacing (-0.25)
- **h4**: 20px, bold, tight letter spacing (-0.25)
- **h5**: 18px, bold
- **h6**: 16px, bold

#### Body Text (Sans-serif)

- **body1**: 16px, normal weight
- **body2**: 14px, normal weight

#### Special Text (Sans-serif)

- **subtitle1**: 18px, semibold
- **subtitle2**: 16px, semibold
- **caption**: 12px, normal weight
- **button**: 16px, semibold, wide letter spacing (0.25), uppercase
- **overline**: 12px, medium weight, wider letter spacing (0.5), uppercase
- **link**: 16px, normal weight, primary color (#0a7ea4)

#### Question Text (Serif)

- **question**: 30px, bold, tighter letter spacing (-0.5)

## Spacing System

Trivia Feed uses a consistent spacing scale based on 4px increments:

```
- 0: 0
- 0.5: 2px
- 1: 4px
- 1.5: 6px
- 2: 8px
- 2.5: 10px
- 3: 12px
- 3.5: 14px
- 4: 16px
- 5: 20px
- 6: 24px
- 7: 28px
- 8: 32px
- 9: 36px
- 10: 40px
...
- 96: 384px
```

## Border Radius

```
- none: 0
- xs: 2px
- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px
- full: 9999px (circular)
```

## Iconography

The app uses multiple icon libraries from Expo Vector Icons:

### Primary Icon Libraries

1. **Feather Icons** - Used for most UI elements
   - Clean, minimal style consistent with the app's design
   - Full icon reference: https://feathericons.com/

2. **Material Icons** - Used on Android and web as a fallback
   - Reference: https://icons.expo.fyi/

3. **SF Symbols** - Used on iOS (native)
   - Consistent with iOS design language

### Other Available Icon Libraries

```
- AntDesign
- Entypo
- EvilIcons
- FontAwesome
- FontAwesome5
- Fontisto
- Foundation
- Ionicons
- MaterialCommunityIcons
- MaterialIcons
- Octicons
- SimpleLineIcons
- Zocial
```

## Layout Guidelines

- **Screen Margin**: 16px (spacing[4])
- **Maximum Content Width**: 1200px
- **Default Z-Index Layers**:
  - Base content: 0-50
  - Modals: 1000
  - Tooltips: 1100
  - Toasts: 1200

## Button Variants

### Button Sizes

- **xs**: padding 4px 8px, 12px font, small border radius
- **sm**: padding 8px 12px, 14px font, medium border radius
- **md**: padding 12px 16px, 16px font, medium border radius
- **lg**: padding 16px 20px, 18px font, large border radius

### Button Styles

- **primary**: Primary color background (#0a7ea4), white text
- **secondary**: Secondary color background, white text
- **accent**: Accent color background, dark text
- **outline**: Transparent background with border, dark text
- **ghost**: Transparent background, dark text, no border
- **destructive**: Error color background (#ef4444), white text
- **success**: Success color background (#10b981), white text
- **warning**: Warning color background (#f59e0b), dark text
- **info**: Info color background (#3b82f6), white text

## Splash Screen

```
- Background: #151718
- Text: #ECEDEE
- Image: ./assets/images/splash-icon.png
- Resize Mode: contain
```

## Usage Guidelines

When creating marketing materials:
1. Always use the provided color palette, particularly the primary brand color (#0a7ea4)
2. Maintain font consistency using Inter for general text and PlayfairDisplay for question-related content
3. Use Feather icons when possible to maintain visual consistency
4. Respect the dark mode color scheme for dark-themed materials
5. Use category-specific colors when highlighting specific trivia categories

For additional UI components or questions about implementation, please consult the development team. 