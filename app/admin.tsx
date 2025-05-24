import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Platform,
  SafeAreaView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useThemeColor } from '@/hooks/useThemeColor';

interface AdminPageInfo {
  id: string;
  title: string;
  description: string;
  icon: string;
  path: string;
  status: 'active' | 'coming-soon' | 'deprecated';
  category: 'debug' | 'config' | 'analytics' | 'tools';
}

const ADMIN_PAGES: AdminPageInfo[] = [
  {
    id: 'topic-debug',
    title: 'Topic Icons Debug',
    description: 'Debug and verify all topic icon mappings. Shows which topics have valid icons vs fallback icons.',
    icon: 'search',
    path: '/admin-topic-debug',
    status: 'active',
    category: 'debug',
  },
  {
    id: 'user-analytics',
    title: 'User Analytics',
    description: 'View detailed user engagement metrics, question performance, and usage patterns.',
    icon: 'bar-chart',
    path: '/admin-analytics',
    status: 'coming-soon',
    category: 'analytics',
  },
  {
    id: 'content-management',
    title: 'Content Management',
    description: 'Manage trivia questions, topics, and content filtering rules.',
    icon: 'edit',
    path: '/admin-content',
    status: 'coming-soon',
    category: 'tools',
  },
  {
    id: 'app-config',
    title: 'App Configuration',
    description: 'Modify app settings, feature flags, and environment-specific configurations.',
    icon: 'settings',
    path: '/admin-config',
    status: 'coming-soon',
    category: 'config',
  },
  {
    id: 'performance-monitor',
    title: 'Performance Monitor',
    description: 'Monitor app performance, API response times, and error rates.',
    icon: 'activity',
    path: '/admin-performance',
    status: 'coming-soon',
    category: 'analytics',
  },
];

const CATEGORIES = {
  debug: { label: 'Debug Tools', color: '#FF6B35', icon: 'search' },
  config: { label: 'Configuration', color: '#4169E1', icon: 'settings' },
  analytics: { label: 'Analytics', color: '#32CD32', icon: 'bar-chart' },
  tools: { label: 'Management Tools', color: '#9370DB', icon: 'tool' },
} as const;

export default function AdminIndexScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');

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
            Admin pages are only accessible on web platform for security reasons.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  const handlePagePress = (page: AdminPageInfo) => {
    if (page.status === 'active') {
      // Navigate to the admin page
      if (Platform.OS === 'web') {
        window.location.href = page.path;
      }
    }
  };

  const renderPageCard = (page: AdminPageInfo) => {
    const categoryInfo = CATEGORIES[page.category];
    const isClickable = page.status === 'active';

    return (
      <TouchableOpacity
        key={page.id}
        style={[
          styles.pageCard,
          {
            backgroundColor,
            borderColor: categoryInfo.color,
            opacity: page.status === 'coming-soon' ? 0.6 : 1,
          },
        ]}
        onPress={() => handlePagePress(page)}
        disabled={!isClickable}
        activeOpacity={isClickable ? 0.7 : 1}
      >
        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(page.status) }]}>
          <ThemedText style={styles.statusText}>
            {getStatusLabel(page.status)}
          </ThemedText>
        </View>

        {/* Icon */}
        <View style={[styles.pageIconContainer, { backgroundColor: `${categoryInfo.color}20` }]}>
          <FeatherIcon
            name={page.icon as any}
            size={32}
            color={categoryInfo.color}
          />
        </View>

        {/* Content */}
        <ThemedText style={[styles.pageTitle, { color: textColor }]}>
          {page.title}
        </ThemedText>

        <ThemedText style={[styles.pageDescription, { color: textColor }]}>
          {page.description}
        </ThemedText>

        {/* Footer */}
        <View style={styles.pageFooter}>
          <View style={[styles.categoryTag, { backgroundColor: `${categoryInfo.color}15` }]}>
            <FeatherIcon
              name={categoryInfo.icon as any}
              size={14}
              color={categoryInfo.color}
            />
            <ThemedText style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </ThemedText>
          </View>

          {isClickable && (
            <FeatherIcon
              name="external-link"
              size={16}
              color={categoryInfo.color}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getStatusColor = (status: AdminPageInfo['status']) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'coming-soon': return '#FFC107';
      case 'deprecated': return '#FF0000';
      default: return '#9E9E9E';
    }
  };

  const getStatusLabel = (status: AdminPageInfo['status']) => {
    switch (status) {
      case 'active': return 'ACTIVE';
      case 'coming-soon': return 'COMING SOON';
      case 'deprecated': return 'DEPRECATED';
      default: return 'UNKNOWN';
    }
  };

  const activePages = ADMIN_PAGES.filter(page => page.status === 'active');
  const comingSoonPages = ADMIN_PAGES.filter(page => page.status === 'coming-soon');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <FeatherIcon name="shield" size={48} color="#4CAF50" />
          </View>
          <ThemedText style={[styles.title, { color: textColor }]}>
            🔒 Admin Control Panel
          </ThemedText>
          <ThemedText style={[styles.subtitle, { color: textColor }]}>
            Administrative tools and debugging utilities
          </ThemedText>
          <ThemedText style={[styles.warning, { color: '#FF6B35' }]}>
            ⚠️ Web platform only • Direct URL access required
          </ThemedText>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#4CAF50' }]}>
              {activePages.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Active Tools
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: '#FFC107' }]}>
              {comingSoonPages.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Coming Soon
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor }]}>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>
              {ADMIN_PAGES.length}
            </ThemedText>
            <ThemedText style={[styles.statLabel, { color: textColor }]}>
              Total Pages
            </ThemedText>
          </View>
        </View>

        {/* Active Pages */}
        {activePages.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              🟢 Active Tools ({activePages.length})
            </ThemedText>
            <View style={styles.pagesGrid}>
              {activePages.map(renderPageCard)}
            </View>
          </View>
        )}

        {/* Coming Soon Pages */}
        {comingSoonPages.length > 0 && (
          <View style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: textColor }]}>
              🟡 Coming Soon ({comingSoonPages.length})
            </ThemedText>
            <View style={styles.pagesGrid}>
              {comingSoonPages.map(renderPageCard)}
            </View>
          </View>
        )}

        {/* Security Notice */}
        <View style={styles.securitySection}>
          <ThemedText style={[styles.securityTitle, { color: '#FF6B35' }]}>
            🔐 Security Notice
          </ThemedText>
          <ThemedText style={[styles.securityText, { color: textColor }]}>
            • Admin pages are not linked anywhere in the main application
          </ThemedText>
          <ThemedText style={[styles.securityText, { color: textColor }]}>
            • Direct URL access required for all admin functionality
          </ThemedText>
          <ThemedText style={[styles.securityText, { color: textColor }]}>
            • Web platform restriction enforced for security
          </ThemedText>
          <ThemedText style={[styles.securityText, { color: textColor }]}>
            • No sensitive data should be exposed in these tools
          </ThemedText>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <ThemedText style={[styles.footerText, { color: textColor }]}>
            Admin Panel • Access URL: /admin
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
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  headerIcon: {
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 8,
  },
  warning: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    flexWrap: 'wrap',
  },
  statCard: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    minWidth: '30%',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.8,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  pagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  pageCard: {
    width: '48%',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 2,
    position: 'relative',
    minHeight: 200,
  },
  statusBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  pageIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  pageDescription: {
    fontSize: 14,
    opacity: 0.8,
    lineHeight: 20,
    marginBottom: 16,
    flex: 1,
  },
  pageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  securitySection: {
    marginBottom: 32,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  securityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  securityText: {
    fontSize: 14,
    marginVertical: 4,
    opacity: 0.9,
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