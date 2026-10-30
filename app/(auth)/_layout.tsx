import { useTheme } from "@/context/ThemeContext";
import { Stack } from "expo-router/stack";
import React from "react";
import { StatusBar } from "react-native";

export default function AuthLayout() {
  const { colors, isDark } = useTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="forgot-password" />
      </Stack>
    </>
  );
}
