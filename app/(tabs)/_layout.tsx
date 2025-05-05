import { Tabs, Link } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet, TouchableOpacity } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { FeatherIcon } from '@/components/FeatherIcon';
import { useAuth } from '@/src/context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { user } = useAuth();

  // Custom tab bar with profile button
  const ProfileTab = ({ color }: { color: string }) => (
    <Link href="/profile" asChild>
      <TouchableOpacity>
        <Ionicons name="person-circle-outline" size={28} color={color} />
      </TouchableOpacity>
    </Link>
  );

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
            maxWidth: 960 / 3, // 3 tabs within 960px max-width
          } : undefined,
        }}
        initialRouteName="feed"
      >
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
          name="feed"
          options={{
            title: 'My Feed',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="lightbulb.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person-circle-outline" size={28} color={color} />,
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
