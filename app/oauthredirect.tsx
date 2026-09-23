import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

export default function OAuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Gracefully handle redirect completion
    const timer = setTimeout(() => {
      router.replace("/(barbers)");
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#0F100E",
      }}
    >
      <ActivityIndicator size="large" color="#A3B39C" />
    </View>
  );
}
