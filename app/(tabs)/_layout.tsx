import { Tabs, Link } from 'expo-router';
import React, { useEffect } from 'react';
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

  // For web: add CSS to center the tab bar
  useEffect(() => {
    if (Platform.OS === 'web') {
      const style = document.createElement('style');
      style.textContent = `
        /* Center the tab bar navigation */
        nav.rn-tab-bar {
          max-width: 960px !important;
          margin: 0 auto !important;
          width: 100% !important;
        }
        /* Style the tab bar background for dark theme */
        .dark-theme nav.rn-tab-bar {
          background-color: #151718 !important;
          border-top: 1px solid rgba(150, 150, 150, 0.2) !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  // Custom tab bar with profile button
  const ProfileTab = ({ color }: { color: string }) => (
    <Link href="/profile" asChild>
      <TouchableOpacity>
        <Ionicons name="person-outline" size={28} color={color} />
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
          // Hide tab bar completely
          tabBarStyle: { 
            display: 'none'
          },
          tabBarItemStyle: Platform.OS === 'web' ? {
            // Adjust tab item style for web
            flex: 1,
            paddingBottom: 4,
            paddingTop: 6,
            height: 'auto',
          } : undefined,
          tabBarLabelStyle: Platform.OS === 'web' ? {
            fontSize: 14,
            paddingBottom: 4,
            marginTop: 2,
            lineHeight: 16,
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
                <IconSymbol size={28} name="chart.bar" color={color} weight="light" /> :
                <FeatherIcon name="bar-chart-2" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="feed"
          options={{
            title: 'My Feed',
            tabBarIcon: ({ color }) => (
              Platform.OS === 'ios' ?
                <IconSymbol size={28} name="lightbulb" color={color} weight="light" /> :
                <FeatherIcon name="book-open" size={24} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={28} color={color} />,
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
  }
});
