import { Link } from "expo-router";
import { Stack } from "expo-router/stack";
import { StyleSheet, Text, View } from "react-native";
import React from "react";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!", headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>Redirecting to Trimly...</Text>
        <Link href="/(barbers)" style={styles.link}>
          <Text style={styles.linkText}>Return to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#171918",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#F5F5F2",
  },
  link: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#C7F36B",
    borderRadius: 24,
  },
  linkText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#171918",
  },
});
