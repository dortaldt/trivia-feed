import React from 'react';
import { View, StyleSheet, TouchableOpacity, Switch, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/src/context/ThemeContext';
import { FeatherIcon } from '@/components/FeatherIcon';

interface ThemeToggleProps {
  containerStyle?: object;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ containerStyle }) => {
  const { isNeonTheme, toggleTheme } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.row}>
        <FeatherIcon name="zap" size={20} style={styles.icon} />
        <ThemedText style={styles.text}>Neon Theme</ThemedText>
        
        {Platform.OS === 'ios' ? (
          <Switch
            value={isNeonTheme}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: '#00FFFF' }}
            thumbColor={isNeonTheme ? '#FF10F0' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
            style={styles.switch}
          />
        ) : (
          <TouchableOpacity 
            onPress={toggleTheme} 
            style={[
              styles.androidToggle, 
              { backgroundColor: isNeonTheme ? '#00FFFF' : '#767577' }
            ]}
          >
            <View style={[
              styles.androidToggleThumb, 
              { backgroundColor: isNeonTheme ? '#FF10F0' : '#f4f3f4',
                transform: [{ translateX: isNeonTheme ? 22 : 0 }] 
              }
            ]} />
          </TouchableOpacity>
        )}
      </View>
      <ThemedText style={styles.description}>
        {isNeonTheme 
          ? "Neon theme activated. Experience the vibrant glow!" 
          : "Turn on for a vibrant neon experience."}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  icon: {
    marginRight: 10,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  description: {
    fontSize: 14,
    marginTop: 6,
    opacity: 0.8,
  },
  switch: {
    marginLeft: 10,
  },
  androidToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  androidToggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
}); 