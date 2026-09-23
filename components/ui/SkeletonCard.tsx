import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface SkeletonCardProps {
  height?: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonCard({
  height = 120,
  width = "100%",
  borderRadius = 16,
  style,
}: SkeletonCardProps) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
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
          height,
          width: width as any,
          borderRadius,
          backgroundColor: colors.secondarySurface,
          opacity,
        },
        style,
      ]}
    />
  );
}

export default SkeletonCard;
