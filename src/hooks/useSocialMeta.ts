import { useEffect } from 'react';
import { Platform } from 'react-native';
import { updateSocialMetaTags } from '../utils/themeIcons';

interface SocialMetaOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
}

/**
 * Hook to set social media metadata for a page
 * Only works on web platform
 */
export function useSocialMeta({
  title,
  description,
  image,
  url
}: SocialMetaOptions = {}) {
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    // Update meta tags with provided values
    updateSocialMetaTags(title, description);
    
    // Custom URL and image handling can be done directly if needed
    if (image || url) {
      try {
        const baseUrl = window.location.origin;
        
        // Helper function to update specific meta tags
        const updateMetaTag = (type: string, name: string, content: string) => {
          let tag = document.querySelector(`meta[${type}="${name}"]`);
          if (tag) {
            tag.setAttribute('content', content);
          }
        };
        
        // Update image if provided
        if (image) {
          // Make sure image URL is absolute
          const imageUrl = image.startsWith('http') ? image : `${baseUrl}${image}`;
          updateMetaTag('property', 'og:image', imageUrl);
          updateMetaTag('name', 'twitter:image', imageUrl);
        }
        
        // Update URL if provided
        if (url) {
          const finalUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
          updateMetaTag('property', 'og:url', finalUrl);
        } else {
          // Default to current URL if not specified
          updateMetaTag('property', 'og:url', window.location.href);
        }
      } catch (error) {
        console.error('Error updating additional meta tags:', error);
      }
    }
  }, [title, description, image, url]);
}

export default useSocialMeta; 