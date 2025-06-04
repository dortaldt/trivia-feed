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

const BANNER_STORAGE_KEY = 'promotional_banners_state';
const SESSION_ID_KEY = 'banner_session_id';

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

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load saved state
      const savedState = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
      if (savedState) {
        this.bannerState = { ...this.bannerState, ...JSON.parse(savedState) };
      }

      // Generate or load session ID
      let sessionId = await AsyncStorage.getItem(SESSION_ID_KEY);
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await AsyncStorage.setItem(SESSION_ID_KEY, sessionId);
      }
      this.sessionId = sessionId;

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize banner service:', error);
    }
  }

  /**
   * Load promotional banners from configuration or remote source
   */
  async loadBanners(): Promise<void> {
    try {
      // For now, load from predefined configuration
      // In the future, this could fetch from a remote API
      const banners = this.getConfiguredBanners();
      
      this.bannerState.activeBanners = banners;
      this.bannerState.lastFetch = new Date().toISOString();
      
      await this.saveState();
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  }

  /**
   * Get configured demo banners - replace with real banner management
   */
  private getConfiguredBanners(): PromotionalBanner[] {
    const now = new Date().toISOString();
    const { activeTopic } = Constants.expoConfig?.extra || {};
    
    // TESTING: Show banners for all apps (including default) for testing purposes
    const isNonDefaultTopicApp = activeTopic && activeTopic !== 'default';
    
    console.log('🎯 Banner Service: getConfiguredBanners called', {
      activeTopic,
      isNonDefaultTopicApp,
      returningBanners: true
    });
    
    // Temporarily disable this check for testing
    // if (!isNonDefaultTopicApp) {
    //   // Return empty array for default topic app - no banners
    //   return [];
    // }
    
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
            minQuestionsAnswered: 0, // Show immediately for testing
            maxQuestionsAnswered: 999999,
          },
          display: {
            frequency: {
              type: 'always', // Show every time for testing
            },
            positioning: {
              strategy: 'fixed_position',
              position: 4, // Second feed item (0-indexed)
            },
          },
          behavior: {
            dismissible: true,
            persistDismissal: false, // Never persist dismissal for testing
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