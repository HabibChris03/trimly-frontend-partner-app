import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";
import Avatar from "./Avatar";
import Badge from "./Badge";

export interface BookingCardProps {
  id: string | number;
  barberName: string;
  serviceName: string;
  dateTime: string;
  price: number;
  status: "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Pending";
  avatarUrl?: string;
  onPress?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  style?: ViewStyle;
}

export function BookingCard({
  barberName,
  serviceName,
  dateTime,
  price,
  status,
  avatarUrl,
  onPress,
  onReschedule,
  onCancel,
  onReview,
  style,
}: BookingCardProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  const getBadgeVariant = () => {
    switch (status) {
      case "Confirmed":
        return "brand";
      case "In Progress":
        return "info";
      case "Completed":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "warning";
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderRadius: radius.xl,
          borderColor: colors.border,
          borderWidth: 1,
          padding: spacing.lg,
        },
        shadows.card,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <Avatar source={avatarUrl} name={barberName} size="md" />
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text
            style={[
              styles.barberName,
              {
                color: colors.primaryText,
                fontFamily: typography.fontFamily.bold,
              },
            ]}
          >
            {barberName}
          </Text>
          <Text
            style={[
              styles.serviceName,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.medium,
              },
            ]}
          >
            {serviceName}
          </Text>
        </View>
        <Badge label={status} variant={getBadgeVariant()} />
      </View>

      <View
        style={[
          styles.divider,
          { backgroundColor: colors.border, marginVertical: spacing.md },
        ]}
      />

      <View style={styles.bottomRow}>
        <View style={styles.timeRow}>
          <Ionicons
            name="calendar-outline"
            size={16}
            color={colors.secondaryText}
          />
          <Text
            style={[
              styles.dateTime,
              {
                color: colors.primaryText,
                fontFamily: typography.fontFamily.medium,
                marginLeft: 6,
              },
            ]}
          >
            {dateTime}
          </Text>
        </View>
        <Text
          style={[
            styles.price,
            {
              color: colors.primary,
              fontFamily: typography.fontFamily.bold,
            },
          ]}
        >
          XAF {price.toLocaleString()}
        </Text>
      </View>

      {(onReschedule || onCancel || onReview) && (
        <View style={[styles.actionRow, { marginTop: spacing.md }]}>
          {onReschedule && status === "Confirmed" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onReschedule}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.secondarySurface,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: colors.primaryText,
                    fontFamily: typography.fontFamily.semiBold,
                  },
                ]}
              >
                Reschedule
              </Text>
            </TouchableOpacity>
          )}

          {onCancel && status === "Confirmed" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onCancel}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: "rgba(220, 38, 38, 0.08)",
                  borderRadius: radius.md,
                  marginLeft: spacing.sm,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: colors.error,
                    fontFamily: typography.fontFamily.semiBold,
                  },
                ]}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          )}

          {onReview && status === "Completed" && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onReview}
              style={[
                styles.actionBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radius.md,
                },
              ]}
            >
              <Text
                style={[
                  styles.actionText,
                  {
                    color: "#FFFFFF",
                    fontFamily: typography.fontFamily.semiBold,
                  },
                ]}
              >
                Leave Review
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  barberName: {
    fontSize: 16,
  },
  serviceName: {
    fontSize: 13,
    marginTop: 2,
  },
  divider: {
    height: 1,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateTime: {
    fontSize: 13,
  },
  price: {
    fontSize: 15,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  actionText: {
    fontSize: 13,
  },
});

export default BookingCard;
