import React, { useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { barberService } from "@/services/barberService";
import { authService } from "@/services/authService";
import { CustomModal } from "@/components/ui/CustomModal";

export default function SubBarberProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();

  const [staffStatus, setStaffStatus] = useState<
    "Active" | "On Break" | "Off Duty"
  >((user as any)?.staff_status || "Active");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletePhraseInput, setDeletePhraseInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [hasPendingLeave, setHasPendingLeave] = useState(false);

  React.useEffect(() => {
    async function checkLeave() {
      if (user?.parent_salon_id) {
        const res = await barberService.getMyLeaveStatus().catch(() => null);
        if (res?.has_pending_leave || (user as any)?.staff_status === "pending_leave") {
          setHasPendingLeave(true);
        }
      }
    }
    checkLeave();
  }, [user?.parent_salon_id, (user as any)?.staff_status]);

  const handleRequestLeaveConfirm = async () => {
    setIsSubmittingLeave(true);
    try {
      const res = await barberService.requestLeaveSalon();
      setLeaveModalVisible(false);
      setHasPendingLeave(true);
      showToast(
        res?.message || (language === "fr" ? "Demande de départ transmise au gérant du salon." : "Leave request sent to salon manager."),
        "info"
      );
    } catch (e: any) {
      showToast(
        e?.message || (language === "fr" ? "Échec de la demande." : "Failed to submit leave request."),
        "error"
      );
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleCancelLeaveConfirm = async () => {
    setIsSubmittingLeave(true);
    try {
      await barberService.cancelLeaveSalonRequest();
      setHasPendingLeave(false);
      showToast(
        language === "fr" ? "Demande de départ annulée. Vous restez actif." : "Leave request cancelled. You remain on the salon floor.",
        "success"
      );
    } catch {
      showToast(language === "fr" ? "Erreur" : "Error cancelling leave request", "error");
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const REQUIRED_DELETE_PHRASE = "Deleting Account and Approving Deletion";
  const isDeletePhraseValid = deletePhraseInput.trim() === REQUIRED_DELETE_PHRASE;

  const handleDeleteAccountConfirm = async () => {
    if (!isDeletePhraseValid || isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount(deletePhraseInput.trim());
      setDeleteAccountModalVisible(false);
      setDeletePhraseInput("");
      showToast(t("profile.accountDeletedToast") || "Account deleted successfully.", "success");
      logout();
      router.replace("/(auth)/login");
    } catch (error: any) {
      showToast(
        error?.message || t("profile.deleteAccountError") || "Failed to delete account.",
        "error"
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const handleStatusChange = async (
    newStatus: "Active" | "On Break" | "Off Duty"
  ) => {
    if (!user?.id || !user?.parent_salon_id) {
      setStaffStatus(newStatus);
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await barberService.updateStaffStatus(
        user.parent_salon_id,
        user.id,
        newStatus
      );
      setStaffStatus(newStatus);
      showToast(
        t("subBarber.dutyStatusUpdated", { status: newStatus }),
        "success"
      );
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleLogOutConfirm = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("subBarber.myProfile")}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/Pages/notifications")}
          style={[
            styles.headerIconBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={colors.primarytext}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* User Card */}
        <View
          style={[
            styles.userCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.avatarCircle,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.onBrand }]}>
              {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.primarytext }]}>
              {user?.name || t("subBarber.stylist")}
            </Text>
            <Text style={[styles.userEmail, { color: colors.secondarytext }]}>
              {user?.email || ""}
            </Text>
            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                  {(user as any)?.staff_title || t("subBarber.salonStylist")}
                </Text>
              </View>
              {user?.parent_salon_id && (
                <View
                  style={[
                    styles.salonBadge,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="business-outline"
                    size={11}
                    color={colors.secondarytext}
                  />
                  <Text
                    style={[
                      styles.salonBadgeText,
                      { color: colors.secondarytext },
                    ]}
                  >
                    {user?.parent_salon_name
                      ? user.parent_salon_name
                      : t("subBarber.salonTeamMember")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Duty Status Selector */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            {t("subBarber.dutyStatus")}
          </Text>
          <View style={styles.statusButtonGroup}>
            {(["Active", "On Break", "Off Duty"] as const).map((status) => {
              const isSelected = staffStatus === status;
              const isLime = status === "Active";
              const accentColor = isLime
                ? colors.primary
                : status === "On Break"
                ? "#F59E0B"
                : colors.secondarytext;
              const activeTextColor = isLime ? colors.onBrand : "#171918";
              const label =
                status === "Active"
                  ? t("common.active")
                  : status === "On Break"
                  ? t("common.onBreak")
                  : t("common.offDuty");

              return (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.82}
                  disabled={isUpdatingStatus}
                  onPress={() => handleStatusChange(status)}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: isSelected
                        ? accentColor
                        : colors.background,
                      borderColor: isSelected ? accentColor : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor: isSelected
                          ? activeTextColor
                          : accentColor,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      {
                        color: isSelected
                          ? activeTextColor
                          : colors.primarytext,
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Salon Affiliation & Salon ID Card */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.secondarytext, marginBottom: 0 }]}>{t("profile.salonAffiliation") || "SALON AFFILIATION & SALON ID"}</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/Pages/edit-profile")}
              style={styles.changeSalonBtn}
            >
              <Ionicons name="create-outline" size={13} color={colors.primary} />
              <Text style={[styles.changeSalonText, { color: colors.primary }]}>
                {user?.parent_salon_id ? "Change ID" : "Set Salon ID"}
              </Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.salonAffiliationBox,
              {
                backgroundColor: colors.background,
                borderColor: user?.parent_salon_id ? "rgba(199, 243, 107, 0.25)" : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.salonAffiliationIcon,
                { backgroundColor: "rgba(199, 243, 107, 0.12)" },
              ]}
            >
              <Ionicons name="business" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.salonIdBadgeRow}>
                <Text style={[styles.salonAffiliationName, { color: colors.primarytext }]} numberOfLines={1}>
                  {user?.parent_salon_name || (user?.parent_salon_id ? `Salon #${user.parent_salon_id}` : "Independent Stylist")}
                </Text>
                <View
                  style={[
                    styles.idNumberBadge,
                    {
                      backgroundColor: user?.parent_salon_id ? colors.primary : colors.surface,
                      borderColor: user?.parent_salon_id ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.idNumberText,
                      { color: user?.parent_salon_id ? colors.onBrand : colors.secondarytext },
                    ]}
                  >
                    {user?.parent_salon_id ? `Salon ID #${user.parent_salon_id}` : "Solo / Freelance"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.salonAffiliationDesc, { color: colors.secondarytext }]}>
                {user?.parent_salon_id
                  ? "Assigned to salon floor. Your bookings and chair revenue sync here."
                  : "Not linked to a salon floor. Enter a Salon ID in Edit Profile to sync."}
              </Text>
            </View>
          </View>

          {/* Leave Salon Request Action */}
          {user?.parent_salon_id ? (
            <View style={{ marginTop: 12 }}>
              {hasPendingLeave ? (
                <View
                  style={{
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: "rgba(245, 158, 11, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(245, 158, 11, 0.3)",
                    gap: 8,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="time-outline" size={17} color="#F59E0B" />
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#F59E0B" }}>
                      {language === "fr" ? "Demande de départ en attente d'approbation" : "Leave Request Pending Manager Approval"}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: colors.secondarytext, lineHeight: 16 }}>
                    {language === "fr"
                      ? "Votre gérant a été notifié. Une fois approuvé, votre compte sera dissocié et vous choisirez d'exercer en solo ou de rejoindre un autre salon."
                      : "Your salon manager must approve your departure. Once approved, your account will be detached and you can activate as solo or join another salon."}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isSubmittingLeave}
                    onPress={handleCancelLeaveConfirm}
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: colors.background,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primarytext }}>
                      {language === "fr" ? "Annuler la demande" : "Cancel Leave Request"}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setLeaveModalVisible(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 10,
                    borderRadius: 10,
                    backgroundColor: "rgba(239, 68, 68, 0.08)",
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.25)",
                    gap: 6,
                  }}
                >
                  <Ionicons name="exit-outline" size={16} color="#EF4444" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#EF4444" }}>
                    {language === "fr" ? "Demander à quitter le salon" : "Request to Leave Salon"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        {/* My Craft & Services */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            {language === "fr" ? "MON ACTIVITÉ & SERVICES" : "MY CRAFT & SERVICES"}
          </Text>

          {/* Manage My Services */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/Pages/manage-services")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="cut-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                  {language === "fr" ? "Mes Services & Tarifs" : "My Services & Prices"}
                </Text>
                <Text style={[styles.menuSublabel, { color: colors.secondarytext }]}>
                  {language === "fr"
                    ? "Gérer vos prestations personnelles, durées et prix"
                    : "Manage your personal menu, duration and prices"}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Manage My Portfolio */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/Pages/portfolio")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                  {language === "fr" ? "Mon Portfolio de Coupes" : "My Style Portfolio"}
                </Text>
                <Text style={[styles.menuSublabel, { color: colors.secondarytext }]}>
                  {language === "fr"
                    ? "Publier des photos de vos réalisations avec prix et durée"
                    : "Post pictures of your cuts with price and duration"}
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>
        </View>

        {/* App Settings */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            {t("profile.preferences")}
          </Text>

          {/* Edit Profile & Salon ID Link */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/Pages/edit-profile")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.primarytext }]}>{t("profile.editProfileAndSalonId") || "Edit Profile & Salon ID"}</Text>
                <Text style={[styles.menuSublabel, { color: colors.secondarytext }]}>{t("profile.manageAffiliationSub") || "Manage name, avatar, password & Salon affiliation"}</Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Dark Mode */}
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={isDark ? "moon-outline" : "sunny-outline"}
                  size={17}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                {t("profile.darkMode")}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isDark ? colors.onBrand : "#F5F5F2"}
            />
          </View>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Language Selection */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setLanguageModalVisible(true)}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="language-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                {t("profile.switchLanguage")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <View
            style={[styles.divider, { backgroundColor: colors.border }]}
          />

          {/* Help & Support */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => router.push("/Pages/help-support")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <View
                style={[
                  styles.menuIconSquare,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="help-circle-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                {t("profile.helpSupport")}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={19} color="#EF4444" />
          <Text style={styles.logoutText}>{t("common.logout")}</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => {
            setDeletePhraseInput("");
            setDeleteAccountModalVisible(true);
          }}
          style={[styles.logoutBtn, { borderColor: "#EF4444", backgroundColor: "rgba(239, 68, 68, 0.08)", marginTop: 10 }]}
        >
          <Ionicons name="trash-outline" size={19} color="#EF4444" />
          <Text style={[styles.logoutText, { color: "#EF4444" }]}>
            {t("profile.deleteSalonAccount") || "Delete Account & Profile"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Leave Salon Confirmation Modal */}
      <CustomModal
        visible={leaveModalVisible}
        onClose={() => setLeaveModalVisible(false)}
        title={language === "fr" ? "Demander à quitter le salon ?" : "Request to Leave Salon?"}
        description={
          language === "fr"
            ? "Le gérant du salon doit d'abord accepter votre demande avant que vous puissiez partir. Vous conserverez votre compte mais ne pourrez plus être réservé jusqu'à ce que vous choisissiez de travailler en solo ou de rejoindre un autre salon."
            : "Your salon manager must accept your request before you can leave. You will keep your account, but you will not be bookable by clients until you choose to work as a solo barber or join another salon."
        }
        icon="exit-outline"
        iconColor="#EF4444"
        primaryText={language === "fr" ? "Envoyer la demande" : "Send Leave Request"}
        secondaryText={language === "fr" ? "Annuler" : "Cancel"}
        primaryDanger={true}
        loading={isSubmittingLeave}
        onPrimary={handleRequestLeaveConfirm}
        onSecondary={() => setLeaveModalVisible(false)}
      />

      {/* Logout Confirmation Modal */}
      <CustomModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title={t("common.logoutConfirmTitle")}
        description={t("common.logoutConfirmMsg")}
        icon="log-out-outline"
        primaryText={t("common.logout")}
        primaryDanger={true}
        secondaryText={t("common.stayLoggedIn") || "Cancel"}
        onPrimary={handleLogOutConfirm}
        onSecondary={() => setLogoutModalVisible(false)}
      />

      {/* Language Selection Modal */}
      <CustomModal
        visible={languageModalVisible}
        title={t("profile.selectLanguage")}
        onClose={() => setLanguageModalVisible(false)}
      >
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              await setLanguage("en");
              setLanguageModalVisible(false);
              showToast("Language changed to English", "info");
            }}
            style={[
              styles.langOptionCard,
              {
                backgroundColor: language === "en" ? "rgba(199, 243, 107, 0.12)" : colors.card,
                borderColor: language === "en" ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.langMonogramBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.langMonogramText, { color: colors.primary }]}>EN</Text>
              </View>
              <View>
                <Text style={[styles.langOptionTitle, { color: colors.primarytext }]}>
                  English
                </Text>
                <Text style={[styles.langOptionSub, { color: colors.secondarytext }]}>
                  Default English (US)
                </Text>
              </View>
            </View>
            {language === "en" && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={async () => {
              await setLanguage("fr");
              setLanguageModalVisible(false);
              showToast("Langue changée en Français", "info");
            }}
            style={[
              styles.langOptionCard,
              {
                backgroundColor: language === "fr" ? "rgba(199, 243, 107, 0.12)" : colors.card,
                borderColor: language === "fr" ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={[styles.langMonogramBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <Text style={[styles.langMonogramText, { color: colors.primary }]}>FR</Text>
              </View>
              <View>
                <Text style={[styles.langOptionTitle, { color: colors.primarytext }]}>
                  Français
                </Text>
                <Text style={[styles.langOptionSub, { color: colors.secondarytext }]}>
                  Français (Cameroun / Standard)
                </Text>
              </View>
            </View>
            {language === "fr" && (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* Account Deletion Confirmation Modal */}
      <CustomModal
        visible={deleteAccountModalVisible}
        onClose={() => {
          if (!isDeletingAccount) {
            setDeleteAccountModalVisible(false);
            setDeletePhraseInput("");
          }
        }}
        title={t("profile.deleteSalonModalTitle") || "Delete Account & Profile"}
        description={t("profile.deleteSalonWarning")}
        icon="alert-circle-outline"
        iconBg="rgba(239, 68, 68, 0.16)"
        iconColor="#EF4444"
        primaryText={isDeletingAccount ? "Deleting..." : (t("profile.deleteSalonBtn") || "Delete Account Permanently")}
        primaryDanger={true}
        primaryDisabled={!isDeletePhraseValid || isDeletingAccount}
        loading={isDeletingAccount}
        secondaryText={t("common.cancel") || "Cancel"}
        onPrimary={handleDeleteAccountConfirm}
        onSecondary={() => {
          setDeleteAccountModalVisible(false);
          setDeletePhraseInput("");
        }}
      >
        <View style={styles.deletionModalBody}>
          <Text style={[styles.deletionInstruction, { color: colors.secondarytext }]}>
            {t("profile.deleteSalonInstruction")}
          </Text>
          <View
            style={[
              styles.phraseBadge,
              {
                backgroundColor: colors.surface || "#252926",
                borderColor: colors.border || "#383D38",
              },
            ]}
          >
            <Text
              style={[
                styles.phraseBadgeText,
                { color: colors.primary || "#C7F36B" },
              ]}
              selectable
            >
              Deleting Account and Approving Deletion
            </Text>
          </View>
          <TextInput
            style={[
              styles.deletionInput,
              {
                backgroundColor: colors.card || "#1F2320",
                borderColor: isDeletePhraseValid
                  ? "#EF4444"
                  : colors.border || "#383D38",
                color: colors.primarytext,
              },
            ]}
            placeholder={t("profile.deleteSalonPlaceholder") || "Type the confirmation phrase..."}
            placeholderTextColor={colors.secondarytext || "#687069"}
            value={deletePhraseInput}
            onChangeText={setDeletePhraseInput}
            autoCapitalize="sentences"
            autoCorrect={false}
            editable={!isDeletingAccount}
          />
        </View>
      </CustomModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  deletionModalBody: {
    width: "100%",
    marginTop: 12,
    marginBottom: 8,
  },
  deletionInstruction: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
    textAlign: "center",
  },
  phraseBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  phraseBadgeText: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  deletionInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    padding: 18,
    paddingBottom: 104,
    gap: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 19,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 17.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  salonBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  salonBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
    letterSpacing: 0.9,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  statusButtonGroup: {
    flexDirection: "row",
    gap: 8,
  },
  statusBtn: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuIconSquare: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 14.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  menuSublabel: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  changeSalonBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "rgba(199, 243, 107, 0.1)",
  },
  changeSalonText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  salonAffiliationBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  salonAffiliationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  salonIdBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    flexWrap: "wrap",
  },
  salonAffiliationName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    flex: 1,
  },
  idNumberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  idNumberText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  salonAffiliationDesc: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 3,
    lineHeight: 15,
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.35)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    gap: 8,
    marginTop: 4,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  langOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  langMonogramBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langMonogramText: {
    fontSize: 13,
    fontWeight: "800",
  },
  langOptionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  langOptionSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
});
