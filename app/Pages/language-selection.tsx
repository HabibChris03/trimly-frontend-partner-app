// trimly/app/Pages/language-selection.tsx
import { SupportedLanguage, useLanguage } from "@/context/LanguageContext";
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

export default function LanguageSelectionScreen() {
  const colors = useColors();
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
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Decorative ambient background glows */}
      <View
        pointerEvents="none"
        style={[styles.glow1, { backgroundColor: colors.primary, opacity: 0.1 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.glow2, { backgroundColor: "#D4B996", opacity: 0.06 }]}
      />

      {/* Top Branding */}
      <View style={styles.topSection}>
        <View style={styles.logoBadge}>
          <Image
            source={appLogo}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.brandTitle, { color: colors.primarytext }]}>
          TRIMLY
        </Text>
        <Text style={[styles.brandSubtitle, { color: colors.secondarytext }]}>
          VIP GROOMING & SALON MANAGEMENT
        </Text>
      </View>

      {/* Title & Subtitle */}
      <View style={styles.titleSection}>
        <Text style={[styles.mainTitle, { color: colors.primarytext }]}>
          {selected === "fr" ? "Choisissez votre langue" : "Choose Your Language"}
        </Text>
        <Text style={[styles.mainSubtitle, { color: colors.secondarytext }]}>
          {selected === "fr"
            ? "Sélectionnez votre langue pour personnaliser votre expérience."
            : "Select your preferred language to customize your experience."}
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
              backgroundColor: colors.surface,
              borderColor:
                selected === "en" ? colors.primary : colors.surfacevariant,
              borderWidth: selected === "en" ? 2 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.flagIconBox}>
              <Text style={styles.flagEmoji}>🇬🇧</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.langName, { color: colors.primarytext }]}>
                English
              </Text>
              <Text style={[styles.langSub, { color: colors.secondarytext }]}>
                English (US)
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor:
                    selected === "en" ? colors.primary : colors.secondarytext,
                  backgroundColor:
                    selected === "en" ? colors.primary : "transparent",
                },
              ]}
            >
              {selected === "en" && (
                <Ionicons name="checkmark" size={14} color="#1C1E1B" />
              )}
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.secondarytext }]}>
            Book haircuts, explore top master stylists, and manage salon appointments.
          </Text>
        </TouchableOpacity>

        {/* French Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setSelected("fr")}
          style={[
            styles.langCard,
            {
              backgroundColor: colors.surface,
              borderColor:
                selected === "fr" ? colors.primary : colors.surfacevariant,
              borderWidth: selected === "fr" ? 2 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.flagIconBox}>
              <Text style={styles.flagEmoji}>🇫🇷</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.langName, { color: colors.primarytext }]}>
                Français
              </Text>
              <Text style={[styles.langSub, { color: colors.secondarytext }]}>
                Français (FR)
              </Text>
            </View>
            <View
              style={[
                styles.radioCircle,
                {
                  borderColor:
                    selected === "fr" ? colors.primary : colors.secondarytext,
                  backgroundColor:
                    selected === "fr" ? colors.primary : "transparent",
                },
              ]}
            >
              {selected === "fr" && (
                <Ionicons name="checkmark" size={14} color="#1C1E1B" />
              )}
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: colors.secondarytext }]}>
            Réservez vos coupes, trouvez les meilleurs coiffeurs et gérez votre salon.
          </Text>
        </TouchableOpacity>
      </View>

      {/* Bottom Continue Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={handleContinue}
          style={[styles.continueBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.continueBtnText}>
            {selected === "fr" ? "Continuer" : "Continue"}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#1C1E1B" />
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
  glow1: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
  },
  glow2: {
    position: "absolute",
    bottom: 50,
    left: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  topSection: {
    alignItems: "center",
    marginTop: 20,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: "rgba(163, 179, 156, 0.15)",
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
    marginTop: 20,
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  mainSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    gap: 16,
    flex: 1,
    justifyContent: "center",
  },
  langCard: {
    borderRadius: 18,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 3,
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
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  flagEmoji: {
    fontSize: 24,
  },
  langName: {
    fontSize: 18,
    fontWeight: "700",
  },
  langSub: {
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
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
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#A3B39C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1C1E1B",
  },
});
