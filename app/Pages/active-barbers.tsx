import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { MANAGE_STAFF_TUTORIAL } from "@/constants/barberTutorials";
import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { useThemeImages } from "@/hooks/useThemeImages";
import { barberService } from "@/services/barberService";
import { bookingService } from "@/services/bookingService";
import { reviewService } from "@/services/reviewService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone?: string;
  email?: string;
  status: "Active" | "Off Duty" | "On Break" | "Suspended";
  chairNumber?: number;
}

interface BarberChairCardData {
  chairNumber: number;
  barberId: number | string;
  barberName: string;
  role: string;
  phone?: string;
  email?: string;
  status: "Active" | "Off Duty" | "On Break" | "Suspended";
  avatar: any;
  revenue: number;
  cutsCount: number;
  rating: number;
  reviewCount: number;
  isLead: boolean;
  isOpenChair?: boolean;
}

export default function ActiveBarbersScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();
  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;

  const salonId = user?.id || 4;
  const salonName = user?.name ? `${user.name}'s Salon` : "Trimly Salon";

  const barberAvatar =
    user?.avatar_url || user?.logo_url
      ? { uri: user.avatar_url || user.logo_url }
      : profilePic;

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [chairsCapacity, setChairsCapacity] = useState<number>(
    user?.capacity || user?.working_chairs || 4
  );
  const [todayAgenda, setTodayAgenda] = useState<any[]>([]);
  const [staffReviews, setStaffReviews] = useState<
    Record<number, { rating: number; reviewCount: number }>
  >({});
  const [ownerRating, setOwnerRating] = useState<number>(5.0);
  const [ownerReviewCount, setOwnerReviewCount] = useState<number>(0);
  const [suspendedChairs, setSuspendedChairs] = useState<number[]>([]);

  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | string | null>(null);
  const [tutorialVisible, setTutorialVisible] = useState<boolean>(false);
  const [selectedBarberForBookings, setSelectedBarberForBookings] = useState<BarberChairCardData | null>(null);

  const fetchActiveBarbersData = useCallback(async () => {
    try {
      const [staffRes, capRes, ownerRevRes, bookingsRes] = await Promise.all([
        barberService.listSalonStaff(salonId).catch(() => []),
        barberService.getSalonCapacity(salonId).catch(() => null),
        reviewService.getBarberReviews(salonId).catch(() => null),
        bookingService.getMySchedule(salonId).catch(() => ({ bookings: [] })),
      ]);

      // Set staff
      const validStaff = Array.isArray(staffRes) ? staffRes : [];
      setStaffList(validStaff);

      // Set chairs capacity
      if (capRes && capRes.capacity) {
        setChairsCapacity(capRes.capacity);
      } else if (user?.capacity || user?.working_chairs) {
        setChairsCapacity(user.capacity || user.working_chairs || 4);
      }

      // Set owner reviews
      if (ownerRevRes) {
        setOwnerRating(ownerRevRes.average_rating || 5.0);
        setOwnerReviewCount(ownerRevRes.total_reviews || 0);
      }

      // Set today bookings
      const rawBookings = Array.isArray(bookingsRes)
        ? bookingsRes
        : (bookingsRes?.bookings || bookingsRes?.schedule || []);
      const todayStr = new Date().toISOString().split("T")[0];
      const todayList = rawBookings.filter((b: any) => {
        if (!b.start_time) return true;
        return b.start_time.startsWith(todayStr);
      });
      setTodayAgenda(todayList);

      // Fetch reviews for each staff member concurrently
      const revMap: Record<number, { rating: number; reviewCount: number }> = {};
      await Promise.all(
        validStaff.map(async (s: any) => {
          try {
            const rev = await reviewService.getBarberReviews(s.id);
            if (rev) {
              revMap[s.id] = {
                rating: rev.average_rating || 5.0,
                reviewCount: rev.total_reviews || 0,
              };
            }
          } catch {
            revMap[s.id] = { rating: 5.0, reviewCount: 0 };
          }
        })
      );
      setStaffReviews(revMap);
    } catch {
      showToast("Unable to refresh barbers directory.", "error");
    }
  }, [salonId, user?.capacity, user?.working_chairs, showToast]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchActiveBarbersData();
      setIsLoading(false);
    }
    load();
  }, [fetchActiveBarbersData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchActiveBarbersData();
    setRefreshing(false);
    showToast("Active barbers & floor status refreshed.", "info");
  }, [fetchActiveBarbersData, showToast]);

  // Unified Barber & Chair Directory (Owner + Staff + Open Chairs)
  const allBarbersAndChairs = useMemo<BarberChairCardData[]>(() => {
    const list: BarberChairCardData[] = [];

    // 1. Owner / Lead Barber (Chair 1)
    const isOwnerSuspended = suspendedChairs.includes(1);
    const ownerBookings = todayAgenda.filter(
      (b) => String(b.barber_id || b.barberId) === String(salonId)
    );
    const ownerRevenue = ownerBookings.reduce(
      (sum, b) => sum + (Number(b.total_price || b.price) || 0),
      0
    );

    list.push({
      chairNumber: 1,
      barberId: salonId,
      barberName: user?.name ? user.name.split("(")[0].trim() : "Lead Stylist (Owner)",
      role: "Lead Specialist & Owner",
      phone: user?.phone || "+237 600 00 00 00",
      email: user?.email || "owner@trimly.com",
      status: isOwnerSuspended ? "Suspended" : "Active",
      avatar: barberAvatar,
      revenue: ownerRevenue,
      cutsCount: ownerBookings.length,
      rating: ownerRating,
      reviewCount: ownerReviewCount,
      isLead: true,
    });

    // 2. Staff Barbers (Chair 2 ... N)
    staffList.forEach((member, idx) => {
      const chairNum = idx + 2;
      const isChairSusp = suspendedChairs.includes(chairNum);
      const isMemberSusp = member.status === "Suspended" || isChairSusp;
      const effectiveStatus: BarberChairCardData["status"] = isMemberSusp
        ? "Suspended"
        : (member.status || "Active");

      const memberBookings = todayAgenda.filter(
        (b) => String(b.barber_id || b.barberId) === String(member.id)
      );
      const memberRevenue = memberBookings.reduce(
        (sum, b) => sum + (Number(b.total_price || b.price) || 0),
        0
      );

      const rev = staffReviews[member.id] || { rating: 5.0, reviewCount: 0 };

      list.push({
        chairNumber: chairNum,
        barberId: member.id,
        barberName: member.name,
        role: member.role || "Salon Stylist",
        phone: member.phone || "+237 670 00 00 00",
        status: effectiveStatus,
        avatar: profilePic,
        revenue: memberRevenue,
        cutsCount: memberBookings.length,
        rating: rev.rating,
        reviewCount: rev.reviewCount,
        isLead: false,
      });
    });

    // 3. Open Chairs if salon capacity > current staffed chairs
    const staffedCount = list.length;
    if (chairsCapacity > staffedCount) {
      for (let c = staffedCount + 1; c <= chairsCapacity; c++) {
        const isOpenSusp = suspendedChairs.includes(c);
        const openBookings = todayAgenda.filter(
          (b) => (b as any).chair_number === c || (b as any).chairId === c
        );
        const openRev = openBookings.reduce(
          (sum, b) => sum + (Number(b.total_price || b.price) || 0),
          0
        );

        list.push({
          chairNumber: c,
          barberId: `chair_${c}`,
          barberName: `Styling Station Chair ${c}`,
          role: "Open Station • Unassigned",
          status: isOpenSusp ? "Suspended" : "Active",
          avatar: null,
          revenue: openRev,
          cutsCount: openBookings.length,
          rating: 5.0,
          reviewCount: 0,
          isLead: false,
          isOpenChair: true,
        });
      }
    }

    return list;
  }, [
    salonId,
    user?.name,
    user?.phone,
    user?.email,
    suspendedChairs,
    todayAgenda,
    ownerRating,
    ownerReviewCount,
    barberAvatar,
    staffList,
    staffReviews,
    chairsCapacity,
    profilePic,
  ]);

  // Telemetry Aggregates
  const totalBarbersCount = allBarbersAndChairs.length;
  const activeBarbersCount = allBarbersAndChairs.filter((b) => b.status === "Active").length;
  const suspendedBarbersCount = allBarbersAndChairs.filter((b) => b.status === "Suspended").length;
  const totalFloorRevenueToday = allBarbersAndChairs.reduce((sum, b) => sum + b.revenue, 0);
  const totalFloorCutsToday = allBarbersAndChairs.reduce((sum, b) => sum + b.cutsCount, 0);

  // Filtered List
  const displayedBarbers = useMemo(() => {
    if (statusFilter === "active") {
      return allBarbersAndChairs.filter((b) => b.status === "Active");
    }
    if (statusFilter === "suspended") {
      return allBarbersAndChairs.filter((b) => b.status === "Suspended");
    }
    return allBarbersAndChairs;
  }, [allBarbersAndChairs, statusFilter]);

  // Handle Suspend / Reactivate Decision
  const handleToggleSuspend = (barber: BarberChairCardData) => {
    const isCurrentlySuspended = barber.status === "Suspended";
    const nextStatus = isCurrentlySuspended ? "Active" : "Suspended";

    Alert.alert(
      isCurrentlySuspended ? "Reactivate Barber & Chair" : "Suspend Barber & Chair",
      isCurrentlySuspended
        ? `Reactivate ${barber.barberName} at Chair 0${barber.chairNumber}? They will immediately be available for client bookings.`
        : `Are you sure you want to suspend ${barber.barberName} at Chair 0${barber.chairNumber}? This temporarily pauses this chair from taking new appointments.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isCurrentlySuspended ? "Reactivate" : "Suspend",
          style: isCurrentlySuspended ? "default" : "destructive",
          onPress: async () => {
            setActionLoadingId(barber.barberId);
            try {
              if (barber.isLead || barber.isOpenChair) {
                setSuspendedChairs((prev) =>
                  isCurrentlySuspended
                    ? prev.filter((c) => c !== barber.chairNumber)
                    : [...prev, barber.chairNumber]
                );
              } else {
                await barberService.updateStaffStatus(
                  salonId,
                  Number(barber.barberId),
                  nextStatus
                );
                setStaffList((prev) =>
                  prev.map((s) =>
                    s.id === Number(barber.barberId) ? { ...s, status: nextStatus } : s
                  )
                );
              }
              showToast(
                `${barber.barberName} (Chair 0${barber.chairNumber}) has been ${isCurrentlySuspended ? "reactivated" : "suspended"}.`,
                "success"
              );
            } catch {
              showToast("Failed to update status. Please try again.", "error");
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSeeReviews = (barber: BarberChairCardData) => {
    const targetId = barber.isLead ? salonId : barber.barberId;
    router.push({
      pathname: "/Pages/reviews",
      params: { barberId: String(targetId) },
    } as any);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Screen Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerCircleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>{t("activeBarbers.title")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {activeBarbersCount} of {totalBarbersCount} Active • {chairsCapacity} Styling Chairs
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTutorialVisible(true)}
            style={[
              styles.headerCircleBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => router.push("/Pages/manage-staff")}
            style={[styles.addStaffHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="person-add" size={15} color={colors.onBrand} />
            <Text style={[styles.addStaffHeaderBtnText, { color: colors.onBrand }]}>{t("activeBarbers.roster")}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Top 4-Cell Telemetry Dashboard Strip */}
        <View
          style={[
            styles.telemetryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCell}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
                <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                  {activeBarbersCount}
                </Text>
              </View>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("activeBarbers.title")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {chairsCapacity}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("activeBarbers.stylingChairs")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                {totalFloorRevenueToday.toLocaleString()} CFA
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("activeBarbers.floorRevenue")}</Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {totalFloorCutsToday}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>{t("activeBarbers.cutsToday") || "Cuts Today"}</Text>
            </View>
          </View>
        </View>

        {/* Filter Segment Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setStatusFilter("all")}
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "all" ? colors.primary : colors.surface,
                borderColor: statusFilter === "all" ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "all" ? colors.onBrand : colors.primarytext },
              ]}
            >
              All Barbers ({totalBarbersCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setStatusFilter("active")}
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "active" ? colors.primary : colors.surface,
                borderColor: statusFilter === "active" ? colors.primary : colors.border,
              },
            ]}
          >
            <View style={[styles.liveDot, { backgroundColor: statusFilter === "active" ? colors.onBrand : colors.success }]} />
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "active" ? colors.onBrand : colors.primarytext },
              ]}
            >
              Active ({activeBarbersCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setStatusFilter("suspended")}
            style={[
              styles.filterPill,
              {
                backgroundColor: statusFilter === "suspended" ? "#EF4444" : colors.surface,
                borderColor: statusFilter === "suspended" ? "#EF4444" : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.filterPillText,
                { color: statusFilter === "suspended" ? "#FFFFFF" : colors.primarytext },
              ]}
            >
              Suspended ({suspendedBarbersCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Barbers List */}
        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondarytext }]}>{t("activeBarbers.loadingBarbers") || "Loading salon barbers & chairs..."}</Text>
          </View>
        ) : displayedBarbers.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="people-outline" size={42} color={colors.secondarytext} />
            <Text style={[styles.emptyStateTitle, { color: colors.primarytext }]}>{t("activeBarbers.noBarbersFound") || "No Barbers Found"}</Text>
            <Text style={[styles.emptyStateSub, { color: colors.secondarytext }]}>
              No barbers currently match the "{statusFilter}" filter.
            </Text>
          </View>
        ) : (
          <View style={styles.barbersList}>
            {displayedBarbers.map((barber) => {
              const isSuspended = barber.status === "Suspended";
              const isLead = barber.isLead;
              const isActionLoading = actionLoadingId === barber.barberId;
              const sharePercent =
                totalFloorRevenueToday > 0
                  ? Math.round((barber.revenue / totalFloorRevenueToday) * 100)
                  : 0;

              return (
                <View
                  key={`active_page_${barber.chairNumber}_${barber.barberId}`}
                  style={[
                    styles.barberCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isSuspended
                        ? "rgba(239, 68, 68, 0.4)"
                        : isLead
                        ? "rgba(199, 243, 107, 0.35)"
                        : colors.border,
                    },
                  ]}
                >
                  {/* Card Header: Chair badge & Status */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.chairBadgePill,
                        {
                          backgroundColor: isLead
                            ? "rgba(199, 243, 107, 0.12)"
                            : "rgba(255, 255, 255, 0.06)",
                          borderColor: isLead
                            ? "rgba(199, 243, 107, 0.35)"
                            : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="cut"
                        size={12}
                        color={isLead ? colors.primary : colors.secondarytext}
                      />
                      <Text
                        style={[
                          styles.chairBadgeText,
                          { color: isLead ? colors.primary : colors.primarytext },
                        ]}
                      >
                        CHAIR 0{barber.chairNumber} {isLead ? "• LEAD STYLIST" : ""}
                      </Text>
                    </View>

                    {/* Live Duty Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        {
                          backgroundColor: isSuspended
                            ? "rgba(239, 68, 68, 0.12)"
                            : barber.status === "Active"
                            ? "rgba(34, 197, 94, 0.12)"
                            : "rgba(245, 158, 11, 0.12)",
                          borderColor: isSuspended
                            ? "rgba(239, 68, 68, 0.3)"
                            : barber.status === "Active"
                            ? "rgba(34, 197, 94, 0.3)"
                            : "rgba(245, 158, 11, 0.3)",
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.statusPillDot,
                          {
                            backgroundColor: isSuspended
                              ? "#EF4444"
                              : barber.status === "Active"
                              ? colors.success
                              : "#F59E0B",
                          },
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusPillText,
                          {
                            color: isSuspended
                              ? "#EF4444"
                              : barber.status === "Active"
                              ? colors.success
                              : "#F59E0B",
                          },
                        ]}
                      >
                        {barber.status}
                      </Text>
                    </View>
                  </View>

                  {/* Profile Row: Avatar, Name & Role */}
                  <View style={styles.barberProfileRow}>
                    <View style={styles.barberAvatarWrap}>
                      {barber.isOpenChair ? (
                        <View
                          style={[
                            styles.openStationBox,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Ionicons
                            name="cut-outline"
                            size={24}
                            color={isSuspended ? "#EF4444" : colors.primary}
                          />
                        </View>
                      ) : (
                        <Image source={barber.avatar} style={styles.barberAvatarImg} />
                      )}
                      <View
                        style={[
                          styles.avatarStatusRing,
                          {
                            backgroundColor: isSuspended
                              ? "#EF4444"
                              : barber.status === "Active"
                              ? colors.success
                              : "#F59E0B",
                            borderColor: colors.surface,
                          },
                        ]}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.barberNameText, { color: colors.primarytext }]}
                        numberOfLines={1}
                      >
                        {barber.barberName}
                      </Text>
                      <Text
                        style={[styles.barberRoleText, { color: colors.secondarytext }]}
                        numberOfLines={1}
                      >
                        {barber.role}
                      </Text>
                      {barber.phone ? (
                        <Text
                          style={[styles.barberContactText, { color: colors.secondarytext }]}
                          numberOfLines={1}
                        >
                          {barber.phone}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Performance & Revenue Matrix */}
                  <View
                    style={[
                      styles.revenueMatrixCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.matrixCol}>
                      <Text style={[styles.matrixLabel, { color: colors.secondarytext }]}>
                        Today's Revenue
                      </Text>
                      <Text style={[styles.matrixValueLime, { color: colors.primary }]}>
                        {barber.revenue.toLocaleString()} CFA
                      </Text>
                    </View>

                    <View style={[styles.matrixDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.matrixCol}>
                      <Text style={[styles.matrixLabel, { color: colors.secondarytext }]}>
                        Cuts Completed
                      </Text>
                      <Text style={[styles.matrixValue, { color: colors.primarytext }]}>
                        {barber.cutsCount} cuts
                      </Text>
                    </View>

                    <View style={[styles.matrixDivider, { backgroundColor: colors.border }]} />

                    <View style={styles.matrixCol}>
                      <Text style={[styles.matrixLabel, { color: colors.secondarytext }]}>{t("activeBarbers.salonShare") || "Salon Share"}</Text>
                      <Text style={[styles.matrixValue, { color: colors.primarytext }]}>
                        {sharePercent}%
                      </Text>
                    </View>
                  </View>

                  {/* Reviews & Client Feedback Strip */}
                  <View style={styles.reviewsRow}>
                    <View style={styles.reviewsScoreBox}>
                      <Ionicons name="star" size={15} color="#F59E0B" />
                      <Text style={[styles.reviewsScoreText, { color: colors.primarytext }]}>
                        {barber.rating.toFixed(1)}
                      </Text>
                      <Text style={[styles.reviewsCountText, { color: colors.secondarytext }]}>
                        ({barber.reviewCount} {barber.reviewCount === 1 ? "review" : "reviews"})
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleSeeReviews(barber)}
                      style={[
                        styles.seeReviewsBtn,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <Ionicons name="chatbubbles-outline" size={14} color={colors.primary} />
                      <Text style={[styles.seeReviewsBtnText, { color: colors.primary }]}>{t("activeBarbers.seeReviews") || "See Reviews"}</Text>
                      <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Operational Decision Action Row */}
                  <View style={styles.cardActionsRow}>
                    {/* View Today's Appointments */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setSelectedBarberForBookings(barber)}
                      style={[
                        styles.secondaryCardBtn,
                        { backgroundColor: colors.background, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="calendar-outline" size={15} color={colors.primarytext} />
                      <Text style={[styles.secondaryCardBtnText, { color: colors.primarytext }]}>
                        View Cuts ({barber.cutsCount})
                      </Text>
                    </TouchableOpacity>

                    {/* Suspend or Reactivate Action Button */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isActionLoading}
                      onPress={() => handleToggleSuspend(barber)}
                      style={[
                        styles.primaryActionBtn,
                        isSuspended
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : {
                              backgroundColor: "rgba(239, 68, 68, 0.12)",
                              borderColor: "rgba(239, 68, 68, 0.35)",
                            },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={isSuspended ? colors.onBrand : "#EF4444"}
                        />
                      ) : (
                        <>
                          <Ionicons
                            name={isSuspended ? "play-circle" : "pause-circle"}
                            size={16}
                            color={isSuspended ? colors.onBrand : "#EF4444"}
                          />
                          <Text
                            style={[
                              styles.primaryActionBtnText,
                              { color: isSuspended ? colors.onBrand : "#EF4444" },
                            ]}
                          >
                            {isSuspended
                              ? barber.isOpenChair
                                ? "Reactivate Chair"
                                : "Reactivate Barber"
                              : barber.isOpenChair
                              ? "Suspend Chair"
                              : "Suspend Barber"}
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
      </ScrollView>

      {/* TODAY'S APPOINTMENTS LOG MODAL */}
      <CustomModal
        visible={!!selectedBarberForBookings}
        onClose={() => setSelectedBarberForBookings(null)}
        title={selectedBarberForBookings?.barberName || "Today's Bookings"}
        description={`Chair 0${selectedBarberForBookings?.chairNumber} • Scheduled appointments today`}
        scrollable={true}
        maxHeight="82%"
      >
        {selectedBarberForBookings && (
          <View style={styles.modalAppointmentsWrap}>
            {todayAgenda.filter(
              (b) => String(b.barber_id || b.barberId) === String(selectedBarberForBookings.barberId)
            ).length === 0 ? (
              <View
                style={[
                  styles.modalEmptyBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <Ionicons name="calendar-outline" size={32} color={colors.secondarytext} />
                <Text style={[styles.modalEmptyText, { color: colors.secondarytext }]}>
                  No appointments scheduled today for {selectedBarberForBookings.barberName}.
                </Text>
              </View>
            ) : (
              todayAgenda
                .filter(
                  (b) =>
                    String(b.barber_id || b.barberId) ===
                    String(selectedBarberForBookings.barberId)
                )
                .map((booking, idx) => (
                  <View
                    key={booking.id || idx}
                    style={[
                      styles.modalBookingCard,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalClientName, { color: colors.primarytext }]}>
                        {booking.client_name || booking.name || "Trimly Client"}
                      </Text>
                      <Text style={[styles.modalServiceName, { color: colors.secondarytext }]}>
                        {booking.custom_hairstyle_name || booking.service || "Hairstyle Cut"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.modalPriceText, { color: colors.primary }]}>
                        {booking.total_price || booking.price
                          ? `${Number(booking.total_price || booking.price).toLocaleString()} CFA`
                          : "Free"}
                      </Text>
                      <Text style={[styles.modalTimeText, { color: colors.secondarytext }]}>
                        {booking.start_time
                          ? new Date(booking.start_time).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "Confirmed"}
                      </Text>
                    </View>
                  </View>
                ))
            )}
          </View>
        )}
      </CustomModal>

      {/* Tutorial Modal */}
      <PageTutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        screenKey="active_barbers"
        title={t("activeBarbers.salonFloorManagement")}
        subtitle={t("activeBarbers.headerSubtitle") || "Manage working chairs, live duty, reviews, and suspensions"}
        steps={MANAGE_STAFF_TUTORIAL.steps}
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  addStaffHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addStaffHeaderBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  telemetryCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  telemetryGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  telemetryCell: {
    flex: 1,
    alignItems: "center",
    gap: 3,
  },
  telemetryDivider: {
    width: 1,
    height: 28,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  telemetryValue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontFamily: FontFamily.medium,
    textAlign: "center",
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
  },
  emptyStateCard: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginTop: 6,
  },
  emptyStateSub: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  barbersList: {
    gap: 14,
  },
  barberCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chairBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  chairBadgeText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusPillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  barberProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  barberAvatarWrap: {
    position: "relative",
  },
  barberAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  openStationBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarStatusRing: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    borderWidth: 2,
  },
  barberNameText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  barberRoleText: {
    fontSize: 12.5,
    fontFamily: FontFamily.medium,
  },
  barberContactText: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  revenueMatrixCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  matrixCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  matrixDivider: {
    width: 1,
    height: 26,
  },
  matrixLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  matrixValueLime: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  matrixValue: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  reviewsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  reviewsScoreBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  reviewsScoreText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  reviewsCountText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  seeReviewsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  seeReviewsBtnText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  secondaryCardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryCardBtnText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  primaryActionBtnText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalAppointmentsWrap: {
    paddingVertical: 8,
    gap: 10,
  },
  modalEmptyBox: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  modalEmptyText: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  modalBookingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalClientName: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  modalServiceName: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
  },
  modalPriceText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  modalTimeText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
});
