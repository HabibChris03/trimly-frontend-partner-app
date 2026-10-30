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

import { SupportedLanguage, useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/theme/useTheme";

const appLogo = require("@/assets/images/logo.png");
const { width } = Dimensions.get("window");

export default function LanguageSelectionScreen() {
  const { colors, isDark, radius } = useTheme();
  const router = useRouter();
  const { language, completeLanguageSelection } = useLanguage();
  const [selected, setSelected] = useState<SupportedLanguage>(language || "en");

  const handleContinue = async () => {
    await completeLanguageSelection(selected);
    router.replace("/Pages/onboarding");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Top Branding */}
      <View style={styles.topSection}>
        <View style={[styles.logoBadge, { backgroundColor: colors.secondarySurface, borderColor: colors.border }]}>
          <Image
            source={appLogo}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandTitle, { color: colors.primaryText }]}>
          TRIMLY PARTNER
        </Text>
        <Text style={[styles.brandSubtitle, { color: colors.secondaryText }]}>
          BARBER & SALON MANAGEMENT PLATFORM
        </Text>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: colors.primaryText }]}>
          {selected === "fr" ? "Choisissez votre langue" : "Choose Your Language"}
        </Text>
        <Text style={[styles.mainSubtitle, { color: colors.secondaryText }]}>
          {selected === "fr"
            ? "Sélectionnez votre langue pour gérer votre salon et vos réservations."
            : "Select your preferred language to manage your shop and appointments."}
        </Text>
      </View>

      {/* Language Options Cards */}
      <View style={styles.optionsContainer}>
        {/* English Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected("en")}
          style={[
            styles.langCard,
            {
              backgroundColor: colors.card,
              borderColor:
                selected === "en" ? colors.primary : colors.border,
              borderWidth: selected === "en" ? 2 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.flagIconBox, { backgroundColor: colors.secondarySurface }]}>
              <Text style={styles.flagEmoji}>🇬🇧</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.langName, { color: colors.primaryText }]}>
                English
              </Text>
              <Text style={[styles.langSub, { color: colors.secondaryText }]}>
                English (US)
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor:
                    selected === "en" ? colors.primary : colors.secondaryText,
                  backgroundColor:
                    selected === "en" ? colors.primary : "transparent",
                },
              ]}
            >
              {selected === "en" && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.secondaryText }]}>
            Manage staff, organize schedules, track earnings, and grow your salon revenue.
          </Text>
        </TouchableOpacity>

        {/* French Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected("fr")}
          style={[
            styles.langCard,
            {
              backgroundColor: colors.card,
              borderColor:
                selected === "fr" ? colors.primary : colors.border,
              borderWidth: selected === "fr" ? 2 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={[styles.flagIconBox, { backgroundColor: colors.secondarySurface }]}>
              <Text style={styles.flagEmoji}>🇫🇷</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.langName, { color: colors.primaryText }]}>
                Français
              </Text>
              <Text style={[styles.langSub, { color: colors.secondaryText }]}>
                Français (FR)
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor:
                    selected === "fr" ? colors.primary : colors.secondaryText,
                  backgroundColor:
                    selected === "fr" ? colors.primary : "transparent",
                },
              ]}
            >
              {selected === "fr" && (
                <Ionicons name="checkmark" size={14} color="#FFFFFF" />
              )}
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.secondaryText }]}>
            Gérez votre équipe, organisez votre emploi du temps et suivez vos revenus.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleContinue}
          style={[
            styles.continueBtn,
            {
              backgroundColor: colors.primary,
              borderRadius: radius["2xl"],
              shadowColor: colors.primary,
            },
          ]}
        >
          <Text style={styles.continueBtnText}>
            {selected === "fr" ? "Continuer" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
  },
  topSection: {
    alignItems: "center",
    marginTop: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.5,
    marginTop: 4,
  },
  titleSection: {
    alignItems: "center",
    marginTop: 10,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    gap: 16,
  },
  langCard: {
    borderRadius: 18,
    padding: 18,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  flagIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  flagEmoji: {
    fontSize: 24,
  },
  langName: {
    fontSize: 17,
    fontWeight: "700",
  },
  langSub: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  cardDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  bottomSection: {
    paddingBottom: 20,
  },
  continueBtn: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
