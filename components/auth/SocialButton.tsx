import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface SocialButtonProps {
  provider: "google" | "apple";
  onPress: () => void;
  title?: string;
}

export default function SocialButton({
  provider,
  onPress,
  title,
}: SocialButtonProps) {
  const colors = useColors();

  const isGoogle = provider === "google";
  const defaultTitle = isGoogle
    ? "Continue with Google"
    : "Continue with Apple";
  const displayTitle = title || defaultTitle;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {isGoogle ? (
          <Ionicons name="logo-google" size={19} color={colors.primaryText} />
        ) : (
          <Ionicons name="logo-apple" size={21} color={colors.primaryText} />
        )}
      </View>
      <Text style={[styles.text, { color: colors.primaryText }]}>
        {displayTitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13,
    borderWidth: 1,
    height: 50,
    width: "100%",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 14.5,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
