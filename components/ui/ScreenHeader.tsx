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
  align?: "center" | "left";
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightAction,
  align = "center",
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { colors, typography, sizes, radius } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(barbers)" as any);
    }
  };

  const side = sizes.iconButton;

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.side, { minWidth: side }]}>
        {showBack && (
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            testID="header-back-button"
            style={[
              styles.backButton,
              {
                width: side,
                height: side,
                borderRadius: radius.full,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.primaryText} />
          </TouchableOpacity>
        )}
      </View>

      <View
        style={[
          styles.titleWrap,
          align === "center" ? styles.titleCenter : styles.titleLeft,
        ]}
      >
        {!!title && (
          <Text
            style={[
              styles.title,
              { color: colors.primaryText, fontFamily: typography.fontFamily.bold },
            ]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
        )}
        {!!subtitle && (
          <Text
            style={[
              styles.subtitle,
              { color: colors.secondaryText, fontFamily: typography.fontFamily.medium },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={[styles.side, styles.sideRight, { minWidth: side }]}>
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: 56,
    paddingHorizontal: 16,
  },
  side: {
    flexDirection: "row",
    alignItems: "center",
  },
  sideRight: {
    justifyContent: "flex-end",
    gap: 8,
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  titleWrap: {
    flex: 1,
    paddingHorizontal: 8,
  },
  titleCenter: {
    alignItems: "center",
  },
  titleLeft: {
    alignItems: "flex-start",
  },
  title: {
    fontSize: 17,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
});

export default ScreenHeader;
