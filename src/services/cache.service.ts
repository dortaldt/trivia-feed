/**
 * Cache Service
 * 
 * This service provides caching functionality for API responses to improve
 * performance and reduce the number of API calls.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import CryptoJS from 'crypto-js';

/**
 * Structure of a cached item
 */
interface CacheItem<T> {
  data: T;
  timestamp: number;
}

/**
 * Service for caching API responses
 */
class CacheService {
  private readonly CACHE_PREFIX = 'openai_cache_';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  /**
   * Get an item from the cache
   * 
   * @param key The cache key
   * @returns The cached item or null if not found or expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const jsonValue = await AsyncStorage.getItem(cacheKey);
      
      if (!jsonValue) return null;
      
      const item: CacheItem<T> = JSON.parse(jsonValue);
      const now = Date.now();
      
      // Check if the cached item is still valid
      if (now - item.timestamp > this.DEFAULT_TTL) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
      
      return item.data;
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }
  
  /**
   * Store an item in the cache
   * 
   * @param key The cache key
   * @param data The data to cache
   * @param ttl Optional time-to-live in milliseconds
   */
  async set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(item));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }
  
  /**
   * Remove an item from the cache
   * 
   * @param key The cache key
   */
  async invalidate(key: string): Promise<void> {
    try {
      const cacheKey = this.CACHE_PREFIX + key;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Clear all cached items
   */
  async invalidateAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(k => k.startsWith(this.CACHE_PREFIX));
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }
  
  /**
   * Create a deterministic cache key from an action and parameters
   * 
   * @param action The action name
   * @param params The parameters
   * @returns A hash-based cache key
   */
  createCacheKey(action: string, params: any): string {
    const paramString = JSON.stringify(params);
    const hash = CryptoJS.SHA256(paramString).toString();
    return `${action}_${hash}`;
  }
}

// Export a singleton instance of the service
export const cacheService = new CacheService(); 