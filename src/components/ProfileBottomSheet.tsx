import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View, Platform } from 'react-native';
import BottomSheet from './BottomSheet';
import ProfileView from '../features/profile/ProfileView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ProfileBottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
};

const ProfileBottomSheet: React.FC<ProfileBottomSheetProps> = ({ 
  isVisible, 
  onClose 
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
      title="Profile"
      snapPoints={snapPoints}
    >
      <View style={[
        styles.container,
        { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 0 }
      ]}>
        <ScrollView 
          style={styles.scrollView} 
          showsVerticalScrollIndicator={false}
          bounces={Platform.OS === 'ios'}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
          keyboardShouldPersistTaps="handled"
        >
          <ProfileView />
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
});

export default ProfileBottomSheet; 