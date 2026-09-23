import React from "react";
import { ActivityIndicator, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
}

export function LoadingState({ message, style }: LoadingStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && (
        <Text
          style={[
            styles.message,
            {
              color: colors.secondaryText,
              fontFamily: typography.fontFamily.medium,
              marginTop: spacing.md,
            },
          ]}
        >
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 14,
  },
});

export default LoadingState;
