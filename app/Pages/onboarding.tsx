import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

const appLogo = require("@/assets/images/logo.png");

const { width } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
}

export default function OnboardingScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: "1",
      title: t("onboarding.slide1Title"),
      subtitle: t("onboarding.slide1Subtitle"),
      icon: "cut-outline",
      accent: "#A3B39C",
    },
    {
      id: "2",
      title: t("onboarding.slide2Title"),
      subtitle: t("onboarding.slide2Subtitle"),
      icon: "sparkles-outline",
      accent: "#A3B39C",
    },
    {
      id: "3",
      title: t("onboarding.slide3Title"),
      subtitle: t("onboarding.slide3Subtitle"),
      icon: "calendar-outline",
      accent: "#A3B39C",
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Bar with Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Image
            source={appLogo}
            style={{ width: 28, height: 28, borderRadius: 8 }}
            resizeMode="contain"
          />
          <Text style={[styles.brandText, { color: colors.primarytext }]}>
            Trimly
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSkip}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: colors.secondarytext }]}>
            {t("onboarding.skip")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Center Slide Content */}
      <View style={styles.centerContent}>
        {/* Decorative Circle Icon Box */}
        <View style={styles.iconOuterRing}>
          <View style={[styles.iconBox, { backgroundColor: "rgba(163, 179, 156, 0.15)" }]}>
            {currentIndex === 0 ? (
              <Image
                source={appLogo}
                style={{ width: 72, height: 72, borderRadius: 18 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={currentSlide.icon} size={64} color="#A3B39C" />
            )}
          </View>
        </View>

        {/* Slide Text */}
        <Text style={[styles.title, { color: colors.primarytext }]}>
          {currentSlide.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.secondarytext }]}>
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
                    backgroundColor: isActive ? "#A3B39C" : colors.surfacevariant,
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
          style={[styles.nextBtn, { backgroundColor: "#A3B39C" }]}
        >
          <Text style={styles.nextBtnText}>
            {currentIndex === slides.length - 1
              ? t("onboarding.getStarted")
              : t("onboarding.next")}
          </Text>
          <Ionicons
            name="arrow-forward"
            size={18}
            color="#1C1E1B"
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
    paddingVertical: 16,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontSize: 20,
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
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: "rgba(163, 179, 156, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  iconBox: {
    width: 130,
    height: 130,
    borderRadius: 65,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 14.5,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  bottomControls: {
    paddingBottom: 30,
    gap: 24,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  nextBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  nextBtnText: {
    color: "#1C1E1B",
    fontSize: 15.5,
    fontWeight: "700",
  },
});
