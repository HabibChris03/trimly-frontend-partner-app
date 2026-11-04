import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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

  // Solo barber salon search strictly by name only & join request state
  const [salonSearchQuery, setSalonSearchQuery] = useState("");
  const [isSearchingSalons, setIsSearchingSalons] = useState(false);
  const [searchedSalons, setSearchedSalons] = useState<any[]>([]);
  const [searchSalonsError, setSearchSalonsError] = useState<string | null>(null);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<any | null>(null);
  const [isSendingJoinRequest, setIsSendingJoinRequest] = useState(false);
  const [isCancellingJoinRequest, setIsCancellingJoinRequest] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [isJoinSalonModalVisible, setIsJoinSalonModalVisible] = useState(false);
  const [selectedSalonToJoin, setSelectedSalonToJoin] = useState<any | null>(null);
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

  const checkPendingJoinRequest = useCallback(async () => {
    try {
      const res = await barberService.getMyPendingJoinRequest();
      if (res?.has_pending_request && res?.request) {
        setPendingJoinRequest(res.request);
      } else {
        setPendingJoinRequest(null);
      }
    } catch {
      setPendingJoinRequest(null);
    }
  }, []);

  useEffect(() => {
    checkPendingJoinRequest();
  }, [checkPendingJoinRequest]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (refreshUser) {
      await refreshUser().catch(() => null);
    }
    await checkPendingJoinRequest();
    setRefreshing(false);
    showToast(language === "fr" ? "Profil actualisé." : "Profile refreshed.", "info");
  }, [refreshUser, checkPendingJoinRequest, showToast, language]);

  const handleSearchSalons = async () => {
    const trimmed = salonSearchQuery.trim();
    if (!trimmed) {
      showToast(
        language === "fr"
          ? "Veuillez entrer le nom d'un salon."
          : "Please enter a salon name to search.",
        "warning"
      );
      return;
    }
    setIsSearchingSalons(true);
    setSearchSalonsError(null);
    try {
      const results: any = await barberService.searchSalonsByName(trimmed);
      if (results?.error || (!results?.length && trimmed)) {
        const errMsg = results?.error || (language === "fr" ? "Salon non trouvé." : "Salon not found.");
        setSearchSalonsError(errMsg);
        setSearchedSalons([]);
      } else {
        setSearchedSalons(Array.isArray(results) ? results : []);
        setSearchSalonsError(null);
      }
    } catch (e: any) {
      setSearchSalonsError(e?.message || (language === "fr" ? "Erreur de recherche." : "Search failed."));
      setSearchedSalons([]);
    } finally {
      setIsSearchingSalons(false);
    }
  };

  const handleOpenJoinConfirmation = (salon: any) => {
    setSelectedSalonToJoin(salon);
    setJoinModalVisible(true);
  };

  const handleConfirmSendJoinRequest = async () => {
    if (!selectedSalonToJoin) return;
    setIsSendingJoinRequest(true);
    try {
      const res = await barberService.sendJoinRequestToSalon(
        selectedSalonToJoin.id,
        selectedSalonToJoin.name
      );
      setPendingJoinRequest({
        id: res?.request_id,
        salon_id: selectedSalonToJoin.id,
        salon_name: selectedSalonToJoin.name,
        created_at: new Date().toISOString(),
      });
      setJoinModalVisible(false);
      setSelectedSalonToJoin(null);
      setSearchedSalons([]);
      setSalonSearchQuery("");
      showToast(
        res?.message ||
          (language === "fr"
            ? `Demande transmise à ${selectedSalonToJoin.name} ! En attente d'approbation.`
            : `Join request sent to ${selectedSalonToJoin.name}! Awaiting manager approval.`),
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr" ? "Impossible d'envoyer la demande." : "Failed to send join request."),
        "error"
      );
    } finally {
      setIsSendingJoinRequest(false);
    }
  };

  const handleCancelPendingJoinRequest = async () => {
    setIsCancellingJoinRequest(true);
    try {
      await barberService.cancelPendingJoinRequest();
      setPendingJoinRequest(null);
      showToast(
        language === "fr" ? "Demande d'adhésion annulée." : "Join request cancelled successfully.",
        "info"
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          (language === "fr" ? "Échec d'annulation de la demande." : "Failed to cancel join request."),
        "error"
      );
    } finally {
      setIsCancellingJoinRequest(false);
    }
  };

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
          ? language === "fr" ? "En service & prêt pour les coupes" : "On Duty & Ready for Cuts"
          : newStatus === "on_break"
          ? language === "fr" ? "Actuellement en pause" : "Currently on Break"
          : language === "fr" ? "Hors service pour aujourd'hui" : "Off Duty for Today";
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
    showToast(language === "fr" ? "Vous avez été déconnecté." : "You have been logged out.", "info");
    router.replace("/(auth)/login");
  };

  const handleCopySalonId = () => {
    const idToCopy = String(user?.id || 4);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idToCopy);
    }
    showToast(
      language === "fr"
        ? `ID Salon #${idToCopy} copié ! Vos coiffeurs peuvent l'utiliser pour s'inscrire.`
        : `Salon ID #${idToCopy} copied! Barbers & hairdressers can use this to register under your salon.`,
      "success"
    );
  };

  const handleVerifySalon = async (idToVerify?: string) => {
    const raw = (idToVerify !== undefined ? idToVerify : salonIdInput).trim();
    const cleanNum = parseInt(raw.replace(/[^0-9]/g, ""), 10);
    if (!cleanNum || isNaN(cleanNum)) {
      showToast(
        language === "fr"
          ? "Veuillez entrer un ID de salon numérique valide (ex. 4)."
          : "Please enter a valid numeric Salon ID (e.g. 4 or SALON-04).",
        "warning"
      );
      return;
    }
    setIsVerifyingSalon(true);
    setVerifiedSalon(null);
    try {
      const salon = await barberService.getSalonById(cleanNum);
      if (salon && salon.id) {
        setVerifiedSalon(salon);
        showToast(language === "fr" ? `Trouvé : ${salon.name}` : `Found: ${salon.name}`, "success");
      } else {
        const fallback = {
          id: cleanNum,
          name: `Trimly Partner Salon #${cleanNum}`,
          city: "Douala, Cameroon",
        };
        setVerifiedSalon(fallback);
        showToast(language === "fr" ? `Salon #${cleanNum} trouvé.` : `Salon #${cleanNum} found.`, "info");
      }
    } catch {
      const fallback = {
        id: cleanNum,
        name: `Trimly Partner Salon #${cleanNum}`,
        city: "Douala, Cameroon",
      };
      setVerifiedSalon(fallback);
      showToast(language === "fr" ? `Salon #${cleanNum} trouvé.` : `Salon #${cleanNum} found.`, "info");
    } finally {
      setIsVerifyingSalon(false);
    }
  };

  const handleConnectSalon = async () => {
    const targetSalonId = verifiedSalon?.id || parseInt(salonIdInput.replace(/[^0-9]/g, ""), 10);
    if (!targetSalonId) {
      showToast(
        language === "fr"
          ? "Veuillez d'abord vérifier un ID de salon valide."
          : "Please verify a valid Salon ID first.",
        "warning"
      );
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
      showToast(
        language === "fr"
          ? `Rattaché avec succès à ${salonName} ! Votre fauteuil est actif dans le salon.`
          : `Successfully linked to ${salonName}! Your chair is active on their salon floor.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || (language === "fr" ? "Échec du rattachement au salon." : "Failed to link salon. Please try again."), "error");
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
      showToast(
        language === "fr"
          ? "Détaché du salon. Vous opérez désormais en tant que coiffeur indépendant."
          : "Unlinked from salon. You are now operating as an independent stylist.",
        "info"
      );
    } catch (err: any) {
      showToast(err?.message || (language === "fr" ? "Impossible de se détacher du salon." : "Could not unlink from salon."), "error");
    } finally {
      setIsUnlinkingSalon(false);
    }
  };

  const isSalonManager = Boolean(user?.role === "salon");

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

          {/* Solo Barber / Hairdresser: Dedicated Join a Salon Button */}
          {!isSalonManager && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setIsJoinSalonModalVisible(true)}
              style={[
                styles.joinSalonHeroBtn,
                {
                  backgroundColor: colors.brand,
                },
              ]}
            >
              <Ionicons name="business" size={18} color={colors.onBrand} />
              <Text style={[styles.joinSalonHeroBtnText, { color: colors.onBrand }]}>
                {language === "fr" ? "🏢 Rejoindre un salon" : "🏢 Join a Salon"}
              </Text>
              {pendingJoinRequest && (
                <View style={styles.pendingBadgeHero}>
                  <Text style={styles.pendingBadgeHeroText}>
                    {language === "fr" ? "Demande en attente" : "Pending"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
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
          // CARD FOR SOLO BARBERS & HAIRDRESSERS: JOIN A SALON (SEARCH STRICTLY BY NAME ONLY)
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
                <Ionicons name="business" size={16} color={colors.brand} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: colors.primaryText }]}>
                  {language === "fr" ? "Rejoindre un salon" : "Join a Salon"}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
                  {language === "fr"
                    ? "Recherchez un salon par nom pour envoyer une demande d'adhésion"
                    : "Search for a salon strictly by name only to send a join request"}
                </Text>
              </View>
              <View style={[styles.affiliatedBadge, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                <Text style={[styles.affiliatedBadgeText, { color: colors.secondaryText }]}>
                  SOLO / INDIE
                </Text>
              </View>
            </View>

            {/* Warning / Informational Callout: Loss of Admin Rights */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderColor: "rgba(245, 158, 11, 0.3)",
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
                marginTop: 6,
              }}
            >
              <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.primaryText }}>
                {language === "fr"
                  ? "Remarque : Lorsque vous rejoignez un salon, vous perdez tous vos droits d'administrateur car vous travaillerez désormais en tant que membre du personnel sous ce salon."
                  : "Notice: When you join a salon, you will no longer have your admin rights since you will now work under that salon as a staff member."}
              </Text>
            </View>

            {/* State A: User has a pending join request */}
            {pendingJoinRequest ? (
              <View
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 14,
                  marginTop: 12,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="time" size={18} color={colors.brand} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
                      {pendingJoinRequest.salon_name || "Trimly Partner Salon"}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "rgba(199, 243, 107, 0.15)",
                      borderColor: "rgba(199, 243, 107, 0.4)",
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.brand }}>
                      {language === "fr" ? "Demande en attente" : "Pending Approval"}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: colors.secondaryText, lineHeight: 17 }}>
                  {language === "fr"
                    ? `Votre demande pour rejoindre ${pendingJoinRequest.salon_name} a été envoyée au gérant du salon. Vous serez rattaché à son salon dès approbation.`
                    : `Your request to join ${pendingJoinRequest.salon_name} has been submitted to the salon manager. You will be onboarded to their salon floor once approved.`}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isCancellingJoinRequest}
                  onPress={handleCancelPendingJoinRequest}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingVertical: 8,
                    marginTop: 2,
                  }}
                >
                  {isCancellingJoinRequest ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#EF4444" }}>
                        {language === "fr" ? "Annuler la demande" : "Cancel Join Request"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* State B: Search for a Salon strictly by name only */
              <View style={{ gap: 10, marginTop: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <Ionicons name="search" size={17} color={colors.secondaryText} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      height: 42,
                      fontSize: 14,
                      color: colors.primaryText,
                    }}
                    placeholder={
                      language === "fr"
                        ? "Nom du salon uniquement (ex: Prestige Cutz)..."
                        : "Search salon by name only (e.g. Prestige Cutz)..."
                    }
                    placeholderTextColor={colors.inputPlaceholder}
                    value={salonSearchQuery}
                    onChangeText={(val) => {
                      setSalonSearchQuery(val);
                      if (searchSalonsError) setSearchSalonsError(null);
                    }}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSalons}
                    autoCapitalize="words"
                  />
                  {salonSearchQuery.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setSalonSearchQuery("");
                        setSearchedSalons([]);
                        setSearchSalonsError(null);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSearchingSalons || !salonSearchQuery.trim()}
                  onPress={handleSearchSalons}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: salonSearchQuery.trim() ? colors.brand : colors.elevated,
                    borderRadius: 8,
                    paddingVertical: 10,
                    opacity: isSearchingSalons ? 0.7 : salonSearchQuery.trim() ? 1 : 0.6,
                  }}
                >
                  {isSearchingSalons ? (
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <>
                      <Ionicons
                        name="search-outline"
                        size={15}
                        color={salonSearchQuery.trim() ? colors.onBrand : colors.secondaryText}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: salonSearchQuery.trim() ? colors.onBrand : colors.secondaryText,
                        }}
                      >
                        {language === "fr" ? "Rechercher le salon" : "Search Salon"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Error / Not Found Display */}
                {searchSalonsError && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      borderColor: "rgba(239, 68, 68, 0.25)",
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: "#EF4444", flex: 1 }}>
                      {searchSalonsError}
                    </Text>
                  </View>
                )}

                {/* Search Results List */}
                {searchedSalons.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondaryText }}>
                      {language === "fr" ? "Salons trouvés :" : "Salons Found:"}
                    </Text>
                    {searchedSalons.map((salon) => (
                      <View
                        key={salon.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: colors.elevated,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8, gap: 2 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
                            {salon.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                            {salon.city || "Cameroon"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => handleOpenJoinConfirmation(salon)}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: colors.brand,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 6,
                          }}
                        >
                          <Ionicons name="paper-plane" size={13} color={colors.onBrand} />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onBrand }}>
                            {language === "fr" ? "Demander" : "Request"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
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

        {/* Dedicated Join a Salon Modal for Solo Barbers */}
        <CustomModal
          visible={isJoinSalonModalVisible}
          onClose={() => {
            setIsJoinSalonModalVisible(false);
            setSearchedSalons([]);
            setSearchSalonsError(null);
          }}
          title={language === "fr" ? "Rejoindre un salon" : "Join a Salon"}
          scrollable
          showCloseButton
          maxHeight="85%"
        >
          <View style={{ gap: 14, paddingBottom: 8 }}>
            {/* Warning / Informational Callout: Loss of Admin Rights */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderColor: "rgba(245, 158, 11, 0.3)",
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.primaryText }}>
                {language === "fr"
                  ? "Remarque : Lorsque vous rejoignez un salon, vous perdez tous vos droits d'administrateur car vous travaillerez désormais en tant que membre du personnel sous ce salon."
                  : "Notice: When you join a salon, you will no longer have your admin rights since you will now work under that salon as a staff member."}
              </Text>
            </View>

            {/* State A: User has a pending join request */}
            {pendingJoinRequest ? (
              <View
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  padding: 14,
                  gap: 10,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="time" size={18} color={colors.brand} />
                    <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
                      {pendingJoinRequest.salon_name || "Trimly Partner Salon"}
                    </Text>
                  </View>
                  <View
                    style={{
                      backgroundColor: "rgba(199, 243, 107, 0.15)",
                      borderColor: "rgba(199, 243, 107, 0.4)",
                      borderWidth: 1,
                      borderRadius: 12,
                      paddingHorizontal: 8,
                      paddingVertical: 2,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: colors.brand }}>
                      {language === "fr" ? "Demande en attente" : "Pending Approval"}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 12, color: colors.secondaryText, lineHeight: 17 }}>
                  {language === "fr"
                    ? `Votre demande pour rejoindre ${pendingJoinRequest.salon_name} a été envoyée au gérant du salon. Vous serez rattaché à son salon dès approbation.`
                    : `Your request to join ${pendingJoinRequest.salon_name} has been submitted to the salon manager. You will be onboarded to their salon floor once approved.`}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isCancellingJoinRequest}
                  onPress={async () => {
                    await handleCancelPendingJoinRequest();
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingVertical: 8,
                    marginTop: 2,
                  }}
                >
                  {isCancellingJoinRequest ? (
                    <ActivityIndicator size="small" color="#EF4444" />
                  ) : (
                    <>
                      <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                      <Text style={{ fontSize: 13, fontWeight: "600", color: "#EF4444" }}>
                        {language === "fr" ? "Annuler la demande" : "Cancel Join Request"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* State B: Search for a Salon strictly by name only */
              <View style={{ gap: 10 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                  }}
                >
                  <Ionicons name="search" size={17} color={colors.secondaryText} style={{ marginRight: 6 }} />
                  <TextInput
                    style={{
                      flex: 1,
                      height: 42,
                      fontSize: 14,
                      color: colors.primaryText,
                    }}
                    placeholder={
                      language === "fr"
                        ? "Nom du salon uniquement (ex: Prestige Cutz)..."
                        : "Search salon by name only (e.g. Prestige Cutz)..."
                    }
                    placeholderTextColor={colors.inputPlaceholder}
                    value={salonSearchQuery}
                    onChangeText={(val) => {
                      setSalonSearchQuery(val);
                      if (searchSalonsError) setSearchSalonsError(null);
                    }}
                    returnKeyType="search"
                    onSubmitEditing={handleSearchSalons}
                    autoCapitalize="words"
                  />
                  {salonSearchQuery.length > 0 && (
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setSalonSearchQuery("");
                        setSearchedSalons([]);
                        setSearchSalonsError(null);
                      }}
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSearchingSalons || !salonSearchQuery.trim()}
                  onPress={handleSearchSalons}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    backgroundColor: salonSearchQuery.trim() ? colors.brand : colors.elevated,
                    borderRadius: 8,
                    paddingVertical: 10,
                    opacity: isSearchingSalons ? 0.7 : salonSearchQuery.trim() ? 1 : 0.6,
                  }}
                >
                  {isSearchingSalons ? (
                    <ActivityIndicator size="small" color={colors.onBrand} />
                  ) : (
                    <>
                      <Ionicons
                        name="search-outline"
                        size={15}
                        color={salonSearchQuery.trim() ? colors.onBrand : colors.secondaryText}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "700",
                          color: salonSearchQuery.trim() ? colors.onBrand : colors.secondaryText,
                        }}
                      >
                        {language === "fr" ? "Rechercher le salon" : "Search Salon"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Error / Not Found Display */}
                {searchSalonsError && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      backgroundColor: "rgba(239, 68, 68, 0.08)",
                      borderColor: "rgba(239, 68, 68, 0.25)",
                      borderWidth: 1,
                      borderRadius: 8,
                      padding: 10,
                    }}
                  >
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: "#EF4444", flex: 1 }}>
                      {searchSalonsError}
                    </Text>
                  </View>
                )}

                {/* Search Results List */}
                {searchedSalons.length > 0 && (
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondaryText }}>
                      {language === "fr" ? "Salons trouvés :" : "Salons Found:"}
                    </Text>
                    {searchedSalons.map((salon) => (
                      <View
                        key={salon.id}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          backgroundColor: colors.elevated,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: 8,
                          padding: 12,
                        }}
                      >
                        <View style={{ flex: 1, marginRight: 8, gap: 2 }}>
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryText }}>
                            {salon.name}
                          </Text>
                          <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                            {salon.city || "Cameroon"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          activeOpacity={0.85}
                          onPress={() => {
                            setIsJoinSalonModalVisible(false);
                            handleOpenJoinConfirmation(salon);
                          }}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: colors.brand,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                            borderRadius: 6,
                          }}
                        >
                          <Ionicons name="paper-plane" size={13} color={colors.onBrand} />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onBrand }}>
                            {language === "fr" ? "Demander" : "Request"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        </CustomModal>

        {/* Join Salon Confirmation Modal (Warning on Admin Rights Loss) */}
        <CustomModal
          visible={joinModalVisible}
          onClose={() => {
            if (!isSendingJoinRequest) {
              setJoinModalVisible(false);
              setSelectedSalonToJoin(null);
            }
          }}
          title={
            language === "fr"
              ? `Rejoindre ${selectedSalonToJoin?.name || "le salon"} ?`
              : `Join ${selectedSalonToJoin?.name || "Salon"}?`
          }
          description={
            language === "fr"
              ? `Attention : Lorsque vous rejoignez un salon, vous perdez tous vos droits d'administrateur car vous travaillerez désormais en tant que membre du personnel sous ce salon.\n\nSouhaitez-vous envoyer une demande d'adhésion à ${selectedSalonToJoin?.name} ?`
              : `Attention: When you join a salon, you will no longer have your admin rights since you will now work under that salon as a staff member.\n\nAre you sure you want to send a join request to ${selectedSalonToJoin?.name}?`
          }
          primaryText={
            isSendingJoinRequest
              ? (language === "fr" ? "Envoi en cours..." : "Sending Request...")
              : (language === "fr" ? "Confirmer et envoyer la demande" : "Confirm & Send Request")
          }
          onPrimary={handleConfirmSendJoinRequest}
          secondaryText={language === "fr" ? "Annuler" : "Cancel"}
          onSecondary={() => {
            setJoinModalVisible(false);
            setSelectedSalonToJoin(null);
          }}
        />

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
  joinSalonHeroBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  joinSalonHeroBtnText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pendingBadgeHero: {
    backgroundColor: "#1C1C1E",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 4,
  },
  pendingBadgeHeroText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
});
