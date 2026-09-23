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
          backgroundColor: colors.surface,
          borderColor: colors.surfacevariant,
        },
      ]}
    >
      <View style={styles.iconContainer}>
        {isGoogle ? (
          <Ionicons name="logo-google" size={20} color={colors.primarytext} />
        ) : (
          <Ionicons name="logo-apple" size={22} color={colors.primarytext} />
        )}
      </View>
      <Text style={[styles.text, { color: colors.primarytext }]}>
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
    borderRadius: 28,
    borderWidth: 1.2,
    height: 45,
    width: "100%",
    marginBottom: 12,
    paddingHorizontal: 16,
    elevation: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  iconContainer: {
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
