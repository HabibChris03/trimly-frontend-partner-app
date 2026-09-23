import { CustomModal } from "@/components/ui/CustomModal";
import { AddServiceModal } from "@/components/barber/AddServiceModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { BARBER_DASHBOARD_TUTORIAL } from "@/constants/barberTutorials";
import { DashboardMetricsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { useThemeImages } from "@/hooks/useThemeImages";
import { barberService } from "@/services/barberService";
import { bookingService } from "@/services/bookingService";
import { reviewService } from "@/services/reviewService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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

interface AgendaItem {
  id: string;
  time: string;
  client: string;
  service: string;
  phone: string;
  accentColor: string;
  status: "Completed" | "Current" | "Upcoming";
}

interface ServiceItem {
  id: string;
  name: string;
  duration: number; // minutes
  price: number;
  category?: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

interface StaffMember {
  id: number;
  name: string;
  role: string;
  status: "Active" | "Off Duty" | "On Break";
  avatarIndex?: number;
}

export default function BarberDashboardScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { handleScroll, showTabBar } = useTabBarVisibility();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );
  
  const themeImages = useThemeImages();
  const appLogo = themeImages.logo;
  const profilePic = themeImages.profilePic;

  const { user } = useAuth();
  const barberAvatar = user?.avatar_url || user?.logo_url
    ? { uri: user.avatar_url || user.logo_url }
    : profilePic;
  const barberImg1 = barberAvatar;
  const barberImg2 = barberAvatar;
  const barberImg3 = barberAvatar;
  const barberImg4 = barberAvatar;
  const { showToast } = useToast();
  const { unreadCount } = useNotifications();

  const barberId = user?.id || 4;
  let salonDisplayName = "";
  if (user?.name && user.name.includes("(") && user.name.includes(")")) {
    const match = user.name.match(/\((.*?)\)/);
    if (match && match[1]?.trim()) {
      salonDisplayName = match[1].trim();
    }
  }
  if (!salonDisplayName) {
    salonDisplayName =
      (user as any)?.salon_name ||
      (user?.role === "salon" ? user?.name : "") ||
      user?.name?.trim().split("(")[0] ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "Trimly Salon";
  }

  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [chairsCapacity, setChairsCapacity] = useState<number>(
    user?.capacity || user?.working_chairs || 5
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.capacity || user?.working_chairs) {
      setChairsCapacity(user.capacity || user.working_chairs || 1);
    }
  }, [user?.capacity, user?.working_chairs]);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [barberRating, setBarberRating] = useState<number>(0.0);
  const [barberReviewCount, setBarberReviewCount] = useState<number>(0);
  const [autoConfirm, setAutoConfirm] = useState<boolean>(
    (user as any)?.auto_confirm ?? true
  );
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [isUpdatingAutoConfirm, setIsUpdatingAutoConfirm] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<any>(null);
  const [agendaItemModal, setAgendaItemModal] = useState<AgendaItem | null>(
    null,
  );
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(
    null,
  );

  const handleToggleAutoConfirm = async (val: boolean) => {
    setAutoConfirm(val);
    setIsUpdatingAutoConfirm(true);
    try {
      await barberService.toggleAutoConfirm(val);
      if (user) {
        (user as any).auto_confirm = val;
      }
      showToast(
        val
          ? "Auto-confirm enabled: bookings are approved automatically."
          : "Auto-confirm disabled: new bookings will be held as Pending for your review.",
        "success"
      );
    } catch {
      setAutoConfirm(!val);
      showToast("Failed to update auto-confirm setting.", "error");
    } finally {
      setIsUpdatingAutoConfirm(false);
    }
  };

  const handleAcceptBooking = async (booking: any) => {
    const id = booking.booking_id || booking.id;
    setActionLoadingId(id);
    try {
      await bookingService.acceptBooking(id);
      showToast("Appointment accepted and confirmed! Client notified.", "success");
      await fetchDashboardData();
    } catch {
      showToast("Failed to accept booking.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineBooking = async (booking: any) => {
    const id = booking.booking_id || booking.id;
    setActionLoadingId(id);
    try {
      await bookingService.declineBooking(id);
      showToast("Appointment declined.", "info");
      await fetchDashboardData();
    } catch {
      showToast("Failed to decline booking.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      // Load real schedule and today's bookings
      const schedule = await bookingService.getMySchedule(barberId).catch(() => null);
      if (schedule) {
        const list = Array.isArray(schedule)
          ? schedule
          : schedule.schedule || schedule.bookings || schedule.upcoming_bookings || [];

        const pendings = list.filter((b: any) => b.status === "Pending");
        setPendingBookings(pendings);

        let total = 0;
        const confirmedOrUpcoming = list.filter((b: any) => b.status !== "Cancelled");
        const mapped: AgendaItem[] = confirmedOrUpcoming.map((b: any, idx: number) => {
          const d = b.start_time ? new Date(b.start_time) : new Date();
          const timeStr = d.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isPast = d.getTime() < Date.now();
          total += b.total_price || 0;

          return {
            id: `dash-ag-${b.booking_id || b.id || idx}`,
            time: timeStr,
            client: b.client_name || b.name || "Valued Client",
            service: b.custom_hairstyle_name || "Custom Cut & Style",
            phone: b.client_phone || "+237 670 00 00 00",
            accentColor:
              idx % 3 === 0
                ? colors.primary
                : idx % 3 === 1
                  ? "#A8B5AD"
                  : "#5A6557",
            status: isPast ? "Completed" : idx === 0 ? "Current" : "Upcoming",
          };
        });
        setAgenda(mapped);
        setTodayEarnings(total);
      }

      // Load barber's services
      const liveServices = await barberService.getBarberServices(barberId);
      setServices(
        liveServices.map((s) => ({
          id: s.id?.toString() || `sv_${Date.now()}`,
          name: s.name,
          duration: s.duration_minutes,
          price: s.price,
        })),
      );

      // Load salon staff
      const staffRes = await barberService
        .listSalonStaff(barberId)
        .catch(() => null);
      if (Array.isArray(staffRes) && staffRes.length > 0) {
        setStaffList(staffRes);
      }

      // Load salon working chairs & capacity from database
      const capRes = await barberService
        .getSalonCapacity(barberId)
        .catch(() => null);
      if (capRes && capRes.capacity) {
        setChairsCapacity(capRes.capacity);
      } else if (user?.capacity || user?.working_chairs) {
        setChairsCapacity(user.capacity || user.working_chairs || 1);
      }

      // Load barber reviews & live rating from database
      try {
        const reviewsRes = await reviewService.getBarberReviews(barberId);
        if (reviewsRes) {
          setBarberRating(reviewsRes.average_rating !== undefined && reviewsRes.average_rating !== null ? reviewsRes.average_rating : 0.0);
          setBarberReviewCount(reviewsRes.total_reviews || 0);
        }
      } catch {
        setBarberRating(0.0);
        setBarberReviewCount(0);
      }
    } catch {
      setAgenda([]);
    }
  }, [barberId, colors.primary, user?.capacity, user?.working_chairs]);

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      await fetchDashboardData();
      setIsLoading(false);
    }
    initialLoad();
  }, [fetchDashboardData]);

  // Automatically refresh when screen regains focus (e.g. returning from Salon Management)
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
  }, [fetchDashboardData]);

  // Modal State for Adding/Editing Service
  const [serviceModalVisible, setServiceModalVisible] = useState(false);
  const [editingServiceItem, setEditingServiceItem] = useState<any>(null);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  const handleOpenAddService = () => {
    setEditingServiceItem(null);
    setServiceModalVisible(true);
  };

  const handleOpenEditService = (service: ServiceItem) => {
    setEditingServiceItem({
      id: service.id,
      name: service.name,
      duration_minutes: service.duration,
      price: service.price,
    });
    setServiceModalVisible(true);
  };

  const handleServiceSaved = (_saved: any) => {
    fetchDashboardData();
  };

  const handleDeleteService = (service: ServiceItem) => {
    setServiceToDelete(service);
  };

  const confirmDeleteService = async () => {
    if (serviceToDelete) {
      const barberId = user?.id || 4;
      await barberService.deleteService(serviceToDelete.id, barberId);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      showToast(`Service "${serviceToDelete.name}" removed.`, "info");
      setServiceToDelete(null);
    }
  };

  const handleAgendaPress = (item: AgendaItem) => {
    setAgendaItemModal(item);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Decorative ambient background glows */}
      <View
        pointerEvents="none"
        style={[styles.circle1, { backgroundColor: "#A3B39C", opacity: 0.08 }]}
      />
      <View
        pointerEvents="none"
        style={[styles.circle2, { backgroundColor: "#D4B996", opacity: 0.05 }]}
      />

      {/* Top Header Section */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={appLogo}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <View style={styles.headerTitleCol}>
            <Text
              style={[
                styles.dashboardSubtitle,
                { color: colors.secondarytext },
              ]}
              numberOfLines={1}
            >
              {t("barber.dashboardTitle")}
            </Text>
            <Text
              style={[styles.dashboardTitle, { color: colors.primarytext }]}
              numberOfLines={1}
            >
              {salonDisplayName}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={21}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/notifications")}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.primarytext}
            />
            {unreadCount > 0 && (
              <View
                style={[
                  styles.notificationBadge,
                  { backgroundColor: colors.primary },
                ]}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(barbers)/profile")}
            style={[
              styles.headerAvatarButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Image source={barberAvatar} style={styles.avatarImage} />
          </TouchableOpacity>
        </View>
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
        {isLoading ? (
          <DashboardMetricsSkeleton />
        ) : (
          <View style={styles.metricsRow}>
            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Text
                style={[styles.metricLabel, { color: colors.secondarytext }]}
              >
                {t("barber.revenueToday")}
              </Text>
              <Text style={[styles.metricValue, { color: colors.primarytext }]}>
                {todayEarnings.toLocaleString()} CFA
              </Text>
              <View style={styles.metricTrendRow}>
                <Ionicons name="trending-up" size={14} color="#A8B5AD" />
                <Text
                  style={[
                    styles.metricTrendText,
                    { color: colors.secondarytext },
                  ]}
                >
                  Live
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.metricCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Text
                style={[styles.metricLabel, { color: colors.secondarytext }]}
              >
                {t("barber.rating")}
              </Text>
              <Text style={[styles.metricValue, { color: colors.primarytext }]}>
                {barberRating.toFixed(1)}
              </Text>
              <View style={styles.metricTrendRow}>
                <Ionicons name="star" size={13} color="#FBBF24" />
                <Text
                  style={[
                    styles.metricTrendText,
                    { color: colors.secondarytext },
                  ]}
                >
                  {barberReviewCount} {barberReviewCount === 1 ? "review" : "reviews"}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* AUTO-CONFIRM SETTINGS BANNER */}
        <View
          style={[
            styles.autoConfirmCard,
            {
              backgroundColor: colors.surface,
              borderColor: autoConfirm ? colors.surfacevariant : "#F59E0B",
            },
          ]}
        >
          <View style={styles.autoConfirmLeft}>
            <View
              style={[
                styles.autoConfirmIcon,
                { backgroundColor: autoConfirm ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)" },
              ]}
            >
              <Ionicons
                name={autoConfirm ? "flash" : "time-outline"}
                size={20}
                color={autoConfirm ? "#10B981" : "#F59E0B"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.autoConfirmTitle, { color: colors.primarytext }]}>
                Auto-Confirm Appointments
              </Text>
              <Text style={[styles.autoConfirmSub, { color: colors.secondarytext }]}>
                {autoConfirm
                  ? "Bookings are automatically accepted instantly"
                  : "Requests require your manual review & confirmation"}
              </Text>
            </View>
          </View>
          <Switch
            value={autoConfirm}
            onValueChange={handleToggleAutoConfirm}
            disabled={isUpdatingAutoConfirm}
            trackColor={{ false: "#767577", true: colors.primary }}
            thumbColor={autoConfirm ? "#FFFFFF" : "#f4f3f4"}
          />
        </View>

        {/* PENDING BOOKINGS AWAITING APPROVAL */}
        {pendingBookings.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingSectionHeader}>
              <View style={styles.pendingSectionTitleRow}>
                <View style={styles.pendingDot} />
                <Text style={[styles.pendingSectionTitle, { color: colors.primarytext }]}>
                  Pending Approval ({pendingBookings.length})
                </Text>
              </View>
              <Text style={[styles.pendingSectionSub, { color: "#F59E0B" }]}>
                Action required
              </Text>
            </View>

            {pendingBookings.map((pb, idx) => {
              const pid = pb.booking_id || pb.id || idx;
              const isActionLoading = actionLoadingId === pid;
              const d = pb.start_time ? new Date(pb.start_time) : new Date();
              const dateStr = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
              const timeStr = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

              return (
                <View
                  key={String(pid)}
                  style={[
                    styles.pendingCard,
                    { backgroundColor: colors.surface, borderColor: "#F59E0B" },
                  ]}
                >
                  <View style={styles.pendingCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingClientName, { color: colors.primarytext }]}>
                        {pb.client_name || "Client"}
                      </Text>
                      <Text style={[styles.pendingServiceText, { color: colors.primary }]}>
                        ✂️ {pb.custom_hairstyle_name || "Hairstyle Service"}
                      </Text>
                      {pb.barber_name && user?.role === "salon" ? (
                        <Text style={[styles.pendingStylistTag, { color: colors.secondarytext }]}>
                          Assigned to: {pb.barber_name}
                        </Text>
                      ) : null}
                      <Text style={[styles.pendingTimeText, { color: colors.secondarytext }]}>
                        📅 {dateStr} at {timeStr} • {(pb.total_price || 0).toLocaleString()} CFA
                      </Text>
                    </View>
                  </View>

                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isActionLoading}
                      onPress={() => handleDeclineBooking(pb)}
                      style={[styles.pendingBtn, styles.pendingDeclineBtn, { opacity: isActionLoading ? 0.7 : 1 }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                          <Text style={styles.pendingDeclineText}>Decline</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isActionLoading}
                      onPress={() => handleAcceptBooking(pb)}
                      style={[styles.pendingBtn, styles.pendingAcceptBtn, { backgroundColor: colors.primary }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.background} />
                          <Text style={[styles.pendingAcceptText, { color: colors.background }]}>
                            Accept & Confirm
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* QUICK MANAGEMENT SHORTCUTS ROW */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/manage-services")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons name="cut-outline" size={18} color={colors.primary} />
            </View>
            <Text
              style={[styles.quickActionTitle, { color: colors.primarytext }]}
            >
              Services
            </Text>
            <Text
              style={[styles.quickActionSub, { color: colors.secondarytext }]}
            >
              {services.length} cuts
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/manage-staff")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons
                name="people-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text
              style={[styles.quickActionTitle, { color: colors.primarytext }]}
            >
              Stylists
            </Text>
            <Text
              style={[styles.quickActionSub, { color: colors.secondarytext }]}
            >
              {staffList.length} staff
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/salon-management")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons
                name="business-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text
              style={[styles.quickActionTitle, { color: colors.primarytext }]}
            >
              Salon
            </Text>
            <Text
              style={[styles.quickActionSub, { color: colors.secondarytext }]}
            >
              {chairsCapacity} chairs
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(barbers)/portfolio")}
            style={[
              styles.quickActionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.quickActionIcon,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons
                name="images-outline"
                size={18}
                color={colors.primary}
              />
            </View>
            <Text
              style={[styles.quickActionTitle, { color: colors.primarytext }]}
            >
              Portfolio
            </Text>
            <Text
              style={[styles.quickActionSub, { color: colors.secondarytext }]}
            >
              Gallery
            </Text>
          </TouchableOpacity>
        </View>

        {/* SALON CAPACITY & CHAIRS CARD */}
        <View
          style={[
            styles.capacityCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <View style={styles.capacityLeft}>
            <View
              style={[
                styles.capacityIconCircle,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons name="business" size={20} color={colors.primary} />
            </View>
            <View>
              <Text
                style={[styles.capacityTitle, { color: colors.primarytext }]}
              >
                Salon Lounge Capacity
              </Text>
              <Text
                style={[styles.capacitySub, { color: colors.secondarytext }]}
              >
                {chairsCapacity} Styling Chairs Active • Ready for Clients
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/salon-management")}
            style={[
              styles.manageCapacityBtn,
              { backgroundColor: colors.primary },
            ]}
          >
            <Text style={styles.manageCapacityBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        {/* SALON STYLISTS & STAFF ROSTER SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Salon Stylists & Staff
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.secondarytext }]}
            >
              {staffList.length} barbers registered
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/Pages/manage-staff")}
            style={[styles.addNewButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="person-add" size={15} color="#1C1E1B" />
            <Text style={styles.addNewButtonText}>Invite</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal Stylists Scroll */}
        {staffList.length === 0 ? (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/Pages/manage-staff")}
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
              borderWidth: 1,
              borderRadius: 16,
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 12,
                flex: 1,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: `${colors.primary}25`,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="person-add-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: colors.primarytext,
                    fontWeight: "600",
                    fontSize: 13.5,
                  }}
                >
                  No stylists added yet
                </Text>
                <Text style={{ color: colors.secondarytext, fontSize: 12 }}>
                  Tap to search and invite clients to join your salon
                </Text>
              </View>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stylistsScroll}
          >
            {staffList.map((member, idx) => {
              const avatar =
                idx % 4 === 0
                  ? barberImg1
                  : idx % 4 === 1
                    ? barberImg2
                    : idx % 4 === 2
                      ? barberImg3
                      : barberImg4;

              return (
                <TouchableOpacity
                  key={member.id}
                  activeOpacity={0.85}
                  onPress={() => router.push("/Pages/manage-staff")}
                  style={[
                    styles.staffPreviewCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <View style={styles.staffAvatarWrap}>
                    <Image source={avatar} style={styles.staffPreviewAvatar} />
                    <View
                      style={[
                        styles.staffStatusDot,
                        {
                          backgroundColor:
                            member.status === "Active" ? "#10B981" : "#6B7280",
                        },
                      ]}
                    />
                  </View>

                  <Text
                    style={[
                      styles.staffPreviewName,
                      { color: colors.primarytext },
                    ]}
                    numberOfLines={1}
                  >
                    {member.name}
                  </Text>
                  <Text
                    style={[
                      styles.staffPreviewRole,
                      { color: colors.secondarytext },
                    ]}
                    numberOfLines={1}
                  >
                    {member.role}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
            Today's Agenda
          </Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/(barbers)/availability")}
            style={styles.editHoursButton}
          >
            <Ionicons
              name="time-outline"
              size={15}
              color={colors.secondarytext}
            />
            <Text
              style={[styles.editHoursText, { color: colors.secondarytext }]}
            >
              Edit Hours
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.agendaBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          {isLoading ? (
            <View style={{ padding: 12, gap: 10 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Skeleton width={55} height={14} borderRadius={4} />
                <Skeleton width={3} height={50} borderRadius={2} />
                <View style={{ flex: 1 }}>
                  <Skeleton
                    width="60%"
                    height={15}
                    borderRadius={4}
                    style={{ marginBottom: 6 }}
                  />
                  <Skeleton width="40%" height={12} borderRadius={4} />
                </View>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Skeleton width={55} height={14} borderRadius={4} />
                <Skeleton width={3} height={50} borderRadius={2} />
                <View style={{ flex: 1 }}>
                  <Skeleton
                    width="70%"
                    height={15}
                    borderRadius={4}
                    style={{ marginBottom: 6 }}
                  />
                  <Skeleton width="50%" height={12} borderRadius={4} />
                </View>
              </View>
            </View>
          ) : agenda.length === 0 ? (
            <View style={{ paddingVertical: 24, alignItems: "center" }}>
              <Ionicons
                name="calendar-outline"
                size={36}
                color={colors.secondarytext}
              />
              <Text
                style={{
                  color: colors.primarytext,
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                No Appointments Today
              </Text>
              <Text
                style={{
                  color: colors.secondarytext,
                  fontSize: 12.5,
                  marginTop: 2,
                }}
              >
                Bookings made by clients will appear here live.
              </Text>
            </View>
          ) : (
            agenda.map((item) => (
              <View key={item.id} style={styles.agendaRowItem}>
                <Text
                  style={[
                    styles.agendaTimeText,
                    { color: colors.secondarytext },
                  ]}
                >
                  {item.time}
                </Text>

                <View
                  style={[
                    styles.agendaAccentBar,
                    { backgroundColor: item.accentColor },
                  ]}
                >
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleAgendaPress(item)}
                  style={[
                    styles.agendaClientCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <View style={styles.agendaClientDetails}>
                    <Text
                      style={[
                        styles.agendaClientName,
                        { color: colors.primarytext },
                      ]}
                    >
                      {item.client}
                    </Text>
                    <Text
                      style={[
                        styles.agendaClientService,
                        { color: colors.secondarytext },
                      ]}
                    >
                      {item.service}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.agendaStatusBadge,
                      {
                        backgroundColor:
                          item.status === "Completed"
                            ? "rgba(142, 167, 140, 0.2)"
                            : item.status === "Current"
                              ? "rgba(200, 138, 138, 0.2)"
                              : "rgba(194, 164, 115, 0.2)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.agendaStatusText,
                        {
                          color:
                            item.status === "Completed"
                              ? "#8EA78C"
                              : item.status === "Current"
                                ? "#C88A8A"
                                : "#C2A473",
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Your Services
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.secondarytext }]}
            >
              Manage pricing and duration
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenAddService}
            style={[styles.addNewButton, { backgroundColor: "#A3B39C" }]}
          >
            <Ionicons name="add" size={16} color="#1C1E1B" />
            <Text style={styles.addNewButtonText}>Add New</Text>
          </TouchableOpacity>
        </View>

        {/* Services List */}
        <View style={styles.servicesList}>
          {services.length === 0 ? (
            <View
              style={{
                paddingVertical: 24,
                alignItems: "center",
                backgroundColor: colors.surface,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: colors.surfacevariant,
                paddingHorizontal: 16,
              }}
            >
              <Ionicons
                name="cut-outline"
                size={32}
                color={colors.secondarytext}
              />
              <Text
                style={{
                  color: colors.primarytext,
                  fontSize: 14,
                  fontWeight: "600",
                  marginTop: 8,
                }}
              >
                No Services Added Yet
              </Text>
              <Text
                style={{
                  color: colors.secondarytext,
                  fontSize: 12.5,
                  marginTop: 2,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                Create your haircut and grooming menu with custom durations, categories, and prices.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenAddService}
                style={[styles.addNewButton, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="add" size={16} color="#1C1E1B" />
                <Text style={styles.addNewButtonText}>Add New Service</Text>
              </TouchableOpacity>
            </View>
          ) : (
            services.map((service) => (
              <View
                key={service.id}
                style={[
                  styles.serviceItemCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <View style={styles.serviceItemInfo}>
                  <Text
                    style={[
                      styles.serviceItemName,
                      { color: colors.primarytext },
                    ]}
                  >
                    {service.name}
                  </Text>
                  <Text
                    style={[
                      styles.serviceItemDurationPrice,
                      { color: colors.secondarytext },
                    ]}
                  >
                    {service.duration} mins • {service.price} CFA
                  </Text>
                </View>

                <View style={styles.serviceActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenEditService(service)}
                    style={styles.serviceActionButton}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={18}
                      color={colors.secondarytext}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleDeleteService(service)}
                    style={styles.serviceActionButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color={colors.secondarytext}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Full-Screen Add / Edit Service Modal (Identical to Service/Pricing Page) */}
      <AddServiceModal
        visible={serviceModalVisible}
        onClose={() => setServiceModalVisible(false)}
        onSaved={handleServiceSaved}
        editingService={editingServiceItem}
        barberId={barberId}
      />

      {/* Interactive Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="barber_dashboard"
        title={BARBER_DASHBOARD_TUTORIAL.title}
        subtitle={BARBER_DASHBOARD_TUTORIAL.subtitle}
        steps={BARBER_DASHBOARD_TUTORIAL.steps}
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        autoTrigger={true}
      />

      {/* Agenda Item Detail Modal */}
      <CustomModal
        visible={!!agendaItemModal}
        onClose={() => setAgendaItemModal(null)}
        title={agendaItemModal ? agendaItemModal.client : "Client Session"}
        description={
          agendaItemModal
            ? `Service: ${agendaItemModal.service}\nScheduled Time: ${agendaItemModal.time}\nPhone: ${agendaItemModal.phone}\nStatus: ${agendaItemModal.status}`
            : ""
        }
        icon="cut-outline"
        primaryText="Start Service"
        onPrimary={() => {
          showToast(
            `Now cutting ${agendaItemModal?.client}'s hair.`,
            "success",
          );
          setAgendaItemModal(null);
        }}
        secondaryText="Close"
        onSecondary={() => setAgendaItemModal(null)}
      />

      {/* Service Deletion Modal */}
      <CustomModal
        visible={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        title="Delete Service"
        description={
          serviceToDelete
            ? `Are you sure you want to remove "${serviceToDelete.name}" from your service catalog?`
            : ""
        }
        icon="trash-outline"
        primaryText="Delete"
        primaryDanger={true}
        secondaryText="Cancel"
        onPrimary={confirmDeleteService}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  circle1: {
    width: 240,
    height: 240,
    borderRadius: 120,
    position: "absolute",
    top: -40,
    left: -40,
    zIndex: -1,
  },
  circle2: {
    width: 320,
    height: 320,
    borderRadius: 160,
    position: "absolute",
    top: 60,
    right: -80,
    zIndex: -1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 110,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 10,
  },
  headerLogo: {
    width: 38,
    height: 38,
    borderRadius: 10,
  },
  headerTitleCol: {
    flex: 1,
  },
  dashboardSubtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  dashboardTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerAvatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 26,
  },
  metricCard: {
    flex: 1,
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 12.5,
    fontWeight: "500",
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  metricTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metricTrendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  editHoursButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editHoursText: {
    fontSize: 13,
    fontWeight: "500",
  },
  agendaBox: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  agendaRowItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  agendaTimeText: {
    fontSize: 12.5,
    fontWeight: "500",
    width: 68,
  },
  agendaAccentBar: {
    width: 3.5,
    height: 32,
    borderRadius: 2,
    marginRight: 10,
  },
  agendaClientCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  agendaClientDetails: {
    flex: 1,
  },
  agendaClientName: {
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  agendaClientService: {
    fontSize: 12,
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
  },
  addNewButtonText: {
    color: "#1C1E1B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  servicesList: {
    gap: 10,
  },
  serviceItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 3,
  },
  serviceItemDurationPrice: {
    fontSize: 12.5,
  },
  serviceActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  serviceActionButton: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#1C1E1B",
    fontSize: 14,
    fontWeight: "700",
  },
  agendaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 6,
  },
  agendaStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 16,
  },
  quickActionCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
  },
  quickActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  quickActionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    marginBottom: 1,
  },
  quickActionSub: {
    fontSize: 10.5,
  },
  capacityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  capacityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  capacityIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  capacityTitle: {
    fontSize: 14.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  capacitySub: {
    fontSize: 11.5,
  },
  manageCapacityBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  manageCapacityBtnText: {
    color: "#1C1E1B",
    fontSize: 12,
    fontWeight: "700",
  },
  stylistsScroll: {
    gap: 10,
    paddingBottom: 4,
    marginBottom: 16,
  },
  staffPreviewCard: {
    width: 104,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  staffAvatarWrap: {
    position: "relative",
    marginBottom: 6,
  },
  staffPreviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  staffStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#1C1E1B",
  },
  staffPreviewName: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 1,
  },
  staffPreviewRole: {
    fontSize: 10,
    textAlign: "center",
  },
  autoConfirmCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginTop: 12,
  },
  autoConfirmLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  autoConfirmIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  autoConfirmTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  autoConfirmSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  pendingSection: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  pendingSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pendingSectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  pendingSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pendingSectionSub: {
    fontSize: 12,
    fontWeight: "600",
  },
  pendingCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  pendingCardTop: {
    flexDirection: "row",
  },
  pendingClientName: {
    fontSize: 15,
    fontWeight: "700",
  },
  pendingServiceText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  pendingStylistTag: {
    fontSize: 11,
    marginTop: 2,
  },
  pendingTimeText: {
    fontSize: 12,
    marginTop: 4,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  pendingBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 8,
    gap: 5,
  },
  pendingDeclineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  pendingDeclineText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
  },
  pendingAcceptBtn: {},
  pendingAcceptText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
