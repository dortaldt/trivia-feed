/**
 * Utility to apply theme variables as CSS custom properties for web
 * This makes it easier to use theme colors in CSS and ensures consistency
 */

import { Platform } from 'react-native';
import { ThemeDefinition } from '../design/themes';
import { ColorSchemeType, ThemeName } from '../context/ThemeContext';
import { updateFavicon, updateSocialMetaTags } from './themeIcons';

/**
 * Applies theme colors as CSS variables on the document root
 * Only has an effect on web platform
 * 
 * @param theme Current theme definition
 * @param colorScheme Current color scheme (light or dark)
 */
export function applyThemeVariables(theme: ThemeDefinition, colorScheme: ColorSchemeType): void {
  // console.log(`[DEBUG] applyThemeVariables: Starting for theme ${theme.id}, colorScheme ${colorScheme}`);
  
  // Only run on web platform
  if (Platform.OS !== 'web') {
    // console.log('[DEBUG] applyThemeVariables: Not web platform, skipping');
    return;
  }
  
  // Get the document root element
  const root = document.documentElement;
  // console.log(`[DEBUG] applyThemeVariables: Got document root element: ${root.tagName}`);
  
  try {
    // Get the colors for the current color scheme
    const colors = theme.colors[colorScheme];
    
    if (!colors) {
      console.error(`[ERROR] applyThemeVariables: No colors defined for ${colorScheme} color scheme in theme ${theme.id}`);
      return;
    }
    
    // console.log(`[DEBUG] applyThemeVariables: Applying color variables for ${colorScheme} mode`);
    // console.log(`[DEBUG] applyThemeVariables: Sample colors - primary: ${colors.primary}, background: ${colors.background}`);
    
    // Apply all colors as CSS variables
    Object.entries(colors).forEach(([key, value]) => {
      const cssVarName = `--color-${key}`;
      root.style.setProperty(cssVarName, value);
      
      // Verify a few key colors to make sure they're being set
      if (key === 'primary' || key === 'background' || key === 'text') {
        // console.log(`[DEBUG] applyThemeVariables: Set ${cssVarName} = ${value}`);
      }
    });
    
    // Apply spacing values
    // console.log(`[DEBUG] applyThemeVariables: Applying spacing variables`);
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--spacing-${key}`, `${value}px`);
    });
    
    // Apply border radius values
    // console.log(`[DEBUG] applyThemeVariables: Applying border radius variables`);
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, `${value}px`);
    });
    
    // Apply typography values
    // console.log(`[DEBUG] applyThemeVariables: Applying typography variables`);
    Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, `${value}px`);
    });
    
    // Apply animation durations
    // console.log(`[DEBUG] applyThemeVariables: Applying animation duration variables`);
    Object.entries(theme.animations.duration).forEach(([key, value]) => {
      root.style.setProperty(`--duration-${key}`, `${value}ms`);
    });
    
    // Set some meta properties to help with theme detection in CSS
    // console.log(`[DEBUG] applyThemeVariables: Setting theme meta variables`);
    root.style.setProperty('--theme-id', theme.id);
    root.style.setProperty('--color-scheme', colorScheme);
    
    // Update the data attributes for easier CSS selectors
    const prevDataTheme = root.dataset.theme;
    const prevDataColorScheme = root.dataset.colorScheme;
    
    root.dataset.theme = theme.id;
    root.dataset.colorScheme = colorScheme;
    
    // console.log(`[DEBUG] applyThemeVariables: Updated data attributes:`);
    // console.log(`  - data-theme: ${prevDataTheme || 'none'} -> ${root.dataset.theme}`);
    // console.log(`  - data-color-scheme: ${prevDataColorScheme || 'none'} -> ${root.dataset.colorScheme}`);
    
    // Add appropriate web animations based on theme
    // console.log(`[DEBUG] applyThemeVariables: Applying theme animations for ${theme.id}`);
    applyThemeAnimations(theme.id);
    
    // Verify some CSS variables to make sure they're set
    const verification = {
      themeId: getComputedStyle(root).getPropertyValue('--theme-id').trim(),
      primary: getComputedStyle(root).getPropertyValue('--color-primary').trim(),
      background: getComputedStyle(root).getPropertyValue('--color-background').trim()
    };
    
    // console.log(`[DEBUG] applyThemeVariables: Verification of CSS variables after setting:`);
    // console.log(`  - --theme-id: ${verification.themeId} (expected: ${theme.id})`);
    // console.log(`  - --color-primary: ${verification.primary} (expected: ${colors.primary})`);
    // console.log(`  - --color-background: ${verification.background} (expected: ${colors.background})`);
    
    // Check for issues
    if (verification.themeId !== theme.id) {
      console.error(`[ERROR] applyThemeVariables: Theme ID CSS variable doesn't match expected value`);
    }
    if (verification.primary !== colors.primary) {
      console.error(`[ERROR] applyThemeVariables: Primary color CSS variable doesn't match expected value`);
    }
    if (verification.background !== colors.background) {
      console.error(`[ERROR] applyThemeVariables: Background color CSS variable doesn't match expected value`);
    }
    
    // console.log(`[DEBUG] applyThemeVariables: Successfully applied theme ${theme.id}`);
  } catch (error) {
    console.error('[ERROR] applyThemeVariables: Error applying theme variables:', error);
  }
}

/**
 * Adds appropriate CSS animations based on the theme
 * 
 * @param themeId The current theme ID
 */
function applyThemeAnimations(themeId: string): void {
  // Remove any existing theme animation style tag
  const existingStyleTag = document.getElementById('theme-animations');
  if (existingStyleTag) {
    document.head.removeChild(existingStyleTag);
  }
  
  // Create new style element
  const styleEl = document.createElement('style');
  styleEl.id = 'theme-animations';
  
  // Add theme-specific animations
  switch (themeId) {
    case 'neon':
      styleEl.innerHTML = `
        @keyframes neonPulse {
          0% {
            box-shadow: 0 0 4px var(--color-primary), 0 0 8px rgba(var(--color-primary), 0.2);
          }
          100% {
            box-shadow: 0 0 8px var(--color-primary), 0 0 12px rgba(var(--color-primary), 0.2);
          }
        }
        
        @keyframes neonTextGlow {
          0% {
            text-shadow: 0 0 2px currentColor, 0 0 3px currentColor;
          }
          50% {
            text-shadow: 0 0 3px currentColor, 0 0 6px currentColor;
          }
          100% {
            text-shadow: 0 0 2px currentColor, 0 0 4px currentColor;
          }
        }
        
        .neon-theme-component {
          transition: all 0.3s ease;
        }
        
        [data-theme="neon"] button:hover,
        [data-theme="neon"] .interactive:hover {
          filter: brightness(1.2);
        }
      `;
      break;
      
    case 'retro':
      styleEl.innerHTML = `
        @keyframes retroScanline {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 0 100%;
          }
        }
        
        [data-theme="retro"] body::after {
          content: "";
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.02) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          background-size: 100% 3px;
          pointer-events: none;
          animation: retroScanline 10s linear infinite;
          z-index: 9999;
        }
        
        [data-theme="retro"] button,
        [data-theme="retro"] .interactive {
          transition: all 0.15s ease;
        }
        
        [data-theme="retro"] button:hover,
        [data-theme="retro"] .interactive:hover {
          transform: translate(-1px, -1px);
          box-shadow: 2px 2px 0 rgba(0, 0, 0, 0.3);
        }
        
        [data-theme="retro"] button:active,
        [data-theme="retro"] .interactive:active {
          transform: translate(1px, 1px);
          box-shadow: none;
        }
      `;
      break;
      
    case 'modern':
      styleEl.innerHTML = `
        [data-theme="modern"] button,
        [data-theme="modern"] .interactive {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        [data-theme="modern"] button::after,
        [data-theme="modern"] .interactive::after {
          content: '';
          display: block;
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
          background-repeat: no-repeat;
          background-position: 50%;
          transform: scale(10, 10);
          opacity: 0;
          transition: transform 0.3s, opacity 0.5s;
        }
        
        [data-theme="modern"] button:active::after,
        [data-theme="modern"] .interactive:active::after {
          transform: scale(0, 0);
          opacity: 0.3;
          transition: 0s;
        }
      `;
      break;
      
    case 'default':
    default:
      styleEl.innerHTML = `
        [data-theme="default"] button,
        [data-theme="default"] .interactive {
          transition: all 0.15s ease;
        }
        
        [data-theme="default"] button:hover,
        [data-theme="default"] .interactive:hover {
          opacity: 0.9;
        }
        
        [data-theme="default"] button:active,
        [data-theme="default"] .interactive:active {
          transform: scale(0.98);
        }
      `;
      break;
  }
  
  // Append to document head
  document.head.appendChild(styleEl);
}

/**
 * Adds a meta theme-color tag for mobile browsers
 * Adjusts the browser UI color based on the theme
 * Also updates social sharing metadata and favicons
 * 
 * @param theme Current theme definition
 * @param colorScheme Current color scheme (light or dark)
 */
export function setMetaThemeColor(theme: ThemeDefinition, colorScheme: ColorSchemeType): void {
  if (Platform.OS !== 'web') {
    return;
  }
  
  // Get browser UI color based on theme
  let themeColor = theme.colors[colorScheme].background;
  
  if (theme.id === 'neon' && colorScheme === 'dark') {
    themeColor = '#000000';
  }
  
  // Find existing meta tag or create a new one
  let metaThemeTag = document.querySelector('meta[name="theme-color"]');
  
  if (!metaThemeTag) {
    metaThemeTag = document.createElement('meta');
    metaThemeTag.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeTag);
  }
  
  // Set the theme color
  metaThemeTag.setAttribute('content', themeColor);
  
  // Update favicon and social media metadata
  updateFavicon(theme.id as ThemeName);
  
  // Update app title for social sharing
  updateSocialMetaTags('TriviaFeed', 'Test your knowledge with TriviaFeed - The ultimate trivia experience');
  
  // Set the document title
  document.title = 'TriviaFeed';
} 