import React, { ReactNode } from 'react';
import { StyleSheet, View, StyleProp, ViewStyle } from 'react-native';
import { Card as PaperCard, Text } from 'react-native-paper';
import { colors, borderRadius, spacing } from '../../theme';

// Card Component Props
interface CardProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Card Header Props
interface CardHeaderProps {
  title: string;
  description?: string;
  style?: StyleProp<ViewStyle>;
}

// Card Content Props
interface CardContentProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Card Footer Props
interface CardFooterProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

// Main Card component
export const Card: React.FC<CardProps> & {
  Header: React.FC<CardHeaderProps>;
  Content: React.FC<CardContentProps>;
  Footer: React.FC<CardFooterProps>;
} = ({ children, style }) => {
  return (
    <PaperCard style={[styles.card, style]}>
      {children}
    </PaperCard>
  );
};

// Card Header component
const CardHeader: React.FC<CardHeaderProps> = ({ title, description, style }) => {
  return (
    <View style={[styles.cardHeader, style]}>
      <Text style={styles.cardTitle}>{title}</Text>
      {description && <Text style={styles.cardDescription}>{description}</Text>}
    </View>
  );
};

// Card Content component
const CardContent: React.FC<CardContentProps> = ({ children, style }) => {
  return (
    <PaperCard.Content style={[styles.cardContent, style]}>
      {children}
    </PaperCard.Content>
  );
};

// Card Footer component
const CardFooter: React.FC<CardFooterProps> = ({ children, style }) => {
  return (
    <View style={[styles.cardFooter, style]}>
      {children}
    </View>
  );
};

// Assign components to main Card component
Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.foreground,
  },
  cardDescription: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: spacing[1],
  },
  cardContent: {
    padding: spacing[4],
  },
  cardFooter: {
    padding: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});

export default Card; 