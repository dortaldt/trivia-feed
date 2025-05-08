import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import BottomSheetCore, {
  BottomSheetBackdrop,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useColorScheme } from '@/hooks/useColorScheme';
import { Colors } from '@/constants/Colors';

type BottomSheetProps = {
  isVisible: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: string[];
  children: React.ReactNode;
  initialSnapPoint?: number;
};

const BottomSheet: React.FC<BottomSheetProps> = ({
  isVisible,
  onClose,
  title,
  snapPoints: customSnapPoints,
  children,
  initialSnapPoint = 0
}) => {
  const bottomSheetRef = useRef<BottomSheetCore>(null);
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'dark';
  const isDark = colorScheme === 'dark';
  
  // Add refs to track state
  const isClosingRef = useRef(false);
  const isManualClose = useRef(false);
  
  const snapPoints = useMemo(() => 
    customSnapPoints || ['50%', '80%', '100%'], 
    [customSnapPoints]
  );

  // Reset flags when visibility changes
  useEffect(() => {
    if (isVisible) {
      isClosingRef.current = false;
      isManualClose.current = false;
    }
  }, [isVisible]);

  // Handle sheet expansion/closing based on visibility prop
  useEffect(() => {
    if (isVisible) {
      // Using a slight delay to avoid animation conflicts on iOS
      const timer = setTimeout(() => {
        bottomSheetRef.current?.expand();
      }, Platform.OS === 'ios' ? 100 : 0);
      
      return () => clearTimeout(timer);
    } else if (!isManualClose.current) {
      // Only close if not already manually closing
      isClosingRef.current = true;
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1 && !isManualClose.current) {
      // Only call onClose if this isn't a result of pressing the X button
      // This prevents double toggling
      if (!isClosingRef.current) {
        onClose();
      }
      isClosingRef.current = false;
    }
  }, [onClose]);

  const handleManualClose = useCallback(() => {
    // Mark that we're manually closing to prevent duplicate onClose calls
    isManualClose.current = true;
    isClosingRef.current = true;
    
    // First close the sheet
    bottomSheetRef.current?.close();
    
    // After a slight delay, call onClose and reset the flag
    setTimeout(() => {
      onClose();
      isManualClose.current = false;
      isClosingRef.current = false;
    }, 100);
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        pressBehavior="close"
        opacity={0.7}
        enableTouchThrough={false}
      />
    ),
    []
  );

  return (
    <BottomSheetCore
      ref={bottomSheetRef}
      index={isVisible ? initialSnapPoint : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: isDark ? Colors.dark.background : Colors.light.background,
      }}
      handleIndicatorStyle={{
        backgroundColor: isDark ? Colors.dark.text : Colors.light.text,
        opacity: 0.5,
      }}
      onChange={handleSheetChanges}
      enableContentPanningGesture={true}
      handleStyle={styles.handleStyle}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      {...(Platform.OS === 'ios' ? {
        enableOverDrag: true,
        animateOnMount: true
      } : {})}
    >
      <BottomSheetView style={styles.contentContainer}>
        {title && (
          <View style={styles.header}>
            <ThemedText style={styles.title}>{title}</ThemedText>
            <TouchableOpacity 
              onPress={handleManualClose} 
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <View style={styles.closeButtonCircle}>
                <FeatherIcon name="x" size={20} color="black" />
              </View>
            </TouchableOpacity>
          </View>
        )}
        <View style={[styles.bodyContainer, { paddingBottom: insets.bottom }]}>
          {children}
        </View>
      </BottomSheetView>
    </BottomSheetCore>
  );
};

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bodyContainer: {
    flex: 1,
  },
  closeButton: {
    padding: 5,
  },
  closeButtonCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffc107',
    justifyContent: 'center',
    alignItems: 'center',
  },
  handleStyle: {
    paddingTop: 12,
    paddingBottom: 8,
  },
});

export default BottomSheet; 