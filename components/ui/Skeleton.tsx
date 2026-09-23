import React, { useEffect, useRef } from "react";
import { Animated, DimensionValue, StyleSheet, View, ViewStyle } from "react-native";
import useColors from "@/hooks/usecolor";

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle | ViewStyle[];
}

/**
 * Base pulsing skeleton block
 */
export function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.75,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
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
          backgroundColor: colors.surfacevariant || "#383D33",
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for Barber Cards (Home Feed, Explore & Saved Barbers)
 */
export function BarberCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.barberCardSkeleton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfacevariant,
        },
      ]}
    >
      <Skeleton width={52} height={52} borderRadius={16} />
      <View style={styles.cardInfoCol}>
        <Skeleton width="65%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width="85%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <View style={styles.rowGap}>
          <Skeleton width={45} height={12} borderRadius={4} />
          <Skeleton width={55} height={12} borderRadius={4} />
        </View>
      </View>
      <Skeleton width={64} height={34} borderRadius={12} />
    </View>
  );
}

/**
 * Skeleton for Appointment Cards (Client Bookings & Barber Schedule)
 */
export function AppointmentCardSkeleton() {
  const colors = useColors();
  return (
    <View
      style={[
        styles.appointmentCardSkeleton,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfacevariant,
        },
      ]}
    >
      <Skeleton width={4} height="100%" borderRadius={2} style={{ marginRight: 12 }} />
      <View style={{ flex: 1 }}>
        <View style={[styles.spaceBetweenRow, { marginBottom: 8 }]}>
          <Skeleton width={70} height={14} borderRadius={4} />
          <Skeleton width={65} height={14} borderRadius={6} />
        </View>
        <Skeleton width="75%" height={16} borderRadius={6} style={{ marginBottom: 6 }} />
        <Skeleton width="50%" height={12} borderRadius={4} />
      </View>
    </View>
  );
}

/**
 * Skeleton for Dashboard Metrics
 */
export function DashboardMetricsSkeleton() {
  const colors = useColors();
  return (
    <View style={styles.metricsSkeletonRow}>
      <View
        style={[
          styles.metricCardSkeleton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
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
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
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

/**
 * Skeleton for Style Grid (Search Results)
 */
export function StyleCardSkeleton({ cardWidth }: { cardWidth?: number }) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.styleCardSkeleton,
        {
          width: cardWidth || 160,
          backgroundColor: colors.surface,
          borderColor: colors.surfacevariant,
        },
      ]}
    >
      <Skeleton width="100%" height={130} borderRadius={16} style={{ marginBottom: 10 }} />
      <Skeleton width="80%" height={15} borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton width="60%" height={12} borderRadius={4} style={{ marginBottom: 10 }} />
      <View style={styles.spaceBetweenRow}>
        <Skeleton width={50} height={14} borderRadius={4} />
        <Skeleton width={32} height={32} borderRadius={10} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barberCardSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardInfoCol: {
    flex: 1,
    marginLeft: 14,
  },
  rowGap: {
    flexDirection: "row",
    gap: 8,
  },
  appointmentCardSkeleton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    height: 90,
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
    borderRadius: 20,
    borderWidth: 1,
    height: 105,
  },
  styleCardSkeleton: {
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
  },
});
