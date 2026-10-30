import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export type BadgeVariant = "brand" | "success" | "warning" | "error" | "info" | "neutral";

export interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function Badge({ label, variant = "brand", style }: BadgeProps) {
  const { colors, radius, spacing, typography } = useTheme();

  const getColors = () => {
    switch (variant) {
      case "brand":
        return { bg: colors.brandSoft, text: colors.accent };
      case "success":
        return { bg: colors.successSoft, text: colors.success };
      case "warning":
        return { bg: colors.warningSoft, text: colors.warning };
      case "error":
        return { bg: colors.errorSoft, text: colors.error };
      case "info":
        return { bg: colors.infoSoft, text: colors.info };
      case "neutral":
        return { bg: colors.secondarySurface, text: colors.secondaryText };
    }
  };

  const { bg, text } = getColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg,
          borderRadius: radius.full,
          paddingHorizontal: spacing.sm + 2,
          paddingVertical: spacing.xs,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: text,
            fontFamily: typography.fontFamily.semiBold,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "flex-start",
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.3,
  },
});

export default Badge;
