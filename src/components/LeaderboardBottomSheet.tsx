import React, { useCallback, useRef, useEffect } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import BottomSheet from './BottomSheet';
import Leaderboard, { LeaderboardRef } from '../components/Leaderboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '@/src/theme';

type LeaderboardBottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  limit?: number;
};

const LeaderboardBottomSheet: React.FC<LeaderboardBottomSheetProps> = ({ 
  isVisible, 
  onClose,
  limit = 10
}) => {
  const insets = useSafeAreaInsets();
  const leaderboardRef = useRef<LeaderboardRef>(null);
  
  // Use a proper callback for closing to prevent re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // Refresh leaderboard data when the bottom sheet becomes visible
  useEffect(() => {
    if (isVisible && leaderboardRef.current) {
      // Refresh the leaderboard data
      leaderboardRef.current.loadLeaderboardData();
    }
  }, [isVisible]);
  
  // Determine appropriate snap points based on platform
  const snapPoints = Platform.OS === 'ios' 
    ? ['65%', '90%'] 
    : ['70%', '90%'];

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      title="Leaderboard"
      snapPoints={snapPoints}
    >
      <View style={styles.container}>
        <Leaderboard ref={leaderboardRef} limit={limit} disableScrolling={true} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: spacing[5],
  }
});

export default LeaderboardBottomSheet; 