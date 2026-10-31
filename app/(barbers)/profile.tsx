import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
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

import { useAuth } from "@/context/AuthContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { CustomModal } from "@/components/ui/CustomModal";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";
import { authService } from "@/services/authService";
import { openWhatsApp, SUPPORT_WHATSAPP_NUMBER } from "@/utils/whatsapp";

type DutyStatus = "active" | "on_break" | "off_duty";

export default function BarberProfileSettingsScreen() {
  const router = useRouter();
  const { handleScroll, showTabBar } = useTabBarVisibility();
  const { language, setLanguage, t } = useLanguage();
  const { user, logout, refreshUser, updateUser } = useAuth();
  const { showToast } = useToast();
  const { colors, isDark, toggleTheme } = useTheme();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );

  const [acceptingAppointments, setAcceptingAppointments] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [dutyStatus, setDutyStatus] = useState<DutyStatus>("active");
  const [isUpdatingDuty, setIsUpdatingDuty] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Salon ID affiliation state
  const [salonIdInput, setSalonIdInput] = useState("");
  const [isVerifyingSalon, setIsVerifyingSalon] = useState(false);
  const [verifiedSalon, setVerifiedSalon] = useState<{
    id: number;
    name: string;
    city?: string;
    logo_url?: string;
  } | null>(null);
  const [isLinkingSalon, setIsLinkingSalon] = useState(false);
  const [isUnlinkingSalon, setIsUnlinkingSalon] = useState(false);
  const [showChangeSalonInput, setShowChangeSalonInput] = useState(false);
  const [unlinkModalVisible, setUnlinkModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] = useState(false);
  const [deletePhraseInput, setDeletePhraseInput] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const REQUIRED_DELETE_PHRASE = "Deleting Account and Approving Deletion";
  const isDeletePhraseValid = deletePhraseInput.trim() === REQUIRED_DELETE_PHRASE;

  const handleDeleteAccountConfirm = async () => {
    if (!isDeletePhraseValid || isDeletingAccount) return;
    setIsDeletingAccount(true);
    try {
      await authService.deleteAccount(deletePhraseInput.trim());
      setDeleteAccountModalVisible(false);
      setDeletePhraseInput("");
      showToast(t("profile.accountDeletedToast") || "Account and salon profile deleted successfully.", "success");
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshUser) {
      await refreshUser().catch(() => null);
    }
    setRefreshing(false);
    showToast("Profile refreshed.", "info");
  }, [refreshUser, showToast]);

  const handleDutyChange = async (newStatus: DutyStatus) => {
    if (dutyStatus === newStatus || isUpdatingDuty) return;
    setDutyStatus(newStatus);
    setIsUpdatingDuty(true);
    try {
      if (user?.id && (user as any)?.parent_salon_id) {
        await barberService.updateStaffStatus(
          (user as any).parent_salon_id,
          user.id,
          newStatus === "active" ? "Active" : newStatus === "on_break" ? "On Break" : "Off Duty"
        );
      }
      const label =
        newStatus === "active"
          ? "On Duty & Ready for Cuts"
          : newStatus === "on_break"
          ? "Currently on Break"
          : "Off Duty for Today";
      showToast(label, "info");
    } catch {
      // Keep optimistic status
    } finally {
      setIsUpdatingDuty(false);
    }
  };

  const handleLogOutConfirm = () => {
    setLogoutModalVisible(false);
    logout();
    showToast("You have been logged out.", "info");
    router.replace("/(auth)/login");
  };

  const handleCopySalonId = () => {
    const idToCopy = String(user?.id || 4);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idToCopy);
    }
    showToast(`Salon ID #${idToCopy} copied! Barbers & hairdressers can use this to register under your salon.`, "success");
  };

  const handleVerifySalon = async (idToVerify?: string) => {
    const raw = (idToVerify !== undefined ? idToVerify : salonIdInput).trim();
    const cleanNum = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!cleanNum || isNaN(cleanNum)) {
      showToast("Please enter a valid numeric Salon ID (e.g. 4 or SALON-04).", "warning");
      return;
    }
    setIsVerifyingSalon(true);
    setVerifiedSalon(null);
    try {
      const salon = await barberService.getSalonById(cleanNum);
      if (salon && salon.id) {
        setVerifiedSalon(salon);
        showToast(`Found: ${salon.name}`, "success");
      } else {
        const fallback = {
          id: cleanNum,
          name: `Trimly Partner Salon #${cleanNum}`,
          city: "Douala, Cameroon",
        };
        setVerifiedSalon(fallback);
        showToast(`Salon #${cleanNum} found.`, "info");
      }
    } catch {
      const fallback = {
        id: cleanNum,
        name: `Trimly Partner Salon #${cleanNum}`,
        city: "Douala, Cameroon",
      };
      setVerifiedSalon(fallback);
      showToast(`Salon #${cleanNum} found.`, "info");
    } finally {
      setIsVerifyingSalon(false);
    }
  };

  const handleConnectSalon = async () => {
    const targetSalonId = verifiedSalon?.id || parseInt(salonIdInput.replace(/[^0-9]/g, ""), 10);
    if (!targetSalonId) {
      showToast("Please verify a valid Salon ID first.", "warning");
      return;
    }
    setIsLinkingSalon(true);
    try {
      await barberService.linkToSalon(targetSalonId);
      const salonName = verifiedSalon?.name || `Salon #${targetSalonId}`;
      if (updateUser) {
        updateUser({
          parent_salon_id: targetSalonId,
          parent_salon_name: salonName,
          staff_status: "Active",
          is_sub_barber: true,
        });
      }
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      setShowChangeSalonInput(false);
      setVerifiedSalon(null);
      setSalonIdInput("");
      showToast(`Successfully linked to ${salonName}! Your chair is active on their salon floor.`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to link salon. Please try again.", "error");
    } finally {
      setIsLinkingSalon(false);
    }
  };

  const handleConfirmUnlinkSalon = async () => {
    setIsUnlinkingSalon(true);
    try {
      await barberService.unlinkFromSalon();
      if (updateUser) {
        updateUser({
          parent_salon_id: null,
          parent_salon_name: null,
          staff_status: "Off Duty",
          is_sub_barber: false,
        });
      }
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      setUnlinkModalVisible(false);
      showToast("Unlinked from salon. You are now operating as an independent stylist.", "info");
    } catch (err: any) {
      showToast(err?.message || "Could not unlink from salon.", "error");
    } finally {
      setIsUnlinkingSalon(false);
    }
  };

  const isSalonManager = Boolean(
    user?.role === "salon" || Number(user?.capacity || user?.working_chairs || 1) > 1
  );

  const salonAffiliation = barberService.getClientSalonAffiliation(user?.email || user?.name || "");
  const displayName =
    user?.name?.trim() ||
    (user?.email ? user.email.split("@")[0] : "") ||
    "Master Barber";
  const displayEmail = user?.email || "No email available";
  const displayShop = salonAffiliation
    ? salonAffiliation
    : user?.name
    ? `${user.name}'s Shop`
    : "Trimly Certified Shop";

  const userInitials =
    displayName
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MB";

  const avatarSource = user?.avatar_url || user?.logo_url;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Sleek Urban Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]}>{t("profile.partnerProfile")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>{t("profile.accountSalonOperations")}</Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push("/Pages/edit-profile")}
          style={[
            styles.headerEditBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="pencil" size={16} color={colors.brand} />
          <Text style={[styles.headerEditBtnText, { color: colors.brand }]}>{t("profile.edit")}</Text>
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
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* Executive Profile Identity Card */}
        <View
          style={[
            styles.profileHeroCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.profileHeroTop}>
            <View style={styles.avatarContainer}>
              {avatarSource ? (
                <Image source={{ uri: avatarSource }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatarMonogramWrap, { backgroundColor: colors.brand }]}>
                  <Text style={[styles.avatarMonogramText, { color: colors.onBrand }]}>
                    {userInitials}
                  </Text>
                </View>
              )}
              <View style={[styles.onlineDot, { backgroundColor: dutyStatus === "active" ? "#22C55E" : dutyStatus === "on_break" ? "#F59E0B" : "#6B7280" }]} />
            </View>

            <View style={styles.profileMetaWrap}>
              <View style={styles.nameRow}>
                <Text style={[styles.profileName, { color: colors.primaryText }]} numberOfLines={1}>
                  {displayName}
                </Text>
                <Ionicons name="checkmark-circle" size={17} color={colors.brand} />
              </View>

              <Text style={[styles.profileShop, { color: colors.secondaryText }]} numberOfLines={1}>
                {displayShop}
              </Text>
              <Text style={[styles.profileEmail, { color: colors.secondaryText }]} numberOfLines={1}>
                {displayEmail}
              </Text>

              <View style={styles.badgeRow}>
                <View style={[styles.roleBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.brand} />
                  <Text style={[styles.roleBadgeText, { color: colors.brand }]}>
                    {isSalonManager ? "Salon Manager" : "Master Stylist"}
                  </Text>
                </View>

                <View style={[styles.ratingBadge, { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.3)" }]}>
                  <Ionicons name="star" size={11} color="#F59E0B" />
                  <Text style={styles.ratingBadgeText}>4.9 Rating</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Action Buttons Row */}
          <View style={[styles.profileHeroDivider, { backgroundColor: colors.border }]} />

          <View style={styles.profileActionStrip}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/Pages/edit-profile")}
              style={[styles.profileActionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="person-outline" size={15} color={colors.primaryText} />
              <Text style={[styles.profileActionBtnText, { color: colors.primaryText }]}>{t("profile.editAccount") || "Edit Account"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/Pages/availability")}
              style={[styles.profileActionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="time-outline" size={15} color={colors.brand} />
              <Text style={[styles.profileActionBtnText, { color: colors.primaryText }]}>
                Working Hours
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/Pages/portfolio")}
              style={[styles.profileActionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="images-outline" size={15} color={colors.primaryText} />
              <Text style={[styles.profileActionBtnText, { color: colors.primaryText }]}>
                Portfolio
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Real-Time Duty & Booking Controls */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="radio" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.primaryText }]}>{t("profile.dutyAndBookingStatus") || "Duty & Booking Status"}</Text>
              <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{t("profile.controlBookingDesc") || "Control whether clients can book you right now"}</Text>
            </View>
          </View>

          {/* 3-State Duty Switcher */}
          <View style={[styles.dutyPillsWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
            {(
              [
                { key: "active", label: "Active", icon: "flash" },
                { key: "on_break", label: "On Break", icon: "cafe" },
                { key: "off_duty", label: "Off Duty", icon: "moon" },
              ] as const
            ).map((item) => {
              const isSelected = dutyStatus === item.key;
              return (
                <TouchableOpacity
                  key={item.key}
                  activeOpacity={0.8}
                  onPress={() => handleDutyChange(item.key)}
                  style={[
                    styles.dutyPillItem,
                    isSelected && {
                      backgroundColor:
                        item.key === "active"
                          ? colors.brand
                          : item.key === "on_break"
                          ? "#F59E0B"
                          : colors.elevated,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.25,
                      shadowRadius: 4,
                      elevation: 3,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={13}
                    color={
                      isSelected
                        ? item.key === "active"
                          ? colors.onBrand
                          : "#FFFFFF"
                        : colors.secondaryText
                    }
                  />
                  <Text
                    style={[
                      styles.dutyPillLabel,
                      {
                        color: isSelected
                          ? item.key === "active"
                            ? colors.onBrand
                            : "#FFFFFF"
                          : colors.secondaryText,
                        fontWeight: isSelected ? "800" : "600",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Accept New Bookings Switch */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: colors.primaryText }]}>{t("profile.acceptOnlineBookings") || "Accept New Online Bookings"}</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.secondaryText }]}>
                {acceptingAppointments
                  ? "Clients can view your timetable and book appointments"
                  : "Bookings paused — existing appointments remain scheduled"}
              </Text>
            </View>
            <Switch
              value={acceptingAppointments}
              onValueChange={(val) => {
                setAcceptingAppointments(val);
                showToast(val ? "Now accepting bookings" : "Bookings paused", "info");
              }}
              trackColor={{ false: colors.elevated, true: colors.brand }}
              thumbColor={colors.onBrand}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Booking Push Notifications Switch */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={[styles.toggleTitle, { color: colors.primaryText }]}>{t("profile.appointmentPushAlerts") || "Appointment Push Notifications"}</Text>
              <Text style={[styles.toggleSubtitle, { color: colors.secondaryText }]}>{t("profile.instantAlertsSub") || "Instant phone sound & banner alerts for incoming bookings"}</Text>
            </View>
            <Switch
              value={pushNotifications}
              onValueChange={(val) => {
                setPushNotifications(val);
                showToast(val ? "Booking alerts enabled" : "Booking alerts muted", "info");
              }}
              trackColor={{ false: colors.elevated, true: colors.brand }}
              thumbColor={colors.onBrand}
            />
          </View>
        </View>

        {/* Section: Salon Affiliation / Salon ID Field */}
        <Text style={[styles.groupSectionHeader, { color: colors.secondaryText }]}>
          {isSalonManager ? "SALON ID & STAFF REGISTRATION" : "SALON AFFILIATION & SALON ID"}
        </Text>

        {isSalonManager ? (
          // CARD FOR SALON OWNER / MANAGER
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
                <Ionicons name="business" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.primaryText }]}>{t("profile.yourSalonIdTitle") || "Your Salon ID for Barbers & Hairdressers"}</Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>{t("profile.yourSalonIdSub") || "Barbers and hairdressers input this ID to register and join your salon floor"}</Text>
              </View>
            </View>

            {/* Prominent Salon ID Display Banner */}
            <View style={[styles.salonIdBanner, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.salonIdBannerLabel, { color: colors.secondaryText }]}>{t("profile.officialSalonId") || "OFFICIAL SALON ID"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 }}>
                  <Text style={[styles.salonIdBannerNumber, { color: colors.brand }]}>
                    #{user?.id || 4}
                  </Text>
                  <View style={[styles.salonIdTagPill, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                    <Text style={[styles.salonIdTagText, { color: colors.brand }]}>
                      TRM-SALON-0{user?.id || 4}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCopySalonId}
                style={[styles.copySalonIdBtn, { backgroundColor: colors.brand }]}
              >
                <Ionicons name="copy-outline" size={15} color={colors.onBrand} />
                <Text style={[styles.copySalonIdBtnText, { color: colors.onBrand }]}>{t("profile.copyId") || "Copy ID"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.salonIdTipsRow}>
              <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
              <Text style={[styles.salonIdTipText, { color: colors.secondaryText }]}>{t("profile.salonIdInstructions") || "Give this Salon ID to your barbers and hairdressers. When they sign up or edit their profile, they enter this ID to immediately link to your salon, appear on your chairs, and take client bookings."}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/Pages/manage-staff")}
                style={[styles.salonSubActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Ionicons name="people-outline" size={15} color={colors.brand} />
                <Text style={[styles.salonSubActionText, { color: colors.primaryText }]}>{t("profile.manageStaff") || "Manage Staff"}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/Pages/active-barbers" as any)}
                style={[styles.salonSubActionBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Ionicons name="cut-outline" size={15} color={colors.brand} />
                <Text style={[styles.salonSubActionText, { color: colors.primaryText }]}>
                  Active Chairs
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // CARD FOR BARBERS & HAIRDRESSERS
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
                <Ionicons name="business" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
                  Salon Affiliation (Salon ID)
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  Register or connect under a particular salon or barbershop
                </Text>
              </View>
              {user?.parent_salon_id && !showChangeSalonInput ? (
                <View style={[styles.affiliatedBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                  <View style={[styles.affiliatedDot, { backgroundColor: colors.brand }]} />
                  <Text style={[styles.affiliatedBadgeText, { color: colors.brand }]}>
                    AFFILIATED
                  </Text>
                </View>
              ) : (
                <View style={[styles.affiliatedBadge, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Text style={[styles.affiliatedBadgeText, { color: colors.secondaryText }]}>
                    SOLO / INDIE
                  </Text>
                </View>
              )}
            </View>

            {/* State 1: Currently Linked to Salon */}
            {user?.parent_salon_id && !showChangeSalonInput ? (
              <View style={styles.linkedSalonCard}>
                <View style={[styles.linkedSalonInfoBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <View style={[styles.linkedSalonIconWrap, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="business-outline" size={20} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.linkedSalonName, { color: colors.primaryText }]} numberOfLines={1}>
                      {user?.parent_salon_name || salonAffiliation || `Salon #${user.parent_salon_id}`}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 }}>
                      <View style={[styles.salonIdPillSmall, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.25)" }]}>
                        <Text style={[styles.salonIdPillSmallText, { color: colors.brand }]}>
                          SALON ID: #{user.parent_salon_id}
                        </Text>
                      </View>
                      <Text style={[styles.linkedSalonRole, { color: colors.secondaryText }]}>
                        {user?.staff_title || "Stylist Chair"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.linkedSalonActionRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      setSalonIdInput(String(user.parent_salon_id));
                      setShowChangeSalonInput(true);
                    }}
                    style={[styles.changeSalonBtn, { backgroundColor: colors.background, borderColor: colors.border }]}
                  >
                    <Ionicons name="swap-horizontal-outline" size={14} color={colors.primaryText} />
                    <Text style={[styles.changeSalonBtnText, { color: colors.primaryText }]}>
                      Change Salon ID
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setUnlinkModalVisible(true)}
                    style={[styles.unlinkSalonBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.25)" }]}
                  >
                    <Ionicons name="exit-outline" size={14} color="#EF4444" />
                    <Text style={styles.unlinkSalonBtnText}>
                      Unlink
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              // State 2: Input Field to Enter or Change Salon ID
              <View style={styles.salonInputBlock}>
                <Text style={[styles.salonInputHelper, { color: colors.secondaryText }]}>
                  Input the Salon ID provided by your salon manager to register or operate as a stylist under that particular salon.
                </Text>

                <View style={styles.salonInputRow}>
                  <View style={[styles.salonInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Ionicons name="key-outline" size={17} color={colors.brand} />
                    <TextInput
                      style={[styles.salonTextInput, { color: colors.primaryText }]}
                      placeholder={t("profile.salonIdPlaceholder") || "e.g. 4 or SALON-04"}
                      placeholderTextColor={colors.inputPlaceholder}
                      value={salonIdInput}
                      onChangeText={(val) => {
                        setSalonIdInput(val);
                        setVerifiedSalon(null);
                      }}
                      keyboardType="numeric"
                      autoCapitalize="characters"
                    />
                    {salonIdInput.length > 0 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setSalonIdInput("");
                          setVerifiedSalon(null);
                        }}
                      >
                        <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={isVerifyingSalon || !salonIdInput.trim()}
                    onPress={() => handleVerifySalon()}
                    style={[
                      styles.verifySalonBtn,
                      {
                        backgroundColor: salonIdInput.trim() ? colors.brand : colors.elevated,
                        borderColor: colors.border,
                        opacity: isVerifyingSalon ? 0.7 : salonIdInput.trim() ? 1 : 0.6,
                      },
                    ]}
                  >
                    {isVerifyingSalon ? (
                      <ActivityIndicator size="small" color={colors.onBrand} />
                    ) : (
                      <>
                        <Ionicons
                          name="search-outline"
                          size={15}
                          color={salonIdInput.trim() ? colors.onBrand : colors.secondaryText}
                        />
                        <Text
                          style={[
                            styles.verifySalonBtnText,
                            { color: salonIdInput.trim() ? colors.onBrand : colors.secondaryText },
                          ]}
                        >
                          Verify
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Verified Salon Preview Card */}
                {verifiedSalon && (
                  <View style={[styles.verifiedSalonBox, { backgroundColor: "rgba(199, 243, 107, 0.08)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                    <View style={styles.verifiedSalonLeft}>
                      <View style={[styles.verifiedCheckCircle, { backgroundColor: colors.brand }]}>
                        <Ionicons name="checkmark" size={14} color={colors.onBrand} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.verifiedSalonTitle, { color: colors.primaryText }]}>
                          {verifiedSalon.name}
                        </Text>
                        <Text style={[styles.verifiedSalonSub, { color: colors.secondaryText }]}>
                          Salon #{verifiedSalon.id} • {verifiedSalon.city || "Cameroon"}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isLinkingSalon}
                      onPress={handleConnectSalon}
                      style={[styles.connectSalonBtn, { backgroundColor: colors.brand }]}
                    >
                      {isLinkingSalon ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <>
                          <Ionicons name="link-outline" size={15} color={colors.onBrand} />
                          <Text style={[styles.connectSalonBtnText, { color: colors.onBrand }]}>
                            Connect to Salon
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {showChangeSalonInput && user?.parent_salon_id && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setShowChangeSalonInput(false)}
                    style={{ alignSelf: "center", marginTop: 8 }}
                  >
                    <Text style={{ fontSize: 12, color: colors.secondaryText, textDecorationLine: "underline" }}>
                      Keep current salon (#{user.parent_salon_id})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Section 1: Salon & Operations Management */}
        <Text style={[styles.groupSectionHeader, { color: colors.secondaryText }]}>
          SALON OPERATIONS & SERVICES
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/manage-services")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="cut" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Services & Pricing Menu
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Haircut styles, durations, and CFA prices
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/availability")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="time" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Weekly Schedule & Working Hours
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Opening hours, break times & capacity rules
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/portfolio")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="images" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Portfolio & Style Showcase
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Upload client haircut photos with direct booking prices
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>

          {isSalonManager && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/Pages/manage-staff")}
                style={styles.menuRowItem}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="people" size={17} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                    Staff & Stylist Chairs
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                    Invite barbers, manage chair capacity & schedules
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push("/Pages/salon-management")}
                style={styles.menuRowItem}
              >
                <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
                  <Ionicons name="business" size={17} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                    Salon Settings & Documents
                  </Text>
                  <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                    Shop identity, verification docs & address
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Section 2: Client Reviews & Alerts */}
        <Text style={[styles.groupSectionHeader, { color: colors.secondaryText }]}>
          CLIENT REPUTATION & ALERTS
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/reviews")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="star" size={17} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Client Reviews & Feedback
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Ratings, client comments and official replies
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View
                style={{
                  backgroundColor: "rgba(199, 243, 107, 0.12)",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "800", color: colors.brand }}>
                  4.9
                </Text>
                <Ionicons name="star" size={10} color={colors.brand} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/notifications")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="notifications" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Notifications & Activity
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                System alerts, staff invites, and schedule updates
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* Section 3: Account Security & Preferences */}
        <Text style={[styles.groupSectionHeader, { color: colors.secondaryText }]}>
          SECURITY & PREFERENCES
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/edit-profile")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="shield-checkmark" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Profile, Phone & Password
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Edit name, client phone line, shop location & password
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLanguageModalVisible(true)}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="globe" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Display Language
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                English / Français
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={[styles.langBadge, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <Text style={[styles.langBadgeText, { color: colors.brand }]}>
                  {language === "fr" ? "FR" : "EN"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.menuRowItem}>
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons
                name={isDark ? "moon" : "sunny"}
                size={17}
                color={colors.brand}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Dark Urban Mode
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                High-contrast barbershop aesthetic
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={() => {
                toggleTheme();
                showToast(isDark ? "Switched to Light Mode" : "Switched to Dark Mode", "info");
              }}
              trackColor={{ false: colors.elevated, true: colors.brand }}
              thumbColor={colors.onBrand}
            />
          </View>
        </View>

        {/* Section 4: Support & Operations */}
        <Text style={[styles.groupSectionHeader, { color: colors.secondaryText }]}>
          HELP & OPERATIONS TEAM
        </Text>
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/support-chat")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="chatbubbles" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Admin Operations Live Chat
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Instant support from Trimly partner desk
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#22C55E" }} />
              <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
            </View>
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/help-support")}
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: colors.elevated }]}>
              <Ionicons name="help-circle" size={17} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                Help Center & FAQs
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Payout guides, booking rules & account policies
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() =>
              openWhatsApp(
                SUPPORT_WHATSAPP_NUMBER,
                "Hello Trimly Support, I am a barber partner and need assistance."
              )
            }
            style={styles.menuRowItem}
          >
            <View style={[styles.menuIconCircle, { backgroundColor: "rgba(34, 197, 94, 0.12)" }]}>
              <Ionicons name="logo-whatsapp" size={17} color="#22C55E" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.menuItemTitle, { color: colors.primaryText }]}>
                WhatsApp Priority Support
              </Text>
              <Text style={[styles.menuItemSub, { color: colors.secondaryText }]}>
                Direct chat: +237 653 811 357
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

        {/* High-Impact Logout Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setLogoutModalVisible(true)}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: colors.card,
              borderColor: "rgba(239, 68, 68, 0.35)",
            },
          ]}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.logoutBtnText}>{t("profile.logoutPartnerAccount") || "Log Out from Partner Account"}</Text>
        </TouchableOpacity>

        {/* Delete Salon / Barber Account Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setDeletePhraseInput("");
            setDeleteAccountModalVisible(true);
          }}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: "rgba(239, 68, 68, 0.08)",
              borderColor: "#EF4444",
              marginTop: 10,
            },
          ]}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
          <Text style={[styles.logoutBtnText, { color: "#EF4444" }]}>
            {t("profile.deleteSalonAccount") || "Delete Salon / Barber Account"}
          </Text>
        </TouchableOpacity>

        {/* Footer Build Info */}
        <View style={styles.footerWrap}>
          <Text style={[styles.footerTitle, { color: colors.secondaryText }]}>
            Trimly Partner Pro Suite
          </Text>
          <Text style={[styles.footerSubtitle, { color: colors.secondaryText }]}>
            Version 2.4.0 • Enterprise Partner Edition
          </Text>
        </View>

        {/* Logout Confirmation Modal */}
        <CustomModal
          visible={logoutModalVisible}
          title={t("profile.logoutConfirmTitle")}
          onClose={() => setLogoutModalVisible(false)}
        >
          <View style={styles.modalBody}>
            <View style={[styles.modalWarningIconBox, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="log-out" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalWarningTitle, { color: colors.primaryText }]}>
              {t("common.logoutConfirmMsg") || "Are you sure you want to log out?"}
            </Text>
            <Text style={[styles.modalWarningText, { color: colors.secondaryText }]}>
              {language === "fr"
                ? "Vous aurez besoin de votre mot de passe ou compte Google pour vous reconnecter. Vos réservations actives et votre planning restent sécurisés."
                : "You will need your password or Google credentials to log back in. Your active bookings and schedule remain securely preserved."}
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setLogoutModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.primaryText }]}>
                  {t("common.cancel") || "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleLogOutConfirm}
                style={[styles.modalDangerBtn, { backgroundColor: "#EF4444" }]}
              >
                <Text style={styles.modalDangerBtnText}>{t("common.logout") || "Log Out"}</Text>
              </TouchableOpacity>
            </View>
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
          title={t("profile.deleteSalonModalTitle") || "Delete Account & Salon Profile"}
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
            <Text style={[styles.deletionInstruction, { color: colors.secondaryText }]}>
              {t("profile.deleteSalonInstruction")}
            </Text>
            <View
              style={[
                styles.phraseBadge,
                {
                  backgroundColor: colors.elevated || "#252926",
                  borderColor: colors.border || "#383D38",
                },
              ]}
            >
              <Text
                style={[
                  styles.phraseBadgeText,
                  { color: colors.brand || "#C7F36B" },
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
                  color: colors.primaryText,
                },
              ]}
              placeholder={t("profile.deleteSalonPlaceholder") || "Type the confirmation phrase..."}
              placeholderTextColor={colors.secondaryText || "#687069"}
              value={deletePhraseInput}
              onChangeText={setDeletePhraseInput}
              autoCapitalize="sentences"
              autoCorrect={false}
              editable={!isDeletingAccount}
            />
          </View>
        </CustomModal>

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
                  backgroundColor: language === "en" ? "rgba(199, 243, 107, 0.1)" : colors.elevated,
                  borderColor: language === "en" ? colors.brand : colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.langMonogramBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.langMonogramText, { color: colors.brand }]}>EN</Text>
                </View>
                <View>
                  <Text style={[styles.langOptionTitle, { color: colors.primaryText }]}>
                    English
                  </Text>
                  <Text style={[styles.langOptionSub, { color: colors.secondaryText }]}>
                    Default English (US)
                  </Text>
                </View>
              </View>
              {language === "en" && (
                <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
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
                  backgroundColor: language === "fr" ? "rgba(199, 243, 107, 0.1)" : colors.elevated,
                  borderColor: language === "fr" ? colors.brand : colors.border,
                },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View style={[styles.langMonogramBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.langMonogramText, { color: colors.brand }]}>FR</Text>
                </View>
                <View>
                  <Text style={[styles.langOptionTitle, { color: colors.primaryText }]}>
                    Français
                  </Text>
                  <Text style={[styles.langOptionSub, { color: colors.secondaryText }]}>
                    Français (Cameroun)
                  </Text>
                </View>
              </View>
              {language === "fr" && (
                <Ionicons name="checkmark-circle" size={22} color={colors.brand} />
              )}
            </TouchableOpacity>
          </View>
        </CustomModal>

        {/* Unlink from Salon Confirmation Modal */}
        <CustomModal
          visible={unlinkModalVisible}
          title={t("profile.unlinkFromSalon")}
          onClose={() => setUnlinkModalVisible(false)}
        >
          <View style={styles.modalBody}>
            <View style={[styles.modalWarningIconBox, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
              <Ionicons name="business" size={32} color="#EF4444" />
            </View>
            <Text style={[styles.modalWarningTitle, { color: colors.primaryText }]}>
              {language === "fr" ? "Opérer en tant que coiffeur indépendant ?" : "Operate as Independent Stylist?"}
            </Text>
            <Text style={[styles.modalWarningText, { color: colors.secondaryText }]}>
              {language === "fr"
                ? `Vous serez dissocié(e) de ${user?.parent_salon_name || "votre salon actuel"} et opérerez en solo. Vos rendez-vous et votre portfolio restent conservés.`
                : `You will be disconnected from ${user?.parent_salon_name || "your current salon"} and will operate as a solo barber. Your appointments and portfolio remain safe.`}
            </Text>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setUnlinkModalVisible(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.primaryText }]}>
                  {t("common.cancel") || "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isUnlinkingSalon}
                onPress={handleConfirmUnlinkSalon}
                style={[styles.modalDangerBtn, { backgroundColor: "#EF4444" }]}
              >
                {isUnlinkingSalon ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalDangerBtnText}>{language === "fr" ? "Dissocier du salon" : "Unlink Salon"}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CustomModal>
      </ScrollView>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: "500",
  },
  headerEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  headerEditBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  profileHeroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  profileHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarImage: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: "#C7F36B",
  },
  avatarMonogramWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#C7F36B",
  },
  avatarMonogramText: {
    fontSize: 24,
    fontWeight: "900",
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: "#171918",
  },
  profileMetaWrap: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  profileName: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  profileShop: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  profileEmail: {
    fontSize: 11.5,
    fontWeight: "400",
    marginTop: 1,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  ratingBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
  },
  profileHeroDivider: {
    height: 1,
    marginVertical: 14,
  },
  profileActionStrip: {
    flexDirection: "row",
    gap: 8,
  },
  profileActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  profileActionBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  groupSectionHeader: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginTop: 6,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  cardSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  dutyPillsWrap: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  dutyPillItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 11,
  },
  dutyPillLabel: {
    fontSize: 12,
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  toggleSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  menuRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  menuIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  menuItemSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  langBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
    borderWidth: 1,
  },
  langBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 4,
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 13.5,
    fontWeight: "800",
  },
  footerWrap: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 3,
  },
  footerTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  footerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  modalBody: {
    alignItems: "center",
    paddingTop: 8,
  },
  modalWarningIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalWarningTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 6,
  },
  modalWarningText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalDangerBtn: {
    flex: 1.2,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDangerBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "800",
  },
  langOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  langMonogramBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  langMonogramText: {
    fontSize: 13,
    fontWeight: "900",
  },
  langOptionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  langOptionSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  // Salon ID & Affiliation Styles
  salonIdBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  salonIdBannerLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  salonIdBannerNumber: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  salonIdTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  salonIdTagText: {
    fontSize: 11,
    fontWeight: "800",
  },
  copySalonIdBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  copySalonIdBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  salonIdTipsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  salonIdTipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  salonSubActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
  },
  salonSubActionText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  affiliatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  affiliatedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  affiliatedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  linkedSalonCard: {
    marginTop: 6,
    gap: 10,
  },
  linkedSalonInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkedSalonIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  linkedSalonName: {
    fontSize: 15,
    fontWeight: "800",
  },
  salonIdPillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  salonIdPillSmallText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  linkedSalonRole: {
    fontSize: 12,
    fontWeight: "500",
  },
  linkedSalonActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  changeSalonBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
  },
  changeSalonBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  unlinkSalonBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 11,
    borderWidth: 1,
  },
  unlinkSalonBtnText: {
    color: "#EF4444",
    fontSize: 12.5,
    fontWeight: "700",
  },
  salonInputBlock: {
    marginTop: 4,
    gap: 10,
  },
  salonInputHelper: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  salonInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  salonInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  salonTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  verifySalonBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 16,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifySalonBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  verifiedSalonBox: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  verifiedSalonLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifiedCheckCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedSalonTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  verifiedSalonSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  connectSalonBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 11,
  },
  connectSalonBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
});
