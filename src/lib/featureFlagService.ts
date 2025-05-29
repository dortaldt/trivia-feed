/**
 * Feature Flag Service
 * 
 * This service manages feature flags for the application.
 * Flags are stored in AsyncStorage and can be controlled via the admin panel.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  defaultValue: boolean;
  category: 'generator' | 'ui' | 'analytics' | 'debug';
}

// Default feature flags configuration
const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, 'enabled'>[] = [
  {
    key: 'question_similarity_check',
    name: 'Question Similarity Check',
    description: 'Enable similarity checking against existing questions during generation to prevent duplicates',
    defaultValue: false,
    category: 'generator',
  },
  {
    key: 'debug_logging',
    name: 'Debug Logging',
    description: 'Enable detailed debug logging throughout the application',
    defaultValue: false,
    category: 'debug',
  },
  {
    key: 'enhanced_analytics',
    name: 'Enhanced Analytics',
    description: 'Enable detailed analytics tracking and performance monitoring',
    defaultValue: true,
    category: 'analytics',
  },
];

const STORAGE_KEY = 'feature_flags';

class FeatureFlagService {
  private flags: Map<string, FeatureFlag> = new Map();
  private initialized = false;

  /**
   * Initialize the feature flag service
   */
  async initialize(): Promise<void> {
    try {
      // Load flags from storage
      const storedFlags = await AsyncStorage.getItem(STORAGE_KEY);
      let savedFlags: Record<string, boolean> = {};
      
      if (storedFlags) {
        savedFlags = JSON.parse(storedFlags);
      }

      // Initialize flags with stored values or defaults
      for (const flagConfig of DEFAULT_FEATURE_FLAGS) {
        const enabled = savedFlags[flagConfig.key] !== undefined 
          ? savedFlags[flagConfig.key] 
          : flagConfig.defaultValue;
        
        this.flags.set(flagConfig.key, {
          ...flagConfig,
          enabled,
        });
      }

      this.initialized = true;
      console.log('[FeatureFlags] Initialized with flags:', Array.from(this.flags.keys()));
    } catch (error) {
      console.error('[FeatureFlags] Failed to initialize:', error);
      // Fall back to default values
      for (const flagConfig of DEFAULT_FEATURE_FLAGS) {
        this.flags.set(flagConfig.key, {
          ...flagConfig,
          enabled: flagConfig.defaultValue,
        });
      }
      this.initialized = true;
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flagKey: string): boolean {
    if (!this.initialized) {
      console.warn(`[FeatureFlags] Service not initialized, returning default for ${flagKey}`);
      const defaultFlag = DEFAULT_FEATURE_FLAGS.find(f => f.key === flagKey);
      return defaultFlag?.defaultValue || false;
    }

    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`[FeatureFlags] Unknown flag: ${flagKey}`);
      return false;
    }

    return flag.enabled;
  }

  /**
   * Set a feature flag value
   */
  async setFlag(flagKey: string, enabled: boolean): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const flag = this.flags.get(flagKey);
    if (!flag) {
      console.warn(`[FeatureFlags] Cannot set unknown flag: ${flagKey}`);
      return;
    }

    // Update the flag
    flag.enabled = enabled;
    this.flags.set(flagKey, flag);

    // Persist to storage
    try {
      const flagsToSave: Record<string, boolean> = {};
      this.flags.forEach((flag, key) => {
        flagsToSave[key] = flag.enabled;
      });
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flagsToSave));
      console.log(`[FeatureFlags] Updated flag ${flagKey} to ${enabled}`);
    } catch (error) {
      console.error(`[FeatureFlags] Failed to persist flag ${flagKey}:`, error);
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlag[] {
    if (!this.initialized) {
      console.warn('[FeatureFlags] Service not initialized, returning empty flags');
      return [];
    }

    return Array.from(this.flags.values());
  }

  /**
   * Reset all flags to their default values
   */
  async resetToDefaults(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Reset all flags to default values
    for (const flagConfig of DEFAULT_FEATURE_FLAGS) {
      const flag = this.flags.get(flagConfig.key);
      if (flag) {
        flag.enabled = flagConfig.defaultValue;
        this.flags.set(flagConfig.key, flag);
      }
    }

    // Persist to storage
    try {
      const flagsToSave: Record<string, boolean> = {};
      this.flags.forEach((flag, key) => {
        flagsToSave[key] = flag.enabled;
      });
      
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(flagsToSave));
      console.log('[FeatureFlags] Reset all flags to defaults');
    } catch (error) {
      console.error('[FeatureFlags] Failed to persist reset flags:', error);
    }
  }

  /**
   * Get flags by category
   */
  getFlagsByCategory(category: FeatureFlag['category']): FeatureFlag[] {
    if (!this.initialized) {
      return [];
    }

    return Array.from(this.flags.values()).filter(flag => flag.category === category);
  }
}

// Create singleton instance
export const featureFlagService = new FeatureFlagService();

// Initialize on module load
featureFlagService.initialize().catch(error => {
  console.error('[FeatureFlags] Failed to initialize service:', error);
});

// Convenience functions for common flags
export const isQuestionSimilarityCheckEnabled = (): boolean => {
  return featureFlagService.isEnabled('question_similarity_check');
};

export const isDebugLoggingEnabled = (): boolean => {
  return featureFlagService.isEnabled('debug_logging');
};

export const isEnhancedAnalyticsEnabled = (): boolean => {
  return featureFlagService.isEnabled('enhanced_analytics');
}; 