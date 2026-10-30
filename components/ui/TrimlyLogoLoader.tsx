import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Image,
  ImageStyle,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

export type TrimlyLogoLoaderSize = "small" | "medium" | "large" | number;

export interface TrimlyLogoLoaderProps {
  /**
   * Size of the logo loader.
   * - "small": 26x26 (ideal for buttons and compact loaders)
   * - "medium": 44x44 (ideal for cards and modal loaders)
   * - "large": 68x68 (ideal for full-screen loading states)
   * - number: exact pixel dimensions
   */
  size?: TrimlyLogoLoaderSize;
  /**
   * Duration in ms for one half of the fade cycle (fade in or fade out).
   * Default: 750ms.
   */
  duration?: number;
  /**
   * Minimum opacity reached at lowest fade point. Default: 0.2.
   */
  minOpacity?: number;
  /**
   * Optional tint color for monochrome usage. Default is undefined (keeps brand colors).
   */
  tintColor?: string;
  /**
   * Whether to include a subtle breathing scale alongside the fade. Default: true.
   */
  scalePulse?: boolean;
  /**
   * Outer container style.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Direct image style.
   */
  imageStyle?: StyleProp<ImageStyle>;
}

const logoSource = require("@/assets/images/logo.png");

export function TrimlyLogoLoader({
  size = "small",
  duration = 750,
  minOpacity = 0.2,
  tintColor,
  scalePulse = true,
  style,
  imageStyle,
}: TrimlyLogoLoaderProps) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const dim =
    typeof size === "number"
      ? size
      : size === "small"
      ? 26
      : size === "large"
      ? 68
      : 44;

  useEffect(() => {
    const fadeSequence = Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: minOpacity,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    const scaleSequence = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.04,
        duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    const animation = Animated.loop(
      scalePulse
        ? Animated.parallel([fadeSequence, scaleSequence])
        : fadeSequence
    );

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, scaleAnim, duration, minOpacity, scalePulse]);

  return (
    <View style={[styles.container, style]}>
      <Animated.Image
        source={logoSource}
        resizeMode="contain"
        style={[
          {
            width: dim,
            height: dim,
            opacity: fadeAnim,
            transform: scalePulse ? [{ scale: scaleAnim }] : undefined,
            tintColor: tintColor || undefined,
          },
          imageStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default TrimlyLogoLoader;
