import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import Avatar from "./Avatar";
import Rating from "./Rating";

export interface ReviewCardProps {
  id: string | number;
  clientName: string;
  rating: number;
  comment: string;
  timeAgo: string;
  tags?: string[];
  style?: ViewStyle;
}

export function ReviewCard({
  clientName,
  rating,
  comment,
  timeAgo,
  tags,
  style,
}: ReviewCardProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          borderColor: colors.border,
          borderWidth: 1,
          padding: spacing.md,
        },
        shadows.subtle,
        style,
      ]}
    >
      <View style={styles.header}>
        <Avatar name={clientName} size="sm" />
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text
            style={[
              styles.name,
              {
                color: colors.primaryText,
                fontFamily: typography.fontFamily.semiBold,
              },
            ]}
          >
            {clientName}
          </Text>
          <Text
            style={[
              styles.timeAgo,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.regular,
              },
            ]}
          >
            {timeAgo}
          </Text>
        </View>
        <Rating rating={rating} showScore={false} size={13} />
      </View>

      <Text
        style={[
          styles.comment,
          {
            color: colors.primaryText,
            fontFamily: typography.fontFamily.regular,
            marginVertical: spacing.sm,
          },
        ]}
      >
        "{comment}"
      </Text>

      {tags && tags.length > 0 && (
        <View style={styles.tagRow}>
          {tags.map((tag, idx) => (
            <View
              key={idx}
              style={[
                styles.tag,
                {
                  backgroundColor: colors.secondarySurface,
                  borderRadius: radius.full,
                  marginRight: spacing.xs,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color: colors.secondaryText,
                    fontFamily: typography.fontFamily.medium,
                  },
                ]}
              >
                {tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  name: {
    fontSize: 14,
  },
  timeAgo: {
    fontSize: 11,
  },
  comment: {
    fontSize: 13,
    lineHeight: 18,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 4,
  },
  tagText: {
    fontSize: 11,
  },
});

export default ReviewCard;
