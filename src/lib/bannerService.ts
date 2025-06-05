import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { 
  PromotionalBanner, 
  BannerState, 
  BannerInteraction, 
  BannerPlacement, 
  BannerEligibility 
} from '../types/bannerTypes';
import { UserProfile } from './personalizationService';
import { FeedItem } from './triviaService';
import { trackEvent } from './mixpanelAnalytics';

const BANNER_STORAGE_KEY = 'promotional_banners_state';
const SESSION_ID_KEY = 'banner_session_id';

// Helper function to generate unique session ID
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class BannerService {
  private bannerState: BannerState = {
    activeBanners: [],
    shownBanners: [],
    dismissedBanners: [],
    interactions: [],
    lastFetch: null,
  };

  private sessionId: string = '';
  private initialized = false;
  private isLoadingBanners = false;
  private hasLoggedBannerConfig = false;
  private currentSessionNumber: number = 1; // Track session number

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.sessionId = generateSessionId();
    
    try {
      // Load saved banner state
      const savedState = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.bannerState.interactions = parsedState.interactions || [];
      }

      // Load and increment session count
      await this.loadAndIncrementSessionCount();
      
      console.log('🎯 Banner Service initialized', { 
        sessionId: this.sessionId,
        sessionNumber: this.currentSessionNumber,
        savedInteractions: this.bannerState.interactions.length 
      });
    } catch (error) {
      console.error('❌ Error initializing banner service:', error);
    }

    this.initialized = true;
  }

  /**
   * Load and increment the session count from persistent storage
   */
  private async loadAndIncrementSessionCount(): Promise<void> {
    try {
      const SESSION_COUNT_KEY = 'banner_session_count';
      const savedCount = await AsyncStorage.getItem(SESSION_COUNT_KEY);
      const previousSessionCount = savedCount ? parseInt(savedCount, 10) : 0;
      
      // Increment session count
      this.currentSessionNumber = previousSessionCount + 1;
      
      // Save the new session count
      await AsyncStorage.setItem(SESSION_COUNT_KEY, this.currentSessionNumber.toString());
      
      console.log('📊 Session count updated:', {
        previousCount: previousSessionCount,
        currentSession: this.currentSessionNumber,
        isFirstSession: this.currentSessionNumber === 1
      });
    } catch (error) {
      console.error('❌ Error managing session count:', error);
      // Fallback to session 1 if there's an error
      this.currentSessionNumber = 1;
    }
  }

  /**
   * Load promotional banners from configuration or remote source
   */
  async loadBanners(): Promise<void> {
    // Prevent multiple simultaneous banner loads
    if (this.isLoadingBanners) {
      console.log('🔄 Banner loading already in progress, skipping duplicate call');
      return;
    }
    
    this.isLoadingBanners = true;
    
    try {
      // For now, load from predefined configuration
      // In the future, this could fetch from a remote API
      const banners = this.getConfiguredBanners();
      
      this.bannerState.activeBanners = banners;
      this.bannerState.lastFetch = new Date().toISOString();
      
      await this.saveState();
    } catch (error) {
      console.error('Failed to load banners:', error);
    } finally {
      this.isLoadingBanners = false;
    }
  }

  /**
   * Get configured demo banners - replace with real banner management
   */
  private getConfiguredBanners(): PromotionalBanner[] {
    const now = new Date().toISOString();
    const expoExtra = Constants.expoConfig?.extra;
    let activeTopic = expoExtra?.activeTopic;
    
    // Fallback: If expo config is not available (production builds), import topic config directly
    if (!activeTopic) {
      try {
        const topicConfig = require('../../app-topic-config');
        activeTopic = topicConfig.activeTopic;
        console.log('🔄 Banner Service: Using fallback topic config:', activeTopic);
      } catch (error) {
        console.warn('🔄 Banner Service: Could not load fallback topic config:', error);
        activeTopic = 'music'; // Final fallback to music
      }
    }
    
    // Only show banners for non-default topic apps (music, etc.)
    const isNonDefaultTopicApp = activeTopic && activeTopic !== 'default';
    
    // Reduce log verbosity to prevent spam during development
    if (!this.hasLoggedBannerConfig) {
      console.log('🎯 Banner Service: getConfiguredBanners called', {
        activeTopic,
        isNonDefaultTopicApp,
        returningBanners: isNonDefaultTopicApp,
        source: expoExtra?.activeTopic ? 'expo-config' : 'fallback'
      });
      this.hasLoggedBannerConfig = true;
    }
    
    if (!isNonDefaultTopicApp) {
      // Return empty array for default topic app - no banners
      console.log('🎯 Banner Service: Not showing banners - default topic app or activeTopic is undefined');
      return [];
    }
    
    return [
      // Ultimate trivia app promotion (only for non-default topic apps)
      {
        id: 'ultimate-trivia-app-promotion',
        type: 'promotional',
        title: 'Discover the Ultimate Trivia Experience',
        description: 'Get the full Trivia Feed app with all topics, premium features, and unlimited questions!',
        imageUrl: require('../../assets/images/app-icon.png'),
        backgroundColor: undefined,
        cta: {
          text: 'Download App',
          action: 'external_link',
          url: 'https://apps.apple.com/il/app/trivia-quiz-game-trivia-feed/id6745873915'
        },
        config: {
          targeting: {
            userTypes: ['guest', 'logged_in'],
            platforms: ['ios', 'android', 'web'],
            minQuestionsAnswered: 1, // show after answering 1 question must be lower than afterQuestions!
            maxQuestionsAnswered: 999999,
          },
          display: {
            frequency: {
              type: 'after_first_session', // Show from second session onwards
              maxShows: 5, // Allow more shows
              // No cooldown - banner can show immediately after conditions are met
            },
            positioning: {
              strategy: 'after_questions',
              afterQuestions: 10, // Show after 10th question in session must be higher than minQuestionsAnswered!
            },
          },
          behavior: {
            dismissible: true,
            persistDismissal: false, // Allow banners to return even if dismissed
          },
        },
        createdAt: now,
        updatedAt: now,
        priority: 10,
      },
    ];
  }

  /**
   * Check if a banner is eligible to be shown to the current user
   */
  checkBannerEligibility(
    banner: PromotionalBanner,
    userProfile: UserProfile,
    isGuest: boolean,
    currentTopic?: string
  ): BannerEligibility {
    const reasons: string[] = [];
    
    // Check if banner is dismissed
    if (banner.config.behavior.persistDismissal && 
        this.bannerState.dismissedBanners.includes(banner.id)) {
      return { eligible: false, reasons: ['Banner was permanently dismissed'] };
    }

    // Check user type targeting
    const userType = isGuest ? 'guest' : 'logged_in';
    if (!banner.config.targeting.userTypes.includes(userType)) {
      return { eligible: false, reasons: [`User type ${userType} not targeted`] };
    }
    reasons.push(`User type ${userType} matches targeting`);

    // Check platform targeting
    if (banner.config.targeting.platforms && 
        !banner.config.targeting.platforms.includes(Platform.OS as any)) {
      return { eligible: false, reasons: [`Platform ${Platform.OS} not targeted`] };
    }
    reasons.push(`Platform ${Platform.OS} matches targeting`);

    // Check questions answered range
    const questionsAnswered = userProfile.totalQuestionsAnswered || 0;
    if (banner.config.targeting.minQuestionsAnswered && 
        questionsAnswered < banner.config.targeting.minQuestionsAnswered) {
      return { 
        eligible: false, 
        reasons: [`User has answered ${questionsAnswered} questions, minimum is ${banner.config.targeting.minQuestionsAnswered}`] 
      };
    }
    if (banner.config.targeting.maxQuestionsAnswered && 
        questionsAnswered > banner.config.targeting.maxQuestionsAnswered) {
      return { 
        eligible: false, 
        reasons: [`User has answered ${questionsAnswered} questions, maximum is ${banner.config.targeting.maxQuestionsAnswered}`] 
      };
    }
    reasons.push(`Questions answered ${questionsAnswered} within range`);

    // Check topic targeting
    if (banner.config.targeting.topics && currentTopic && 
        !banner.config.targeting.topics.includes(currentTopic)) {
      return { 
        eligible: false, 
        reasons: [`Current topic ${currentTopic} not in targeted topics`] 
      };
    }

    // Check date range
    const now = new Date();
    if (banner.config.display.startDate && new Date(banner.config.display.startDate) > now) {
      return { eligible: false, reasons: ['Banner start date not reached'] };
    }
    if (banner.config.display.endDate && new Date(banner.config.display.endDate) < now) {
      return { eligible: false, reasons: ['Banner end date passed'] };
    }

    // Check frequency rules
    const frequencyCheck = this.checkFrequencyRules(banner);
    if (!frequencyCheck.eligible) {
      return frequencyCheck;
    }
    reasons.push(...frequencyCheck.reasons);

    return { eligible: true, reasons };
  }

  /**
   * Check frequency rules for a banner
   */
  private checkFrequencyRules(banner: PromotionalBanner): BannerEligibility {
    const interactions = this.bannerState.interactions.filter(i => i.bannerId === banner.id);
    const shownInteractions = interactions.filter(i => i.action === 'shown');
    
    // Check max shows
    if (banner.config.display.frequency.maxShows && 
        shownInteractions.length >= banner.config.display.frequency.maxShows) {
      return { 
        eligible: false, 
        reasons: [`Banner shown ${shownInteractions.length} times, maximum is ${banner.config.display.frequency.maxShows}`] 
      };
    }

    // Check frequency type
    switch (banner.config.display.frequency.type) {
      case 'once':
        if (shownInteractions.length > 0) {
          return { eligible: false, reasons: ['Banner can only be shown once and was already shown'] };
        }
        break;
        
      case 'session':
        if (this.bannerState.shownBanners.includes(banner.id)) {
          return { eligible: false, reasons: ['Banner already shown in this session'] };
        }
        break;
        
      case 'after_first_session':
        // Use persistent session count instead of in-memory interactions
        if (this.currentSessionNumber <= 1) {
          return { 
            eligible: false, 
            reasons: [`Banner only shows after first session. Current session: ${this.currentSessionNumber}`] 
          };
        }
        
        console.log('✅ After first session check passed:', {
          currentSession: this.currentSessionNumber,
          isAfterFirstSession: this.currentSessionNumber > 1
        });
        
        // Apply cooldown if specified
        if (banner.config.display.frequency.cooldownHours) {
          const lastShown = shownInteractions[shownInteractions.length - 1];
          if (lastShown) {
            const timeSinceLastShown = Date.now() - new Date(lastShown.timestamp).getTime();
            const cooldownMs = banner.config.display.frequency.cooldownHours * 60 * 60 * 1000;
            if (timeSinceLastShown < cooldownMs) {
              const remainingHours = Math.ceil((cooldownMs - timeSinceLastShown) / (60 * 60 * 1000));
              return { 
                eligible: false, 
                reasons: [`Banner in cooldown, ${remainingHours} hours remaining`] 
              };
            }
          }
        }
        break;
        
      case 'daily':
      case 'weekly':
        const cooldownHours = banner.config.display.frequency.cooldownHours || 
          (banner.config.display.frequency.type === 'daily' ? 24 : 168);
        const lastShown = shownInteractions[shownInteractions.length - 1];
        if (lastShown) {
          const timeSinceLastShown = Date.now() - new Date(lastShown.timestamp).getTime();
          const cooldownMs = cooldownHours * 60 * 60 * 1000;
          if (timeSinceLastShown < cooldownMs) {
            const remainingHours = Math.ceil((cooldownMs - timeSinceLastShown) / (60 * 60 * 1000));
            return { 
              eligible: false, 
              reasons: [`Banner in cooldown, ${remainingHours} hours remaining`] 
            };
          }
        }
        break;
        
      case 'always':
        // No frequency restrictions
        break;
    }

    return { eligible: true, reasons: ['Frequency rules passed'] };
  }

  /**
   * Get banners that should be placed in the feed
   */
  async getBannersForFeed(
    feedItems: FeedItem[],
    userProfile: UserProfile,
    isGuest: boolean,
    currentTopic?: string
  ): Promise<BannerPlacement[]> {
    console.log('🎯 Banner Service: getBannersForFeed called');
    console.log('📊 User Profile:', {
      isGuest,
      questionsAnswered: userProfile.totalQuestionsAnswered || 0,
      currentTopic,
      feedLength: feedItems.length
    });
    
    await this.initialize();
    
    // Only load banners if we haven't loaded them yet and we're not currently loading
    if (this.bannerState.activeBanners.length === 0) {
      console.log('⚠️  No active banners, loading...');
      await this.loadBanners();
    }

    console.log(`📋 Checking ${this.bannerState.activeBanners.length} active banners`);
    const placements: BannerPlacement[] = [];
    
    // Check each banner for eligibility
    for (const banner of this.bannerState.activeBanners) {
      console.log(`🔍 Checking banner: ${banner.id}`);
      const eligibility = this.checkBannerEligibility(banner, userProfile, isGuest, currentTopic);
      
      if (!eligibility.eligible) {
        console.log(`❌ Banner ${banner.id} not eligible:`, eligibility.reasons);
        continue;
      }

      console.log(`✅ Banner ${banner.id} eligible:`, eligibility.reasons);

      // Determine position based on strategy
      const position = this.calculateBannerPosition(banner, feedItems.length);
      console.log(`📍 Banner ${banner.id} position:`, position);
      
      if (position !== null) {
        placements.push({
          banner,
          position,
          reason: `Strategy: ${banner.config.display.positioning.strategy}, Eligibility: ${eligibility.reasons.join(', ')}`
        });
        console.log(`✨ Banner ${banner.id} added to placements at position ${position}`);
      }
    }

    console.log(`🎉 Final placements: ${placements.length} banners`);
    placements.forEach(p => console.log(`  - ${p.banner.id} at position ${p.position}`));

    // Sort by priority (higher priority first)
    return placements.sort((a, b) => b.banner.priority - a.banner.priority);
  }

  /**
   * Calculate position for a banner based on its positioning strategy
   */
  private calculateBannerPosition(banner: PromotionalBanner, feedLength: number): number | null {
    const strategy = banner.config.display.positioning;
    
    switch (strategy.strategy) {
      case 'fixed_position':
        const position = strategy.position ?? 0;
        return position < feedLength ? position : null;
        
      case 'after_questions':
        const afterQuestions = strategy.afterQuestions ?? 5;
        return afterQuestions < feedLength ? afterQuestions : null;
        
      case 'random':
        const probability = strategy.probability ?? 0.1;
        if (Math.random() < probability) {
          // Return a random position in the first half of the feed
          return Math.floor(Math.random() * Math.min(feedLength, 10));
        }
        return null;
        
      default:
        return null;
    }
  }

  /**
   * Record a banner interaction
   */
  async recordInteraction(
    bannerId: string,
    action: BannerInteraction['action'],
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const interaction: BannerInteraction = {
      bannerId,
      userId,
      sessionId: this.sessionId,
      action,
      timestamp: new Date().toISOString(),
      metadata,
    };

    this.bannerState.interactions.push(interaction);
    
    // Update session state for shown banners
    if (action === 'shown') {
      if (!this.bannerState.shownBanners.includes(bannerId)) {
        this.bannerState.shownBanners.push(bannerId);
      }
    }

    // Track interaction with Mixpanel
    try {
      await trackEvent('Promotional Banner Interaction', {
        bannerId,
        action,
        sessionId: this.sessionId,
        userId,
        ...metadata
      });
    } catch (error) {
      console.error('Failed to track banner interaction:', error);
    }

    await this.saveState();
  }

  /**
   * Dismiss a banner (permanently if configured)
   */
  async dismissBanner(bannerId: string, userId?: string): Promise<void> {
    const banner = this.bannerState.activeBanners.find(b => b.id === bannerId);
    
    if (banner?.config.behavior.persistDismissal) {
      if (!this.bannerState.dismissedBanners.includes(bannerId)) {
        this.bannerState.dismissedBanners.push(bannerId);
      }
    }

    await this.recordInteraction(bannerId, 'dismissed', userId);
  }

  /**
   * Save banner state to storage
   */
  private async saveState(): Promise<void> {
    try {
      await AsyncStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(this.bannerState));
    } catch (error) {
      console.error('Failed to save banner state:', error);
    }
  }

  /**
   * Get current banner state (for debugging)
   */
  getBannerState(): BannerState {
    return { ...this.bannerState };
  }

  /**
   * Clear all banner data (for testing/debugging)
   */
  async clearBannerData(): Promise<void> {
    this.bannerState = {
      activeBanners: [],
      shownBanners: [],
      dismissedBanners: [],
      interactions: [],
      lastFetch: null,
    };
    
    await AsyncStorage.removeItem(BANNER_STORAGE_KEY);
    await AsyncStorage.removeItem(SESSION_ID_KEY);
    this.initialized = false;
  }
}

export const bannerService = new BannerService(); 