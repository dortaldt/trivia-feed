import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Button, Text } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { MaterialIcons } from '@expo/vector-icons';

const ButtonShowcase: React.FC = () => {
  const { themeDefinition } = useTheme();
  
  // Button variants to showcase
  const variants = [
    'primary',
    'secondary', 
    'tertiary',
    'accent',
    'outline',
    'ghost',
    'destructive',
    'success',
    'warning',
    'info'
  ] as const;
  
  // Button sizes to showcase
  const sizes = ['xs', 'sm', 'md', 'lg'] as const;
  
  // Simple icon examples - Button component will handle colors
  const leftIcon = <MaterialIcons name="arrow-forward" size={18} />;
  const rightIcon = <MaterialIcons name="check-circle" size={18} />;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Button Showcase</Text>
      <Text style={styles.subtitle}>Using accent color for buttons (no glow)</Text>
      
      {/* Standard button variants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Button Variants</Text>
        <View style={styles.buttonGrid}>
          {variants.map(variant => (
            <View key={variant} style={styles.buttonContainer}>
              <Text style={styles.buttonLabel}>{variant}</Text>
              <Button variant={variant}>{variant}</Button>
            </View>
          ))}
        </View>
      </View>
      
      {/* Button sizes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Button Sizes</Text>
        <View style={styles.buttonGrid}>
          {sizes.map(size => (
            <View key={size} style={styles.buttonContainer}>
              <Text style={styles.buttonLabel}>{size}</Text>
              <Button variant="primary" size={size}>{size}</Button>
            </View>
          ))}
        </View>
      </View>
      
      {/* Button states */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Button States</Text>
        
        <View style={styles.buttonGrid}>
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonLabel}>Default</Text>
            <Button variant="primary">Default</Button>
          </View>
          
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonLabel}>Disabled</Text>
            <Button variant="primary" disabled>Disabled</Button>
          </View>
          
          <View style={styles.buttonContainer}>
            <Text style={styles.buttonLabel}>With Icons</Text>
            <Button 
              variant="primary"
              leftIcon={leftIcon}
              rightIcon={rightIcon}
            >
              With Icons
            </Button>
          </View>
        </View>
      </View>
      
      {/* Icons with different variants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Icons With Different Variants</Text>
        <View style={styles.buttonGrid}>
          {variants.slice(0, 6).map(variant => (
            <View key={variant} style={styles.buttonContainer}>
              <Text style={styles.buttonLabel}>{variant}</Text>
              <Button 
                variant={variant}
                leftIcon={leftIcon}
                rightIcon={rightIcon}
              >
                {variant}
              </Button>
            </View>
          ))}
        </View>
      </View>
      
      {/* Full width buttons */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Full Width Buttons</Text>
        
        <View style={styles.fullWidthContainer}>
          <Button variant="primary" fullWidth>Full Width Primary</Button>
          <View style={styles.spacer} />
          <Button variant="secondary" fullWidth>Full Width Secondary</Button>
          <View style={styles.spacer} />
          <Button variant="tertiary" fullWidth>Full Width Tertiary</Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    opacity: 0.7,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  buttonContainer: {
    minWidth: 150,
    marginBottom: 16,
  },
  buttonLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  fullWidthContainer: {
    width: '100%',
  },
  spacer: {
    height: 16,
  },
});

export default ButtonShowcase; 