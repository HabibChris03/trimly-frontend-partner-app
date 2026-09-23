import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export interface RatingProps {
  rating: number;
  max?: number;
  reviewCount?: number;
  showScore?: boolean;
  size?: number;
  style?: ViewStyle;
}

export function Rating({
  rating,
  max = 5,
  reviewCount,
  showScore = true,
  size = 14,
  style,
}: RatingProps) {
  const { colors, typography, spacing } = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Ionicons name="star" size={size} color="#F59E0B" />
      {showScore && (
        <Text
          style={[
            styles.score,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.bold,
              fontSize: size,
              marginLeft: spacing.xs,
            },
          ]}
        >
          {rating.toFixed(1)}
        </Text>
      )}
      {reviewCount !== undefined && (
        <Text
          style={[
            styles.count,
            {
              color: colors.secondaryText,
              fontFamily: typography.fontFamily.regular,
              fontSize: size - 1,
              marginLeft: spacing.xs,
            },
          ]}
        >
          ({reviewCount})
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  score: {},
  count: {},
});

export default Rating;
