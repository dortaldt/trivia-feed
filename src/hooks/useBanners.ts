import { useEffect, useMemo, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { bannerService } from '../lib/bannerService';
import { 
  setBanners, 
  recordBannerInteraction, 
  dismissBanner as dismissBannerAction,
  clearBannerSession 
} from '../store/triviaSlice';
import { BannerPlacement, PromotionalBanner } from '../types/bannerTypes';
import { FeedItem } from '../lib/triviaService';
import { useAuth } from '../context/AuthContext';

export const useBanners = () => {
  const dispatch = useAppDispatch();
  const { user, isGuest } = useAuth();
  
  const bannerState = useAppSelector(state => state.trivia.banners);
  const userProfile = useAppSelector(state => state.trivia.userProfile);
  const personalizedFeed = useAppSelector(state => state.trivia.personalizedFeed);
  
  // Use refs to track initialization state and prevent re-initialization
  const isInitialized = useRef(false);
  const isLoading = useRef(false);

  // Initialize banner service on mount - only run once
  useEffect(() => {
    const initializeBanners = async () => {
      // Prevent multiple simultaneous initializations
      if (isInitialized.current || isLoading.current) {
        return;
      }
      
      isLoading.current = true;
      
      try {
        await bannerService.initialize();
        
        // Clear session banners on app start
        dispatch(clearBannerSession());
        
        // Load banners if we don't have any or they're stale
        const shouldLoad = bannerState.activeBanners.length === 0 || 
                          !bannerState.lastFetch ||
                          Date.now() - new Date(bannerState.lastFetch).getTime() > 24 * 60 * 60 * 1000; // 24 hours
        
        if (shouldLoad) {
          await bannerService.loadBanners();
          const serviceState = bannerService.getBannerState();
          dispatch(setBanners({
            banners: serviceState.activeBanners,
            lastFetch: serviceState.lastFetch || new Date().toISOString()
          }));
        }
        
        isInitialized.current = true;
      } catch (error) {
        console.error('Failed to initialize banners:', error);
      } finally {
        isLoading.current = false;
      }
    };

    initializeBanners();
  }, [dispatch]); // Only depend on dispatch, not on banner state to prevent loops

  /**
   * Get banners that should be placed in the current feed
   */
  const getBannersForFeed = useMemo(() => {
    return async (): Promise<BannerPlacement[]> => {
      if (!userProfile || personalizedFeed.length === 0) {
        return [];
      }

      try {
        // Get current active topic (if any)
        const currentTopic = personalizedFeed[0]?.topic;
        
        const placements = await bannerService.getBannersForFeed(
          personalizedFeed,
          userProfile,
          isGuest,
          currentTopic
        );
        
        return placements;
      } catch (error) {
        console.error('Failed to get banners for feed:', error);
        return [];
      }
    };
  }, [personalizedFeed, userProfile, isGuest]);

  /**
   * Record a banner interaction
   */
  const recordInteraction = async (
    bannerId: string, 
    action: 'shown' | 'clicked' | 'dismissed' | 'auto_hidden',
    metadata?: any
  ) => {
    try {
      const interaction = {
        bannerId,
        userId: user?.id,
        sessionId: '', // Will be set by service
        action,
        timestamp: new Date().toISOString(),
        metadata,
      };

      // Record in service
      await bannerService.recordInteraction(bannerId, action, user?.id, metadata);
      
      // Update Redux state
      dispatch(recordBannerInteraction(interaction));
    } catch (error) {
      console.error('Failed to record banner interaction:', error);
    }
  };

  /**
   * Dismiss a banner
   */
  const dismissBanner = async (bannerId: string) => {
    try {
      const banner = bannerState.activeBanners.find(b => b.id === bannerId);
      if (!banner) return;

      // Dismiss in service
      await bannerService.dismissBanner(bannerId, user?.id);
      
      // Update Redux state
      dispatch(dismissBannerAction({
        bannerId,
        persistDismissal: banner.config.behavior.persistDismissal
      }));

      // Record dismissal interaction
      await recordInteraction(bannerId, 'dismissed');
    } catch (error) {
      console.error('Failed to dismiss banner:', error);
    }
  };

  /**
   * Check if a specific banner is eligible to be shown
   */
  const isBannerEligible = (banner: PromotionalBanner): boolean => {
    if (!userProfile) return false;
    
    try {
      const currentTopic = personalizedFeed[0]?.topic;
      const eligibility = bannerService.checkBannerEligibility(
        banner,
        userProfile,
        isGuest,
        currentTopic
      );
      return eligibility.eligible;
    } catch (error) {
      console.error('Failed to check banner eligibility:', error);
      return false;
    }
  };

  /**
   * Get debug information about banner state
   */
  const getDebugInfo = () => {
    const serviceState = bannerService.getBannerState();
    return {
      reduxState: bannerState,
      serviceState,
      userProfile: {
        questionsAnswered: userProfile?.totalQuestionsAnswered || 0,
        isGuest,
        userId: user?.id,
      },
    };
  };

  /**
   * Clear all banner data (for testing/debugging)
   */
  const clearBannerData = async () => {
    try {
      await bannerService.clearBannerData();
      dispatch(clearBannerSession());
      dispatch(setBanners({ banners: [], lastFetch: new Date().toISOString() }));
    } catch (error) {
      console.error('Failed to clear banner data:', error);
    }
  };

  return {
    // State
    banners: bannerState.activeBanners,
    shownBanners: bannerState.shownBanners,
    dismissedBanners: bannerState.dismissedBanners,
    interactions: bannerState.interactions,
    
    // Actions
    getBannersForFeed,
    recordInteraction,
    dismissBanner,
    isBannerEligible,
    
    // Debug/Admin
    getDebugInfo,
    clearBannerData,
  };
}; 