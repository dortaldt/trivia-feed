import { ThemeName } from '../context/ThemeContext';
import { Platform } from 'react-native';
import { getActiveTopicConfig } from './topicTheming';

/**
 * Helper utility to get theme-appropriate icons and favicon paths
 */

// Map theme names to their respective app icons
const appIconMap: Record<ThemeName, string> = {
  default: '/assets/images/app-icon.png',
  neon: '/assets/images/app-icon-neon.png',
  retro: '/assets/images/app-icon.png', // Fallback to default if no dedicated icon
  modern: '/assets/images/app-icon.png', // Fallback to default if no dedicated icon
};

// Map theme names to their respective favicons with proper paths
const faviconMap: Record<ThemeName, string> = {
  default: 'favicon.png',
  neon: 'favicon.png',
  retro: 'favicon.png', // Fallback to default if no dedicated icon
  modern: 'favicon.png', // Fallback to default if no dedicated icon
};

// Local social preview images based on topic (hosted in public folder for better accessibility)
const topicSocialImageMap: Record<string, string> = {
  'friends-tv': '/social-preview.png',
  'music': '/social-preview.png', // TODO: Create music-specific social preview
  'nineties': '/social-preview.png', // TODO: Create 90s-specific social preview  
  'default': '/social-preview-neon.png'
};

// Get app icon based on theme
export const getAppIcon = (theme: ThemeName): string => {
  return appIconMap[theme] || appIconMap.default;
};

// Get favicon based on theme
export const getFavicon = (theme: ThemeName): string => {
  // console.log(`Getting favicon for theme: ${theme}`);
  return faviconMap[theme] || faviconMap.default;
};

// Get social preview image based on current topic (using local files for better social media accessibility)
export const getSocialPreviewImage = (): string => {
  try {
    const activeConfig = getActiveTopicConfig();
    const activeTopic = activeConfig.activeTopic || 'default';
    
    // Return the appropriate local social preview image for the topic
    return topicSocialImageMap[activeTopic] || topicSocialImageMap['default'];
  } catch (error) {
    console.error('Error getting active topic for social image:', error);
    // Fallback to Friends theme if there's any error
    return topicSocialImageMap['friends-tv'];
  }
};

// Get social preview image based on theme (legacy function - kept for backward compatibility)
export const getSocialPreviewImageLegacy = (theme: ThemeName): string => {
  switch (theme) {
    case 'neon':
      return '/social-preview-neon.png';
    default:
      return '/social-preview.png';
  }
};

// Update favicon dynamically (web only)
export const updateFavicon = (theme: ThemeName): void => {
  if (Platform.OS !== 'web') return;
  
  // console.log(`Updating favicon for theme: ${theme}`);
  
  try {
    // Get the proper favicon path for this theme
    const faviconPath = getFavicon(theme);
    // console.log(`Using favicon path: ${faviconPath}`);
    
    // Force reload by adding a cache-busting parameter
    const cacheBuster = `?v=${Date.now()}`;
    
    // Get base URL for absolute paths
    const baseUrl = window.location.origin;
    
    // Update main favicon (shortcut icon)
    const mainFavicon = document.querySelector('link[rel="shortcut icon"]');
    if (mainFavicon) {
      // Use absolute path without %PUBLIC_URL%
      const newPath = `${faviconPath.replace('%PUBLIC_URL%', '')}${cacheBuster}`;
      // console.log(`Setting main favicon to: ${newPath}`);
      mainFavicon.setAttribute('href', newPath);
    } else {
      console.warn('Main favicon element not found');
    }
    
    // Update 16x16 favicon
    const favicon16 = document.querySelector('link[sizes="16x16"]');
    if (favicon16) {
      const path16 = theme === 'neon' ? '/favicon-neon-16x16.png' : '/favicon-16x16.png';
      favicon16.setAttribute('href', `${path16}${cacheBuster}`);
    }
    
    // Update 32x32 favicon
    const favicon32 = document.querySelector('link[sizes="32x32"]');
    if (favicon32) {
      const path32 = theme === 'neon' ? '/favicon-neon-32x32.png' : '/favicon-32x32.png';
      favicon32.setAttribute('href', `${path32}${cacheBuster}`);
    }
    
    // Update apple-touch-icon
    const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
    if (appleIcon) {
      const appleIconPath = theme === 'neon' ? '/apple-touch-icon-neon.png' : '/apple-touch-icon.png';
      appleIcon.setAttribute('href', `${appleIconPath}${cacheBuster}`);
    }
    
    // Update social preview images for Open Graph and Twitter
    // *** IMPORTANT: NO cache busters for social media images ***
    // Social platforms don't like URLs with query parameters
    const socialImagePath = getSocialPreviewImage();
    const absoluteSocialImageUrl = `${baseUrl}${socialImagePath}`;
    
    // Helper function to create or update meta tags
    const createOrUpdateMetaTag = (type: string, property: string, content: string) => {
      let metaTag = document.querySelector(`meta[${type}="${property}"]`);
      if (metaTag) {
        metaTag.setAttribute('content', content);
      }
    };
    
    // Update social media images with local URLs (NO cache busters)
    createOrUpdateMetaTag('property', 'og:image', absoluteSocialImageUrl);
    createOrUpdateMetaTag('property', 'og:image:secure_url', absoluteSocialImageUrl);
    createOrUpdateMetaTag('name', 'twitter:image', absoluteSocialImageUrl);
    
    // Create a test element to force favicon reload
    const testLink = document.createElement('link');
    testLink.rel = 'icon';
    testLink.href = `${faviconPath.replace('%PUBLIC_URL%', '')}${cacheBuster}`;
    document.head.appendChild(testLink);
    setTimeout(() => {
      document.head.removeChild(testLink);
    }, 100);
    
    // console.log('Favicon update completed successfully');
  } catch (error) {
    console.error('Error updating favicon:', error);
  }
};

// Update app title in social meta tags (web only)
export const updateSocialMetaTags = (title?: string, description?: string): void => {
  if (Platform.OS !== 'web') return;
  
  try {
    // Default values if not provided
    const finalTitle = title || 'Trivia Feed Friends - Ultimate Friends TV Show Quiz Game';
    const finalDescription = description || 'Could you BE a more Friends fan? Test your knowledge of Central Perk, the gang, and all those iconic moments from the beloved TV series. Join thousands of Friends fans in epic trivia battles!';
    
    // Get the appropriate social image URL for the current topic (local file)
    const baseUrl = window.location.origin;
    const socialImagePath = getSocialPreviewImage();
    const imageUrl = `${baseUrl}${socialImagePath}`;
    
    // Helper function to create or update meta tags
    const createOrUpdateMetaTag = (type: string, property: string, content: string) => {
      let metaTag = document.querySelector(`meta[${type}="${property}"]`);
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(type, property);
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', content);
    };
    
    // Update Open Graph tags
    createOrUpdateMetaTag('property', 'og:title', finalTitle);
    createOrUpdateMetaTag('property', 'og:description', finalDescription);
    createOrUpdateMetaTag('property', 'og:image', imageUrl);
    createOrUpdateMetaTag('property', 'og:image:secure_url', imageUrl);
    createOrUpdateMetaTag('property', 'og:url', window.location.href);
    createOrUpdateMetaTag('property', 'og:type', 'website');
    
    // Update Twitter Card tags
    createOrUpdateMetaTag('name', 'twitter:card', 'summary_large_image');
    createOrUpdateMetaTag('name', 'twitter:title', finalTitle);
    createOrUpdateMetaTag('name', 'twitter:description', finalDescription);
    createOrUpdateMetaTag('name', 'twitter:image', imageUrl);
    
    // console.log('Social meta tags updated successfully');
  } catch (error) {
    console.error('Error updating social meta tags:', error);
  }
}; 