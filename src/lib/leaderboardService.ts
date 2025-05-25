import { supabase } from './supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LeaderboardUser {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string;
  country: string;
  correct_answers_count: number;
  correct_answers_today: number;
  correct_answers_week: number;
  correct_answers_month: number;
  streak: number;
  longest_streak: number;
}

export type LeaderboardPeriod = 'day' | 'week' | 'month' | 'all';

/**
 * Fetches leaderboard data for a specific time period
 */
export async function fetchLeaderboard(
  period: LeaderboardPeriod = 'all',
  limit: number = 10
): Promise<LeaderboardUser[]> {
  try {
    let columnToSort: string;
    
    // Determine which column to sort by based on the period
    switch (period) {
      case 'day':
        columnToSort = 'correct_answers_today';
        break;
      case 'week':
        columnToSort = 'correct_answers_week';
        break;
      case 'month':
        columnToSort = 'correct_answers_month';
        break;
      case 'all':
      default:
        columnToSort = 'correct_answers_count';
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, full_name, avatar_url, country, correct_answers_count, correct_answers_today, correct_answers_week, correct_answers_month, streak, longest_streak')
      .order(columnToSort, { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching leaderboard:', error.message);
      throw error;
    }

    return data as LeaderboardUser[];
  } catch (error) {
    console.error('Unexpected error in fetchLeaderboard:', error);
    return [];
  }
}

/**
 * Fetches the user's rank on the leaderboard
 */
export async function fetchUserRank(
  userId: string,
  period: LeaderboardPeriod = 'all'
): Promise<number> {
  try {
    let columnToSort: string;
    
    // Determine which column to sort by based on the period
    switch (period) {
      case 'day':
        columnToSort = 'correct_answers_today';
        break;
      case 'week':
        columnToSort = 'correct_answers_week';
        break;
      case 'month':
        columnToSort = 'correct_answers_month';
        break;
      case 'all':
      default:
        columnToSort = 'correct_answers_count';
    }

    // Get the user's score first
    const { data: userData, error: userError } = await supabase
      .from('user_profiles')
      .select(columnToSort)
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error fetching user data:', userError.message);
      throw userError;
    }

    const userScore = userData[columnToSort];

    // Count how many users have a higher score
    const { count, error: countError } = await supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .gt(columnToSort, userScore);

    if (countError) {
      console.error('Error calculating user rank:', countError.message);
      throw countError;
    }

    // Rank is the count of users with higher scores + 1
    return (count || 0) + 1;
  } catch (error) {
    console.error('Unexpected error in fetchUserRank:', error);
    return 0;
  }
}

/**
 * Records a user's answer to a trivia question
 */
export async function recordUserAnswer(
  userId: string,
  questionId: string,
  isCorrect: boolean,
  answerIndex: number
): Promise<void> {
  try {
    // Check if user is in guest mode - skip database operations for guests
    try {
      const guestMode = await AsyncStorage.getItem('guestMode');
      if (guestMode === 'true') {
        console.log('🏠 Guest user detected - skipping leaderboard recording');
        console.log('🏠 Leaderboard data remains client-side only for guest users');
        return;
      }
    } catch (error) {
      console.error('Error checking guest mode in recordUserAnswer:', error);
    }

    console.log('Recording user answer to leaderboard:', { userId, questionId, isCorrect });
    
    const { error } = await supabase
      .from('user_answers')
      .insert([
        {
          user_id: userId,
          question_id: questionId,
          is_correct: isCorrect,
          answer_index: answerIndex
        }
      ]);

    if (error) {
      console.error('Error recording user answer:', error.message);
      throw error;
    } else {
      console.log('Successfully recorded user answer to leaderboard');
    }
  } catch (error) {
    console.error('Unexpected error in recordUserAnswer:', error);
  }
} 