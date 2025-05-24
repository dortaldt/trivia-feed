import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import { TOPIC_ICONS } from '@/src/types/topicRings';
import { ALL_TOPICS } from '@/src/constants/topics';
import { getTopicColor } from '@/constants/NeonColors';

const { width } = Dimensions.get('window');
const isTablet = width > 768;

export default function AdminTopicDebugScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

  // Create a grid of topic cards
  const renderTopicCard = (topic: string, index: number) => {
    const iconName = TOPIC_ICONS[topic] || TOPIC_ICONS.default;
    const topicColor = getTopicColor(topic);
    const hasCustomIcon = TOPIC_ICONS[topic] !== undefined;

    return (
      <View
        key={topic}
        style={[
          styles.topicCard,
          {
            backgroundColor,
            borderColor: hasCustomIcon ? topicColor.hex : '#FF0000',
            borderWidth: hasCustomIcon ? 1 : 2,
          },
        ]}
      >
        {/* Icon Section */}
        <View style={[styles.iconContainer, { backgroundColor: `${topicColor.hex}20` }]}>
          <FeatherIcon
            name={iconName as any}
            size={32}
            color={topicColor.hex}
          />
        </View>

        {/* Topic Name */}
        <ThemedText style={[styles.topicName, { color: textColor }]}>
          {topic}
        </ThemedText>

        {/* Icon Name */}
        <ThemedText style={[styles.iconName, { color: hasCustomIcon ? topicColor.hex : '#FF0000' }]}>
          {iconName}
        </ThemedText>

        {/* Status Indicator */}
        <View style={[styles.statusIndicator, { backgroundColor: hasCustomIcon ? '#4CAF50' : '#FF0000' }]}>
          <ThemedText style={styles.statusText}>
            {hasCustomIcon ? '✓' : '⚠'}
          </ThemedText>
        </View>

        {/* Debug Info */}
        <ThemedText style={[styles.debugInfo, { color: textColor }]}>
          Color: {topicColor.name}
        </ThemedText>
      </View>
    );
  };

  const validTopics = ALL_TOPICS.filter(topic => TOPIC_ICONS[topic]);
  const missingTopics = ALL_TOPICS.filter(topic => !TOPIC_ICONS[topic]);
  const extraIcons = Object.keys(TOPIC_ICONS).filter(topic => 
    topic !== 'default' && !ALL_TOPICS.includes(topic)
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.title, { color: textColor }]}>
            🔧 Admin: Topic Icons Debug
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            Direct URL access only - Debug page for topic icon mappings
          </ThemedText>
        </View>

        {/* Summary Stats */}
        <View style={styles.summaryContainer}>
          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>
              {validTopics.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Valid Icons
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#FF0000' }]}>
              {missingTopics.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Missing Icons
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#FFC107' }]}>
              {extraIcons.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Extra Icons
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>
              {ALL_TOPICS.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Total Topics
            </ThemedText>
          </View>
        </View>

        {/* Missing Topics Alert */}
        {missingTopics.length > 0 && (
          <View style={styles.alertSection}>
            <ThemedText style={[styles.alertTitle, { color: '#FF0000' }]}>
              ⚠️ Missing Topic Icons ({missingTopics.length})
            </ThemedText>
            {missingTopics.map(topic => (
              <ThemedText key={topic} style={[styles.alertItem, { color: '#FF0000' }]}>
                • {topic}
              </ThemedText>
            ))}
          </View>
        )}

        {/* Extra Icons Alert */}
        {extraIcons.length > 0 && (
          <View style={styles.alertSection}>
            <ThemedText style={[styles.alertTitle, { color: '#FFC107' }]}>
              🔄 Extra Icon Mappings ({extraIcons.length})
            </ThemedText>
            {extraIcons.map(topic => (
              <ThemedText key={topic} style={[styles.alertItem, { color: '#FFC107' }]}>
                • {topic} → {TOPIC_ICONS[topic]}
              </ThemedText>
            ))}
          </View>
        )}

        {/* All Topics Grid */}
        <View style={styles.section}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            All Topics & Icons ({ALL_TOPICS.length})
          </ThemedText>
          <View style={styles.topicsGrid}>
            {ALL_TOPICS.map((topic, index) => renderTopicCard(topic, index))}
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legendSection}>
          <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
            Legend
          </ThemedText>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: '#4CAF50' }]} />
            <ThemedText style={[styles.legendText, { color: textColor }]}>
              Topic has valid icon mapping
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIndicator, { backgroundColor: '#FF0000' }]} />
            <ThemedText style={[styles.legendText, { color: textColor }]}>
              Topic missing icon (using fallback)
            </ThemedText>
          </View>
          <ThemedText style={[styles.legendNote, { color: textColor }]}>
            Red border = Using fallback icon | Green border = Valid icon
          </ThemedText>
        </View>

        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textColor }]}>
            URL: /admin-topic-debug
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
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 8,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: '22%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  alertSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF0000',
    backgroundColor: '#FFF5F5',
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  alertItem: {
    fontSize: 14,
    marginLeft: 8,
    marginVertical: 2,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  topicsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicCard: {
    width: Platform.OS === 'web' ? (isTablet ? '23%' : '48%') : '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    position: 'relative',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  topicName: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  iconName: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  statusIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    fontSize: 10,
    textAlign: 'center',
    opacity: 0.6,
  },
  legendSection: {
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  legendIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  legendText: {
    fontSize: 14,
  },
  legendNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 8,
    opacity: 0.7,
  },
  footer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    opacity: 0.6,
    marginVertical: 2,
  },
}); 