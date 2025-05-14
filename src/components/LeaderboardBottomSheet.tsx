import React, { useCallback } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import BottomSheet from './BottomSheet';
import Leaderboard from '../components/Leaderboard';
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
  
  // Use a proper callback for closing to prevent re-renders
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);
  
  // Set a fixed 80% height for the leaderboard
  const snapPoints = ['80%'];

  return (
    <BottomSheet
      isVisible={isVisible}
      onClose={handleClose}
      title="Leaderboard"
      snapPoints={snapPoints}
    >
      <View style={[
        styles.container,
        // Add negative margin to counter any iOS-specific padding
        Platform.OS === 'ios' && { marginBottom: -insets.bottom }
      ]}>
        <Leaderboard limit={limit} disableScrolling={true} />
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0,
  }
});

export default LeaderboardBottomSheet; 