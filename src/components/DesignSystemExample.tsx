import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { Text, View, Button } from './ui';
import { useDesignSystem } from '../hooks/useDesignSystem';

/**
 * A component that showcases various design system elements
 */
export function DesignSystemExample() {
  const { colors, typography, spacing, borderRadius, shadows } = useDesignSystem();

  // Spacing showcase values
  const spacingValues = [
    { key: '1', value: spacing[1] },
    { key: '2', value: spacing[2] },
    { key: '4', value: spacing[4] },
    { key: '8', value: spacing[8] },
  ];

  return (
    <ScrollView style={styles.container}>
      <View p="6" m="4" rounded="lg" shadow="md">
        <Text variant="h3" center>Design System</Text>
        
        {/* Typography Examples */}
        <View mb="6" mt="4">
          <Text variant="h4" style={styles.sectionTitle}>Typography</Text>
          <View p="4" rounded="md" backgroundColor={colors.surfaceVariant}>
            <Text variant="h1">Heading 1</Text>
            <Text variant="h2">Heading 2</Text>
            <Text variant="h3">Heading 3</Text>
            <Text variant="h4">Heading 4</Text>
            <Text variant="h5">Heading 5</Text>
            <Text variant="h6">Heading 6</Text>
            <Text variant="subtitle1">Subtitle 1</Text>
            <Text variant="subtitle2">Subtitle 2</Text>
            <Text variant="body1">Body 1 - Main text style</Text>
            <Text variant="body2">Body 2 - Smaller text style</Text>
            <Text variant="caption">Caption - Small labels and metadata</Text>
            <Text variant="button">Button - Used for buttons</Text>
            <Text variant="overline">Overline - Tiny labels</Text>
            <Text variant="link">Link style</Text>
          </View>
        </View>

        {/* Color System Examples */}
        <View mb="6">
          <Text variant="h4" style={styles.sectionTitle}>Color System</Text>
          <View row style={styles.colorRow}>
            <ColorSwatch color={colors.primary} name="Primary" />
            <ColorSwatch color={colors.text} name="Text" />
            <ColorSwatch color={colors.background} name="Background" />
          </View>
          <View row style={styles.colorRow}>
            <ColorSwatch color={colors.success} name="Success" />
            <ColorSwatch color={colors.warning} name="Warning" />
            <ColorSwatch color={colors.error} name="Error" />
          </View>
          <View row style={styles.colorRow}>
            <ColorSwatch color={colors.border} name="Border" />
            <ColorSwatch color={colors.surface} name="Surface" />
            <ColorSwatch color={colors.surfaceVariant} name="Surface Variant" />
          </View>
        </View>

        {/* Button Examples */}
        <View mb="6">
          <Text variant="h4" style={styles.sectionTitle}>Buttons</Text>
          
          <Text variant="subtitle2" style={styles.subsectionTitle}>Variants</Text>
          <View mb="2">
            <View style={styles.buttonContainer}>
              <Button label="Primary Button" variant="primary" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Secondary Button" variant="secondary" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Outline Button" variant="outline" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Ghost Button" variant="ghost" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Destructive Button" variant="destructive" />
            </View>
            <Button label="Link Button" variant="link" />
          </View>
          
          <Text variant="subtitle2" style={styles.subsectionTitle}>Sizes</Text>
          <View>
            <View style={styles.buttonContainer}>
              <Button label="Extra Small" size="xs" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Small" size="sm" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Medium (Default)" size="md" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Large" size="lg" />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Extra Large" size="xl" />
            </View>
          </View>
          
          <Text variant="subtitle2" style={styles.subsectionTitle}>States</Text>
          <View>
            <View style={styles.buttonContainer}>
              <Button label="Disabled Button" disabled />
            </View>
            <View style={styles.buttonContainer}>
              <Button label="Loading Button" loading />
            </View>
          </View>
        </View>

        {/* Spacing Examples */}
        <View mb="6">
          <Text variant="h4" style={styles.sectionTitle}>Spacing</Text>
          <View backgroundColor={colors.surfaceVariant} p="4" rounded="md">
            <View style={styles.spacingRow}>
              {spacingValues.map(item => (
                <View 
                  key={item.key}
                  backgroundColor={colors.primary}
                  style={{ width: item.value, height: item.value }}
                  mb="2"
                >
                  <Text variant="caption" style={styles.spacingLabel}>{item.key}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Shadow Examples */}
        <View mb="6">
          <Text variant="h4" style={styles.sectionTitle}>Shadows</Text>
          <View row style={styles.shadowRow}>
            <ShadowBox shadowSize="xs" label="XS" />
            <ShadowBox shadowSize="sm" label="SM" />
            <ShadowBox shadowSize="md" label="MD" />
          </View>
          <View row style={styles.shadowRow}>
            <ShadowBox shadowSize="lg" label="LG" />
            <ShadowBox shadowSize="xl" label="XL" />
          </View>
        </View>

        {/* Border Radius Examples */}
        <View mb="6">
          <Text variant="h4" style={styles.sectionTitle}>Border Radius</Text>
          <View row style={styles.borderRow}>
            <BorderBox radius="none" label="None" />
            <BorderBox radius="xs" label="XS" />
            <BorderBox radius="sm" label="SM" />
          </View>
          <View row style={styles.borderRow}>
            <BorderBox radius="md" label="MD" />
            <BorderBox radius="lg" label="LG" />
            <BorderBox radius="xl" label="XL" />
          </View>
          <View row style={styles.borderRow}>
            <BorderBox radius="2xl" label="2XL" />
            <BorderBox radius="3xl" label="3XL" />
            <BorderBox radius="full" label="Full" />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

// Helper Components
const ColorSwatch = ({ color, name }: { color: string, name: string }) => (
  <View style={styles.colorSwatch}>
    <View style={[styles.colorBox, { backgroundColor: color }]} />
    <Text variant="caption" center>{name}</Text>
  </View>
);

const ShadowBox = ({ shadowSize, label }: { shadowSize: string, label: string }) => {
  const { colors } = useDesignSystem();
  return (
    <View 
      backgroundColor={colors.background}
      shadow={shadowSize as any}
      style={styles.shadowBox}
      p="4"
      m="2"
    >
      <Text variant="caption" center>{label}</Text>
    </View>
  );
};

const BorderBox = ({ radius, label }: { radius: string, label: string }) => {
  const { colors } = useDesignSystem();
  return (
    <View 
      backgroundColor={colors.primary}
      rounded={radius as any}
      style={styles.borderBox}
      p="2"
      m="2"
    >
      <Text variant="caption" center color={colors.textInverted}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  subsectionTitle: {
    marginTop: 16,
    marginBottom: 4,
  },
  buttonContainer: {
    marginBottom: 8,
  },
  colorRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  colorSwatch: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  colorBox: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 4,
  },
  spacingRow: {
    alignItems: 'flex-start',
  },
  spacingLabel: {
    color: 'white',
    textAlign: 'center',
  },
  shadowRow: {
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  shadowBox: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  borderRow: {
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  borderBox: {
    width: 80,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 