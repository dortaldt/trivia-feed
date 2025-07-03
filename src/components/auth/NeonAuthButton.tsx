import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { NeonColors } from '../../../constants/NeonColors';

interface NeonAuthButtonProps {
  onPress: () => void;
  title: string;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary';
  style?: ViewStyle;
  textStyle?: TextStyle;
  topicColor?: string;
}

export const NeonAuthButton: React.FC<NeonAuthButtonProps> = ({
  onPress,
  title,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
  textStyle,
  topicColor
}) => {
  const primaryColor = topicColor || NeonColors.dark.primary;

  const buttonStyle = [
    styles.button,
    variant === 'primary' ? [styles.primaryButton, { backgroundColor: primaryColor }] : [styles.secondaryButton, { borderColor: primaryColor }],
    disabled && styles.disabledButton,
    style
  ];

  const textColor = variant === 'primary' ? '#FFFFFF' : primaryColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={buttonStyle}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          size="small" 
          color={textColor} 
        />
      ) : (
        <Text style={[
          styles.buttonText,
          { color: textColor },
          textStyle
        ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    paddingHorizontal: 20,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: NeonColors.dark.primary,
    borderWidth: 0,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: NeonColors.dark.primary,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
}); 