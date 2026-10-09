import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { CustomModal } from "@/components/ui/CustomModal";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";
import { useThemeImages } from "@/hooks/useThemeImages";
import { openWhatsApp, SUPPORT_WHATSAPP_NUMBER } from "@/utils/whatsapp";

export default function BarberProfileSettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { handleScroll, showTabBar } = useTabBarVisibility();
  const { language, setLanguage, t } = useLanguage();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );
  const themeImages = useThemeImages();
  const { user, logout, refreshUser, updateUser } = useAuth();
  const barberAvatar = user?.avatar_url || user?.logo_url
    ? { uri: user.avatar_url || user.logo_url }
    : themeImages.profilePic;
  const { showToast } = useToast();
  const { isDark, toggleTheme } = useTheme();

  const [acceptingAppointments, setAcceptingAppointments] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [callingPhone, setCallingPhone] = useState(user?.phone || "");
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user?.phone !== undefined && user?.phone !== null) {
      setCallingPhone(user.phone);
    }
  }, [user?.phone]);

  const handleSaveCallingPhone = async () => {
    const trimmed = callingPhone.trim();
    setIsSavingPhone(true);
    try {
      await barberService.updateProfileDetails({
        phone: trimmed,
      });
      if (updateUser) {
        updateUser({ phone: trimmed });
      }
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      showToast(
        trimmed
          ? "Client calling line saved. Clients can now call you directly via your profile."
          : "Calling line cleared.",
        "success"
      );
    } catch {
      if (updateUser) {
        updateUser({ phone: trimmed });
      }
      showToast("Calling line updated locally.", "info");
    } finally {
      setIsSavingPhone(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshUser) {
      await refreshUser().catch(() => null);
    }
    setRefreshing(false);
    showToast("Profile refreshed.", "info");
  }, [refreshUser, showToast]);

  const handleLogOutConfirm = () => {
    logout();
    showToast("You have been logged out.", "info");
    router.replace("/(auth)/login");
  };

  const salonAffiliation = barberService.getClientSalonAffiliation(user?.email || user?.name || "");
  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Master Barber";
  const displayEmail = user?.email || "No email available";
  const displayPhone = user?.phone || "No phone added";
  const displayShop = salonAffiliation
    ? salonAffiliation
    : user?.name
    ? `${user.name}'s Shop`
    : "Trimly Certified Shop";
  const hasClientAccount = user?.role === "client" || (user as any)?.has_client_account === true;
  const badgeTitle = salonAffiliation
    ? `${salonAffiliation} Barber`
    : "Verified Barber Pro";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("barberSettings.title")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {t("barberSettings.subtitle")}
          </Text>
        </View>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/Pages/edit-profile")}
          style={[
            styles.headerEditBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A3B39C"
            colors={["#A3B39C"]}
          />
        }
      >
        {/* Profile Card */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/Pages/edit-profile")}
          style={[
            styles.profileCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          {user?.logo_url || user?.avatar_url ? (
            <Image
              source={{ uri: user.logo_url || user.avatar_url || "" }}
              style={styles.avatar}
            />
          ) : (
            <Image source={barberAvatar} style={styles.avatar} />
          )}
          <View style={styles.profileInfo}>
            <Text style={[styles.name, { color: colors.primarytext }]}>
              {displayName}
            </Text>
            <Text style={[styles.shop, { color: colors.secondarytext }]}>
              {displayShop} • {displayEmail}
            </Text>
            <View style={styles.verifiedTag}>
              <Ionicons name="checkmark-circle" size={13} color="#A8B5AD" />
              <Text style={styles.verifiedText}>{badgeTitle}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.secondarytext} />
        </TouchableOpacity>

        {/* Toggle Option */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text
                style={[styles.toggleTitle, { color: colors.primarytext }]}
              >
                {t("barberSettings.acceptingBookings")}
              </Text>
              <Text
                style={[styles.toggleSubtitle, { color: colors.secondarytext }]}
              >
                {t("barberSettings.acceptingBookingsSub")}
              </Text>
            </View>
            <Switch
              value={acceptingAppointments}
              onValueChange={(val) => {
                setAcceptingAppointments(val);
                showToast(val ? "Now accepting bookings" : "Bookings paused", "info");
              }}
              trackColor={{ false: "#383D34", true: "#A3B39C" }}
              thumbColor={acceptingAppointments ? "#1C1E1B" : "#A8B5AD"}
            />
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text
                style={[styles.toggleTitle, { color: colors.primarytext }]}
              >
                {t("barberSettings.bookingNotifications")}
              </Text>
              <Text
                style={[styles.toggleSubtitle, { color: colors.secondarytext }]}
              >
                {t("barberSettings.bookingNotificationsSub")}
              </Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(val) => {
                setPushNotifications(val);
                showToast(val ? "Notifications enabled" : "Notifications disabled", "info");
              }}
              trackColor={{ false: "#383D34", true: "#A3B39C" }}
              thumbColor={pushNotifications ? "#1C1E1B" : "#A8B5AD"}
            />
          </View>
        </View>

        {/* Client Calling Line Section */}
        <View
          style={[
            styles.sectionCard,
            styles.callingCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.callingHeaderRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View style={[styles.callIconBadge, { backgroundColor: "rgba(163, 179, 156, 0.15)" }]}>
                <Ionicons name="call" size={17} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.callingSectionTitle, { color: colors.primarytext }]}>
                  {t("barberSettings.callingLine")}
                </Text>
                <Text style={[styles.callingSectionSub, { color: colors.secondarytext }]}>
                  {t("barberSettings.callingLineSub")}
                </Text>
              </View>
            </View>

            <View style={[styles.privateBadge, { backgroundColor: "rgba(16, 185, 129, 0.12)" }]}>
              <Ionicons name="lock-closed" size={11} color="#10B981" />
              <Text style={styles.privateBadgeText}>Private</Text>
            </View>
          </View>

          <Text style={[styles.privacyExplanationText, { color: colors.secondarytext }]}>
            {t("barberSettings.callingLinePrivacy")}
          </Text>

          <View style={styles.phoneInputRow}>
            <View
              style={[
                styles.phoneInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons name="call-outline" size={17} color={colors.secondarytext} style={{ marginLeft: 12, marginRight: 8 }} />
              <TextInput
                style={[styles.phoneTextInput, { color: colors.primarytext }]}
                placeholder="+237 6XX XXX XXX"
                placeholderTextColor={colors.inputPlaceholder}
                value={callingPhone}
                onChangeText={setCallingPhone}
                keyboardType="phone-pad"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSavingPhone}
              onPress={handleSaveCallingPhone}
              style={[
                styles.savePhoneBtn,
                { backgroundColor: colors.primary },
              ]}
            >
              {isSavingPhone ? (
                <ActivityIndicator size="small" color="#1C1E1B" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={16} color="#1C1E1B" />
                  <Text style={styles.savePhoneBtnText}>{t("common.save")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {callingPhone.trim() ? (
            <View style={styles.statusActiveRow}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
              <Text style={[styles.statusActiveText, { color: "#10B981" }]}>
                {t("barberSettings.callingLineReady")}
              </Text>
            </View>
          ) : (
            <View style={styles.statusActiveRow}>
              <Ionicons name="alert-circle-outline" size={13} color="#F59E0B" />
              <Text style={[styles.statusActiveText, { color: "#F59E0B" }]}>
                No number set yet. Enter your phone number so clients can reach you.
              </Text>
            </View>
          )}
        </View>

        {/* Menu Items */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(barbers)/availability" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="time-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.scheduleWorkingHours")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/manage-services" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="cut-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.servicesMenu")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(barbers)/portfolio" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="images-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.portfolioShowcase")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/manage-staff" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="people-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.staffRoster")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/salon-management" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="business-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.salonManagement")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(barbers)/earnings" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="stats-chart-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("barberSettings.earningsAnalytics")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          {/* Report Issue & Admin Live Chat */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/support-chat" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="chatbubbles-outline" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuText, { color: colors.primarytext }]}>
                Report Issue & Admin Chat
              </Text>
              <Text style={{ fontSize: 11, color: colors.secondarytext, marginTop: 1 }}>
                Direct live chat with Trimly operations team
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#10B981" }} />
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.secondarytext}
              />
            </View>
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          {/* Help Center & Support */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/help-support" as any)}
            style={styles.menuItem}
          >
            <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("profile.helpCenter")}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          {/* WhatsApp Support */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              openWhatsApp(
                SUPPORT_WHATSAPP_NUMBER,
                "Hello Trimly Support, I am a barber partner and need assistance."
              )
            }
            style={styles.menuItem}
          >
            <Ionicons name="logo-whatsapp" size={20} color="#25D366" />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              WhatsApp Support (653811357)
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />



          {/* Dark Mode Toggle */}
          <View style={styles.menuItem}>
            <Ionicons
              name={isDark ? "moon-outline" : "sunny-outline"}
              size={20}
              color={colors.primary}
            />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("profile.darkMode")}
            </Text>
            <Switch
              value={isDark}
              onValueChange={() => {
                toggleTheme();
                showToast(isDark ? "Switched to Light Mode" : "Switched to Dark Mode", "info");
              }}
              trackColor={{
                false: "#D8E0D5",
                true: colors.primary,
              }}
              thumbColor={isDark ? "#1C1E1B" : "#FFFFFF"}
            />
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: colors.surfacevariant },
            ]}
          />

          {/* Language Switcher */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
            style={styles.menuItem}
          >
            <Ionicons name="globe-outline" size={20} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.primarytext }]}>
              {t("common.language")}
            </Text>
            <Text style={{ color: colors.secondarytext, fontSize: 13, marginRight: 6 }}>
              {language === "fr" ? "Français 🇫🇷" : "English 🇬🇧"}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setLogoutModalVisible(true)}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>{t("common.logout")}</Text>
        </TouchableOpacity>

        {/* Footer App Info */}
        <View style={{ alignItems: "center", marginTop: 14, marginBottom: 20 }}>
          <Text style={{ color: colors.secondarytext, fontSize: 13, fontWeight: "600" }}>
            {t("barberSettings.proBarberSuite")}
          </Text>
          <Text style={{ color: colors.secondarytext, fontSize: 11.5, marginTop: 3 }}>
            Version 1.0.0 (Build 42)
          </Text>
        </View>

        {/* Language Selection Modal */}
        <CustomModal
          visible={languageModalVisible}
          title={t("common.selectLanguage")}
          onClose={() => setLanguageModalVisible(false)}
        >
          <View style={{ gap: 12 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                await setLanguage("en");
                setLanguageModalVisible(false);
                showToast("Language changed to English", "info");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderRadius: 14,
                backgroundColor:
                  language === "en"
                    ? "rgba(163, 179, 156, 0.15)"
                    : colors.surface,
                borderWidth: 1.5,
                borderColor:
                  language === "en" ? colors.primary : colors.surfacevariant,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 24 }}>🇬🇧</Text>
                <View>
                  <Text
                    style={{
                      color: colors.primarytext,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    English
                  </Text>
                  <Text style={{ color: colors.secondarytext, fontSize: 12 }}>
                    English (US)
                  </Text>
                </View>
              </View>
              {language === "en" && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={async () => {
                await setLanguage("fr");
                setLanguageModalVisible(false);
                showToast("Langue changée en Français", "info");
              }}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                padding: 16,
                borderRadius: 14,
                backgroundColor:
                  language === "fr"
                    ? "rgba(163, 179, 156, 0.15)"
                    : colors.surface,
                borderWidth: 1.5,
                borderColor:
                  language === "fr" ? colors.primary : colors.surfacevariant,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Text style={{ fontSize: 24 }}>🇫🇷</Text>
                <View>
                  <Text
                    style={{
                      color: colors.primarytext,
                      fontSize: 16,
                      fontWeight: "700",
                    }}
                  >
                    Français
                  </Text>
                  <Text style={{ color: colors.secondarytext, fontSize: 12 }}>
                    Français (FR)
                  </Text>
                </View>
              </View>
              {language === "fr" && (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={colors.primary}
                />
              )}
            </TouchableOpacity>
          </View>
        </CustomModal>

        {/* Logout Custom Modal */}
        <CustomModal
          visible={logoutModalVisible}
          onClose={() => setLogoutModalVisible(false)}
          title={t("common.logoutConfirmTitle")}
          description={t("common.logoutConfirmMsg")}
          icon="log-out-outline"
          primaryText={t("common.logout")}
          primaryDanger={true}
          secondaryText="Cancel"
          onPrimary={handleLogOutConfirm}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerEditBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    gap: 14,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    gap: 14,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#4A5244",
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  shop: {
    fontSize: 12.5,
    marginBottom: 6,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  verifiedText: {
    fontSize: 11.5,
    color: "#A8B5AD",
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  toggleTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    width: "100%",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 12,
  },
  menuText: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "700",
  },
  callingCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  callingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  callIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  callingSectionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  callingSectionSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  privateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  privacyExplanationText: {
    fontSize: 12,
    lineHeight: 17,
  },
  phoneInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  phoneInputWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    paddingRight: 10,
  },
  savePhoneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: "center",
  },
  savePhoneBtnText: {
    color: "#1C1E1B",
    fontSize: 13,
    fontWeight: "700",
  },
  statusActiveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  statusActiveText: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
});
