import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  onRightIconPress,
  isPassword = false,
  style,
  onFocus,
  onBlur,
  ...props
}: InputProps) {
  const { colors, radius, spacing, typography } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(!isPassword);

  const handleFocus = (e: any) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  const borderColor = error
    ? colors.error
    : isFocused
    ? colors.primary
    : colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.semiBold,
              marginBottom: spacing.xs,
            },
          ]}
        >
          {label}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.inputBg,
            borderColor,
            borderRadius: radius.xl,
            paddingHorizontal: spacing.lg,
          },
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={isFocused ? colors.primary : colors.secondaryText}
            style={{ marginRight: spacing.sm }}
          />
        )}

        <TextInput
          placeholderTextColor={colors.inputPlaceholder}
          secureTextEntry={isPassword && !showPassword}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.textInput,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.regular,
            },
            style,
          ]}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowPassword((prev) => !prev)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.secondaryText}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onRightIconPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name={rightIcon} size={20} color={colors.secondaryText} />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text
          style={[
            styles.errorText,
            {
              color: colors.error,
              fontFamily: typography.fontFamily.medium,
              marginTop: spacing.xs,
            },
          ]}
        >
          {error}
        </Text>
      ) : helperText ? (
        <Text
          style={[
            styles.helperText,
            {
              color: colors.secondaryText,
              fontFamily: typography.fontFamily.regular,
              marginTop: spacing.xs,
            },
          ]}
        >
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    letterSpacing: 0.1,
  },
  inputWrapper: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.2,
  },
  textInput: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  errorText: {
    fontSize: 12,
  },
  helperText: {
    fontSize: 12,
  },
});

export default Input;
