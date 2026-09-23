import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
}

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  style,
  disabled,
  onPress,
  ...props
}: ButtonProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const handlePress = (e: any) => {
    if (disabled || loading) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    onPress?.(e);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return {
          container: { backgroundColor: colors.primary },
          text: { color: "#FFFFFF" },
        };
      case "secondary":
        return {
          container: { backgroundColor: colors.secondarySurface },
          text: { color: colors.primaryText },
        };
      case "outline":
        return {
          container: {
            backgroundColor: "transparent",
            borderWidth: 1.5,
            borderColor: colors.border,
          },
          text: { color: colors.primaryText },
        };
      case "ghost":
        return {
          container: { backgroundColor: "transparent" },
          text: { color: colors.primary },
        };
      case "destructive":
        return {
          container: { backgroundColor: colors.error },
          text: { color: "#FFFFFF" },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "sm":
        return {
          height: 36,
          paddingHorizontal: spacing.md,
          fontSize: 13,
          iconSize: 16,
        };
      case "md":
        return {
          height: 48,
          paddingHorizontal: spacing.xl,
          fontSize: 15,
          iconSize: 18,
        };
      case "lg":
        return {
          height: 54,
          paddingHorizontal: spacing["2xl"],
          fontSize: 16,
          iconSize: 20,
        };
    }
  };

  const vStyle = getVariantStyles();
  const sStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.82}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[
        styles.base,
        {
          borderRadius: radius["2xl"],
          height: sStyle.height,
          paddingHorizontal: sStyle.paddingHorizontal,
          width: fullWidth ? "100%" : undefined,
          opacity: disabled ? 0.45 : 1,
        },
        vStyle.container,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" || variant === "destructive" ? "#FFFFFF" : colors.primary}
        />
      ) : (
        <View style={styles.contentRow}>
          {leftIcon && (
            <Ionicons
              name={leftIcon}
              size={sStyle.iconSize}
              color={vStyle.text.color}
              style={{ marginRight: spacing.xs + 2 }}
            />
          )}
          <Text
            style={[
              styles.text,
              {
                color: vStyle.text.color,
                fontSize: sStyle.fontSize,
                fontFamily: typography.fontFamily.semiBold,
              },
            ]}
          >
            {title}
          </Text>
          {rightIcon && (
            <Ionicons
              name={rightIcon}
              size={sStyle.iconSize}
              color={vStyle.text.color}
              style={{ marginLeft: spacing.xs + 2 }}
            />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    letterSpacing: 0.2,
  },
});

export default Button;
