import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Platform, ViewStyle, TextStyle } from 'react-native';
import { NeonColors } from '../../../constants/NeonColors';

interface NeonAuthInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  style?: ViewStyle;
  textStyle?: TextStyle;
  topicColor?: string;
}

export const NeonAuthInput: React.FC<NeonAuthInputProps> = ({
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  style,
  textStyle,
  topicColor
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const primaryColor = topicColor || NeonColors.dark.primary;
  const secondaryColor = NeonColors.dark.secondary;

  // Add CSS keyframes animation for web platform
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Create a style element for the input glow effect
      const styleEl = document.createElement('style');
      styleEl.innerHTML = `
        .neon-auth-input {
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid ${primaryColor}40;
          box-shadow: 
            0 0 10px ${primaryColor}20,
            inset 0 0 10px rgba(0, 0, 0, 0.5);
          transition: all 0.3s ease;
          outline: none;
        }
        
        .neon-auth-input:focus {
          border-color: ${primaryColor};
          box-shadow: 
            0 0 15px ${primaryColor}60,
            0 0 25px ${primaryColor}40,
            inset 0 0 15px rgba(0, 0, 0, 0.3);
          background: rgba(0, 0, 0, 0.6);
        }
        
        .neon-auth-input::placeholder {
          color: ${primaryColor}80;
          opacity: 0.7;
        }
        
        .neon-auth-input:focus::placeholder {
          color: ${primaryColor}60;
          opacity: 0.5;
        }
        
        /* Autofill styling for web */
        .neon-auth-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.8) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          border-color: ${primaryColor} !important;
        }
        
        .neon-auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.9) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        document.head.removeChild(styleEl);
      };
    }
  }, [primaryColor, secondaryColor]);

  const inputStyle = [
    styles.input,
    isFocused && styles.focusedInput,
    style
  ];

  const inputTextStyle = [
    styles.inputText,
    textStyle
  ];

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={primaryColor + '80'}
      secureTextEntry={secureTextEntry}
      autoCapitalize={autoCapitalize}
      keyboardType={keyboardType}
      style={inputStyle}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      {...(Platform.OS === 'web' ? { className: 'neon-auth-input' } : {})}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.4)',
    borderWidth: 2,
    borderColor: NeonColors.dark.primary + '40',
    marginVertical: 8,
    ...(Platform.OS !== 'web' && {
      shadowColor: NeonColors.dark.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 5,
    }),
  },
  focusedInput: {
    borderColor: NeonColors.dark.primary,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.6)',
    ...(Platform.OS !== 'web' && {
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  inputText: {
    color: '#FFFFFF',
  },
}); 