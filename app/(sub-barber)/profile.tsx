import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { AppUpdateModal } from "@/components/ui/AppUpdateModal";
import { UPDATE_CONFIG } from "@/constants/updateConfig";
import { authService } from "@/services/authService";
import { CustomModal } from "@/components/ui/CustomModal";
import ChairOccupantsEditor, {
  ChairSlotStatus,
  verifyAllChairOccupants,
} from "@/components/barber/ChairOccupantsEditor";
import { setAuthToken, setActiveMode } from "@/services/api";

export default function SubBarberProfileScreen() {
  const router = useRouter();
  const { user, logout, updateUser, refreshUser } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const { showToast } = useToast();

  const [staffStatus, setStaffStatus] = useState<
    "Active" | "On Break" | "Off Duty"
  >((user as any)?.staff_status || "Active");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [updateModalVisible, setUpdateModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletePhraseInput, setDeletePhraseInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [leaveModalVisible, setLeaveModalVisible] = useState(false);
  const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);
  const [hasPendingLeave, setHasPendingLeave] = useState(false);

  // Switch to Salon state
  const [switchSalonModalVisible, setSwitchSalonModalVisible] = useState(false);
  const [newSalonRole, setNewSalonRole] = useState<"Salon Manager" | "Main Barber & Studio Owner">("Salon Manager");
  const [newSalonNameInput, setNewSalonNameInput] = useState(user?.name ? `${user.name} Salon` : "");
  const [newSalonChairsInput, setNewSalonChairsInput] = useState("2");
  const [newSalonCapacity, setNewSalonCapacity] = useState(2);
  const [newSalonChairNames, setNewSalonChairNames] = useState<string[]>([
    user?.name || "",
    "",
  ]);
  const [newSalonChairStatuses, setNewSalonChairStatuses] = useState<
    Record<number, ChairSlotStatus>
  >({});
  const [newSalonCityInput, setNewSalonCityInput] = useState(user?.city || "");
  const [newSalonPhoneInput, setNewSalonPhoneInput] = useState(user?.phone || "");
  const [newSalonAboutInput, setNewSalonAboutInput] = useState(user?.about_us || "");
  const [isSwitchingToSalon, setIsSwitchingToSalon] = useState(false);

  const openSwitchSalonModal = () => {
    setNewSalonRole("Salon Manager");
    setNewSalonNameInput(user?.name ? `${user.name} Salon` : "");
    setNewSalonChairsInput("5");
    setNewSalonCapacity(5);
    setNewSalonCityInput(user?.city || "");
    setNewSalonPhoneInput(user?.phone || "");
    setNewSalonAboutInput(user?.about_us || "");
    setSwitchSalonModalVisible(true);
  };

  const handleDirectLeaveSalonConfirm = async () => {
    setIsSubmittingLeave(true);
    try {
      await barberService.unlinkFromSalon();
      if (updateUser) {
        updateUser({
          parent_salon_id: null,
          parent_salon_name: null,
          staff_status: "Active",
          is_sub_barber: false,
          staff_title: user?.role === "hairdresser" ? "Hairdresser" : "Solo Barber",
        });
      }
      setLeaveModalVisible(false);
      setHasPendingLeave(false);
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      showToast(
        language === "fr"
          ? "Vous avez quitté le salon avec succès. Vous travaillez désormais en tant que professionnel solo indépendant."
          : "You have left the salon successfully. You are now operating as an independent solo provider.",
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr" ? "Erreur lors du départ du salon." : "Failed to leave salon."),
        "error"
      );
    } finally {
      setIsSubmittingLeave(false);
    }
  };

  const handleSwitchToSalonConfirm = async () => {
    setIsSwitchingToSalon(true);
    try {
      const parsedChairs = parseInt(newSalonChairsInput, 10);
      const targetCapacity = (!isNaN(parsedChairs) && parsedChairs >= 1)
        ? Math.min(50, parsedChairs)
        : Math.max(1, Math.min(50, newSalonCapacity || 2));

      const verification = await verifyAllChairOccupants(
        targetCapacity,
        newSalonChairNames,
        user?.id,
        user?.name
      );
      setNewSalonChairStatuses((prev) => ({ ...prev, ...verification.statuses }));
      if (!verification.valid) {
        showToast(verification.errorMessage || "User not found", "error");
        setIsSwitchingToSalon(false);
        return;
      }

      const targetName =
        newSalonNameInput.trim() ||
        user?.name ||
        "Trimly Partner Salon";
      const res = await barberService.switchToSalon({
        salon_name: targetName,
        capacity: targetCapacity,
        staff_title: newSalonRole,
        city: newSalonCityInput.trim() || user?.city || undefined,
        phone: newSalonPhoneInput.trim() || user?.phone || undefined,
        about_us: newSalonAboutInput.trim() || user?.about_us || undefined,
        chair_barber_names: verification.verifiedNames,
      });

      if (res?.access_token) {
        await setAuthToken(res.access_token);
      }

      if (updateUser) {
        updateUser(res?.user || {
          role: "salon",
          name: targetName,
          is_manager: true,
          has_admin_rights: true,
          is_lead: true,
          parent_salon_id: null,
          parent_salon_name: null,
          is_sub_barber: false,
          capacity: targetCapacity,
          staff_title: newSalonRole,
        });
      }

      await setActiveMode("barber");
      setSwitchSalonModalVisible(false);

      if (refreshUser) {
        await refreshUser().catch(() => null);
      }

      showToast(
        res?.message ||
          (language === "fr"
            ? `Compte converti en Salon (${newSalonRole}) avec succès !`
            : `Account successfully switched to Salon as ${newSalonRole}!`),
        "success"
      );

      // Navigate directly to the main dashboard of the partner app for barbers
      router.replace("/(barbers)");
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr"
            ? "Échec du passage en compte Salon."
            : "Failed to switch to salon account."),
        "error"
      );
    } finally {
      setIsSwitchingToSalon(false);
    }
  };

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
        {/* Left Salon Status Banner (Displayed when provider is not under a salon) */}
        {!user?.parent_salon_id && (
          <View
            style={[
              styles.leftSalonCard,
              {
                backgroundColor: isDark ? "rgba(34, 197, 94, 0.08)" : "rgba(34, 197, 94, 0.06)",
                borderColor: isDark ? "rgba(34, 197, 94, 0.28)" : "rgba(34, 197, 94, 0.22)",
              },
            ]}
          >
            <View style={styles.leftSalonHeader}>
              <View
                style={[
                  styles.leftSalonIconCircle,
                  { backgroundColor: isDark ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.15)" },
                ]}
              >
                <Ionicons name="checkmark-done" size={19} color="#22C55E" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.leftSalonTitle, { color: colors.primarytext }]}>
                  {language === "fr"
                    ? "Salon quitté • Professionnel Solo Indépendant"
                    : "Left Salon • Operating as Solo Provider"}
                </Text>
                <Text style={[styles.leftSalonDesc, { color: colors.secondarytext }]}>
                  {language === "fr"
                    ? "Vous avez quitté le salon et exercez désormais en toute indépendance. Aucune affiliation de salon n'apparaît sur votre profil."
                    : "You have left the salon and are currently operating independently. No salon affiliation appears on your profile."}
                </Text>
              </View>
            </View>
          </View>
        )}

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
                  {user?.parent_salon_id
                    ? ((user as any)?.staff_title || t("subBarber.salonStylist"))
                    : (user?.role === "hairdresser" ? (language === "fr" ? "Coiffeuse Solo" : "Solo Hairdresser") : (language === "fr" ? "Barbier Solo" : "Solo Barber"))}
                </Text>
              </View>
              {Boolean(user?.parent_salon_id) && (
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

        {/* Salon Affiliation & Salon ID Card (Only shown when under a salon) */}
        {Boolean(user?.parent_salon_id) && (
          <View
            style={[
              styles.sectionCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.secondarytext, marginBottom: 0 }]}>
                {language === "fr" ? "AFFILIATION AU SALON" : "SALON AFFILIATION"}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/Pages/edit-profile")}
                style={styles.changeSalonBtn}
              >
                <Ionicons name="create-outline" size={13} color={colors.primary} />
                <Text style={[styles.changeSalonText, { color: colors.primary }]}>
                  {language === "fr" ? "Modifier l'ID" : "Change ID"}
                </Text>
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.salonAffiliationBox,
                {
                  backgroundColor: colors.background,
                  borderColor: "rgba(199, 243, 107, 0.25)",
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
                    {user?.parent_salon_name || `Salon #${user?.parent_salon_id}`}
                  </Text>
                  <View
                    style={[
                      styles.idNumberBadge,
                      {
                        backgroundColor: colors.primary,
                        borderColor: colors.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.idNumberText,
                        { color: colors.onBrand },
                      ]}
                    >
                      {`Salon #${user?.parent_salon_id}`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.salonAffiliationDesc, { color: colors.secondarytext }]}>
                  Assigned to salon floor. Your bookings and chair revenue sync here.
                </Text>
              </View>
            </View>

            {/* Leave Salon Request Action */}
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
                    {language === "fr" ? "Quitter le salon" : "Leave Salon"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Switch to Salon Account Card */}
        <View
          style={[
            styles.sectionCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.switchSalonCardHeader}>
            <View
              style={[
                styles.switchSalonIconBox,
                { backgroundColor: colors.brandSoft, borderColor: colors.brandBorder },
              ]}
            >
              <Ionicons name="business" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                <Text style={[styles.switchSalonTitle, { color: colors.primarytext }]}>
                  {language === "fr" ? "Passer à un compte Salon" : "Switch to Salon Account"}
                </Text>
                <View style={{ backgroundColor: colors.brandSoft, borderColor: colors.brandBorder, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: colors.primary }}>
                    {language === "fr" ? "GÉRER DU PERSONNEL" : "INVITE & MANAGE STAFF"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.switchSalonSubtitle, { color: colors.secondarytext, marginTop: 4 }]}>
                {language === "fr"
                  ? "Développez votre activité, configurez vos postes de coiffure et recrutez des barbiers ou coiffeurs sous votre salon."
                  : "Expand your business, configure your chairs, and recruit staff barbers or stylists to work under your establishment."}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={openSwitchSalonModal}
            style={[styles.switchSalonBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color={colors.onBrand} />
            <Text style={[styles.switchSalonBtnText, { color: colors.onBrand }]}>
              {language === "fr" ? "Configurer mon Salon" : "Set Up Salon Account"}
            </Text>
          </TouchableOpacity>
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
                <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                  {user?.parent_salon_id
                    ? (language === "fr" ? "Modifier le profil & Salon" : "Edit Profile & Salon")
                    : (language === "fr" ? "Modifier le profil" : "Edit Profile")}
                </Text>
                <Text style={[styles.menuSublabel, { color: colors.secondarytext }]}>
                  {user?.parent_salon_id
                    ? (t("profile.manageAffiliationSub") || "Manage name, avatar, password & Salon affiliation")
                    : (language === "fr" ? "Gérer votre nom, avatar, mot de passe et informations" : "Manage your name, avatar, password and details")}
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

          {/* App Update Button */}
          <TouchableOpacity
            activeOpacity={0.75}
            onPress={() => setUpdateModalVisible(true)}
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
                  name="cloud-download-outline"
                  size={17}
                  color={colors.primary}
                />
              </View>
              <View>
                <Text style={[styles.menuLabel, { color: colors.primarytext }]}>
                  {language === "fr" ? "Mise à jour de l'application" : "Check for App Update"}
                </Text>
                <Text style={[styles.menuSublabel, { color: colors.secondarytext, marginTop: 1 }]}>
                  {language === "fr"
                    ? `Version ${UPDATE_CONFIG.CURRENT_VERSION} • Rechercher les mises à jour`
                    : `Version ${UPDATE_CONFIG.CURRENT_VERSION} • Tap to check for updates`}
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
        onClose={() => !isSubmittingLeave && setLeaveModalVisible(false)}
        title={language === "fr" ? "Quitter le salon ?" : "Leave Salon?"}
        description={
          language === "fr"
            ? "En quittant le salon, votre affiliation sera immédiatement supprimée. Vous opérerez désormais en tant que professionnel solo indépendant et rien concernant le salon n'apparaîtra plus sur votre page."
            : "Leaving the salon will immediately detach your account. You will operate as an independent solo provider, and nothing concerning the salon will appear on your page."
        }
        icon="exit-outline"
        iconColor="#EF4444"
        primaryText={language === "fr" ? "Quitter le salon maintenant" : "Leave Salon Now (Operate Solo)"}
        secondaryText={language === "fr" ? "Annuler" : "Cancel"}
        primaryDanger={true}
        loading={isSubmittingLeave}
        onPrimary={handleDirectLeaveSalonConfirm}
        onSecondary={() => setLeaveModalVisible(false)}
      />

      {/* Switch to Salon Modal */}
      <CustomModal
        visible={switchSalonModalVisible}
        onClose={() => !isSwitchingToSalon && setSwitchSalonModalVisible(false)}
        title={language === "fr" ? "Passer en compte Salon" : "Switch to Salon Account"}
      >
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
          <View style={{ gap: 14, paddingVertical: 4 }}>
            {/* Feature highlights callout */}
            <View
              style={{
                backgroundColor: "rgba(199, 243, 107, 0.1)",
                borderColor: "rgba(199, 243, 107, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.primarytext }}>
                  {language === "fr" ? "Avantages du Compte Salon" : "Salon Account Features"}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.primarytext }}>
                    {language === "fr" ? "Inviter et gérer plusieurs barbiers & coiffeurs" : "Invite, hire and manage team barbers & hairdressers"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.primarytext }}>
                    {language === "fr" ? "Identifiant unique de salon pour l'onboarding du staff" : "Unique Salon ID for instant staff onboarding"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.primary} />
                  <Text style={{ fontSize: 12, color: colors.primarytext }}>
                    {language === "fr" ? "Gestion des fauteuils actifs et suivi des revenus" : "Active chairs capacity & team revenue breakdown"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Role Selection: Manager vs Main Barber */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                {language === "fr" ? "Choisissez votre rôle dans le salon :" : "Choose your operational salon role:"}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* Salon Manager */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNewSalonRole("Salon Manager")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: newSalonRole === "Salon Manager" ? "rgba(199, 243, 107, 0.12)" : colors.surface,
                    borderColor: newSalonRole === "Salon Manager" ? colors.primary : colors.border,
                    borderWidth: 1.5,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Ionicons name="briefcase-outline" size={18} color={newSalonRole === "Salon Manager" ? colors.primary : colors.secondarytext} />
                    {newSalonRole === "Salon Manager" && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primarytext }}>
                    {language === "fr" ? "Gérant du Salon" : "Salon Manager"}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.secondarytext, lineHeight: 14 }}>
                    {language === "fr" ? "Gestion complète des opérations et de l'équipe" : "Full operations, staff and booking oversight"}
                  </Text>
                </TouchableOpacity>

                {/* Main Barber */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNewSalonRole("Main Barber & Studio Owner")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: newSalonRole === "Main Barber & Studio Owner" ? "rgba(199, 243, 107, 0.12)" : colors.surface,
                    borderColor: newSalonRole === "Main Barber & Studio Owner" ? colors.primary : colors.border,
                    borderWidth: 1.5,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Ionicons name="cut-outline" size={18} color={newSalonRole === "Main Barber & Studio Owner" ? colors.primary : colors.secondarytext} />
                    {newSalonRole === "Main Barber & Studio Owner" && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primarytext }}>
                    {language === "fr" ? "Barbier Principal" : "Main Barber"}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.secondarytext, lineHeight: 14 }}>
                    {language === "fr" ? "Barbier en chef & gérant de l'établissement" : "Lead barber cutting hair & managing shop"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Chair Capacity Inputted by User */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                {language === "fr" ? "Nombre de fauteuils / postes de coiffure :" : "Number of Chairs / Workstations:"}
              </Text>
              
              {/* Stepper + Input */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const current = parseInt(newSalonChairsInput, 10) || 5;
                    const next = Math.max(1, current - 1);
                    setNewSalonChairsInput(String(next));
                    setNewSalonCapacity(next);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.primarytext} />
                </TouchableOpacity>

                <View
                  style={{
                    flex: 1,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 12,
                  }}
                >
                  <Ionicons name="cube-outline" size={17} color={colors.primary} />
                  <TextInput
                    style={{
                      flex: 1,
                      color: colors.primarytext,
                      textAlign: "center",
                      fontWeight: "800",
                      fontSize: 15,
                      paddingVertical: 0,
                    }}
                    value={newSalonChairsInput}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, "");
                      setNewSalonChairsInput(cleaned);
                      const n = parseInt(cleaned, 10);
                      if (!isNaN(n)) setNewSalonCapacity(n);
                    }}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.secondarytext}
                    maxLength={3}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                    {language === "fr" ? "fauteuils" : "chairs"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const current = parseInt(newSalonChairsInput, 10) || 5;
                    const next = Math.min(50, current + 1);
                    setNewSalonChairsInput(String(next));
                    setNewSalonCapacity(next);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.primarytext} />
                </TouchableOpacity>
              </View>

              {/* Preset Chips */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {[2, 3, 5, 8, 10].map((cap) => (
                  <TouchableOpacity
                    key={cap}
                    activeOpacity={0.8}
                    onPress={() => {
                      setNewSalonChairsInput(String(cap));
                      setNewSalonCapacity(cap);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: (parseInt(newSalonChairsInput, 10) === cap) ? colors.primary : colors.surface,
                      borderColor: (parseInt(newSalonChairsInput, 10) === cap) ? colors.primary : colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: (parseInt(newSalonChairsInput, 10) === cap) ? colors.onBrand : colors.primarytext,
                      }}
                    >
                      {cap}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Chair Occupants Container */}
              <ChairOccupantsEditor
                chairCount={Math.max(1, Math.min(50, parseInt(newSalonChairsInput, 10) || newSalonCapacity || 1))}
                chairNames={newSalonChairNames}
                onChangeChairNames={setNewSalonChairNames}
                chairStatuses={newSalonChairStatuses}
                onChangeChairStatuses={setNewSalonChairStatuses}
                salonId={user?.id}
                ownerName={user?.name}
              />
            </View>

            {/* Salon Name Input */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                {language === "fr" ? "Nom officiel du salon :" : "Official Salon Name:"}
              </Text>
              <View
                style={{
                  height: 46,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 12,
                  gap: 8,
                }}
              >
                <Ionicons name="business-outline" size={17} color={colors.primary} />
                <TextInput
                  style={{ flex: 1, color: colors.primarytext, fontSize: 14 }}
                  value={newSalonNameInput}
                  onChangeText={setNewSalonNameInput}
                  placeholder={language === "fr" ? "ex: Prestige Barbershop" : "e.g. Prestige Barbershop"}
                  placeholderTextColor={colors.secondarytext}
                />
              </View>
            </View>

            {/* Salon City & Phone */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                  {language === "fr" ? "Ville / Région :" : "City / Region:"}
                </Text>
                <View
                  style={{
                    height: 46,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    gap: 6,
                  }}
                >
                  <Ionicons name="location-outline" size={16} color={colors.primary} />
                  <TextInput
                    style={{ flex: 1, color: colors.primarytext, fontSize: 13 }}
                    value={newSalonCityInput}
                    onChangeText={setNewSalonCityInput}
                    placeholder="Yaoundé"
                    placeholderTextColor={colors.secondarytext}
                  />
                </View>
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                  {language === "fr" ? "Téléphone :" : "Phone Contact:"}
                </Text>
                <View
                  style={{
                    height: 46,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 10,
                    gap: 6,
                  }}
                >
                  <Ionicons name="call-outline" size={16} color={colors.primary} />
                  <TextInput
                    style={{ flex: 1, color: colors.primarytext, fontSize: 13 }}
                    value={newSalonPhoneInput}
                    onChangeText={setNewSalonPhoneInput}
                    placeholder="+237 6..."
                    placeholderTextColor={colors.secondarytext}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* About Us / Description */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondarytext }}>
                {language === "fr" ? "À propos du salon (Bio) :" : "Salon Bio / About Us:"}
              </Text>
              <View
                style={{
                  height: 68,
                  borderRadius: 10,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderWidth: 1,
                  flexDirection: "row",
                  paddingHorizontal: 10,
                  paddingTop: 8,
                  gap: 8,
                }}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                <TextInput
                  style={{ flex: 1, color: colors.primarytext, fontSize: 13, textAlignVertical: "top", height: "100%" }}
                  value={newSalonAboutInput}
                  onChangeText={setNewSalonAboutInput}
                  placeholder={language === "fr" ? "Description de votre salon..." : "Describe your salon vibe, team and specialties..."}
                  placeholderTextColor={colors.secondarytext}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSwitchingToSalon}
                onPress={() => setSwitchSalonModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.secondarytext }}>
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSwitchingToSalon}
                onPress={handleSwitchToSalonConfirm}
                style={{
                  flex: 1.6,
                  flexDirection: "row",
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isSwitchingToSalon ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.onBrand }}>
                      {language === "fr" ? "Confirmer & Passer au Salon" : "Confirm & Switch to Salon"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </CustomModal>

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
                <Text style={[styles.langOptionTitle, { color: colors.primarytext }]}>{language === "fr" ? "Anglais" : "English"}</Text>
                <Text style={[styles.langOptionSub, { color: colors.secondarytext }]}>{language === "fr" ? "Anglais par défaut (US)" : "Default English (US)"}</Text>
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

      {/* App Update Modal */}
      <AppUpdateModal
        visible={updateModalVisible}
        onClose={() => setUpdateModalVisible(false)}
      />
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
  leftSalonCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  leftSalonHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  leftSalonIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  leftSalonTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  leftSalonDesc: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  switchSalonCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  switchSalonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchSalonTitle: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  switchSalonSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
  },
  switchSalonBtn: {
    height: 46,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  switchSalonBtnText: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "800",
  },
});
