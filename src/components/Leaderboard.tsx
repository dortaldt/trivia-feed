import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator, useWindowDimensions, Platform, Text } from 'react-native';
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
  const [activeTab, setActiveTab] = useState<LeaderboardTabKey>('Daily');
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);
  const { user } = useAuth();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  // Yellow color theme
  const YELLOW_PRIMARY = '#ffc107'; // Matches the X button
  const YELLOW_LIGHT = '#fff8e1';
  const YELLOW_DARK = '#c79100';

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

  // Convert country code to flag emoji
  const getCountryFlag = (code: string | null): string => {
    if (!code || code.length !== 2) return '';
    
    // Country code to regional indicator symbols
    // For example: 'US' becomes 🇺🇸
    const codePoints = [...code.toUpperCase()].map(
      char => 127397 + char.charCodeAt(0)
    );
    
    return String.fromCodePoint(...codePoints);
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
        index % 2 === 1 && !isCurrentUser && styles.altItemContainer,
      ]}
      {...(Platform.OS === 'web' ? {
        className: `leaderboard-item ${isCurrentUser ? 'current-user' : ''}`
      } : {})}>
        <ThemedText style={[styles.rank, isCurrentUser && styles.currentUserRank]}>
          {index + 1}
        </ThemedText>
        
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, isCurrentUser && styles.currentUserAvatar]}>
              <ThemedText style={styles.avatarText}>{getInitials(item.full_name, item.username)}</ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.usernameRow}>
            <ThemedText style={[styles.username, isCurrentUser && styles.currentUserText]}>
              {item.full_name || item.username || 'Anonymous'} 
              {isCurrentUser && <ThemedText style={styles.youLabel}>(You)</ThemedText>}
            </ThemedText>
            
            {item.country && (
              <Text style={styles.flag}>
                {getCountryFlag(item.country)}
              </Text>
            )}
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <ThemedText style={[styles.scoreValue, { color: isCurrentUser ? YELLOW_PRIMARY : YELLOW_DARK }]}>
            {scoreToShow}
          </ThemedText>
          <ThemedText style={styles.scoreLabel}>
            correct
          </ThemedText>
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
            Your Rank: <ThemedText style={styles.rankNumber}>#{userRank}</ThemedText>
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
            background-color: #332b00; /* Dark yellow for dark theme */
            border-color: transparent;
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
    backgroundColor: 'white',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    display: 'none', // Hide this header since we're using the modal header
  },
  headerTitle: {
    fontSize: 24,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#ffc107', // Yellow active tab indicator
  },
  tabText: {
    fontSize: 14,
    color: '#888888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#ffc107', // Yellow text for active tab
    fontWeight: '600',
  },
  yourRankContainer: {
    padding: 15,
    backgroundColor: '#fff8e1', // Light yellow background
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  yourRankText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333333',
    fontWeight: '500',
  },
  rankNumber: {
    color: '#ffc107', // Yellow rank number
    fontWeight: 'bold',
  },
  listContent: {
    padding: 0,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  altItemContainer: {
    backgroundColor: '#f9f9f9',
  },
  currentUserItem: {
    backgroundColor: '#fff8e1', // Light yellow background for current user
  },
  rank: {
    width: 30,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#666666',
  },
  currentUserRank: {
    color: '#ffc107', // Yellow rank number for current user
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
    backgroundColor: '#c79100', // Darker yellow for avatar
    justifyContent: 'center',
    alignItems: 'center',
  },
  currentUserAvatar: {
    backgroundColor: '#ffc107', // Yellow avatar for current user
  },
  avatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  currentUserText: {
    color: '#333333',
  },
  youLabel: {
    fontStyle: 'italic',
    color: '#ffc107',
    marginLeft: 4,
  },
  flag: {
    fontSize: 18,
    marginLeft: 8,
  },
  scoreContainer: {
    alignItems: 'flex-end',
    minWidth: 60,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#888888',
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