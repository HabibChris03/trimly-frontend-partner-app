import React, { useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { UPDATE_CONFIG } from "@/constants/updateConfig";
import { useToast } from "@/context/ToastContext";

interface AppUpdateModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors, isDark } = useTheme();
  const { language } = useLanguage();
  const { showToast } = useToast();

  const [isUpdatingOta, setIsUpdatingOta] = useState(false);
  const [otaStatus, setOtaStatus] = useState<string | null>(null);

  const handleInstantOtaUpdate = async () => {
    setIsUpdatingOta(true);
    setOtaStatus(
      language === "fr"
        ? "Recherche de mise à jour instantanée..."
        : "Checking for instant updates..."
    );

    try {
      if (!__DEV__) {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          setOtaStatus(
            language === "fr"
              ? "Téléchargement de la nouvelle version..."
              : "Downloading new version..."
          );
          await Updates.fetchUpdateAsync();
          setOtaStatus(
            language === "fr"
              ? "Mise à jour prête ! Redémarrage..."
              : "Update ready! Restarting app..."
          );
          showToast(
            language === "fr"
              ? "Mise à jour appliquée avec succès !"
              : "Update installed successfully!",
            "success"
          );
          await Updates.reloadAsync();
          return;
        }
      }
      // If no OTA update or running in dev/sideload
      setOtaStatus(
        language === "fr"
          ? "Aucun correctif OTA immédiat. Téléchargez la dernière version APK ci-dessous."
          : "No immediate OTA patch found. Download the latest APK build below."
      );
    } catch (err: any) {
      setOtaStatus(
        language === "fr"
          ? "Téléchargement direct APK prêt."
          : "Direct APK download ready."
      );
    } finally {
      setIsUpdatingOta(false);
    }
  };

  const handleDownloadDirectApk = async () => {
    try {
      showToast(
        language === "fr"
          ? "Lancement du téléchargement de l'APK officiel Partenaire..."
          : "Starting official Partner APK download...",
        "info"
      );
      await Linking.openURL(UPDATE_CONFIG.DIRECT_APK_URL);
    } catch {
      // Fallback to website download page
      await Linking.openURL(UPDATE_CONFIG.WEBSITE_DOWNLOAD_PAGE_URL);
    }
  };

  const handleOpenWebsiteDownload = async () => {
    showToast(
      language === "fr"
        ? "Ouverture de la page de téléchargement web..."
        : "Opening website download page...",
      "info"
    );
    await Linking.openURL(UPDATE_CONFIG.WEBSITE_DOWNLOAD_PAGE_URL);
  };

  const handleOpenPlayStore = async () => {
    if (UPDATE_CONFIG.PLAY_STORE_URL && UPDATE_CONFIG.PLAY_STORE_URL.trim().length > 0) {
      showToast(
        language === "fr"
          ? "Redirection vers le Google Play Store..."
          : "Redirecting to Google Play Store...",
        "info"
      );
      await Linking.openURL(UPDATE_CONFIG.PLAY_STORE_URL);
    } else {
      // If user hasn't added the Play Store link yet, redirect to website download page
      showToast(
        language === "fr"
          ? "Lien Play Store en cours d'ajout. Redirection vers la page de téléchargement APK..."
          : "Play Store link pending. Redirecting to APK download page...",
        "info"
      );
      await Linking.openURL(UPDATE_CONFIG.WEBSITE_DOWNLOAD_PAGE_URL);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          {/* Header Icon & Close Button */}
          <View style={styles.topRow}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "rgba(199, 243, 107, 0.15)", borderColor: colors.brand },
              ]}
            >
              <Ionicons name="cloud-download" size={24} color={colors.brand} />
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="close" size={18} color={colors.secondaryText} />
            </TouchableOpacity>
          </View>

          {/* Title & Version info */}
          <Text style={[styles.title, { color: colors.primaryText }]}>
            {language === "fr" ? "Mise à jour Trimly Partner" : "Trimly Partner App Update"}
          </Text>

          <View style={styles.versionBadgesRow}>
            <View
              style={[
                styles.versionBadge,
                { backgroundColor: colors.elevated, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.versionBadgeLabel, { color: colors.secondaryText }]}>
                {language === "fr" ? "Version installée :" : "Installed :"}
              </Text>
              <Text style={[styles.versionBadgeValue, { color: colors.primaryText }]}>
                v{UPDATE_CONFIG.CURRENT_VERSION}
              </Text>
            </View>

            <View
              style={[
                styles.versionBadge,
                { backgroundColor: "rgba(34, 197, 94, 0.12)", borderColor: "rgba(34, 197, 94, 0.3)" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={12} color="#22C55E" />
              <Text style={[styles.versionBadgeValue, { color: "#22C55E" }]}>
                {language === "fr" ? "Dernière version" : "Latest Build"}
              </Text>
            </View>
          </View>

          {/* Status feedback */}
          {otaStatus && (
            <View
              style={[
                styles.statusBox,
                { backgroundColor: colors.elevated, borderColor: colors.border },
              ]}
            >
              <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
              <Text style={[styles.statusText, { color: colors.primaryText }]}>
                {otaStatus}
              </Text>
            </View>
          )}

          {/* Action 1: Instant Update / Reload (OTA) */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isUpdatingOta}
            onPress={handleInstantOtaUpdate}
            style={[styles.primaryActionBtn, { backgroundColor: colors.brand }]}
          >
            {isUpdatingOta ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <Ionicons name="sync" size={18} color={colors.onBrand} />
            )}
            <Text style={[styles.primaryActionText, { color: colors.onBrand }]}>
              {language === "fr"
                ? "Télécharger et appliquer la mise à jour"
                : "Auto-Download & Update at Once"}
            </Text>
          </TouchableOpacity>

          {/* Action 2: Direct APK Download Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleDownloadDirectApk}
            style={[
              styles.secondaryActionBtn,
              { backgroundColor: colors.elevated, borderColor: colors.border },
            ]}
          >
            <View style={styles.btnIconLeft}>
              <Ionicons name="download-outline" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.btnTitle, { color: colors.primaryText }]}>
                {language === "fr"
                  ? "Télécharger l'APK Partenaire directement"
                  : "Download Official Partner APK"}
              </Text>
              <Text style={[styles.btnSub, { color: colors.secondaryText }]}>
                {language === "fr"
                  ? "Téléchargement direct et rapide pour Android"
                  : "Fast direct Android package installer"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </TouchableOpacity>

          {/* Action 3: Website Download Page Link */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenWebsiteDownload}
            style={[
              styles.secondaryActionBtn,
              { backgroundColor: colors.elevated, borderColor: colors.border },
            ]}
          >
            <View style={styles.btnIconLeft}>
              <Ionicons name="globe-outline" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.btnTitle, { color: colors.primaryText }]}>
                {language === "fr"
                  ? "Page de téléchargement du site web"
                  : "Website Download Center"}
              </Text>
              <Text style={[styles.btnSub, { color: colors.secondaryText }]}>
                trimly237.com/download
              </Text>
            </View>
            <Ionicons name="open-outline" size={16} color={colors.secondaryText} />
          </TouchableOpacity>

          {/* Action 4: Google Play Store Slot */}
          {UPDATE_CONFIG.PLAY_STORE_URL ? (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleOpenPlayStore}
              style={[
                styles.secondaryActionBtn,
                { backgroundColor: colors.elevated, borderColor: colors.border },
              ]}
            >
              <View style={styles.btnIconLeft}>
                <Ionicons name="logo-google-playstore" size={18} color="#00C3FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.btnTitle, { color: colors.primaryText }]}>
                  Google Play Store
                </Text>
                <Text style={[styles.btnSub, { color: colors.secondaryText }]}>
                  {language === "fr"
                    ? "Mettre à jour depuis Google Play"
                    : "Update from Google Play Store"}
                </Text>
              </View>
              <Ionicons name="open-outline" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          ) : (
            <View
              style={[
                styles.storeNoticeBox,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Ionicons name="logo-google-playstore" size={15} color={colors.secondaryText} />
              <Text style={[styles.storeNoticeText, { color: colors.secondaryText }]}>
                {language === "fr"
                  ? "Google Play Store : Emplacement prêt dans updateConfig.ts. Redirection automatique vers le téléchargement APK du site."
                  : "Google Play Store: Link slot configured in updateConfig.ts. Currently linking to website APK download."}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  versionBadgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  versionBadgeLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  versionBadgeValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnIconLeft: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(199, 243, 107, 0.1)",
  },
  btnTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  btnSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  storeNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 2,
  },
  storeNoticeText: {
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
    fontWeight: "500",
  },
});
