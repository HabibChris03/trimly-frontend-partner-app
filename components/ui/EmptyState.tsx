import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export function EmptyState({
  icon = "sparkles-outline",
  title,
  description,
  actionText,
  onActionPress,
  style,
}: EmptyStateProps) {
  const { colors, spacing, typography, radius } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing["2xl"] }, style]}>
      <View
        style={[
          styles.iconCircle,
          {
            backgroundColor: colors.secondarySurface,
            borderRadius: radius.full,
            marginBottom: spacing.lg,
          },
        ]}
      >
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text
        style={[
          styles.title,
          {
            color: colors.primaryText,
            fontFamily: typography.fontFamily.bold,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {title}
      </Text>
      <Text
        style={[
          styles.description,
          {
            color: colors.secondaryText,
            fontFamily: typography.fontFamily.regular,
            marginBottom: actionText ? spacing.xl : 0,
          },
        ]}
      >
        {description}
      </Text>
      {actionText && onActionPress && (
        <Button title={actionText} onPress={onActionPress} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  iconCircle: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});

export default EmptyState;
