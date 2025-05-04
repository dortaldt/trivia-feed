import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fetchLeaderboard, LeaderboardUser, LeaderboardPeriod, fetchUserRank } from '../lib/leaderboardService';
import { useAuth } from '../context/AuthContext';
import { countries } from '../data/countries';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';

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
      <View style={[styles.itemContainer, isCurrentUser && styles.currentUserItem]}>
        <Text style={styles.rank}>{index + 1}</Text>
        
        <View style={styles.avatarContainer}>
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{getInitials(item.full_name, item.username)}</Text>
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.username}>
            {item.full_name || item.username || 'Anonymous'} 
            {isCurrentUser && <Text style={styles.youLabel}> (You)</Text>}
          </Text>
          {item.country && (
            <Text style={styles.country}>{getCountryName(item.country)}</Text>
          )}
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreValue}>{scoreToShow}</Text>
          <Text style={styles.scoreLabel}>correct</Text>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Leaderboard</ThemedText>
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
        <View style={styles.yourRankContainer}>
          <ThemedText style={styles.yourRankText}>
            Your Rank: <Text style={styles.rankNumber}>#{userRank}</Text>
          </ThemedText>
        </View>
      )}
      
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
        </View>
      ) : leaderboardData.length > 0 ? (
        <FlatList
          data={leaderboardData}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="trophy-outline" size={64} color="#ccc" />
          <ThemedText style={styles.emptyText}>No data available for this period</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3498db',
  },
  tabText: {
    fontSize: 14,
    color: '#777',
  },
  activeTabText: {
    color: '#3498db',
    fontWeight: '600',
  },
  yourRankContainer: {
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  yourRankText: {
    fontSize: 14,
    textAlign: 'center',
  },
  rankNumber: {
    fontWeight: 'bold',
    color: '#3498db',
  },
  listContent: {
    padding: 12,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  currentUserItem: {
    backgroundColor: '#f0f8ff',
    borderWidth: 1,
    borderColor: '#3498db',
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
    backgroundColor: '#3498db',
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
    fontWeight: '500',
  },
  youLabel: {
    fontStyle: 'italic',
    color: '#3498db',
  },
  country: {
    fontSize: 14,
    color: '#777',
  },
  scoreContainer: {
    alignItems: 'center',
    minWidth: 50,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3498db',
  },
  scoreLabel: {
    fontSize: 12,
    color: '#777',
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
    color: '#777',
    textAlign: 'center',
  },
}); 