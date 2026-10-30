import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TrimlyLogoLoader, TrimlyLogoLoaderSize } from "./TrimlyLogoLoader";

export interface LoadingStateProps {
  message?: string;
  style?: ViewStyle;
  size?: TrimlyLogoLoaderSize;
}

export function LoadingState({ message, style, size = "medium" }: LoadingStateProps) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={[styles.container, { padding: spacing.xl }, style]}>
      <TrimlyLogoLoader size={size} />
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
