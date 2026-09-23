import useColors from "@/hooks/usecolor";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

const appLogo = require("@/assets/images/logo.png");

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AuthHeader({
  title = "Welcome Back",
  subtitle = "Step into your best look yet",
}: AuthHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.headerContainer}>
      <View style={styles.shapesWrapper}>
        <View
          style={[
            styles.peachCircle,
            { backgroundColor: colors.secondary, opacity: 0.3 },
          ]}
        />
        <View
          style={[
            styles.sageBlob,
            { backgroundColor: colors.surfacevariant, opacity: 0.45 },
          ]}
        />
      </View>
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfacevariant,
            borderWidth: 1,
          },
        ]}
      >
        <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
      </View>

      <Text style={[styles.brandTitle, { color: colors.primarytext }]}>
        Trimly
      </Text>

      <Text style={[styles.mainTitle, { color: colors.primarytext }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.secondarytext }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingBottom: 22,
    position: "relative",
  },
  shapesWrapper: {
    position: "absolute",
    top: -6,
    width: 260,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
    zIndex: -1,
  },
  peachCircle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    left: 20,
    top: 5,
    opacity: 0.65,
  },
  sageBlob: {
    position: "absolute",
    width: 140,
    height: 130,
    borderRadius: 65,
    right: 15,
    top: 8,
    opacity: 0.7,
  },
  iconBadge: {
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  logoImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginBottom: 18,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    marginTop: 6,
    textAlign: "center",
  },
});
