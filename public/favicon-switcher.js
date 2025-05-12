/**
 * Utility script to manually test favicon switching
 * You can include this in your page or run it directly in the browser console
 */

function switchToNeonFavicon() {
  console.log('Switching to neon favicon');
  
  // Update main favicon
  const mainFavicon = document.querySelector('link[rel="shortcut icon"]');
  if (mainFavicon) {
    mainFavicon.setAttribute('href', '/favicon-neon.png?v=' + Date.now());
  } else {
    console.warn('Main favicon element not found');
  }
  
  // Update 16x16 favicon
  const favicon16 = document.querySelector('link[sizes="16x16"]');
  if (favicon16) {
    favicon16.setAttribute('href', '/favicon-neon-16x16.png?v=' + Date.now());
  }
  
  // Update 32x32 favicon
  const favicon32 = document.querySelector('link[sizes="32x32"]');
  if (favicon32) {
    favicon32.setAttribute('href', '/favicon-neon-32x32.png?v=' + Date.now());
  }
  
  // Update apple-touch-icon
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.setAttribute('href', '/apple-touch-icon-neon.png?v=' + Date.now());
  }
  
  // Force favicon reload
  const tempLink = document.createElement('link');
  tempLink.rel = 'icon';
  tempLink.href = '/favicon-neon.png?v=' + Date.now();
  document.head.appendChild(tempLink);
  setTimeout(() => {
    try {
      document.head.removeChild(tempLink);
    } catch (e) {
      console.warn('Could not remove temp link', e);
    }
  }, 100);
  
  return 'Switched to neon favicon';
}

function switchToDefaultFavicon() {
  console.log('Switching to default favicon');
  
  // Update main favicon
  const mainFavicon = document.querySelector('link[rel="shortcut icon"]');
  if (mainFavicon) {
    mainFavicon.setAttribute('href', '/favicon.png?v=' + Date.now());
  } else {
    console.warn('Main favicon element not found');
  }
  
  // Update 16x16 favicon
  const favicon16 = document.querySelector('link[sizes="16x16"]');
  if (favicon16) {
    favicon16.setAttribute('href', '/favicon-16x16.png?v=' + Date.now());
  }
  
  // Update 32x32 favicon
  const favicon32 = document.querySelector('link[sizes="32x32"]');
  if (favicon32) {
    favicon32.setAttribute('href', '/favicon-32x32.png?v=' + Date.now());
  }
  
  // Update apple-touch-icon
  const appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
  if (appleIcon) {
    appleIcon.setAttribute('href', '/apple-touch-icon.png?v=' + Date.now());
  }
  
  // Force favicon reload
  const tempLink = document.createElement('link');
  tempLink.rel = 'icon';
  tempLink.href = '/favicon.png?v=' + Date.now();
  document.head.appendChild(tempLink);
  setTimeout(() => {
    try {
      document.head.removeChild(tempLink);
    } catch (e) {
      console.warn('Could not remove temp link', e);
    }
  }, 100);
  
  return 'Switched to default favicon';
}

// To test in console, call these functions directly:
// switchToNeonFavicon();
// switchToDefaultFavicon();

// Log current favicons for debugging
console.log('Current favicons:');
document.querySelectorAll('link[rel*="icon"]').forEach(link => {
  console.log(`${link.rel} (${link.sizes || 'no size'}): ${link.href}`);
}); 