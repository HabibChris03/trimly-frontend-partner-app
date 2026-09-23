import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionText?: string;
  onActionPress?: () => void;
  style?: ViewStyle;
}

export function SectionHeader({
  title,
  subtitle,
  actionText,
  onActionPress,
  style,
}: SectionHeaderProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { marginBottom: spacing.md }, style]}>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.title,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.bold,
            },
          ]}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.regular,
                marginTop: 2,
              },
            ]}
          >
            {subtitle}
          </Text>
        )}
      </View>
      {actionText && onActionPress && (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onActionPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text
            style={[
              styles.actionText,
              {
                color: colors.primary,
                fontFamily: typography.fontFamily.semiBold,
              },
            ]}
          >
            {actionText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 20,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
  },
  actionText: {
    fontSize: 14,
  },
});

export default SectionHeader;
