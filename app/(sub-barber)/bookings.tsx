import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CustomModal } from "@/components/ui/CustomModal";
import { barberService } from "@/services/barberService";
import { authService } from "@/services/authService";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useNotifications } from "@/context/NotificationContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { useThemeImages } from "@/hooks/useThemeImages";
import { bookingService, BookingReceipt } from "@/services/bookingService";

export default function SubBarberBookingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();
  const themeImages = useThemeImages();

  const staffAvatar =
    user?.avatar_url || user?.logo_url
      ? { uri: user.avatar_url || user.logo_url }
      : themeImages.profilePic;

  const [filter, setFilter] = useState<
    "All" | "Pending" | "Confirmed" | "Completed"
  >("All");
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSwitchingToSolo, setIsSwitchingToSolo] = useState(false);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [newSalonEmail, setNewSalonEmail] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);
  const [isVerifyingNewSalon, setIsVerifyingNewSalon] = useState(false);
  const [verifiedNewSalonName, setVerifiedNewSalonName] = useState<string | null>(null);

  const handleSwitchToSolo = async () => {
    setIsSwitchingToSolo(true);
    try {
      await barberService.switchToSoloBarber();
      showToast("Converted to independent Solo Barber successfully!", "success");
      await refreshUser();
      router.replace("/(barbers)");
    } catch (e: any) {
      showToast(e?.message || "Failed to switch to solo account.", "error");
    } finally {
      setIsSwitchingToSolo(false);
    }
  };

  const handleVerifyNewSalon = async (email: string) => {
    if (!email || !email.includes("@")) return;
    setIsVerifyingNewSalon(true);
    try {
      const res = await authService.validateSalonEmail(email);
      if (res.valid && res.salon) {
        setVerifiedNewSalonName(res.salon.name || "Verified Salon");
      } else {
        setVerifiedNewSalonName(null);
        showToast("No active salon found with this email.", "error");
      }
    } catch {
      setVerifiedNewSalonName(null);
    } finally {
      setIsVerifyingNewSalon(false);
    }
  };

  const handleRetrySalonRequest = async () => {
    if (!newSalonEmail.trim() || !newSalonEmail.includes("@")) {
      showToast("Please enter a valid salon email address.", "error");
      return;
    }
    setIsRetrying(true);
    try {
      await barberService.retrySalonRequest(newSalonEmail.trim());
      showToast("Join request sent to salon manager!", "success");
      setShowRetryModal(false);
      setNewSalonEmail("");
      setVerifiedNewSalonName(null);
      await refreshUser();
      await fetchBookings();
    } catch (e: any) {
      showToast(e?.message || "Failed to send join request.", "error");
    } finally {
      setIsRetrying(false);
    }
  };

  const [actionLoadingId, setActionLoadingId] = useState<
    string | number | null
  >(null);

  const fetchBookings = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await bookingService.getMySchedule(user.id);
      const list = res?.bookings || [];
      // Sub-barber only sees bookings assigned to their own user id
      const myOnly = list.filter(
        (b: any) =>
          !b.barber_id ||
          b.barber_id === user.id ||
          String(b.barber_id) === String(user.id)
      );
      setBookings(myOnly);
    } catch {
      setBookings([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchBookings();
    }, [fetchBookings])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const handleAccept = async (booking: BookingReceipt) => {
    const id = booking.booking_id || booking.id;
    if (!id) return;
    setActionLoadingId(id);
    try {
      await bookingService.acceptBooking(id);
      showToast("Appointment accepted and confirmed!", "success");
      await fetchBookings();
    } catch (err: any) {
      showToast(err.message || "Failed to accept booking", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = (booking: BookingReceipt) => {
    const id = booking.booking_id || booking.id;
    if (!id) return;
    Alert.alert(
      t("common.declineAppointment"),
      t("common.declineAppointmentMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.decline"),
          style: "destructive",
          onPress: async () => {
            setActionLoadingId(id);
            try {
              await bookingService.declineBooking(id, "Declined by stylist");
              showToast(t("common.declined"), "info");
              await fetchBookings();
            } catch (err: any) {
              showToast(err.message || t("common.error"), "error");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleUpdateStatus = async (
    booking: BookingReceipt,
    newStatus: "In Progress" | "Completed"
  ) => {
    const id = booking.booking_id || booking.id;
    if (!id) return;
    setActionLoadingId(id);
    try {
      await bookingService.updateBookingStatus(id, newStatus);
      showToast(`Appointment marked as ${newStatus}`, "success");
      await fetchBookings();
    } catch (err: any) {
      showToast(err.message || t("common.error"), "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === "All") return true;
    if (filter === "Pending") return b.status === "Pending";
    if (filter === "Confirmed")
      return b.status === "Confirmed" || b.status === "In Progress";
    if (filter === "Completed")
      return b.status === "Completed" || b.status === "Cancelled";
    return true;
  });

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === "Pending").length,
    [bookings]
  );
  const confirmedCount = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === "Confirmed" || b.status === "In Progress"
      ).length,
    [bookings]
  );
  const completedCount = useMemo(
    () => bookings.filter((b) => b.status === "Completed").length,
    [bookings]
  );

  const filterTabs = [
    { key: "All" as const, label: t("common.all") },
    { key: "Pending" as const, label: t("common.pending") },
    { key: "Confirmed" as const, label: t("common.confirmed") },
    { key: "Completed" as const, label: t("common.completed") },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Urban Personal Workspace Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(sub-barber)/profile")}
          style={styles.headerLeft}
        >
          <View
            style={[
              styles.avatarRing,
              {
                borderColor: colors.primary,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Image source={staffAvatar} style={styles.avatarImg} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetingText, { color: colors.secondarytext }]}>
              {user?.parent_salon_name
                ? `Stylist - ${user.parent_salon_name}`
                : t("subBarber.assignedSubtitle")}
            </Text>
            <Text
              style={[styles.title, { color: colors.primarytext }]}
              numberOfLines={1}
            >
              {user?.name || t("subBarber.myAppointments")}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerActions}>
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
            {unreadCount > 0 && (
              <View
                style={[
                  styles.unreadDot,
                  {
                    backgroundColor: colors.primary,
                    borderColor: colors.surface,
                  },
                ]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleRefresh}
            style={[
              styles.headerIconBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="refresh" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* PENDING SALON APPROVAL STATUS CARD */}
      {user?.account_status === "pending_salon_approval" && (
        <View
          style={[
            styles.approvalStatusCard,
            { backgroundColor: colors.surface, borderColor: "#F59E0B" },
          ]}
        >
          <View style={styles.statusCardHeader}>
            <View
              style={[
                styles.statusIconWrap,
                { backgroundColor: "rgba(245, 158, 11, 0.15)" },
              ]}
            >
              <Ionicons name="time-outline" size={20} color="#F59E0B" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusCardTitle, { color: colors.primarytext }]}>{t("subBarber.waitingForSalonApproval")}</Text>
              <Text style={[styles.statusCardDesc, { color: colors.secondarytext }]}>{t("subBarber.waitingForSalonApprovalDesc", { salon_name: user?.parent_salon_name || "the salon manager" })}</Text>
            </View>
          </View>
          <View style={styles.statusActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                await refreshUser();
                await fetchBookings();
                showToast("Status refreshed.", "info");
              }}
              style={[
                styles.statusBtnSecondary,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Ionicons name="refresh" size={14} color={colors.primarytext} />
              <Text style={[styles.statusBtnSecondaryText, { color: colors.primarytext }]}>{t("barber.checkStatus")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSwitchingToSolo}
              onPress={handleSwitchToSolo}
              style={[styles.statusBtnPrimary, { backgroundColor: colors.primary }]}
            >
              {isSwitchingToSolo ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={[styles.statusBtnPrimaryText, { color: colors.onBrand }]}>{t("subBarber.switchToSolo")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* REJECTED / DECLINED STATUS CARD */}
      {user?.account_status === "rejected" && (
        <View
          style={[
            styles.approvalStatusCard,
            { backgroundColor: colors.surface, borderColor: "#EF4444" },
          ]}
        >
          <View style={styles.statusCardHeader}>
            <View
              style={[
                styles.statusIconWrap,
                { backgroundColor: "rgba(239, 68, 68, 0.15)" },
              ]}
            >
              <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.statusCardTitle, { color: "#EF4444" }]}>{t("subBarber.joinRequestDeclined")}</Text>
              <Text style={[styles.statusCardDesc, { color: colors.secondarytext }]}>{t("subBarber.joinRequestDeclinedDesc")}</Text>
            </View>
          </View>
          <View style={styles.statusActionRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowRetryModal(true)}
              style={[
                styles.statusBtnSecondary,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.statusBtnSecondaryText, { color: colors.primarytext }]}>{t("subBarber.tryAnotherSalon")}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSwitchingToSolo}
              onPress={handleSwitchToSolo}
              style={[styles.statusBtnPrimary, { backgroundColor: colors.primary }]}
            >
              {isSwitchingToSolo ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={[styles.statusBtnPrimaryText, { color: colors.onBrand }]}>{t("subBarber.continueAsSolo")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Personal Chair Queue Telemetry (Strictly Personal Counts — Zero Salon Earnings) */}
      <View
        style={[
          styles.personalSummaryCard,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <View style={styles.summaryTopRow}>
          <View style={styles.chairTagPill}>
            <View
              style={[styles.chairLiveDot, { backgroundColor: colors.primary }]}
            />
            <Text style={[styles.chairTagText, { color: colors.primary }]}>
              {t("subBarber.myAppointments") || "My Chair Schedule"}
            </Text>
          </View>
          <Text style={[styles.totalBadgeText, { color: colors.secondarytext }]}>
            {bookings.length} total
          </Text>
        </View>

        <View
          style={[
            styles.summaryMetricsStrip,
            { backgroundColor: colors.background, borderColor: colors.border },
          ]}
        >
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: colors.primary }]}>
              {confirmedCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>
              Active
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>
              {pendingCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>
              Pending
            </Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>
              Done
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {filterTabs.map((tab) => {
            const isSelected = filter === tab.key;
            const count =
              tab.key === "All"
                ? bookings.length
                : bookings.filter((b) =>
                    tab.key === "Pending"
                      ? b.status === "Pending"
                      : tab.key === "Confirmed"
                      ? b.status === "Confirmed" || b.status === "In Progress"
                      : b.status === "Completed" || b.status === "Cancelled"
                  ).length;

            return (
              <TouchableOpacity
                key={tab.key}
                activeOpacity={0.82}
                onPress={() => setFilter(tab.key)}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterTabText,
                    {
                      color: isSelected
                        ? colors.onBrand
                        : colors.secondarytext,
                    },
                  ]}
                >
                  {tab.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIconBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons
                name="calendar-outline"
                size={34}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {t("subBarber.noAppointmentsFound")}
            </Text>
            <Text style={[styles.emptySub, { color: colors.secondarytext }]}>
              {filter === "Pending"
                ? t("subBarber.noPendingBookings")
                : t("subBarber.noCategoryBookings")}
            </Text>
          </View>
        ) : (
          filteredBookings.map((b, idx) => {
            const id = b.booking_id || b.id || idx;
            const isPending = b.status === "Pending";
            const isConfirmed = b.status === "Confirmed";
            const isInProgress = b.status === "In Progress";
            const isCompleted = b.status === "Completed";
            const isActionLoading = actionLoadingId === id;

            const date = b.start_time ? new Date(b.start_time) : new Date();
            const dateStr = date.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const timeStr = date.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <View
                key={String(id)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: isPending
                      ? "rgba(245, 158, 11, 0.45)"
                      : colors.border,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.clientInfo}>
                    <Text
                      style={[styles.clientName, { color: colors.primarytext }]}
                    >
                      {b.client_name || "Client"}
                    </Text>
                    {b.client_phone ? (
                      <View style={styles.phoneRow}>
                        <Ionicons
                          name="call-outline"
                          size={12}
                          color={colors.secondarytext}
                        />
                        <Text
                          style={[
                            styles.clientPhone,
                            { color: colors.secondarytext },
                          ]}
                        >
                          {b.client_phone}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isPending
                          ? "rgba(245, 158, 11, 0.14)"
                          : isConfirmed
                          ? colors.brandSoft
                          : isInProgress
                          ? colors.infoSoft
                          : isCompleted
                          ? colors.successSoft
                          : colors.errorSoft,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        {
                          color: isPending
                            ? "#F59E0B"
                            : isConfirmed
                            ? colors.primary
                            : isInProgress
                            ? colors.info
                            : isCompleted
                            ? colors.success
                            : colors.error,
                        },
                      ]}
                    >
                      {b.status === "Pending"
                        ? t("common.pending")
                        : b.status === "Confirmed"
                        ? t("common.confirmed")
                        : b.status === "In Progress"
                        ? t("common.inProgress")
                        : b.status === "Completed"
                        ? t("common.completed")
                        : b.status === "Cancelled"
                        ? t("common.cancelled")
                        : b.status || t("common.confirmed")}
                    </Text>
                  </View>
                </View>

                {/* Service Details */}
                <View
                  style={[
                    styles.serviceRow,
                    { borderTopColor: colors.border },
                  ]}
                >
                  <View style={styles.serviceLeft}>
                    <Ionicons
                      name="cut-outline"
                      size={16}
                      color={colors.primary}
                    />
                    <Text
                      style={[
                        styles.serviceName,
                        { color: colors.primarytext },
                      ]}
                      numberOfLines={1}
                    >
                      {b.custom_hairstyle_name ||
                        t("subBarber.hairstyleService")}
                    </Text>
                  </View>
                  <Text style={[styles.priceText, { color: colors.primary }]}>
                    {(b.total_price || 0).toLocaleString()} CFA
                  </Text>
                </View>

                {/* Date & Time */}
                <View style={styles.timeRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={colors.secondarytext}
                  />
                  <Text
                    style={[styles.timeText, { color: colors.secondarytext }]}
                  >
                    {dateStr} - {timeStr}
                  </Text>
                </View>

                {/* Action Buttons */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDecline(b)}
                      disabled={isActionLoading}
                      style={[
                        styles.actionBtn,
                        styles.declineBtn,
                        { opacity: isActionLoading ? 0.7 : 1 },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons
                            name="close-circle-outline"
                            size={16}
                            color="#EF4444"
                          />
                          <Text style={styles.declineBtnText}>
                            {t("common.decline")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleAccept(b)}
                      disabled={isActionLoading}
                      style={[
                        styles.actionBtn,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onBrand}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={16}
                            color={colors.onBrand}
                          />
                          <Text
                            style={[
                              styles.acceptBtnText,
                              { color: colors.onBrand },
                            ]}
                          >
                            {t("subBarber.acceptBooking")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {isConfirmed && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => handleUpdateStatus(b, "In Progress")}
                      disabled={isActionLoading}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.background,
                          borderWidth: 1,
                          borderColor: colors.border,
                          opacity: isActionLoading ? 0.75 : 1,
                        },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.primary}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="play-outline"
                            size={16}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.acceptBtnText,
                              { color: colors.primarytext },
                            ]}
                          >
                            {t("subBarber.startService")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleUpdateStatus(b, "Completed")}
                      disabled={isActionLoading}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity: isActionLoading ? 0.75 : 1,
                        },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onBrand}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-done"
                            size={16}
                            color={colors.onBrand}
                          />
                          <Text
                            style={[
                              styles.acceptBtnText,
                              { color: colors.onBrand },
                            ]}
                          >
                            {t("common.completed")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {isInProgress && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleUpdateStatus(b, "Completed")}
                      disabled={isActionLoading}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          flex: 1,
                          opacity: isActionLoading ? 0.75 : 1,
                        },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={colors.onBrand}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name="checkmark-done"
                            size={16}
                            color={colors.onBrand}
                          />
                          <Text
                            style={[
                              styles.acceptBtnText,
                              { color: colors.onBrand },
                            ]}
                          >
                            {t("subBarber.completeAppointment")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
          {/* Retry Salon Modal */}
      <CustomModal
        visible={showRetryModal}
        onClose={() => {
          setShowRetryModal(false);
          setNewSalonEmail("");
          setVerifiedNewSalonName(null);
        }}
        title={t("subBarber.tryAnotherSalonTitle")}
      >
        <View style={{ gap: 12, paddingVertical: 8 }}>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: colors.background, borderColor: colors.border },
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={colors.secondarytext} />
            <TextInput
              value={newSalonEmail}
              onChangeText={(text) => {
                setNewSalonEmail(text);
                setVerifiedNewSalonName(null);
              }}
              onEndEditing={() => handleVerifyNewSalon(newSalonEmail)}
              placeholder="e.g. manager@prestigelounge.cm"
              placeholderTextColor={colors.secondarytext}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.textInput, { color: colors.primarytext }]}
            />
          </View>

          {isVerifyingNewSalon ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : verifiedNewSalonName ? (
            <View style={[styles.verifiedBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: colors.primary }]}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={[styles.verifiedBadgeText, { color: colors.primary }]}>{t("subBarber.foundSalon", { name: verifiedNewSalonName })}</Text>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowRetryModal(false)}
              style={[styles.modalCancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.modalCancelText, { color: colors.secondarytext }]}>{t("common.cancel") || "Cancel"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isRetrying || !newSalonEmail.trim()}
              onPress={handleRetrySalonRequest}
              style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
            >
              {isRetrying ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={[styles.modalSubmitText, { color: colors.onBrand }]}>{t("subBarber.sendJoinRequest")}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingRight: 10,
  },
  avatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 2,
    overflow: "hidden",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  greetingText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginBottom: 2,
  },
  title: {
    fontSize: 19,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  personalSummaryCard: {
    marginHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chairTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(199, 243, 107, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9,
  },
  chairLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chairTagText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  totalBadgeText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  summaryMetricsStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    paddingVertical: 10,
  },
  summaryCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryNum: {
    fontSize: 17,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 24,
  },
  filterWrap: {
    paddingVertical: 6,
  },
  filterRow: {
    paddingHorizontal: 18,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 104,
    gap: 12,
  },
  centerContainer: {
    paddingTop: 72,
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: 64,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 19,
  },
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
  },
  clientPhone: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    gap: 8,
  },
  serviceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  serviceName: {
    fontSize: 13.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
    flex: 1,
  },
  priceText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  declineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  declineBtnText: {
    color: "#EF4444",
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    fontSize: 12.5,
  },
  acceptBtnText: {
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    fontSize: 12.5,
  },
  approvalStatusCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  statusCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  statusIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statusCardTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  statusCardDesc: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
    marginTop: 2,
  },
  statusActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  statusBtnSecondary: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  statusBtnSecondaryText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  statusBtnPrimary: {
    flex: 1.2,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBtnPrimaryText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.regular,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  verifiedBadgeText: {
    fontSize: 11.5,
    fontFamily: FontFamily.medium,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 12.5,
    fontFamily: FontFamily.medium,
  },
  modalSubmitBtn: {
    flex: 1.5,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});
