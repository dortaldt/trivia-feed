import { Mixpanel } from 'mixpanel-react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Mixpanel token
const MIXPANEL_TOKEN = '96dae6cd094d82692a291ed838ab6272';

// Initialize Mixpanel with automatic events disabled (we'll track them manually)
const trackAutomaticEvents = false;
const mixpanel = new Mixpanel(MIXPANEL_TOKEN, trackAutomaticEvents);

let isInitialized = false;
let sessionCount = 0;
let questionAnsweredCount = 0;
let currentUserId: string | null = null;
// Add local counter for accurate total question count
let localQuestionCounter = 0;

/**
 * Get or create a persistent device ID for consistent user identification
 */
const getDeviceId = async (): Promise<string> => {
  let deviceId = await AsyncStorage.getItem('mixpanel_device_id');
  
  if (!deviceId) {
    // Create a persistent device ID that won't change between sessions
    deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    await AsyncStorage.setItem('mixpanel_device_id', deviceId);
    console.log('Created new persistent device ID for analytics:', deviceId);
  }
  
  return deviceId;
};

/**
 * Initialize Mixpanel analytics
 */
export const initMixpanel = async () => {
  if (isInitialized) return;
  
  try {
    // Initialize Mixpanel SDK
    await mixpanel.init();
    
    // Get the persistent device ID
    const deviceId = await getDeviceId();
    currentUserId = deviceId;
    
    // Set this device ID as the identity for all events until user logs in
    await mixpanel.identify(deviceId);
    
    console.log('Identified device with persistent ID:', deviceId);
    
    // Load session count from storage
    const storedSessionCount = await AsyncStorage.getItem('mixpanel_session_count');
    sessionCount = storedSessionCount ? parseInt(storedSessionCount, 10) : 0;
    
    // Load question count from storage
    const storedQuestionCount = await AsyncStorage.getItem('mixpanel_question_count');
    questionAnsweredCount = storedQuestionCount ? parseInt(storedQuestionCount, 10) : 0;
    
    // Initialize local counter from stored value
    localQuestionCounter = questionAnsweredCount;
    
    // Track session start
    sessionCount++;
    await AsyncStorage.setItem('mixpanel_session_count', sessionCount.toString());
    
    // Get app version info with multiple fallbacks
    let appVersion = process.env.EXPO_PUBLIC_APP_VERSION || 
                     Constants.expoConfig?.extra?.appVersion || 
                     '1.2.0'; // Default numeric version
    let appTopic = 'default';
    
    try {
      const topicConfig = require('../../app-topic-config');
      appTopic = topicConfig.activeTopic || 'default';
    } catch (error) {
      console.warn('Could not load topic config for analytics:', error);
    }
    
    // Set global properties that will be sent with every event
    mixpanel.registerSuperProperties({
      platform: Platform.OS,
      appVersion: appVersion, // Use the already resolved version
      appTopic: appTopic,
      deviceType: Platform.OS === 'web' ? 'web' : Platform.OS,
    });
    
    // Track session start event (now with consistent user ID)
    await mixpanel.track('Session Start', {
      sessionNumber: sessionCount,
      timestamp: new Date().toISOString(),
    });
    
    isInitialized = true;
    console.log('Mixpanel initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Mixpanel:', error);
  }
};

/**
 * Identify a user with Mixpanel - used when a user signs in or signs up
 * @param userId Unique identifier for the user
 * @param userProperties Additional user properties to track
 */
export const identifyUser = async (userId: string, userProperties: Record<string, any> = {}) => {
  if (!isInitialized) {
    await initMixpanel();
  }
  
  try {
    // Get the device ID that was used for anonymous tracking
    const deviceId = await getDeviceId();
    
    if (userId !== deviceId && currentUserId !== userId) {
      // Only create alias if this is a real user ID (not a device ID)
      // and it's different from the current user ID
      
      console.log(`Creating alias from device ID ${deviceId} to user ID ${userId}`);
      
      try {
        // Create an alias from the anonymous device ID to the real user ID
        // This connects all previous anonymous activity to the new user identity
        await mixpanel.alias(userId, deviceId);
      } catch (aliasError) {
        console.error('Failed to create alias in Mixpanel:', aliasError);
        // Continue anyway since identifying still works
      }
    }
    
    // Set the user ID for all future events
    await mixpanel.identify(userId);
    currentUserId = userId;
    
    // Get app version and topic info for user properties
    let appVersion = process.env.EXPO_PUBLIC_APP_VERSION || 
                     Constants.expoConfig?.extra?.appVersion || 
                     '1.2.0';
    let appTopic = 'default';
    
    try {
      const topicConfig = require('../../app-topic-config');
      appTopic = topicConfig.activeTopic || 'default';
    } catch (error) {
      console.warn('Could not load topic config for analytics:', error);
    }
    
    // Combine user properties with platform info
    const properties = {
      ...userProperties,
      platform: Platform.OS,
      deviceType: Platform.OS === 'web' ? 'web' : Platform.OS,
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion,
      appTopic: appTopic,
      $last_seen: new Date().toISOString(),
      sessionCount,
    };
    
    // Set user profile properties
    await mixpanel.getPeople().set(properties);
    
    console.log('User identified in Mixpanel:', userId);
  } catch (error) {
    console.error('Failed to identify user in Mixpanel:', error);
  }
};

/**
 * Track an event with Mixpanel
 * @param eventName Name of the event to track
 * @param properties Additional properties for the event
 */
export const trackEvent = async (eventName: string, properties: Record<string, any> = {}) => {
  if (!isInitialized) {
    await initMixpanel();
  }
  
  try {
    // Ensure we're using a consistent user ID for all events
    if (!currentUserId) {
      const deviceId = await getDeviceId();
      await mixpanel.identify(deviceId);
      currentUserId = deviceId;
    }
    
    // Get app version and topic info for all events
    let appVersion = '1.2.0'; // Numeric version
    let appTopic = 'default'; // Topic version
    
    try {
      const topicConfig = require('../../app-topic-config');
      appTopic = topicConfig.activeTopic || 'default';
    } catch (error) {
      // Fallback to default if config can't be loaded
      console.warn('Could not load topic config for analytics:', error);
    }
    
    // Special handling for Question Answered events to ensure accurate counting
    if (eventName === 'Question Answered') {
      // Increment our local counter first
      localQuestionCounter++;
      
      // Override any provided totalAnswered with our accurate local counter
      properties = {
        ...properties,
        totalAnswered: localQuestionCounter,
      };
      
      // Update persistent storage with the new count
      await AsyncStorage.setItem('mixpanel_question_count', localQuestionCounter.toString());
      questionAnsweredCount = localQuestionCounter;
    }
    
    // Combine event properties with default platform info and app version
    const eventProperties = {
      ...properties,
      platform: Platform.OS,
      deviceType: Platform.OS === 'web' ? 'web' : Platform.OS,
      appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion, // Numeric app version
      appTopic: appTopic, // Topic version (default/nineties/music/etc.)
      timestamp: new Date().toISOString(),
    };
    
    // Track the event
    await mixpanel.track(eventName, eventProperties);
    
    // Special handling for question milestone events
    if (eventName === 'Question Answered') {
      // Track milestone events (questions 1, 50, 100, 150, etc.)
      if (localQuestionCounter === 1 || localQuestionCounter % 50 === 0) {
        await mixpanel.track('Question Milestone Reached', {
          questionCount: localQuestionCounter,
          milestone: localQuestionCounter === 1 ? 'First Question' : `${localQuestionCounter} Questions`,
          isCorrect: properties.isCorrect,
          totalAnswered: localQuestionCounter,
          platform: Platform.OS,
          appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion, // Numeric app version
          appTopic: appTopic, // Topic version
          timestamp: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error(`Failed to track event "${eventName}" in Mixpanel:`, error);
  }
};

/**
 * Track when a user views a screen
 * @param screenName Name of the screen being viewed
 * @param properties Additional properties for the screen view
 */
export const trackScreenView = async (screenName: string, properties: Record<string, any> = {}) => {
  await trackEvent('Screen View', {
    screen: screenName,
    ...properties,
  });
};

/**
 * Track when a user clicks a button
 * @param buttonName Name of the button clicked
 * @param properties Additional properties for the button click
 */
export const trackButtonClick = async (buttonName: string, properties: Record<string, any> = {}) => {
  await trackEvent('Button Click', {
    button: buttonName,
    ...properties,
  });
};

/**
 * Track topic ring interactions
 * @param ringTopic The topic of the ring that was clicked
 * @param properties Additional properties for the ring interaction
 */
export const trackTopicRingClick = async (ringTopic: string, properties: Record<string, any> = {}) => {
  // Get app version and topic info
  let appVersion = '1.2.0';
  let appTopic = 'default';
  
  try {
    const topicConfig = require('../../app-topic-config');
    appTopic = topicConfig.activeTopic || 'default';
  } catch (error) {
    console.warn('Could not load topic config for analytics:', error);
  }

  await trackEvent('Topic Ring Click', {
    ringTopic,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion,
    appTopic: appTopic,
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

/**
 * Track topic ring modal interactions
 * @param action The action performed in the modal (opened, closed, feed_control_more, feed_control_less)
 * @param ringTopic The topic of the ring
 * @param properties Additional properties for the modal interaction
 */
export const trackTopicRingModal = async (action: string, ringTopic: string, properties: Record<string, any> = {}) => {
  // Get app version and topic info
  let appVersion = '1.2.0';
  let appTopic = 'default';
  
  try {
    const topicConfig = require('../../app-topic-config');
    appTopic = topicConfig.activeTopic || 'default';
  } catch (error) {
    console.warn('Could not load topic config for analytics:', error);
  }

  await trackEvent('Topic Ring Modal', {
    action,
    ringTopic,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion,
    appTopic: appTopic,
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

/**
 * Track all rings modal interactions
 * @param action The action performed (opened, closed, ring_selected)
 * @param properties Additional properties for the interaction
 */
export const trackAllRingsModal = async (action: string, properties: Record<string, any> = {}) => {
  // Get app version and topic info
  let appVersion = '1.2.0';
  let appTopic = 'default';
  
  try {
    const topicConfig = require('../../app-topic-config');
    appTopic = topicConfig.activeTopic || 'default';
  } catch (error) {
    console.warn('Could not load topic config for analytics:', error);
  }

  await trackEvent('All Rings Modal', {
    action,
    appVersion: process.env.EXPO_PUBLIC_APP_VERSION || appVersion,
    appTopic: appTopic,
    timestamp: new Date().toISOString(),
    ...properties,
  });
};

/**
 * Reset user tracking (e.g., on logout)
 */
export const resetUser = async () => {
  if (!isInitialized) return;
  
  try {
    // Track logout event first
    await trackEvent('User Logout');
    
    // Get the device ID to revert to anonymous tracking
    const deviceId = await getDeviceId();
    
    // Reset the user in Mixpanel
    await mixpanel.reset();
    
    // Identify as the anonymous device ID again
    await mixpanel.identify(deviceId);
    currentUserId = deviceId;
    
    console.log('User reset in Mixpanel, reverting to device ID:', deviceId);
  } catch (error) {
    console.error('Failed to reset user in Mixpanel:', error);
  }
};

/**
 * Track session end and flush events
 */
export const endSession = async () => {
  if (!isInitialized) return;
  
  try {
    // Track session end event
    await trackEvent('Session End', {
      sessionNumber: sessionCount,
    });
    
    // Flush any pending events to ensure they're sent
    await mixpanel.flush();
    
    console.log('Session ended and events flushed');
  } catch (error) {
    console.error('Failed to end session in Mixpanel:', error);
  }
};

export default {
  initMixpanel,
  identifyUser,
  trackEvent,
  trackScreenView,
  trackButtonClick,
  trackTopicRingClick,
  trackTopicRingModal,
  trackAllRingsModal,
  resetUser,
  endSession,
}; 