# TriviaFeed Branding and Social Sharing Implementation Plan

## Overview
This document outlines the plan to update our app's branding from "Zest" to "TriviaFeed", implement proper favicon handling, add theme-aware app icons, and enhance social sharing functionality.

## Goals
1. Rename app from "Zest" to "TriviaFeed" throughout the codebase
2. Update favicon to support different themes (default and neon)
3. Make app icons theme-aware for better branding
4. Add proper social sharing metadata for improved sharing experience
5. Ensure all shared links use the proper app name and theme-appropriate icons

## Implementation Tasks

### 1. App Name Updates
- [x] Update app.config.js to change name from "Zest" to "TriviaFeed"
- [x] Update web-build-template.html to use new app name
- [ ] Update iOS project files with new name
- [ ] Search for any remaining "Zest" references and update them

### 2. Favicon and App Icon Updates
- [x] Create theme-aware favicon implementation
- [x] Update favicon reference in app.config.js
- [x] Update web favicon reference in web-build-template.html
- [x] Ensure app-icon.png and app-icon-neon.png are used appropriately based on theme
- [x] Create additional favicon variants (16x16, 32x32, apple-touch-icon)
- [x] Create manifest.json for PWA support
- [x] Add neon-specific favicon variants (favicon-neon.png, favicon-neon-16x16.png, etc.)
- [x] Update themeIcons.ts utility to handle neon favicon variants
- [x] Add theme-specific comments to HTML template for easier maintenance

### 3. Social Sharing Enhancements
- [x] Add Open Graph meta tags to web-build-template.html
- [x] Add Twitter Card meta tags to web-build-template.html
- [x] Create logic to use theme-appropriate images when content is shared
- [x] Update sharing links to use the new app name "TriviaFeed"
- [x] Create social preview images for different themes

### 4. Theme Integration
- [x] Create themeIcons.ts utility for theme-specific icons and favicon
- [x] Modify ThemeContext to handle theme-specific app icons and favicon
- [x] Create utility function to get the correct icon based on current theme
- [x] Update setMetaThemeColor to handle dynamic favicon changes
- [x] Ensure theme changes dynamically update all head metadata

## Remaining Tasks
1. Update iOS project files with new app name
2. Search for remaining "Zest" references in the codebase and update them

## Resources Created
- Theme-aware favicon implementation
- Social sharing metadata
- PWA manifest.json
- Additional favicon variants for both default and neon themes:
  - favicon.png and favicon-neon.png
  - favicon-16x16.png and favicon-neon-16x16.png 
  - favicon-32x32.png and favicon-neon-32x32.png
  - apple-touch-icon.png and apple-touch-icon-neon.png
- Social preview images for different themes

## Testing Plan
- Test favicon changes across different browsers
- Test theme switching to verify favicons update properly
- Test app icon appearance on iOS/Android home screens
- Test social sharing on different platforms (Twitter, Facebook, etc.)
- Verify correct theme-based icons are shown in all contexts 