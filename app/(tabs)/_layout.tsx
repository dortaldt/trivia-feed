import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FeatherIcon } from '@/components/FeatherIcon';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  // Render a wrapper View with full-width navigation, but max-width tab buttons
  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarBackground: TabBarBackground,
          // Fix tab bar position and styling for web
          tabBarStyle: {
            ...Platform.select({
              ios: {
                position: 'absolute',
              },
              web: {
                borderTop: '1px solid rgba(0,0,0,0.1)',
                height: 49,
                backgroundColor: colorScheme === 'dark' ? '#000' : '#fff',
                width: '100%'
              },
              default: {},
            }),
          },
          tabBarItemStyle: Platform.OS === 'web' ? {
            // Adjust tab item style to fit within content container
            flex: 1,
            maxWidth: 960 / 4, // 4 tabs within 960px max-width
          } : undefined,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: 'Stats',
            tabBarIcon: ({ color }) => (
              Platform.OS === 'ios' ? 
                <IconSymbol size={28} name="chart.bar.fill" color={color} /> :
                <FeatherIcon name="bar-chart-2" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  tabBarWrapper: {
    maxWidth: 960,
    width: '100%',
    marginHorizontal: 'auto',
  }
});
