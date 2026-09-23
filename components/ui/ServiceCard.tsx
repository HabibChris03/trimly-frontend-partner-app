import React from "react";
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/theme/useTheme";

export interface ServiceCardProps {
  id: string | number;
  name: string;
  durationMinutes: number;
  price: number;
  category?: string;
  selected?: boolean;
  onSelect?: () => void;
  onBook?: () => void;
  style?: ViewStyle;
}

export function ServiceCard({
  name,
  durationMinutes,
  price,
  selected = false,
  onSelect,
  onBook,
  style,
}: ServiceCardProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onSelect || onBook}
      style={[
        styles.card,
        {
          backgroundColor: selected ? colors.secondarySurface : colors.card,
          borderRadius: radius.lg,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: selected ? 1.8 : 1,
          padding: spacing.md + 2,
        },
        shadows.subtle,
        style,
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.name,
            {
              color: colors.primaryText,
              fontFamily: typography.fontFamily.bold,
            },
          ]}
        >
          {name}
        </Text>
        <View style={[styles.durationRow, { marginTop: spacing.xs }]}>
          <Ionicons
            name="time-outline"
            size={13}
            color={colors.secondaryText}
          />
          <Text
            style={[
              styles.duration,
              {
                color: colors.secondaryText,
                fontFamily: typography.fontFamily.regular,
                marginLeft: 4,
              },
            ]}
          >
            {durationMinutes} mins
          </Text>
        </View>
      </View>

      <View style={styles.rightAction}>
        <Text
          style={[
            styles.price,
            {
              color: colors.primary,
              fontFamily: typography.fontFamily.bold,
              marginRight: spacing.sm,
            },
          ]}
        >
          XAF {price.toLocaleString()}
        </Text>

        {onBook && !onSelect && (
          <View
            style={[
              styles.bookBtn,
              {
                backgroundColor: colors.primary,
                borderRadius: radius.full,
              },
            ]}
          >
            <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
          </View>
        )}

        {onSelect && (
          <View
            style={[
              styles.checkCircle,
              {
                backgroundColor: selected ? colors.primary : "transparent",
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radius.full,
              },
            ]}
          >
            {selected && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  name: {
    fontSize: 15,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  duration: {
    fontSize: 12,
  },
  rightAction: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 15,
  },
  bookBtn: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default ServiceCard;
