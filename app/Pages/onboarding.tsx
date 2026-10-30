import React, { useState } from "react";
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/theme/useTheme";

const appLogo = require("@/assets/images/logo.png");
const { width } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function PartnerOnboardingScreen() {
  const { colors, isDark, radius } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: "1",
      title: "Fill Every Chair & Maximize Bookings",
      subtitle: "Connect with thousands of local clients looking for top grooming services daily.",
      icon: "calendar-outline",
    },
    {
      id: "2",
      title: "Real-Time Earnings & Instant Analytics",
      subtitle: "Track daily revenue, tips, and booking trends with transparent financial metrics.",
      icon: "trending-up-outline",
    },
    {
      id: "3",
      title: "Effortless Team & Salon Management",
      subtitle: "Coordinate staff shifts, set service catalogs, and manage multiple chairs in one app.",
      icon: "people-outline",
    },
  ];

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace("/(auth)/login");
    }
  };

  const handleSkip = () => {
    router.replace("/(auth)/login");
  };

  const currentSlide = slides[currentIndex];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={appLogo}
            style={{ width: 28, height: 28, borderRadius: 8 }}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: colors.primaryText }]}>
            Trimly Partner
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkip}
          style={styles.skipBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.skipText, { color: colors.secondaryText }]}>
            {t("onboarding.skip") || "Skip"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Slide Content */}
      <View style={styles.centerContent}>
        {/* Decorative Circle Icon Box */}
        <View style={styles.iconOuterRing}>
          <View style={[styles.iconBox, { backgroundColor: colors.secondarySurface }]}>
            <Ionicons name={currentSlide.icon} size={64} color={colors.primary} />
          </View>
        </View>

        {/* Slide Text */}
        <Text style={[styles.title, { color: colors.primaryText }]}>
          {currentSlide.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
          {currentSlide.subtitle}
        </Text>
      </View>

      {/* Bottom Controls: Dots + Button */}
      <View style={styles.bottomControls}>
        {/* Dot Indicators */}
        <View style={styles.dotsRow}>
          {slides.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? colors.primary : colors.border,
                    width: isActive ? 28 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Next / Get Started Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleNext}
          style={[
            styles.nextBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radius["2xl"],
              shadowColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1
              ? "Get Started"
              : "Next"}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 6 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: 16,
  },
  iconOuterRing: {
    marginBottom: 36,
  },
  iconBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.3,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  bottomControls: {
    paddingBottom: 24,
    gap: 24,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
