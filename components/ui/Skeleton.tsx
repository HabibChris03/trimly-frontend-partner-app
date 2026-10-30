import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from "react-native";
import useColors from "@/hooks/usecolor";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.32)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.32,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.secondarySurface || "#2E332F",
          opacity,
        },
        style,
      ]}
    />
  );
}

export function BarberCardSkeleton({ compact = false }: { compact?: boolean }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.barberCardSkeleton,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton
        width="100%"
        height={compact ? 132 : 158}
        borderRadius={13}
        style={{ marginBottom: 10 }}
      />
      <Skeleton width="68%" height={15} borderRadius={5} style={{ marginBottom: 6 }} />
      <Skeleton width="82%" height={12} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="44%" height={12} borderRadius={4} style={{ marginBottom: 12 }} />
      <View style={styles.ctaRow}>
        <Skeleton width={38} height={38} borderRadius={10} />
        <View style={{ flex: 1 }}>
          <Skeleton width="100%" height={38} borderRadius={10} />
        </View>
      </View>
    </View>
  );
}

export function AppointmentCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.appointmentCardSkeleton,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton width={48} height={48} borderRadius={24} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <View style={[styles.spaceBetweenRow, { marginBottom: 8 }]}>
          <Skeleton width="55%" height={15} borderRadius={4} />
          <Skeleton width={68} height={20} borderRadius={10} />
        </View>
        <Skeleton width="72%" height={13} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="48%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function DashboardMetricsSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.metricsSkeletonRow}>
      <View
        style={[
          styles.metricCardSkeleton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Skeleton width={80} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width={110} height={24} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={50} height={12} borderRadius={4} />
      </View>
      <View
        style={[
          styles.metricCardSkeleton,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          },
        ]}
      >
        <Skeleton width={70} height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width={60} height={24} borderRadius={6} style={{ marginBottom: 8 }} />
        <Skeleton width={60} height={12} borderRadius={4} />
      </View>
    </View>
  );
}

export function StyleCardSkeleton({ cardWidth }: { cardWidth?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.styleCardSkeleton,
        {
          width: cardWidth || 160,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <Skeleton width="100%" height={150} borderRadius={13} style={{ marginBottom: 10 }} />
      <Skeleton width="80%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="55%" height={12} borderRadius={4} />
    </View>
  );
}

const styles = StyleSheet.create({
  barberCardSkeleton: {
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  appointmentCardSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
  },
  spaceBetweenRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricsSkeletonRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  metricCardSkeleton: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    height: 105,
  },
  styleCardSkeleton: {
    padding: 10,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
});
