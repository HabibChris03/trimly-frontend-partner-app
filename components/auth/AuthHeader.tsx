import useColors from "@/hooks/usecolor";
import { BrandPhotos } from "@/theme/colors";
import React from "react";
import { Image, ImageBackground, StyleSheet, Text, View } from "react-native";

const appLogo = require("@/assets/images/logo.png");

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}

export default function AuthHeader({
  title = "Welcome Back",
  subtitle = "Manage your chairs, team, and bookings",
}: AuthHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.headerContainer}>
      <ImageBackground
        source={{ uri: BrandPhotos.authHero }}
        style={[
          styles.heroBanner,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
        imageStyle={styles.heroImage}
      >
        <View style={styles.heroOverlay}>
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: "rgba(23, 25, 24, 0.85)",
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={appLogo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.brandTag}>
            <Text style={styles.brandTitle}>TRIMLY PARTNER</Text>
            <View
              style={[styles.brandDot, { backgroundColor: colors.brand }]}
            />
          </View>
        </View>
      </ImageBackground>

      <Text style={[styles.mainTitle, { color: colors.primaryText }]}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    width: "100%",
    alignItems: "flex-start",
    paddingTop: 4,
    paddingBottom: 20,
  },
  heroBanner: {
    width: "100%",
    height: 136,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },
  heroImage: {
    borderRadius: 17,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: "rgba(23, 25, 24, 0.56)",
    padding: 16,
    justifyContent: "space-between",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
  },
  brandTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(23, 25, 24, 0.82)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  brandTitle: {
    color: "#F5F5F2",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  brandDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14.5,
    fontWeight: "400",
    marginTop: 5,
    lineHeight: 20,
  },
});
