import React from "react";
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  count,
  style,
}: ChipProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: selected ? colors.primary : colors.card,
          borderRadius: radius.full,
          borderColor: selected ? colors.primary : colors.border,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.sm,
        },
        !selected && shadows.subtle,
        style,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color={selected ? "#FFFFFF" : colors.primaryText}
          style={{ marginRight: spacing.xs + 2 }}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: selected ? "#FFFFFF" : colors.primaryText,
            fontFamily: selected
              ? typography.fontFamily.bold
              : typography.fontFamily.medium,
          },
        ]}
      >
        {label}
      </Text>
      {count !== undefined && (
        <Text
          style={[
            styles.count,
            {
              color: selected ? "rgba(255,255,255,0.85)" : colors.secondaryText,
              fontFamily: typography.fontFamily.semiBold,
              marginLeft: spacing.xs,
            },
          ]}
        >
          ({count})
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    height: 38,
  },
  text: {
    fontSize: 13,
    letterSpacing: 0.1,
  },
  count: {
    fontSize: 12,
  },
});

export default Chip;
