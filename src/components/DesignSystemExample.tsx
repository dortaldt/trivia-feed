import React from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { FeatherIcon } from '@/components/FeatherIcon';
import Button from './ui/Button';
import Text from './ui/Text';
import Container from './ui/Container';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/src/context/ThemeContext';
import { useDesignSystem } from '@/src/hooks/useDesignSystem';

/**
 * Component to showcase the design system elements with the current theme
 */
const DesignSystemExample: React.FC = () => {
  const { currentTheme, colorScheme } = useTheme();
  const theme = useDesignSystem();
  
  return (
    <ScrollView style={styles.scrollContainer}>
      <Container variant="default" padded fullWidth style={styles.container}>
        <Container variant="card" padded rounded style={styles.header}>
          <Text variant="h2" color={theme.colors.primary}>Design System</Text>
          <Text variant="body1" style={styles.subtitle}>
            Current Theme: <Text style={styles.highlight}>{currentTheme}</Text> | 
            Mode: <Text style={styles.highlight}>{colorScheme}</Text>
          </Text>
          
          <View style={styles.themeToggleContainer}>
            <ThemeToggle />
          </View>
        </Container>
        
        {/* Typography Section */}
        <Container variant="surface" padded rounded style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Typography</Text>
          
          <Text variant="h1">Heading 1</Text>
          <Text variant="h2">Heading 2</Text>
          <Text variant="h3">Heading 3</Text>
          <Text variant="h4">Heading 4</Text>
          <Text variant="h5">Heading 5</Text>
          <Text variant="h6">Heading 6</Text>
          
          <View style={styles.divider} />
          
          <Text variant="subtitle1">Subtitle 1 - A slightly larger subtitle</Text>
          <Text variant="subtitle2">Subtitle 2 - A smaller subtitle</Text>
          <Text variant="body1">Body 1 - Main text for content. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</Text>
          <Text variant="body2">Body 2 - Secondary text for descriptions. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</Text>
          <Text variant="caption">Caption - Small text for auxiliary information</Text>
          <Text variant="button">Button Text</Text>
          <Text variant="overline">Overline Text</Text>
        </Container>
        
        {/* Colors Section */}
        <Container variant="surface" padded rounded style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Colors</Text>
          
          <View style={styles.colorGrid}>
            {Object.entries(theme.colors).map(([name, color]) => {
              // Skip complex colors or conditional strings
              if (typeof color !== 'string' || color.includes('rgba')) {
                return null;
              }
              
              return (
                <View key={name} style={styles.colorItem}>
                  <View style={[styles.colorSwatch, { backgroundColor: color }]} />
                  <Text variant="caption">{name}</Text>
                </View>
              );
            })}
          </View>
        </Container>
        
        {/* Buttons Section */}
        <Container variant="surface" padded rounded style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Buttons</Text>
          
          <View style={styles.buttonRow}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="destructive">Destructive</Button>
            <Button variant="info">Info</Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button variant="primary" size="xs">XS</Button>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </View>
          
          <View style={styles.buttonRow}>
            <Button 
              variant="primary" 
              leftIcon={<FeatherIcon name="check" size={18} color="white" />}
            >
              With Icon
            </Button>
            
            <Button 
              variant="primary" 
              rightIcon={<FeatherIcon name="arrow-right" size={18} color="white" />}
            >
              Next
            </Button>
            
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </View>
        </Container>
        
        {/* Containers Section */}
        <Container variant="surface" padded rounded style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Containers</Text>
          
          <Container variant="default" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Default Container</Text>
          </Container>
          
          <Container variant="card" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Card Container</Text>
          </Container>
          
          <Container variant="outlined" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Outlined Container</Text>
          </Container>
          
          <Container variant="surface" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Surface Container</Text>
          </Container>
          
          <Container variant="elevated" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Elevated Container</Text>
          </Container>
          
          <Container variant="glass" padded rounded style={styles.demoContainer}>
            <Text variant="subtitle2">Glass Container (Blur effect)</Text>
          </Container>
        </Container>
        
        {/* Theme Examples */}
        <Container variant="surface" padded rounded style={styles.section}>
          <Text variant="h3" style={styles.sectionTitle}>Theme Examples</Text>
          
          <Container variant="card" padded rounded style={styles.themeExample}>
            <Text variant="h5">Default Theme</Text>
            <Text variant="body2" style={styles.themeDescription}>
              A clean, modern design with a focus on usability and readability.
            </Text>
            <Button variant="primary">Default Button</Button>
          </Container>
          
          <Container variant="card" padded rounded style={[styles.themeExample, styles.neonExample]}>
            <Text variant="h5" color="#00FFFF">Neon Theme</Text>
            <Text variant="body2" style={styles.themeDescription}>
              Vibrant colors with glowing effects for a cyberpunk aesthetic.
            </Text>
            <Button variant="primary">Neon Button</Button>
          </Container>
          
          <Container variant="card" padded rounded style={[styles.themeExample, styles.retroExample]}>
            <Text variant="h5" color="#FF6B6B">Retro Theme</Text>
            <Text variant="body2" style={styles.themeDescription}>
              Nostalgic design inspired by 80s/90s aesthetics with bright colors.
            </Text>
            <Button variant="primary">Retro Button</Button>
          </Container>
          
          <Container variant="card" padded rounded style={[styles.themeExample, styles.modernExample]}>
            <Text variant="h5" color="#6200EE">Modern Theme</Text>
            <Text variant="body2" style={styles.themeDescription}>
              Clean, minimalist design with subtle animations and rounded corners.
            </Text>
            <Button variant="primary">Modern Button</Button>
          </Container>
        </Container>
      </Container>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    paddingBottom: 80,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    maxWidth: 800,
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.8,
  },
  highlight: {
    fontWeight: 'bold',
  },
  themeToggleContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  section: {
    width: '100%',
    maxWidth: 800,
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.3)',
    paddingBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(150, 150, 150, 0.3)',
    width: '100%',
    marginVertical: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  colorItem: {
    alignItems: 'center',
    margin: 8,
    width: 80,
  },
  colorSwatch: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(150, 150, 150, 0.3)',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  demoContainer: {
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
  },
  themeExample: {
    marginBottom: 16,
    padding: 16,
    alignItems: 'center',
  },
  themeDescription: {
    textAlign: 'center',
    marginVertical: 8,
  },
  neonExample: {
    backgroundColor: '#050505',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 10px #00FFFF, 0 0 5px #00FFFF',
    } as any : {
      shadowColor: '#00FFFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.7,
      shadowRadius: 10,
    }),
  },
  retroExample: {
    ...(Platform.OS === 'web' ? {
      boxShadow: '4px 4px 0px rgba(0, 0, 0, 0.3)',
    } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 4, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 0,
      elevation: 5,
    }),
  },
  modernExample: {
    borderRadius: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    } as any : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.1,
      shadowRadius: 25,
      elevation: 5,
    }),
  },
});

export default DesignSystemExample; 