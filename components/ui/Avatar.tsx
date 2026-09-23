import React from "react";
import { Image, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface AvatarProps {
  source?: string | any;
  name?: string;
  size?: AvatarSize;
  online?: boolean;
  style?: ViewStyle;
}

const PASTEL_COLORS = [
  "#A3B39C",
  "#88977F",
  "#5F7A61",
  "#7B9E87",
  "#6B8E7B",
];

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorForName(name?: string): string {
  if (!name) return PASTEL_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PASTEL_COLORS[Math.abs(hash) % PASTEL_COLORS.length];
}

export function Avatar({
  source,
  name,
  size = "md",
  online,
  style,
}: AvatarProps) {
  const { typography } = useTheme();

  const getDimensions = () => {
    switch (size) {
      case "xs":
        return { dim: 28, fontSize: 11, dot: 7 };
      case "sm":
        return { dim: 36, fontSize: 13, dot: 9 };
      case "md":
        return { dim: 48, fontSize: 16, dot: 11 };
      case "lg":
        return { dim: 64, fontSize: 22, dot: 14 };
      case "xl":
        return { dim: 88, fontSize: 30, dot: 18 };
    }
  };

  const { dim, fontSize, dot } = getDimensions();
  const initials = getInitials(name);
  const bgColor = getColorForName(name);

  const imageUri = typeof source === "string" ? { uri: source } : source;

  return (
    <View style={[{ width: dim, height: dim }, style]}>
      {source ? (
        <Image
          source={imageUri}
          style={{ width: dim, height: dim, borderRadius: dim / 2 }}
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                fontSize,
                fontFamily: typography.fontFamily.bold,
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}

      {online !== undefined && (
        <View
          style={[
            styles.onlineDot,
            {
              width: dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: online ? "#2E8B57" : "#9CA3AF",
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  initialsContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  initialsText: {
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 1.8,
    borderColor: "#FFFFFF",
  },
});

export default Avatar;
