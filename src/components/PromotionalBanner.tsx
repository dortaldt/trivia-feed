import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Platform,
  Image,
  Pressable,
  Linking,
  useColorScheme,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { PromotionalBanner as BannerType } from '../types/bannerTypes';
import { trackEvent } from '../lib/mixpanelAnalytics';

const { width, height } = Dimensions.get('window');

type PromotionalBannerProps = {
  banner: BannerType;
  position: number;
  onDismiss?: (bannerId: string) => void;
  onInteraction?: (bannerId: string, action: string, metadata?: any) => void;
  debugMode?: boolean;
};

const PromotionalBanner: React.FC<PromotionalBannerProps> = ({
  banner,
  position,
  onDismiss,
  onInteraction,
  debugMode = false
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [ctaPressed, setCtaPressed] = useState(false);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const colorScheme = useColorScheme();
  
  // Auto-hide timer
  const autoHideTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Animate in when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();

    // Track that banner was shown
    onInteraction?.(banner.id, 'shown', { position });
    
    // Track analytics
    trackEvent('Promotional Banner Shown', {
      bannerId: banner.id,
      bannerTitle: banner.title,
      position,
      userTypes: banner.config.targeting.userTypes,
      strategy: banner.config.display.positioning.strategy,
    });

    // Set up auto-hide if configured
    if (banner.config.behavior.autoHideAfterSeconds) {
      autoHideTimer.current = setTimeout(() => {
        handleAutoHide();
      }, banner.config.behavior.autoHideAfterSeconds * 1000);
    }

    return () => {
      if (autoHideTimer.current) {
        clearTimeout(autoHideTimer.current);
      }
    };
  }, []);

  const handleAutoHide = () => {
    onInteraction?.(banner.id, 'auto_hidden', { position });
    trackEvent('Promotional Banner Auto Hidden', {
      bannerId: banner.id,
      bannerTitle: banner.title,
      position,
    });
    
    animateOut(() => {
      setDismissed(true);
    });
  };

  const handleDismiss = () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    onInteraction?.(banner.id, 'dismissed', { position });
    onDismiss?.(banner.id);
    
    trackEvent('Promotional Banner Dismissed', {
      bannerId: banner.id,
      bannerTitle: banner.title,
      position,
    });

    animateOut(() => {
      setDismissed(true);
    });
  };

  const handleCtaPress = async () => {
    if (ctaPressed) return; // Prevent double-tap
    setCtaPressed(true);

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    onInteraction?.(banner.id, 'clicked', { 
      position,
      ctaText: banner.cta?.text,
      ctaAction: banner.cta?.action,
    });
    
    trackEvent('Promotional Banner CTA Clicked', {
      bannerId: banner.id,
      bannerTitle: banner.title,
      ctaText: banner.cta?.text,
      ctaAction: banner.cta?.action,
      position,
    });

    // Handle CTA action
    if (banner.cta) {
      switch (banner.cta.action) {
        case 'external_link':
          if (banner.cta.url) {
            try {
              await Linking.openURL(banner.cta.url);
            } catch (error) {
              console.error('Failed to open URL:', error);
            }
          }
          break;
        case 'internal_navigation':
          // Handle internal navigation - could emit event for parent to handle
          break;
        case 'custom':
          // Handle custom actions via actionData
          break;
      }
    }

    // Reset pressed state after animation
    setTimeout(() => setCtaPressed(false), 300);
  };

  const animateOut = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => callback?.());
  };

  if (dismissed) {
    return null;
  }

  // Get a default image if none provided
  const defaultImage = 'https://images.unsplash.com/photo-1516961642265-531546e84af2?w=400&h=200&fit=crop&crop=center';
  const imageSource = banner.imageUrl 
    ? (typeof banner.imageUrl === 'string' 
        ? { uri: banner.imageUrl } 
        : banner.imageUrl) // Handle require() objects
    : { uri: defaultImage };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }
      ]}
    >
      {/* Neon gradient background */}
      <LinearGradient
        colors={[
          '#1a0033', // Deep purple
          '#2d1b3d', // Dark purple
          '#3d1b2f', // Purple-pink
          '#2d0a1f', // Dark pink
          '#1a0015', // Very dark pink
        ]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBackground}
      />

      {/* Neon glow overlay */}
      <Animated.View
        style={[
          styles.glowOverlay,
          {
            opacity: glowAnim,
          }
        ]}
      >
        <LinearGradient
          colors={[
            'rgba(255, 0, 255, 0.1)', // Magenta glow
            'rgba(138, 43, 226, 0.1)', // Blue violet glow
            'rgba(255, 20, 147, 0.1)', // Deep pink glow
            'transparent',
          ]}
          locations={[0, 0.3, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.glowGradient}
        />
      </Animated.View>



      {/* Dismiss Button */}
      {banner.config.behavior.dismissible && (
        <TouchableOpacity
          style={styles.dismissButton}
          onPress={handleDismiss}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <View style={styles.dismissButtonInner}>
            <Text style={styles.dismissButtonText}>✕</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Content Container - Centered */}
      <View style={styles.contentContainer}>
        {/* Banner Image */}
        <View style={styles.imageContainer}>
          <Image
            source={imageSource}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={[
              'transparent',
              'rgba(255, 0, 255, 0.1)',
              'rgba(138, 43, 226, 0.2)',
            ]}
            style={styles.imageOverlay}
          />
        </View>

        {/* Text Content */}
        <View style={styles.textContent}>
          <Text style={styles.title}>{banner.title}</Text>
          <Text style={styles.description}>{banner.description}</Text>

          {/* Neon CTA Button - Rings Modal Style */}
          {banner.cta && (
            <>
              <TouchableOpacity
                style={[
                  styles.ctaButton,
                  styles.neonButton,
                  ctaPressed && styles.disabledButton
                ]}
                onPress={handleCtaPress}
                disabled={ctaPressed}
                activeOpacity={0.7}
              >
                <Feather name="zap" size={16} color="#00FF88" />
                <Text style={[
                  styles.ctaText,
                  { color: ctaPressed ? '#666' : '#00FF88' }
                ]}>
                  {banner.cta.text}
                  {banner.cta.action === 'external_link' && ' →'}
                </Text>
              </TouchableOpacity>
              
              {/* Secondary "Not Now" Button */}
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleDismiss}
                activeOpacity={0.7}
              >
                <Text style={styles.secondaryButtonText}>Not now</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Debug Info */}
      {debugMode && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>
            Banner: {banner.id} | Position: {position} | Type: {banner.config.targeting.userTypes.join(', ')}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
    minHeight: 300,
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  glowGradient: {
    flex: 1,
  },

  dismissButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  dismissButtonInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    ...(Platform.OS === 'web' ? {
      maxWidth: 600,
      alignSelf: 'center',
      width: '100%',
    } : {})
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 24, // Rounded corners for app icon style
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: '#ff006e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  textContent: {
    alignItems: 'center',
    maxWidth: '90%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    lineHeight: 30,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 2,
    // Add shadow/glow effects for all platforms
    ...Platform.select({
      ios: {
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 8,
        shadowOpacity: 0.6,
      },
      android: {
        elevation: 6,
      },
      web: {
        transition: 'all 0.3s ease',
      }
    }),
  },
  neonButton: {
    borderColor: '#00FF88',
    // Platform-specific glow
    ...Platform.select({
      ios: {
        shadowColor: '#00FF88',
      },
      android: {
        // Android doesn't support colored elevation, so we use borderColor
      },
      web: {
        boxShadow: '0 0 15px rgba(0, 255, 136, 0.6), inset 0 0 10px rgba(0, 255, 136, 0.1)',
        '&:hover': {
          boxShadow: '0 0 20px rgba(0, 255, 136, 0.8), inset 0 0 15px rgba(0, 255, 136, 0.2)',
          transform: 'scale(1.02)',
        } as any,
      }
    }),
  },
  disabledButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.3)',
    borderColor: '#666',
    shadowOpacity: 0,
    elevation: 0,
    ...Platform.select({
      web: {
        boxShadow: 'none',
      } as any
    }),
  },
  ctaText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  debugText: {
    fontSize: 10,
    color: '#fff',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default PromotionalBanner; 