/**
 * Utility to apply theme variables as CSS custom properties for web
 * This makes it easier to use theme colors in CSS and ensures consistency
 */

import { Platform } from 'react-native';
import { ThemeDefinition } from '../design/themes';
import { ColorSchemeType } from '../context/ThemeContext';

/**
 * Applies theme colors as CSS variables on the document root
 * Only has an effect on web platform
 * 
 * @param theme Current theme definition
 * @param colorScheme Current color scheme (light or dark)
 */
export function applyThemeVariables(theme: ThemeDefinition, colorScheme: ColorSchemeType): void {
  // Only run on web platform
  if (Platform.OS !== 'web') {
    return;
  }
  
  // Get the document root element
  const root = document.documentElement;
  
  // Get the colors for the current color scheme
  const colors = theme.colors[colorScheme];
  
  // Apply all colors as CSS variables
  Object.entries(colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Apply spacing values
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--spacing-${key}`, `${value}px`);
  });
  
  // Apply border radius values
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    root.style.setProperty(`--radius-${key}`, `${value}px`);
  });
  
  // Apply typography values
  Object.entries(theme.typography.fontSize).forEach(([key, value]) => {
    root.style.setProperty(`--font-size-${key}`, `${value}px`);
  });
  
  // Apply animation durations
  Object.entries(theme.animations.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, `${value}ms`);
  });
  
  // Set some meta properties to help with theme detection in CSS
  root.style.setProperty('--theme-id', theme.id);
  root.style.setProperty('--color-scheme', colorScheme);
  
  // Update the data attributes for easier CSS selectors
  root.dataset.theme = theme.id;
  root.dataset.colorScheme = colorScheme;
  
  // Add appropriate web animations based on theme
  applyThemeAnimations(theme.id);
}

/**
 * Adds appropriate CSS animations based on the theme
 * 
 * @param themeId The current theme ID
 */
function applyThemeAnimations(themeId: string): void {
  // Remove any existing theme animation style tags
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
} 