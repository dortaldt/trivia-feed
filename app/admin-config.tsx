import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { featureFlagService, FeatureFlag } from '@/src/lib/featureFlagService';

const CATEGORIES = {
  generator: { label: 'Question Generator', color: '#FF6B35', icon: 'cpu' },
  ui: { label: 'User Interface', color: '#4169E1', icon: 'layout' },
  analytics: { label: 'Analytics', color: '#32CD32', icon: 'bar-chart' },
  debug: { label: 'Debug & Development', color: '#9370DB', icon: 'code' },
} as const;

export default function AdminConfigScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Only allow on web platform
  if (Platform.OS !== 'web') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor }]}>
        <View style={styles.errorContainer}>
          <FeatherIcon name="alert-circle" size={48} color="#FF0000" />
          <ThemedText style={[styles.errorTitle, { color: textColor }]}>
            Web Only
          </ThemedText>
          <ThemedText style={[styles.errorDescription, { color: textColor }]}>
            Feature flag management is only accessible on web platform for security reasons.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    loadFlags();
  }, []);

  const loadFlags = async () => {
    setLoading(true);
    try {
      // Ensure service is initialized
      await featureFlagService.initialize();
      const allFlags = featureFlagService.getAllFlags();
      setFlags(allFlags);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      Alert.alert('Error', 'Failed to load feature flags');
    } finally {
      setLoading(false);
    }
  };

  const toggleFlag = async (flagKey: string, newValue: boolean) => {
    setUpdating(flagKey);
    try {
      await featureFlagService.setFlag(flagKey, newValue);
      
      // Update local state
      setFlags(prev => prev.map(flag => 
        flag.key === flagKey ? { ...flag, enabled: newValue } : flag
      ));
      
      console.log(`Feature flag ${flagKey} set to ${newValue}`);
    } catch (error) {
      console.error(`Failed to update flag ${flagKey}:`, error);
      Alert.alert('Error', `Failed to update feature flag: ${flagKey}`);
    } finally {
      setUpdating(null);
    }
  };

  const resetAllFlags = () => {
    Alert.alert(
      'Reset All Feature Flags',
      'This will reset all feature flags to their default values. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await featureFlagService.resetToDefaults();
              await loadFlags(); // Reload flags
              Alert.alert('Success', 'All feature flags have been reset to defaults');
            } catch (error) {
              console.error('Failed to reset flags:', error);
              Alert.alert('Error', 'Failed to reset feature flags');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderFlagCard = (flag: FeatureFlag) => {
    const categoryInfo = CATEGORIES[flag.category];
    const isUpdating = updating === flag.key;

    return (
      <View
        key={flag.key}
        style={[
          styles.flagCard,
          {
            backgroundColor,
            borderColor: flag.enabled ? categoryInfo.color : '#666',
            opacity: isUpdating ? 0.6 : 1,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.flagHeader}>
          <View style={styles.flagTitleContainer}>
            <View style={[styles.flagIcon, { backgroundColor: `${categoryInfo.color}20` }]}>
              <FeatherIcon
                name={categoryInfo.icon as any}
                size={20}
                color={categoryInfo.color}
              />
            </View>
            <ThemedText style={[styles.flagTitle, { color: textColor }]}>
              {flag.name}
            </ThemedText>
          </View>
          
          <View style={styles.flagControls}>
            {/* Status Badge */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: flag.enabled ? '#4CAF50' : '#FF6B35' }
            ]}>
              <ThemedText style={styles.statusText}>
                {flag.enabled ? 'ON' : 'OFF'}
              </ThemedText>
            </View>
            
            {/* Toggle Switch */}
            <Switch
              value={flag.enabled}
              onValueChange={(value) => toggleFlag(flag.key, value)}
              disabled={isUpdating}
              trackColor={{
                false: '#767577',
                true: categoryInfo.color,
              }}
              thumbColor={flag.enabled ? '#ffffff' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Description */}
        <ThemedText style={[styles.flagDescription, { color: textColor }]}>
          {flag.description}
        </ThemedText>

        {/* Footer */}
        <View style={styles.flagFooter}>
          <View style={[styles.categoryTag, { backgroundColor: `${categoryInfo.color}15` }]}>
            <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </ThemedText>
          </View>
          
          <ThemedText style={[styles.defaultValue, { color: textColor }]}>
            Default: {flag.defaultValue ? 'ON' : 'OFF'}
          </ThemedText>
        </View>
      </View>
    );
  };

  const groupedFlags = flags.reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = [];
    }
    acc[flag.category].push(flag);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  const enabledCount = flags.filter(f => f.enabled).length;
  const totalCount = flags.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FeatherIcon name="settings" size={48} color="#4169E1" />
          </View>
          <ThemedText style={[styles.title, { color: textColor }]}>
            ⚙️ Feature Flag Configuration
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            Control application features and behavior
          </ThemedText>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>
              {enabledCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Enabled
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#FF6B35' }]}>
              {totalCount - enabledCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Disabled
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>
              {totalCount}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Total Flags
            </ThemedText>
          </View>
        </View>

        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetButton, { borderColor: '#FF6B35' }]}
          onPress={resetAllFlags}
          disabled={loading}
        >
          <FeatherIcon name="refresh-cw" size={20} color="#FF6B35" />
          <ThemedText style={[styles.resetButtonText, { color: '#FF6B35' }]}>
            Reset All to Defaults
          </ThemedText>
        </TouchableOpacity>

        {/* Feature Flags by Category */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText style={[styles.loadingText, { color: textColor }]}>
              Loading feature flags...
            </ThemedText>
          </View>
        ) : (
          Object.entries(groupedFlags).map(([category, categoryFlags]) => {
            const categoryInfo = CATEGORIES[category as keyof typeof CATEGORIES];
            if (!categoryInfo) return null;

            return (
              <View key={category} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <FeatherIcon
                    name={categoryInfo.icon as any}
                    size={24}
                    color={categoryInfo.color}
                  />
                  <ThemedText style={[styles.categoryTitle, { color: textColor }]}>
                    {categoryInfo.label} ({categoryFlags.length})
                  </ThemedText>
                </View>
                
                <View style={styles.flagsContainer}>
                  {categoryFlags.map(renderFlagCard)}
                </View>
              </View>
            );
          })
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textColor }]}>
            URL: /admin-config
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: textColor }]}>
            Changes are saved automatically
          </ThemedText>
          <ThemedText style={[styles.footerText, { color: textColor }]}>
            Last updated: {new Date().toLocaleString()}
          </ThemedText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 16,
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 80,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginBottom: 32,
    marginHorizontal: 16,
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  flagsContainer: {
    gap: 16,
  },
  flagCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  flagHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  flagTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  flagIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  flagTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  flagControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  flagDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.8,
  },
  flagFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  defaultValue: {
    fontSize: 12,
    opacity: 0.6,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    opacity: 0.5,
    marginBottom: 4,
  },
}); 