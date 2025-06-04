/**
 * Promotional Banner Types
 * 
 * Defines the structure for promotional banners that appear in the trivia feed.
 * Banners look like feed items but are clearly promotional and don't affect
 * feed logic, counts, or ordering.
 */

export interface PromotionalBanner {
  id: string;
  type: 'promotional';
  
  // Content
  title: string;
  description: string;
  imageUrl?: string;
  backgroundColor?: string;
  
  // Call to Action
  cta?: {
    text: string;
    url?: string;
    action?: 'external_link' | 'internal_navigation' | 'custom';
    actionData?: any;
  };
  
  // Configuration
  config: BannerConfig;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  priority: number; // Higher number = higher priority
}

export interface BannerConfig {
  // Targeting
  targeting: {
    userTypes: ('guest' | 'logged_in')[];
    topics?: string[]; // Show only when these topics are active
    platforms?: ('ios' | 'android' | 'web')[];
    minQuestionsAnswered?: number;
    maxQuestionsAnswered?: number;
  };
  
  // Display Rules
  display: {
    // When to show
    startDate?: string; // ISO string
    endDate?: string; // ISO string
    
    // How often
    frequency: {
      type: 'once' | 'session' | 'daily' | 'weekly' | 'always';
      maxShows?: number; // Maximum times to show this banner
      cooldownHours?: number; // Hours between shows
    };
    
    // Position in feed
    positioning: {
      strategy: 'fixed_position' | 'after_questions' | 'random';
      position?: number; // For fixed_position: which position in feed (0-based)
      afterQuestions?: number; // For after_questions: show after X questions
      probability?: number; // For random: probability (0-1) of showing
    };
  };
  
  // Behavior
  behavior: {
    dismissible: boolean;
    persistDismissal: boolean; // Remember dismissal across sessions
    autoHideAfterSeconds?: number;
    requireInteraction?: boolean; // Must click CTA or dismiss to continue
  };
  
  // A/B Testing
  abTest?: {
    variant: string;
    trafficSplit: number; // 0-1, what percentage of users see this variant
  };
}

export interface BannerInteraction {
  bannerId: string;
  userId?: string;
  sessionId: string;
  action: 'shown' | 'clicked' | 'dismissed' | 'auto_hidden';
  timestamp: string;
  position?: number; // Position in feed where shown
  metadata?: Record<string, any>;
}

export interface BannerState {
  activeBanners: PromotionalBanner[];
  shownBanners: string[]; // IDs of banners shown in current session
  dismissedBanners: string[]; // IDs of permanently dismissed banners
  interactions: BannerInteraction[];
  lastFetch: string | null;
}

// Utility types for banner management
export type BannerPlacement = {
  banner: PromotionalBanner;
  position: number;
  reason: string; // For debugging/analytics
};

export type BannerEligibility = {
  eligible: boolean;
  reasons: string[]; // Why eligible/not eligible
}; 