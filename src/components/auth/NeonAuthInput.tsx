import React, { useState } from 'react';
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
  const errorColor = '#FF6B6B';
  const hasError = !!error;

  const inputStyle = [
    styles.input,
    isFocused && [styles.focusedInput, { borderColor: primaryColor }],
    hasError && [styles.errorInput, { borderColor: errorColor }],
    !editable && styles.disabledInput,
    style
  ];

  const containerStyle = [
    styles.container,
    style
  ];

  // Simplified web props without complex CSS class manipulation
  const webProps = Platform.OS === 'web' ? {
    autoComplete,
    inputMode,
    'aria-label': label || placeholder,
    'aria-invalid': hasError,
    'aria-required': required,
  } : {};

  return (
    <View style={containerStyle}>
      {label && (
        <Text style={[styles.label, { color: hasError ? errorColor : primaryColor }]}>
          {label}
          {required && <Text style={[styles.required, { color: errorColor }]}> *</Text>}
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
          style={[inputStyle, textStyle]}
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
          style={[styles.errorText, { color: errorColor }]}
          accessibilityLiveRegion="polite"
        >
          {error}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#FFFFFF',
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
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingRight: 48, // Space for eye icon
    fontSize: 16,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    fontWeight: '400',
  },
  focusedInput: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderColor: NeonColors.dark.primary,
  },
  errorInput: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: '#FF6B6B',
  },
  disabledInput: {
    opacity: 0.6,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
    fontWeight: '500',
  },
}); 