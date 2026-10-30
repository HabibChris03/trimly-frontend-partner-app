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

function getInitials(name?: string): string {
  if (!name) return "U";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  source,
  name,
  size = "md",
  online,
  style,
}: AvatarProps) {
  const { colors, typography } = useTheme();

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

  const imageUri = typeof source === "string" ? { uri: source } : source;

  return (
    <View style={[{ width: dim, height: dim }, style]}>
      {source ? (
        <Image
          source={imageUri}
          style={{
            width: dim,
            height: dim,
            borderRadius: dim / 2,
            backgroundColor: colors.secondarySurface,
          }}
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            {
              width: dim,
              height: dim,
              borderRadius: dim / 2,
              backgroundColor: colors.secondarySurface,
              borderWidth: 1,
              borderColor: colors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.initialsText,
              {
                fontSize,
                color: colors.brand,
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
              backgroundColor: online ? colors.success : colors.mutedText,
              borderColor: colors.card,
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
    letterSpacing: 0.5,
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    borderWidth: 1.8,
  },
});

export default Avatar;
