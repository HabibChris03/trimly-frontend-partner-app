import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "@/theme/useTheme";

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors, spacing, typography, radius } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleBack}
            style={[
              styles.backButton,
              {
                backgroundColor: colors.secondarySurface,
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primaryText} />
          </TouchableOpacity>
        )}
        <View style={{ marginLeft: showBack ? spacing.sm : 0 }}>
          {title && (
            <Text
              style={[
                styles.title,
                {
                  color: colors.primaryText,
                  fontFamily: typography.fontFamily.bold,
                },
              ]}
              numberOfLines={1}
            >
              {title}
            </Text>
          )}
          {subtitle && (
            <Text
              style={[
                styles.subtitle,
                {
                  color: colors.secondaryText,
                  fontFamily: typography.fontFamily.regular,
                },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>

      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  leftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ScreenHeader;
