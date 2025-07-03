import React, { useState, useEffect } from 'react';
import { TextInput, StyleSheet, Platform, ViewStyle, TextStyle, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NeonColors } from '../../../constants/NeonColors';

interface NeonAuthInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoComplete?: 'tel' | 'url' | 'email' | 'additional-name' | 'address-line1' | 'address-line2' | 'birthdate-day' | 'birthdate-full' | 'birthdate-month' | 'birthdate-year' | 'cc-csc' | 'cc-exp' | 'cc-exp-month' | 'cc-exp-year' | 'cc-number' | 'country' | 'current-password' | 'email' | 'family-name' | 'given-name' | 'honorific-prefix' | 'honorific-suffix' | 'name' | 'new-password' | 'nickname' | 'one-time-code' | 'organization' | 'organization-title' | 'postal-code' | 'street-address' | 'tel' | 'url' | 'username' | 'off';
  inputMode?: 'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search';
  style?: ViewStyle;
  textStyle?: TextStyle;
  topicColor?: string;
  error?: string;
  required?: boolean;
  editable?: boolean;
  maxLength?: number;
}

export const NeonAuthInput: React.FC<NeonAuthInputProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  inputMode,
  style,
  textStyle,
  topicColor,
  error,
  required = false,
  editable = true,
  maxLength
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const primaryColor = topicColor || NeonColors.dark.primary;
  const secondaryColor = NeonColors.dark.secondary;
  const errorColor = '#FF6B6B';
  const hasError = !!error;

  // Enhanced CSS styling for web platform with better visibility and accessibility
  useEffect(() => {
    if (Platform.OS === 'web') {
      const styleEl = document.createElement('style');
              styleEl.innerHTML = `
        .neon-auth-input {
          background: rgba(0, 0, 0, 0.85);
          border: 3px solid ${hasError ? errorColor : primaryColor}80;
          box-shadow: 
            0 0 15px ${hasError ? errorColor : primaryColor}50,
            0 0 25px ${hasError ? errorColor : primaryColor}30,
            inset 0 0 10px rgba(0, 0, 0, 0.7);
          transition: all 0.3s ease;
          outline: none;
          font-size: 16px !important; /* Prevents zoom on iOS Safari */
          min-height: 48px; /* Compact but touch-friendly */
          font-weight: 500 !important;
        }
        
        .neon-auth-input:focus {
          border-color: ${hasError ? errorColor : primaryColor};
          box-shadow: 
            0 0 25px ${hasError ? errorColor : primaryColor}70,
            0 0 40px ${hasError ? errorColor : primaryColor}50,
            0 0 60px ${hasError ? errorColor : primaryColor}30,
            inset 0 0 15px rgba(0, 0, 0, 0.5);
          background: rgba(0, 0, 0, 0.9);
        }
        
        .neon-auth-input::placeholder {
          color: ${hasError ? errorColor + '90' : primaryColor + '90'};
          opacity: 0.8;
        }
        
        .neon-auth-input:focus::placeholder {
          color: ${hasError ? errorColor + '70' : primaryColor + '70'};
          opacity: 0.6;
        }
        
        /* Enhanced autofill styling */
        .neon-auth-input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.9) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
          border-color: ${primaryColor} !important;
          transition: background-color 5000s ease-in-out 0s;
        }
        
        .neon-auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px rgba(0, 0, 0, 0.95) inset !important;
          -webkit-text-fill-color: #FFFFFF !important;
        }
        
        /* Improved contrast for better readability */
        .neon-auth-input {
          color: #FFFFFF !important;
          font-weight: 400;
        }
        
        /* Error state styling */
        .neon-auth-input.error {
          border-color: ${errorColor};
          box-shadow: 
            0 0 20px ${errorColor}60,
            0 0 35px ${errorColor}40,
            inset 0 0 10px rgba(255, 107, 107, 0.3);
        }
        
        .neon-auth-input.error:focus {
          box-shadow: 
            0 0 30px ${errorColor}80,
            0 0 50px ${errorColor}60,
            0 0 70px ${errorColor}40,
            inset 0 0 15px rgba(255, 107, 107, 0.4);
        }
      `;
      document.head.appendChild(styleEl);
      
      return () => {
        if (document.head.contains(styleEl)) {
          document.head.removeChild(styleEl);
        }
      };
    }
  }, [primaryColor, hasError, errorColor]);

  const inputStyle = [
    styles.input,
    isFocused && styles.focusedInput,
    hasError && styles.errorInput,
    !editable && styles.disabledInput,
    style
  ];

  const containerStyle = [
    styles.container,
    hasError && styles.errorContainer
  ];

  // Determine web-specific props
  const webProps = Platform.OS === 'web' ? {
    className: `neon-auth-input ${hasError ? 'error' : ''}`,
    autoComplete,
    inputMode,
    'aria-label': label || placeholder,
    'aria-invalid': hasError,
    'aria-describedby': error ? `${placeholder}-error` : undefined,
    'aria-required': required,
  } : {};

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: hasError ? errorColor : primaryColor }]}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={hasError ? errorColor + '90' : primaryColor + '90'}
          secureTextEntry={secureTextEntry && !showPassword}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          style={inputStyle}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          editable={editable}
          maxLength={maxLength}
          selectTextOnFocus={Platform.OS === 'web'}
          autoCorrect={false}
          spellCheck={false}
          {...webProps}
        />
        
        {/* Password visibility toggle */}
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            accessibilityRole="button"
          >
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={20}
              color={hasError ? errorColor : primaryColor}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <Text 
          style={styles.errorText}
          accessibilityLiveRegion="polite"
          {...(Platform.OS === 'web' ? { id: `${placeholder}-error` } : {})}
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  errorContainer: {
    // Additional styling for error container if needed
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  required: {
    color: '#FF6B6B',
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? 48 : 46, // Compact but touch-friendly
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingRight: 46, // Space for eye icon
    fontSize: Platform.OS === 'web' ? 16 : 17, // Prevents zoom on iOS
    color: '#FFFFFF',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.85)',
    borderWidth: 3,
    borderColor: NeonColors.dark.primary + '80',
    fontWeight: '500',
    ...(Platform.OS !== 'web' && {
      shadowColor: NeonColors.dark.primary,
      shadowOffset: {
        width: 0,
        height: 0,
      },
      shadowOpacity: 0.6,
      shadowRadius: 12,
      elevation: 8,
    }),
  },
  focusedInput: {
    borderColor: NeonColors.dark.primary,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.9)',
    ...(Platform.OS !== 'web' && {
      shadowOpacity: 0.8,
      shadowRadius: 18,
      elevation: 12,
    }),
  },
  errorInput: {
    borderColor: '#FF6B6B',
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(255, 107, 107, 0.15)',
    ...(Platform.OS !== 'web' && {
      shadowColor: '#FF6B6B',
      shadowOpacity: 0.7,
      shadowRadius: 15,
    }),
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(0, 0, 0, 0.3)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 14,
    padding: 3,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
}); 