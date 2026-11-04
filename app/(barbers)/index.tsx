import { CustomModal } from "@/components/ui/CustomModal";
import { AddServiceModal } from "@/components/barber/AddServiceModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { BARBER_DASHBOARD_TUTORIAL } from "@/constants/barberTutorials";
import { FontFamily } from "@/constants/theme";
import { DashboardMetricsSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { useThemeImages } from "@/hooks/useThemeImages";
import { barberService } from "@/services/barberService";
import { bookingService } from "@/services/bookingService";
import { reviewService } from "@/services/reviewService";
import { BrandPhotos } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
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
  barberId?: number | string;
  barberName?: string;
  price?: number;
  bookingId?: string | number;
  reference_photo_url?: string | null;
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
  phone?: string;
  status: "Active" | "Off Duty" | "On Break" | "Suspended";
  avatarIndex?: number;
  chairNumber?: number;
}

interface ChairItem {
  chairNumber: number;
  barberId: number | string;
  barberName: string;
  role: string;
  status: "Active" | "Off Duty" | "On Break" | "Suspended";
  avatar: any;
  revenue: number;
  cutsCount: number;
  rating: number;
  reviewCount: number;
  isLead: boolean;
  isOpenChair?: boolean;
}

export default function BarberDashboardScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { handleScroll, showTabBar } = useTabBarVisibility();

  useFocusEffect(
    useCallback(() => {
      showTabBar();
    }, [showTabBar])
  );

  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;

  const { user, refreshUser } = useAuth();
  const barberAvatar =
    user?.avatar_url || user?.logo_url
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
    null
  );
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(
    null
  );
  const [suspendedChairs, setSuspendedChairs] = useState<number[]>([]);
  const [staffReviews, setStaffReviews] = useState<
    Record<number, { rating: number; reviewCount: number }>
  >({});
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [incomingInvites, setIncomingInvites] = useState<any[]>([]);
  const [isRespondingInviteId, setIsRespondingInviteId] = useState<number | null>(null);

  const handleRespondManagerInvite = async (salonId: number, action: "accept" | "decline", inviteId: number) => {
    setIsRespondingInviteId(inviteId);
    try {
      await barberService.respondToManagerInvite(salonId, action);
      showToast(
        action === "accept"
          ? "Invitation accepted! You have joined the salon floor."
          : "Invitation declined.",
        action === "accept" ? "success" : "info"
      );
      await refreshUser();
      await fetchDashboardData();
    } catch (e: any) {
      showToast(e?.message || "Failed to respond to invitation.", "error");
    } finally {
      setIsRespondingInviteId(null);
    }
  };

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
      showToast(
        "Appointment accepted and confirmed! Client notified.",
        "success"
      );
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
      const schedule = await bookingService
        .getMySchedule(barberId)
        .catch(() => null);
      if (schedule) {
        const list = Array.isArray(schedule)
          ? schedule
          : schedule.schedule ||
            schedule.bookings ||
            schedule.upcoming_bookings ||
            [];

        const pendings = list.filter((b: any) => b.status === "Pending");
        setPendingBookings(pendings);

        let total = 0;
        const confirmedOrUpcoming = list.filter(
          (b: any) => b.status !== "Cancelled"
        );
        const mapped: AgendaItem[] = confirmedOrUpcoming.map(
          (b: any, idx: number) => {
            const d = b.start_time ? new Date(b.start_time) : new Date();
            const timeStr = d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isPast = d.getTime() < Date.now();
            total += b.total_price || 0;

            return {
              id: `dash-ag-${b.booking_id || b.id || idx}`,
              bookingId: b.booking_id || b.id,
              time: timeStr,
              client: b.client_name || b.name || "Valued Client",
              service: b.custom_hairstyle_name || "Custom Cut & Style",
              phone: b.client_phone || "+237 670 00 00 00",
              barberId: b.barber_id || barberId,
              barberName:
                b.barber_name ||
                (user?.name ? user.name.split("(")[0].trim() : "Main Barber"),
              price: b.total_price || 0,
              reference_photo_url:
                b.reference_photo_url || b.picture_url || b.photo_url || null,
              accentColor: isPast
                ? "#22C55E"
                : idx === 0
                ? "#F59E0B"
                : colors.primary,
              status: isPast ? "Completed" : idx === 0 ? "Current" : "Upcoming",
            };
          }
        );
        setAgenda(mapped);
        setTodayEarnings(total);
      }

      // Load incoming invitations for this barber
      try {
        const myInvites = await barberService.getMyInvitations();
        setIncomingInvites(Array.isArray(myInvites) ? myInvites : []);
      } catch {
        setIncomingInvites([]);
      }

      // Load barber's services
      const liveServices = await barberService.getBarberServices(barberId);
      setServices(
        liveServices.map((s) => ({
          id: s.id?.toString() || `sv_${Date.now()}`,
          name: s.name,
          duration: s.duration_minutes,
          price: s.price,
        }))
      );

      // Load salon staff
      const staffRes = await barberService
        .listSalonStaff(barberId)
        .catch(() => null);
      if (Array.isArray(staffRes) && staffRes.length > 0) {
        setStaffList(staffRes);

        // Fetch review stats for each registered staff barber concurrently
        const staffRevMap: Record<number, { rating: number; reviewCount: number }> = {};
        await Promise.all(
          staffRes.map(async (member: any) => {
            try {
              const r = await reviewService.getBarberReviews(member.id);
              if (r) {
                staffRevMap[member.id] = {
                  rating: r.average_rating || 5.0,
                  reviewCount: r.total_reviews || 0,
                };
              }
            } catch {
              staffRevMap[member.id] = { rating: 5.0, reviewCount: 0 };
            }
          })
        );
        setStaffReviews(staffRevMap);
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
          setBarberRating(
            reviewsRes.average_rating !== undefined &&
              reviewsRes.average_rating !== null
              ? reviewsRes.average_rating
              : 0.0
          );
          setBarberReviewCount(reviewsRes.total_reviews || 0);
        }
      } catch {
        setBarberRating(0.0);
        setBarberReviewCount(0);
      }
    } catch {
      setAgenda([]);
    }
  }, [barberId, colors.primary, user?.capacity, user?.working_chairs, user?.name]);

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
      const currentBarberId = user?.id || 4;
      await barberService.deleteService(serviceToDelete.id, currentBarberId);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      showToast(`Service "${serviceToDelete.name}" removed.`, "info");
      setServiceToDelete(null);
    }
  };

  const handleAgendaPress = (item: AgendaItem) => {
    setAgendaItemModal(item);
  };

  const myChairBookingsCount = useMemo(
    () => agenda.filter((a) => String(a.barberId) === String(barberId)).length,
    [agenda, barberId]
  );

  const myChairRevenue = useMemo(
    () =>
      agenda
        .filter((a) => String(a.barberId) === String(barberId))
        .reduce((sum, a) => sum + (a.price || 0), 0),
    [agenda, barberId]
  );

  const chairItems = useMemo<ChairItem[]>(() => {
    const list: ChairItem[] = [];

    // Chair 1: Lead Barber / Salon Owner
    const isLeadSuspended = suspendedChairs.includes(1);
    list.push({
      chairNumber: 1,
      barberId: barberId,
      barberName: user?.name ? user.name.split("(")[0].trim() : "Lead Barber",
      role: "Lead Specialist",
      status: isLeadSuspended ? "Suspended" : "Active",
      avatar: barberAvatar,
      revenue: myChairRevenue,
      cutsCount: myChairBookingsCount,
      rating: barberRating > 0 ? barberRating : 5.0,
      reviewCount: barberReviewCount,
      isLead: true,
    });

    // Staff Barbers: Chair 2 ... N
    staffList.forEach((member, idx) => {
      const chairNum = idx + 2;
      const isChairSusp = suspendedChairs.includes(chairNum);
      const isMemberSusp = member.status === "Suspended" || isChairSusp;
      const effectiveStatus: ChairItem["status"] = isMemberSusp
        ? "Suspended"
        : (member.status || "Active");

      const staffCuts = agenda.filter(
        (a) => String(a.barberId) === String(member.id)
      );
      const staffRevenue = staffCuts.reduce(
        (sum, a) => sum + (a.price || 0),
        0
      );

      const avatar =
        idx % 4 === 0
          ? barberImg1
          : idx % 4 === 1
          ? barberImg2
          : idx % 4 === 2
          ? barberImg3
          : barberImg4;

      const revInfo = staffReviews[member.id] || { rating: 5.0, reviewCount: 0 };

      list.push({
        chairNumber: chairNum,
        barberId: member.id,
        barberName: member.name,
        role: member.role || "Salon Barber",
        status: effectiveStatus,
        avatar: avatar,
        revenue: staffRevenue,
        cutsCount: staffCuts.length,
        rating: revInfo.rating,
        reviewCount: revInfo.reviewCount,
        isLead: false,
      });
    });

    // Open Styling Stations if capacity > current barbers
    const currentCount = list.length;
    if (chairsCapacity > currentCount) {
      for (let c = currentCount + 1; c <= chairsCapacity; c++) {
        const isOpenSusp = suspendedChairs.includes(c);
        const openCuts = agenda.filter(
          (a) => (a as any).chair_number === c || (a as any).chairId === c
        );
        const openRev = openCuts.reduce((sum, a) => sum + (a.price || 0), 0);
        list.push({
          chairNumber: c,
          barberId: `chair_${c}`,
          barberName: `Chair ${c} Station`,
          role: "Open Styling Station",
          status: isOpenSusp ? "Suspended" : "Active",
          avatar: null,
          revenue: openRev,
          cutsCount: openCuts.length,
          rating: 5.0,
          reviewCount: 0,
          isLead: false,
          isOpenChair: true,
        });
      }
    }

    return list;
  }, [
    barberId,
    user?.name,
    suspendedChairs,
    barberAvatar,
    myChairRevenue,
    myChairBookingsCount,
    barberRating,
    barberReviewCount,
    staffList,
    agenda,
    barberImg1,
    barberImg2,
    barberImg3,
    barberImg4,
    staffReviews,
    chairsCapacity,
  ]);

  const activeBarbersCount = useMemo(() => {
    return chairItems.filter((c) => c.status === "Active").length;
  }, [chairItems]);

  const suspendedCount = useMemo(() => {
    return chairItems.filter((c) => c.status === "Suspended").length;
  }, [chairItems]);

  const totalBarbersCount = chairItems.length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Top Urban Header — Matches Reference Screen 1 Proportions */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/(barbers)/profile")}
          style={styles.headerLeft}
        >
          <View
            style={[
              styles.headerAvatarRing,
              {
                borderColor: colors.primary,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Image source={barberAvatar} style={styles.avatarImage} />
          </View>

          <View style={styles.headerTitleCol}>
            <View style={styles.headerGreetingRow}>
              <Text
                style={[
                  styles.dashboardSubtitle,
                  { color: colors.secondarytext },
                ]}
                numberOfLines={1}
              >
                {t("barber.dashboardTitle") || "Partner Studio"}
              </Text>
              <View style={styles.liveOpenPill}>
                <View
                  style={[
                    styles.liveOpenDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <Text style={[styles.liveOpenText, { color: colors.primary }]}>
                  Open
                </Text>
              </View>
            </View>
            <Text
              style={[styles.dashboardTitle, { color: colors.primarytext }]}
              numberOfLines={1}
            >
              {salonDisplayName}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.secondarytext}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/Pages/notifications")}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
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
                  styles.notificationBadge,
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
            onPress={() => router.push("/(barbers)/profile")}
            style={[
              styles.headerIconButton,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="settings-outline"
              size={20}
              color={colors.primarytext}
            />
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
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Salon Manager Pending Stylist Confirmation Banner */}
        {user?.account_status === "pending_barber_approval" && (
          <View
            style={[
              styles.pendingApprovalCard,
              { backgroundColor: colors.surface, borderColor: "#F59E0B" },
            ]}
          >
            <View style={styles.pendingCardHeader}>
              <View style={[styles.pendingIconWrap, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                <Ionicons name="hourglass-outline" size={20} color="#F59E0B" />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pendingCardTitle, { color: colors.primarytext }]}>{t("barber.awaitingStylistConfirmation")}</Text>
                <Text style={[styles.pendingCardDesc, { color: colors.secondarytext }]}>{t("barber.awaitingStylistConfirmationDesc")}</Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={async () => {
                await refreshUser();
                await fetchDashboardData();
                showToast("Account status refreshed.", "info");
              }}
              style={[styles.pendingRefreshBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="refresh" size={14} color={colors.onBrand} />
              <Text style={[styles.pendingRefreshText, { color: colors.onBrand }]}>{t("barber.checkStatus")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Incoming Salon Floor Invitations */}
        {incomingInvites.map((inv) => (
          <View
            key={`invite-${inv.id}`}
            style={[
              styles.pendingApprovalCard,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <View style={styles.pendingCardHeader}>
              <View style={[styles.pendingIconWrap, { backgroundColor: "rgba(199, 243, 107, 0.15)" }]}>
                <Ionicons name="business" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.pendingCardTitle, { color: colors.primarytext }]}>{t("barber.salonFloorInvitation")}</Text>
                <Text style={[styles.pendingCardDesc, { color: colors.secondarytext }]}>{t("barber.salonFloorInvitationDesc", { salon_name: inv.salon_name, role: inv.role || "Barber" })}</Text>
              </View>
            </View>
            <View style={styles.inviteActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isRespondingInviteId === inv.id}
                onPress={() => handleRespondManagerInvite(inv.salon_id, "decline", inv.id)}
                style={[styles.inviteDeclineBtn, { borderColor: "rgba(239, 68, 68, 0.4)", backgroundColor: "rgba(239, 68, 68, 0.08)" }]}
              >
                <Text style={styles.inviteDeclineText}>{t("barber.decline")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isRespondingInviteId === inv.id}
                onPress={() => handleRespondManagerInvite(inv.salon_id, "accept", inv.id)}
                style={[styles.inviteAcceptBtn, { backgroundColor: colors.primary }]}
              >
                {isRespondingInviteId === inv.id ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.inviteAcceptText, { color: colors.onBrand }]}>{t("barber.acceptAndJoinFloor")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* EXECUTIVE REVENUE & OPERATIONS COMMAND HERO */}
        {isLoading ? (
          <DashboardMetricsSkeleton />
        ) : (
          <View
            style={[
              styles.heroCommandCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Image
              source={{ uri: BrandPhotos.shopCover }}
              style={styles.heroBgPhoto}
              resizeMode="cover"
            />
            <View style={styles.heroBgScrim} />

            <View style={styles.heroTopRow}>
              <View style={styles.heroLabelPill}>
                <View
                  style={[
                    styles.heroLiveDot,
                    { backgroundColor: colors.primary },
                  ]}
                />
                <Text style={[styles.heroLabelText, { color: colors.primary }]}>
                  {t("barber.revenueToday") || "Today's Revenue"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(barbers)/earnings" as any)}
                style={[
                  styles.heroAnalyticsBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="stats-chart"
                  size={13}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.heroAnalyticsBtnText,
                    { color: colors.primarytext },
                  ]}
                >{t("barber.analytics")}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={colors.secondarytext}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.heroAmountRow}>
              <Text
                style={[styles.heroAmountValue, { color: colors.primarytext }]}
              >
                {todayEarnings.toLocaleString()}
              </Text>
              <Text style={[styles.heroAmountCurrency, { color: colors.primary }]}>
                CFA
              </Text>
            </View>

            <Text
              style={[
                styles.heroFilterSubtext,
                { color: colors.secondarytext },
              ]}
            >
              Live salon performance across {activeBarbersCount}{" "}
              {activeBarbersCount === 1 ? "active barber" : "active barbers"}
            </Text>

            {/* 3-Column Live Telemetry Strip */}
            <View
              style={[
                styles.telemetryStrip,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/(barbers)/bookings" as any)}
                style={styles.telemetryCell}
              >
                <View style={styles.telemetryValueRow}>
                  <Ionicons
                    name="calendar"
                    size={13}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.telemetryValue,
                      { color: colors.primarytext },
                    ]}
                  >
                    {agenda.length}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.telemetryLabel,
                    { color: colors.secondarytext },
                  ]}
                >{t("barber.todayCuts")}</Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.telemetryDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/Pages/reviews" as any)}
                style={styles.telemetryCell}
              >
                <View style={styles.telemetryValueRow}>
                  <Ionicons name="star" size={13} color={colors.primary} />
                  <Text
                    style={[
                      styles.telemetryValue,
                      { color: colors.primarytext },
                    ]}
                  >
                    {barberRating.toFixed(1)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.telemetryLabel,
                    { color: colors.secondarytext },
                  ]}
                >
                  {barberReviewCount}{" "}
                  {language === "fr" ? "Avis" : (barberReviewCount === 1 ? "Review" : "Reviews")}
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.telemetryDivider,
                  { backgroundColor: colors.border },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push("/Pages/salon-management")}
                style={styles.telemetryCell}
              >
                <View style={styles.telemetryValueRow}>
                  <Ionicons
                    name="business"
                    size={13}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.telemetryValue,
                      { color: colors.primarytext },
                    ]}
                  >
                    {chairsCapacity}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.telemetryLabel,
                    { color: colors.secondarytext },
                  ]}
                >{t("barber.activeChairs")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* PENDING BOOKINGS AWAITING APPROVAL */}
        {pendingBookings.length > 0 && (
          <View style={styles.pendingSection}>
            <View style={styles.pendingSectionHeader}>
              <View style={styles.pendingSectionTitleRow}>
                <View style={styles.pendingDot} />
                <Text
                  style={[
                    styles.pendingSectionTitle,
                    { color: colors.primarytext },
                  ]}
                >
                  Pending Approval ({pendingBookings.length})
                </Text>
              </View>
              <View style={styles.actionRequiredPill}>
                <Text style={styles.actionRequiredText}>Action Required</Text>
              </View>
            </View>

            {pendingBookings.map((pb, idx) => {
              const pid = pb.booking_id || pb.id || idx;
              const isActionLoading = actionLoadingId === pid;
              const d = pb.start_time ? new Date(pb.start_time) : new Date();
              const dateStr = d.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              });
              const timeStr = d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              });
              const initials = (pb.client_name || "CL")
                .slice(0, 2)
                .toUpperCase();

              return (
                <View
                  key={String(pid)}
                  style={[
                    styles.pendingCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: "rgba(245, 158, 11, 0.45)",
                    },
                  ]}
                >
                  <View style={styles.pendingCardTop}>
                    <View
                      style={[
                        styles.pendingClientAvatar,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.pendingClientInitials,
                          { color: colors.primary },
                        ]}
                      >
                        {initials}
                      </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={styles.pendingNamePriceRow}>
                        <Text
                          style={[
                            styles.pendingClientName,
                            { color: colors.primarytext },
                          ]}
                          numberOfLines={1}
                        >
                          {pb.client_name || "Client"}
                        </Text>
                        <Text
                          style={[
                            styles.pendingPriceValue,
                            { color: colors.primary },
                          ]}
                        >
                          {(pb.total_price || 0).toLocaleString()} CFA
                        </Text>
                      </View>

                      <View style={styles.pendingMetaInline}>
                        <Ionicons
                          name="cut-outline"
                          size={13}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.pendingServiceText,
                            { color: colors.primarytext },
                          ]}
                          numberOfLines={1}
                        >
                          {pb.custom_hairstyle_name || "Hairstyle Service"}
                        </Text>
                      </View>

                      {pb.barber_name && user?.role === "salon" ? (
                        <View style={styles.pendingMetaInline}>
                          <Ionicons
                            name="person-outline"
                            size={12}
                            color={colors.secondarytext}
                          />
                          <Text
                            style={[
                              styles.pendingStylistTag,
                              { color: colors.secondarytext },
                            ]}
                          >
                            Assigned to: {pb.barber_name}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.pendingMetaInline}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={colors.secondarytext}
                        />
                        <Text
                          style={[
                            styles.pendingTimeText,
                            { color: colors.secondarytext },
                          ]}
                        >
                          {dateStr} at {timeStr}
                        </Text>
                      </View>

                      {pb.reference_photo_url ? (
                        <View
                          style={[
                            styles.pendingRefPhotoBox,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.brandBorder,
                            },
                          ]}
                        >
                          <Image
                            source={{ uri: pb.reference_photo_url }}
                            style={styles.pendingRefPhotoThumb}
                          />
                          <View style={{ flex: 1 }}>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <Ionicons
                                name="camera-outline"
                                size={12}
                                color={colors.primary}
                              />
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontFamily: FontFamily.bold,
                                  fontWeight: "700",
                                  color: colors.primary,
                                }}
                              >
                                Client Reference Photo
                              </Text>
                            </View>
                            <Text
                              style={{
                                fontSize: 10.5,
                                color: colors.secondarytext,
                                marginTop: 1,
                              }}
                            >
                              Booked directly from style photo
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.pendingActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isActionLoading}
                      onPress={() => handleDeclineBooking(pb)}
                      style={[
                        styles.pendingBtn,
                        styles.pendingDeclineBtn,
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
                          <Text style={styles.pendingDeclineText}>{t("barber.decline")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isActionLoading}
                      onPress={() => handleAcceptBooking(pb)}
                      style={[
                        styles.pendingBtn,
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
                              styles.pendingAcceptText,
                              { color: colors.onBrand },
                            ]}
                          >
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

        {/* AUTO-CONFIRM APPOINTMENTS CONTROL BAR */}
        <View
          style={[
            styles.autoConfirmCard,
            {
              backgroundColor: colors.surface,
              borderColor: autoConfirm
                ? colors.border
                : "rgba(245, 158, 11, 0.45)",
            },
          ]}
        >
          <View style={styles.autoConfirmLeft}>
            <View
              style={[
                styles.autoConfirmIcon,
                {
                  backgroundColor: autoConfirm
                    ? colors.brandSoft
                    : "rgba(245, 158, 11, 0.14)",
                },
              ]}
            >
              <Ionicons
                name={autoConfirm ? "flash" : "time-outline"}
                size={19}
                color={autoConfirm ? colors.primary : "#F59E0B"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[styles.autoConfirmTitle, { color: colors.primarytext }]}
              >
                Auto-Confirm Appointments
              </Text>
              <Text
                style={[styles.autoConfirmSub, { color: colors.secondarytext }]}
              >
                {autoConfirm
                  ? "Incoming bookings are approved automatically"
                  : "Requests require your manual review & confirmation"}
              </Text>
            </View>
          </View>
          <Switch
            value={autoConfirm}
            onValueChange={handleToggleAutoConfirm}
            disabled={isUpdatingAutoConfirm}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={autoConfirm ? colors.onBrand : "#F5F5F2"}
          />
        </View>

        {/* 2x2 BENTO STUDIO OPERATIONS GRID */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Studio Operations
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.secondarytext }]}
            >
              Quick access to catalog, team, hours & gallery
            </Text>
          </View>
        </View>

        <View style={styles.bentoGrid}>
          <View style={styles.bentoRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/Pages/manage-services")}
              style={[
                styles.bentoTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="cut-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.secondarytext}
                />
              </View>
              <Text
                style={[styles.bentoTileTitle, { color: colors.primarytext }]}
              >
                Services Menu
              </Text>
              <Text
                style={[styles.bentoTileSub, { color: colors.secondarytext }]}
              >
                {services.length}{" "}
                {services.length === 1 ? "service" : "services"} listed
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/Pages/active-barbers" as any)}
              style={[
                styles.bentoTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.secondarytext}
                />
              </View>
              <Text
                style={[styles.bentoTileTitle, { color: colors.primarytext }]}
              >{t("barber.activeBarbers")}</Text>
              <Text
                style={[styles.bentoTileSub, { color: colors.secondarytext }]}
              >
                {activeBarbersCount} of {totalBarbersCount} active
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bentoRow}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/Pages/availability" as any)}
              style={[
                styles.bentoTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.secondarytext}
                />
              </View>
              <Text
                style={[styles.bentoTileTitle, { color: colors.primarytext }]}
              >
                Working Hours
              </Text>
              <Text
                style={[styles.bentoTileSub, { color: colors.secondarytext }]}
              >
                Schedule & slot rules
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/Pages/portfolio" as any)}
              style={[
                styles.bentoTile,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.bentoTileTop}>
                <View
                  style={[
                    styles.bentoIconBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={15}
                  color={colors.secondarytext}
                />
              </View>
              <Text
                style={[styles.bentoTileTitle, { color: colors.primarytext }]}
              >
                Style Portfolio
              </Text>
              <Text
                style={[styles.bentoTileSub, { color: colors.secondarytext }]}
              >
                Upload cuts & prices
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TODAY'S QUEUE / LIVE TIMELINE */}
        <View style={[styles.sectionHeaderRow, { marginTop: 18 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Today's Queue
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.secondarytext }]}
            >
              {agenda.length}{" "}
              {agenda.length === 1 ? "appointment" : "appointments"} •{" "}
              {todayEarnings.toLocaleString()} CFA
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.push("/(barbers)/bookings" as any)}
            style={[
              styles.secondaryActionPill,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.primary}
            />
            <Text
              style={[
                styles.secondaryActionPillText,
                { color: colors.primarytext },
              ]}
            >
              Full Schedule
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={[
            styles.agendaBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          {isLoading ? (
            <View style={{ padding: 8, gap: 12 }}>
              {[1, 2].map((sk) => (
                <View
                  key={sk}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
                >
                  <Skeleton width={64} height={28} borderRadius={8} />
                  <Skeleton width={3} height={52} borderRadius={2} />
                  <View style={{ flex: 1 }}>
                    <Skeleton
                      width="62%"
                      height={15}
                      borderRadius={4}
                      style={{ marginBottom: 6 }}
                    />
                    <Skeleton width="44%" height={12} borderRadius={4} />
                  </View>
                </View>
              ))}
            </View>
          ) : agenda.length === 0 ? (
            <View style={styles.emptyAgendaState}>
              <View
                style={[
                  styles.emptyAgendaIconCircle,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={26}
                  color={colors.secondarytext}
                />
              </View>
              <Text
                style={[
                  styles.emptyAgendaTitle,
                  { color: colors.primarytext },
                ]}
              >
                No Appointments in Queue
              </Text>
              <Text
                style={[
                  styles.emptyAgendaSub,
                  { color: colors.secondarytext },
                ]}
              >
                Client bookings for today will appear here in real time.
              </Text>
            </View>
          ) : (
            agenda.map((item) => (
              <View key={item.id} style={styles.agendaRowItem}>
                <View
                  style={[
                    styles.agendaTimePill,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.agendaTimeText,
                      { color: colors.primarytext },
                    ]}
                  >
                    {item.time}
                  </Text>
                </View>

                <View
                  style={[
                    styles.agendaAccentBar,
                    { backgroundColor: item.accentColor },
                  ]}
                />

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => handleAgendaPress(item)}
                  style={[
                    styles.agendaClientCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.agendaClientDetails}>
                    <View style={styles.agendaClientTopRow}>
                      <Text
                        style={[
                          styles.agendaClientName,
                          { color: colors.primarytext },
                        ]}
                        numberOfLines={1}
                      >
                        {item.client}
                      </Text>
                      <View
                        style={[
                          styles.agendaStatusBadge,
                          {
                            backgroundColor:
                              item.status === "Completed"
                                ? colors.successSoft
                                : item.status === "Current"
                                ? "rgba(245, 158, 11, 0.16)"
                                : colors.brandSoft,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.agendaStatusText,
                            {
                              color:
                                item.status === "Completed"
                                  ? colors.success
                                  : item.status === "Current"
                                  ? "#F59E0B"
                                  : colors.primary,
                            },
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    <Text
                      style={[
                        styles.agendaClientService,
                        { color: colors.secondarytext },
                      ]}
                      numberOfLines={1}
                    >
                      {item.service}
                      {item.price
                        ? ` - ${item.price.toLocaleString()} CFA`
                        : ""}
                    </Text>

                    <View style={styles.agendaBadgesRow}>
                      {item.barberName && (
                        <View
                          style={[
                            styles.agendaMiniTag,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name="cut-outline"
                            size={10.5}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.agendaMiniTagText,
                              { color: colors.secondarytext },
                            ]}
                          >
                            {item.barberName}
                          </Text>
                        </View>
                      )}

                      {item.reference_photo_url ? (
                        <View
                          style={[
                            styles.agendaMiniTag,
                            {
                              backgroundColor: colors.brandSoft,
                              borderColor: colors.brandBorder,
                            },
                          ]}
                        >
                          <Ionicons
                            name="camera-outline"
                            size={10.5}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.agendaMiniTagText,
                              { color: colors.primary },
                            ]}
                          >
                            Photo Attached
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* SERVICES & PRICING MENU PREVIEW */}
        <View style={[styles.sectionHeaderRow, { marginTop: 26 }]}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
              Active Services
            </Text>
            <Text
              style={[styles.sectionSubtitle, { color: colors.secondarytext }]}
            >
              Manage haircut pricing and session duration
            </Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenAddService}
            style={[styles.addNewButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={16} color={colors.onBrand} />
            <Text
              style={[styles.addNewButtonText, { color: colors.onBrand }]}
            >
              Add New
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.servicesList}>
          {services.length === 0 ? (
            <View
              style={[
                styles.emptyServicesBox,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyAgendaIconCircle,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="cut-outline"
                  size={24}
                  color={colors.primary}
                />
              </View>
              <Text
                style={[
                  styles.emptyAgendaTitle,
                  { color: colors.primarytext },
                ]}
              >
                No Services Added Yet
              </Text>
              <Text
                style={[
                  styles.emptyAgendaSub,
                  { color: colors.secondarytext, marginBottom: 14 },
                ]}
              >
                Create your haircut and grooming menu with custom durations and
                CFA prices.
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleOpenAddService}
                style={[
                  styles.addNewButton,
                  { backgroundColor: colors.primary },
                ]}
              >
                <Ionicons name="add" size={16} color={colors.onBrand} />
                <Text
                  style={[styles.addNewButtonText, { color: colors.onBrand }]}
                >
                  Add First Service
                </Text>
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
                    borderColor: colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.serviceIconSquare,
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

                <View style={styles.serviceItemInfo}>
                  <Text
                    style={[
                      styles.serviceItemName,
                      { color: colors.primarytext },
                    ]}
                    numberOfLines={1}
                  >
                    {service.name}
                  </Text>
                  <View style={styles.serviceMetaRow}>
                    <Text
                      style={[
                        styles.serviceItemDuration,
                        { color: colors.secondarytext },
                      ]}
                    >
                      {service.duration} mins
                    </Text>
                    <View
                      style={[
                        styles.serviceMetaDot,
                        { backgroundColor: colors.border },
                      ]}
                    />
                    <Text
                      style={[
                        styles.serviceItemPrice,
                        { color: colors.primary },
                      ]}
                    >
                      {Number(service.price || 0).toLocaleString()} CFA
                    </Text>
                  </View>
                </View>

                <View style={styles.serviceActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleOpenEditService(service)}
                    style={[
                      styles.serviceActionButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="pencil-outline"
                      size={15}
                      color={colors.primarytext}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleDeleteService(service)}
                    style={[
                      styles.serviceActionButton,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={15}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Full-Screen Add / Edit Service Modal */}
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
        primaryText={
          agendaItemModal?.reference_photo_url
            ? "View Full Details"
            : "Start Service"
        }
        onPrimary={() => {
          if (agendaItemModal?.reference_photo_url) {
            const item = agendaItemModal;
            setAgendaItemModal(null);
            router.push({
              pathname: "/Pages/booking-detail",
              params: {
                bookingId: String(item.bookingId || item.id),
                pictureUrl: item.reference_photo_url,
                clientName: item.client,
                clientPhone: item.phone,
                serviceName: item.service,
                price: String(item.price || 1000),
                status: item.status,
                time: item.time,
              },
            });
          } else {
            showToast(
              `Now cutting ${agendaItemModal?.client}'s hair.`,
              "success"
            );
            setAgendaItemModal(null);
          }
        }}
        secondaryText="Close"
        onSecondary={() => setAgendaItemModal(null)}
      >
        {agendaItemModal?.reference_photo_url ? (
          <View
            style={{
              width: "100%",
              marginTop: 10,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                marginBottom: 6,
                alignSelf: "flex-start",
              }}
            >
              <Ionicons
                name="camera-outline"
                size={13}
                color={colors.primary}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: FontFamily.bold,
                  fontWeight: "800",
                  color: colors.primary,
                }}
              >
                CLIENT'S SELECTED HAIRSTYLE PHOTO
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                const item = agendaItemModal;
                setAgendaItemModal(null);
                router.push({
                  pathname: "/Pages/booking-detail",
                  params: {
                    bookingId: String(item.bookingId || item.id),
                    pictureUrl: item.reference_photo_url || "",
                    clientName: item.client,
                    clientPhone: item.phone,
                    serviceName: item.service,
                    price: String(item.price || 1000),
                    status: item.status,
                    time: item.time,
                  },
                });
              }}
              style={{
                width: "100%",
                height: 164,
                borderRadius: 14,
                overflow: "hidden",
                position: "relative",
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Image
                source={{ uri: agendaItemModal.reference_photo_url }}
                style={{ width: "100%", height: "100%" }}
                resizeMode="cover"
              />
              <View
                style={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  backgroundColor: "rgba(23, 25, 24, 0.85)",
                  borderWidth: 1,
                  borderColor: colors.border,
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 9,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Ionicons
                  name="open-outline"
                  size={12}
                  color={colors.primary}
                />
                <Text
                  style={{
                    color: colors.primarytext,
                    fontSize: 10.5,
                    fontFamily: FontFamily.semibold,
                    fontWeight: "600",
                  }}
                >
                  Tap to Inspect
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}
      </CustomModal>

      {/* Service Deletion Modal */}
      <CustomModal
        visible={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        title={t("manageServices.deleteServiceTitle") || "Delete Service"}
        description={
          serviceToDelete
            ? `Are you sure you want to remove "${serviceToDelete.name}" from your service catalog?`
            : ""
        }
        icon="trash-outline"
        primaryText={t("common.delete") || "Delete"}
        primaryDanger={true}
        secondaryText={t("common.cancel") || "Cancel"}
        onPrimary={confirmDeleteService}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    gap: 12,
    paddingRight: 10,
  },
  headerAvatarRing: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    padding: 2,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 20,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerGreetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  dashboardSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    fontWeight: "500",
  },
  liveOpenPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(199, 243, 107, 0.12)",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveOpenDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  liveOpenText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  dashboardTitle: {
    fontSize: 19,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 112,
  },
  heroCommandCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 16,
    overflow: "hidden",
    position: "relative",
  },
  heroBgPhoto: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "52%",
    opacity: 0.16,
  },
  heroBgScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(37, 41, 38, 0.45)",
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  heroLabelPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(23, 25, 24, 0.85)",
    borderWidth: 1,
    borderColor: "rgba(199, 243, 107, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  heroLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  heroLabelText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  heroAnalyticsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  heroAnalyticsBtnText: {
    fontSize: 11.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  heroAmountRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  heroAmountValue: {
    fontSize: 31,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  heroAmountCurrency: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  heroFilterSubtext: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 3,
    marginBottom: 16,
  },
  telemetryStrip: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
  },
  telemetryCell: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  telemetryValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  telemetryValue: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  telemetryDivider: {
    width: 1,
    height: 26,
  },
  pendingSection: {
    marginBottom: 16,
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
    gap: 7,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  pendingSectionTitle: {
    fontSize: 15.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  actionRequiredPill: {
    backgroundColor: "rgba(245, 158, 11, 0.14)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  actionRequiredText: {
    color: "#F59E0B",
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  pendingCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  pendingCardTop: {
    flexDirection: "row",
    gap: 12,
  },
  pendingClientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingClientInitials: {
    fontSize: 14,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
  },
  pendingNamePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },
  pendingClientName: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    flex: 1,
  },
  pendingPriceValue: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  pendingMetaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  pendingServiceText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  pendingStylistTag: {
    fontSize: 11.5,
    fontFamily: FontFamily.medium,
  },
  pendingTimeText: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  pendingRefPhotoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  pendingRefPhotoThumb: {
    width: 38,
    height: 38,
    borderRadius: 9,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 10,
  },
  pendingBtn: {
    flex: 1,
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  pendingDeclineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  pendingDeclineText: {
    color: "#EF4444",
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  pendingAcceptText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  autoConfirmCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 22,
  },
  autoConfirmLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  autoConfirmIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  autoConfirmTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  autoConfirmSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: -0.1,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  secondaryActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 11,
    borderWidth: 1,
  },
  secondaryActionPillText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  bentoGrid: {
    gap: 10,
    marginBottom: 12,
  },
  bentoRow: {
    flexDirection: "row",
    gap: 10,
  },
  bentoTile: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  bentoTileTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  bentoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bentoTileTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  bentoTileSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  capacityCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 22,
  },
  capacityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  capacityIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  capacityTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  capacitySub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  manageCapacityBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 11,
  },
  manageCapacityBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  emptyTeamBanner: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  emptyTeamLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  emptyTeamIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTeamTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  emptyTeamSub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  stylistsScroll: {
    gap: 10,
    paddingBottom: 6,
    marginBottom: 16,
  },
  heroFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 3,
    marginBottom: 16,
    gap: 8,
  },
  heroClearFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  heroClearFilterBtnText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  activeBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  activeBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  clearFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 9,
  },
  clearFilterPillText: {
    fontSize: 11,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  barberChairCard: {
    width: 175,
    borderRadius: 18,
    padding: 12,
  },
  chairTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  openChairAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chairNumTag: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  chairNumTagText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  staffRoleText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    marginBottom: 6,
  },
  chairReviewsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 8,
  },
  chairRatingNum: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  chairReviewsCount: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
  },
  seeReviewsLink: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginLeft: "auto",
  },
  chairCardDivider: {
    height: 1,
    marginBottom: 8,
    opacity: 0.6,
  },
  chairEarningsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  chairEarningsLabel: {
    fontSize: 9.5,
    fontFamily: FontFamily.medium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginBottom: 1,
  },
  chairRevenueText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  cutsCountChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  cutsCountText: {
    fontSize: 10.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  chairBottomActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  statusPillSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillSmallDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusPillSmallText: {
    fontSize: 10,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  suspendQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  suspendQuickBtnText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  addBarberCard: {
    width: 130,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  addBarberIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  addBarberTitle: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  addBarberSub: {
    fontSize: 10.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  modalContentWrap: {
    paddingVertical: 6,
    gap: 12,
  },
  modalStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  modalStatusDotLarge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  modalStatusTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalStatusDesc: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  modalDecisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalDecisionBtnText: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalSectionHeader: {
    marginTop: 4,
    marginBottom: 2,
  },
  modalSectionLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalSectionSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 1,
  },
  modalTelemetryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  modalTelemetryCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTelemLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    marginBottom: 4,
  },
  modalTelemValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalTelemFoot: {
    fontSize: 10,
    fontFamily: FontFamily.regular,
  },
  modalReviewsBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  modalReviewsScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalStarsWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalScoreBig: {
    fontSize: 18,
    fontFamily: FontFamily.extrabold,
    fontWeight: "800",
  },
  modalScoreMax: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  modalTotalRevText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  modalSeeReviewsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalSeeReviewsBtnText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
    flex: 1,
    marginLeft: 8,
  },
  modalEmptyAgenda: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  modalEmptyAgendaText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  modalBookingsList: {
    gap: 6,
  },
  modalBookingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalBookingClient: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalBookingService: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  modalBookingPrice: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalFilterTimelineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 6,
  },
  modalFilterTimelineBtnText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  staffPerfCard: {
    width: 132,
    borderRadius: 18,
    padding: 12,
  },
  staffPerfTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  staffAllIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  staffCountChip: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  staffCountChipText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  staffAvatarWrap: {
    position: "relative",
  },
  staffPreviewAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  staffStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },
  staffPreviewName: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  staffPerfRevenue: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  agendaBox: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  emptyAgendaState: {
    paddingVertical: 24,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  emptyAgendaIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  emptyAgendaTitle: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  emptyAgendaSub: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  agendaRowItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  agendaTimePill: {
    width: 72,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  agendaTimeText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  agendaAccentBar: {
    width: 3.5,
    height: 44,
    borderRadius: 2,
    marginRight: 9,
  },
  agendaClientCard: {
    flex: 1,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 15,
    borderWidth: 1,
  },
  agendaClientDetails: {
    flex: 1,
  },
  agendaClientTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 3,
  },
  agendaClientName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    flex: 1,
  },
  agendaClientService: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  agendaBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  agendaMiniTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  agendaMiniTagText: {
    fontSize: 10.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  agendaStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
  },
  agendaStatusText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  addNewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 11,
  },
  addNewButtonText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  servicesList: {
    gap: 10,
  },
  emptyServicesBox: {
    paddingVertical: 26,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  serviceItemCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
  },
  serviceIconSquare: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 3,
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  serviceItemDuration: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
  },
  serviceMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  serviceItemPrice: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  serviceActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  serviceActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingApprovalCard: {
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 14,
  },
  pendingCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  pendingIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pendingCardTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  pendingCardDesc: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
    marginTop: 2,
  },
  pendingRefreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 10,
    marginTop: 2,
  },
  pendingRefreshText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  inviteActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  inviteDeclineBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteDeclineText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    color: "#EF4444",
    fontWeight: "600",
  },
  inviteAcceptBtn: {
    flex: 1.5,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAcceptText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});
