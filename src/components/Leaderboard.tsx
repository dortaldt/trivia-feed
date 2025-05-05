import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { fetchLeaderboard, LeaderboardUser, LeaderboardPeriod, fetchUserRank } from '../lib/leaderboardService';
import { useAuth } from '../context/AuthContext';
import { countries } from '../data/countries';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';
import { FeatherIcon } from '@/components/FeatherIcon';
import { WebContainer } from '@/components/WebContainer';

const LeaderboardTabs = {
  Daily: 'day',
  Weekly: 'week',
  Monthly: 'month',
  AllTime: 'all'
} as const;

type LeaderboardTabKey = keyof typeof LeaderboardTabs;

interface LeaderboardProps {
  limit?: number;
}

export default function Leaderboard({ limit = 10 }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTabKey>('Weekly');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  useEffect(() => {
    loadLeaderboardData();
  }, [activeTab]);

  const loadLeaderboardData = async () => {
    try {
      setIsLoading(true);
      const period = LeaderboardTabs[activeTab] as LeaderboardPeriod;
      const data = await fetchLeaderboard(period, limit);
      setLeaderboardData(data);

      // Get user rank if logged in
      if (user) {
        const rank = await fetchUserRank(user.id, period);
        setUserRank(rank);
      }
    } catch (error) {
      console.error('Error loading leaderboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get country name from country code
  const getCountryName = (code: string | null) => {
    if (!code) return '';
    const country = countries.find(c => c.code === code);
    return country ? country.name : '';
  };

  // Get initials for avatar
  const getInitials = (name: string = '', username: string = '') => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (username) {
      return username.substring(0, 2).toUpperCase();
    }
    return '?';
  };

  const renderItem = ({ item, index }: { item: LeaderboardUser; index: number }) => {
    // Calculate which column to display based on the active tab
    let scoreToShow: number;
    switch (LeaderboardTabs[activeTab]) {
      case 'day':
        scoreToShow = item.correct_answers_today;
        break;
      case 'week':
        scoreToShow = item.correct_answers_week;
        break;
      case 'month':
        scoreToShow = item.correct_answers_month;
        break;
      case 'all':
      default:
        scoreToShow = item.correct_answers_count;
    }

    // Determine if this is the current user
    const isCurrentUser = user && user.id === item.id;

    return (
      <ThemedView style={[
        styles.itemContainer, 
        isCurrentUser && styles.currentUserItem,
        { borderWidth: 1, borderColor: 'rgba(150, 150, 150, 0.2)' }
      ]}
      {...(Platform.OS === 'web' ? {
        className: `leaderboard-item ${isCurrentUser ? 'current-user' : ''}`
      } : {})}>
        <ThemedText style={styles.rank}>{index + 1}</ThemedText>
        
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarText}>{getInitials(item.full_name, item.username)}</ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <ThemedText type="defaultSemiBold" style={styles.username}>
            {item.full_name || item.username || 'Anonymous'} 
            {isCurrentUser && <ThemedText style={styles.youLabel}> (You)</ThemedText>}
          </ThemedText>
          {item.country && (
            <ThemedText style={styles.country}>{getCountryName(item.country)}</ThemedText>
          )}
        </View>
        
        <View style={styles.scoreContainer}>
          <ThemedText style={[styles.scoreValue, { color: '#0a7ea4' }]}>{scoreToShow}</ThemedText>
          <ThemedText style={styles.scoreLabel}>correct</ThemedText>
        </View>
      </ThemedView>
    );
  };

  const content = (
    <ThemedView 
      style={styles.container}
      {...(Platform.OS === 'web' ? { className: 'leaderboard-container' } : {})}
    >
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.headerTitle}>Leaderboard</ThemedText>
      </View>
      
      <View style={styles.tabContainer}>
        {(Object.keys(LeaderboardTabs) as LeaderboardTabKey[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, tab === activeTab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, tab === activeTab && styles.activeTabText]}>
              {tab}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      
      {user && userRank !== null && (
        <ThemedView style={styles.yourRankContainer}>
          <ThemedText style={styles.yourRankText}>
            Your Rank: <ThemedText type="defaultSemiBold" style={styles.rankNumber}>#{userRank}</ThemedText>
          </ThemedText>
        </ThemedView>
      )}
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        </View>
      ) : leaderboardData.length > 0 ? (
        <FlatList
          data={leaderboardData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent, 
            isTablet && { maxWidth: 800, alignSelf: 'center', width: '100%' }
          ]}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <FeatherIcon 
            name="award" 
            size={64} 
            color={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.2)'} 
          />
          <ThemedText style={styles.emptyText}>No data available for this period</ThemedText>
        </View>
      )}
    </ThemedView>
  );

  // Use WebContainer on web for better responsive design
  if (Platform.OS === 'web') {
    // Ensure dark theme styling for any web-specific elements
    useEffect(() => {
      if (isDark) {
        document.body.classList.add('dark-theme');
        
        // Add inline styles for specific leaderboard elements
        const style = document.createElement('style');
        style.textContent = `
          .leaderboard-container {
            background-color: #151718;
            color: #ECEDEE;
          }
          .leaderboard-item {
            background-color: #1c1c1c;
            border: 1px solid rgba(150, 150, 150, 0.2);
          }
          .leaderboard-item.current-user {
            background-color: rgba(10, 126, 164, 0.08);
            border-color: #0a7ea4;
          }
        `;
        document.head.appendChild(style);
        
        return () => {
          document.body.classList.remove('dark-theme');
          document.head.removeChild(style);
        };
      }
      return () => {
        document.body.classList.remove('dark-theme');
      };
    }, [isDark]);
    
    return <WebContainer>{content}</WebContainer>;
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
  },
  headerTitle: {
    fontSize: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#0a7ea4',
  },
  tabText: {
    fontSize: 14,
    opacity: 0.7,
  },
  activeTabText: {
    color: '#0a7ea4',
    fontWeight: '600',
    opacity: 1,
  },
  yourRankContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  yourRankText: {
    fontSize: 14,
    textAlign: 'center',
  },
  rankNumber: {
    color: '#0a7ea4',
  },
  listContent: {
    padding: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentUserItem: {
    borderColor: '#0a7ea4',
    borderWidth: 1,
    backgroundColor: 'rgba(10, 126, 164, 0.08)',
  },
  rank: {
    width: 30,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  username: {
    fontSize: 16,
  },
  youLabel: {
    fontStyle: 'italic',
    color: '#0a7ea4',
  },
  country: {
    fontSize: 14,
    opacity: 0.7,
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
}); 