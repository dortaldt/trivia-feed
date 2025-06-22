import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { FeatherIcon, FeatherIconName } from '@/components/FeatherIcon';
import { useTheme } from '@/src/context/ThemeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export interface BannerContent {
  id: string;
  title: string;
  description: string;
  icon?: FeatherIconName;
  actionText?: string;
  onActionPress?: () => void;
  type?: 'tip' | 'info' | 'warning' | 'success';
}

interface FeedItemBannerProps {
  content: BannerContent;
  onDismiss?: (bannerId: string) => void;
  style?: any;
  testID?: string;
}

const BANNER_STORAGE_KEY = 'dismissed_banners';

export const FeedItemBanner: React.FC<FeedItemBannerProps> = ({
  content,
  onDismiss,
  style,
  testID,
}) => {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  const { isNeonTheme } = useTheme();
  const colorScheme = useColorScheme();

  // Check if banner was previously dismissed
  useEffect(() => {
    checkDismissedStatus();
  }, [content.id]);

  // Animate in when component mounts
  useEffect(() => {
    if (visible && !dismissed) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, dismissed]);

  const checkDismissedStatus = async () => {
    try {
      const dismissedBanners = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
      if (dismissedBanners) {
        const dismissedIds = JSON.parse(dismissedBanners);
        if (dismissedIds.includes(content.id)) {
          setDismissed(true);
          setVisible(false);
        }
      }
    } catch (error) {
      console.error('Error checking dismissed banner status:', error);
    }
  };

  const handleDismiss = async () => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync().catch(() => {});
    }

    // Animate out
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
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      setDismissed(true);
    });

    // Store dismissed status
    try {
      const dismissedBanners = await AsyncStorage.getItem(BANNER_STORAGE_KEY);
      const dismissedIds = dismissedBanners ? JSON.parse(dismissedBanners) : [];
      if (!dismissedIds.includes(content.id)) {
        dismissedIds.push(content.id);
        await AsyncStorage.setItem(BANNER_STORAGE_KEY, JSON.stringify(dismissedIds));
      }
    } catch (error) {
      console.error('Error storing dismissed banner:', error);
    }

    // Call parent dismiss handler
    onDismiss?.(content.id);
  };

  const handleActionPress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    content.onActionPress?.();
  };

  const getTypeColor = () => {
    if (isNeonTheme) {
      switch (content.type) {
        case 'tip': return '#00FFFF';
        case 'info': return '#0AEFFF';
        case 'warning': return '#FFFF00';
        case 'success': return '#00FF8F';
        default: return '#00FFFF';
      }
    } else {
      switch (content.type) {
        case 'tip': return '#2196F3';
        case 'info': return '#2196F3';
        case 'warning': return '#FF9800';
        case 'success': return '#4CAF50';
        default: return '#2196F3';
      }
    }
  };

  const getTypeIcon = (): FeatherIconName => {
    switch (content.type) {
      case 'tip': return 'zap';
      case 'info': return 'info';
      case 'warning': return 'alert-triangle';
      case 'success': return 'check-circle';
      default: return 'help-circle';
    }
  };

  if (!visible || dismissed) {
    return null;
  }

  const typeColor = getTypeColor();
  const isDark = colorScheme === 'dark';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { scale: scaleAnim },
            { translateY: slideAnim },
          ],
        },
        style,
      ]}
      testID={testID}
    >
      {isNeonTheme ? (
        <LinearGradient
          colors={[
            'rgba(0, 0, 0, 0.85)',
            'rgba(13, 13, 13, 0.85)',
            'rgba(0, 0, 0, 0.85)',
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      ) : (
        <View
          style={[
            styles.gradient,
            {
              backgroundColor: isDark 
                ? 'rgba(0, 0, 0, 0.75)' 
                : 'rgba(255, 255, 255, 0.95)',
            },
          ]}
        />
      )}

      {/* Neon glow border */}
      {isNeonTheme && (
        <View
          style={[
            styles.neonBorder,
            {
              borderColor: typeColor,
              ...Platform.select({
                ios: {
                  shadowColor: typeColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.8,
                  shadowRadius: 8,
                },
                android: {
                  elevation: 5,
                },
                web: {
                  boxShadow: `0 0 10px ${typeColor}, inset 0 0 5px ${typeColor}30`,
                } as any,
              }),
            },
          ]}
        />
      )}

      <View style={styles.content}>
        {/* Header with icon and dismiss button */}
        <View style={styles.header}>
          <View style={styles.iconTitleContainer}>
            <View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: isNeonTheme 
                    ? 'transparent' 
                    : `${typeColor}20`,
                  borderColor: isNeonTheme ? typeColor : 'transparent',
                  borderWidth: isNeonTheme ? 1 : 0,
                },
              ]}
            >
              <FeatherIcon
                name={content.icon || getTypeIcon()}
                size={16}
                color={typeColor}
                style={isNeonTheme ? {
                  textShadowColor: typeColor,
                  textShadowOffset: { width: 0, height: 0 },
                  textShadowRadius: 4,
                } : {}}
              />
            </View>
            <Text
              style={[
                styles.title,
                {
                  color: isNeonTheme 
                    ? '#FFFFFF' 
                    : (isDark ? '#FFFFFF' : '#333333'),
                  ...(isNeonTheme ? {
                    textShadowColor: 'rgba(255, 255, 255, 0.5)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 2,
                  } : {}),
                },
              ]}
            >
              {content.title}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={handleDismiss}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FeatherIcon
              name="x"
              size={18}
              color={isNeonTheme ? '#FFFFFF60' : (isDark ? '#FFFFFF60' : '#00000060')}
            />
          </TouchableOpacity>
        </View>

        {/* Description */}
        <Text
          style={[
            styles.description,
            {
              color: isNeonTheme 
                ? 'rgba(255, 255, 255, 0.8)' 
                : (isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.7)'),
            },
          ]}
        >
          {content.description}
        </Text>

        {/* Action button */}
        {content.actionText && content.onActionPress && (
          <Pressable
            style={({ pressed }) => [
              styles.actionButton,
              {
                backgroundColor: isNeonTheme 
                  ? 'transparent' 
                  : `${typeColor}${pressed ? '30' : '20'}`,
                borderColor: typeColor,
                borderWidth: isNeonTheme ? 1 : 0,
                opacity: pressed ? 0.8 : 1,
                ...(isNeonTheme && Platform.OS === 'web' ? {
                  boxShadow: `0 0 8px ${typeColor}40`,
                } as any : {}),
              },
            ]}
            onPress={handleActionPress}
          >
            <Text
              style={[
                styles.actionText,
                {
                  color: isNeonTheme ? typeColor : typeColor,
                  fontWeight: isNeonTheme ? '600' : '500',
                  ...(isNeonTheme ? {
                    textShadowColor: `${typeColor}80`,
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 2,
                  } : {}),
                },
              ]}
            >
              {content.actionText}
            </Text>
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: width - 32,
    alignSelf: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    // Add max width for web like main content
    ...(Platform.OS === 'web' ? {
      maxWidth: 600,
      width: '100%',
      marginHorizontal: 0,
    } : {}),
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  neonBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    borderWidth: 1,
  },
  content: {
    padding: 16,
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  iconTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  dismissButton: {
    padding: 4,
    borderRadius: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

export default FeedItemBanner; 