import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import BottomSheet from './BottomSheet';
import Leaderboard from '../components/Leaderboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <Leaderboard limit={limit} />
        </ScrollView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  }
});

export default LeaderboardBottomSheet; 