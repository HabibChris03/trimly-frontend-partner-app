import { AppointmentCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { bookingService } from "@/services/bookingService";
import { barberService } from "@/services/barberService";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface Appointment {
  id: string;
  booking_id?: number | string;
  barber_id?: number | string;
  barber_name?: string;
  client: string;
  service: string;
  time: string;
  rawStartTime?: string;
  duration: string;
  price: number;
  accent: string;
  status:
    | "Confirmed"
    | "shaving..."
    | "In Progress"
    | "Completed"
    | "Cancelled"
    | "Pending"
    | "No-Show"
    | "disputed";
  payment_status?: string;
  dispute_reason?: string;
  completion_pin_requested?: boolean;
  reference_photo_url?: string | null;
  client_phone?: string;
  service_type?: string;
  home_address?: string;
  home_instructions?: string;
}

export default function BarberBookingsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookingId?: string; pictureUrl?: string }>();
  const { user } = useAuth();
  const barberId = user?.id || 4;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { handleScroll, showTabBar } = useTabBarVisibility();

  const isSalonManager = Boolean(
    user?.role === "salon" || Number(user?.capacity || user?.working_chairs || 1) > 1
  );

  const [selectedFilter, setSelectedFilter] = useState("All Bookings");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBarberFilter, setSelectedBarberFilter] = useState("All");
  const [salonStaffNames, setSalonStaffNames] = useState<string[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [processingInlineId, setProcessingInlineId] = useState<string | null>(null);

  // Worst-Case Scenario Modals
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [arrivalPinInput, setArrivalPinInput] = useState("");
  const [isBypassingPin, setIsBypassingPin] = useState(false);
  const [bypassReason, setBypassReason] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "momo" | "unpaid">(
    "cash"
  );
  const [unpaidDisputeNote, setUnpaidDisputeNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [noShowModalVisible, setNoShowModalVisible] = useState(false);
  const [isSubmittingNoShow, setIsSubmittingNoShow] = useState(false);

  // Delete past booking modal state
  const [bookingToDelete, setBookingToDelete] = useState<Appointment | null>(null);
  const [isDeletingBooking, setIsDeletingBooking] = useState(false);

  // Ending Service Handshake Modal & Code
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [completionPinInput, setCompletionPinInput] = useState("");
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [pinSentSuccess, setPinSentSuccess] = useState(false);
  const [isBypassingCompletionPin, setIsBypassingCompletionPin] = useState(false);
  const [bypassCompletionReason, setBypassCompletionReason] = useState("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const [schedule, staffList] = await Promise.all([
        bookingService.getMySchedule(barberId).catch(() => null),
        isSalonManager ? barberService.listSalonStaff(barberId).catch(() => []) : Promise.resolve([]),
      ]);

      if (Array.isArray(staffList) && staffList.length > 0) {
        const names = staffList
          .map((s: any) => (s?.name || s?.clientName || "").trim())
          .filter(Boolean);
        setSalonStaffNames(Array.from(new Set(names)));
      }

      if (schedule) {
        const list = Array.isArray(schedule)
          ? schedule
          : schedule.schedule || schedule.bookings || schedule.upcoming_bookings || [];

        if (list.length > 0) {
          const mapped: Appointment[] = list.map((b: any, idx: number) => {
            const rawStart = b.start_time;
            const d = rawStart ? new Date(rawStart) : new Date();
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });

            const rawStat = (b.status || "").toLowerCase();
            let finalStatus: Appointment["status"] = "Confirmed";
            if (rawStat === "cancelled") finalStatus = "Cancelled";
            else if (rawStat === "pending") finalStatus = "Pending";
            else if (
              rawStat === "shaving..." ||
              rawStat === "shaving" ||
              rawStat === "in progress" ||
              rawStat === "in_progress"
            )
              finalStatus = "shaving...";
            else if (rawStat === "no-show" || rawStat === "noshow") finalStatus = "No-Show";
            else if (rawStat === "disputed" || rawStat === "unpaid") finalStatus = "disputed";
            else if (rawStat === "completed") finalStatus = "Completed";
            else finalStatus = "Confirmed";

            return {
              id: `b-sched-${b.booking_id || b.id || idx}`,
              booking_id: b.booking_id || b.id,
              barber_id: b.barber_id,
              barber_name: b.barber_name || b.staff_name || undefined,
              client: b.client_name || b.name || "Valued Client",
              service: b.custom_hairstyle_name || "Haircut & Styling",
              time: `${dateStr} • ${timeStr}`,
              rawStartTime: rawStart,
              duration: "45 mins",
              price: b.total_price || 1000,
              accent:
                idx % 4 === 0
                  ? "#C7F36B"
                  : idx % 4 === 1
                  ? "#3B82F6"
                  : idx % 4 === 2
                  ? "#22C55E"
                  : "#F59E0B",
              status: finalStatus,
              payment_status: b.payment_status || "unpaid",
              dispute_reason: b.dispute_reason,
              completion_pin_requested: Boolean(b.completion_pin_requested),
              reference_photo_url: b.reference_photo_url || b.picture_url || b.photo_url || null,
              client_phone: b.client_phone || "+237 670 12 34 56",
              service_type: b.service_type || "in_salon",
              home_address: b.home_address,
              home_instructions: b.home_instructions,
            };
          });
          setAppointments(mapped);

          // If opened with specific bookingId from notification, auto-select it
          if (params.bookingId) {
            const target = mapped.find(
              (m) =>
                String(m.booking_id) === String(params.bookingId) ||
                String(m.id).includes(String(params.bookingId))
            );
            if (target) {
              setSelectedAppointment(target);
            }
          }
        } else {
          setAppointments([]);
        }
      }
    } catch {
      setAppointments([]);
    }
  }, [barberId, isSalonManager, params.bookingId]);

  useFocusEffect(
    useCallback(() => {
      showTabBar();
      fetchSchedule();
    }, [showTabBar, fetchSchedule])
  );

  useEffect(() => {
    async function initialLoad() {
      setIsLoading(true);
      await fetchSchedule();
      setIsLoading(false);
    }
    initialLoad();
  }, [fetchSchedule]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedule();
    setRefreshing(false);
  }, [fetchSchedule]);

  const barberFilterOptions = useMemo(() => {
    const names = new Set<string>();
    salonStaffNames.forEach((n) => names.add(n));
    appointments.forEach((a) => {
      if (a.barber_name && a.barber_name.trim()) {
        names.add(a.barber_name.trim());
      }
    });
    const list = Array.from(names);
    if (!isSalonManager && list.length <= 1) return [];
    return ["All", ...list];
  }, [appointments, isSalonManager, salonStaffNames]);

  const tabCounts = useMemo(() => {
    let upcoming = 0;
    let completed = 0;
    appointments.forEach((app) => {
      const st = (app.status || "").toLowerCase();
      if (st === "completed" || st === "cancelled" || st === "no-show" || st === "disputed") {
        completed += 1;
      } else {
        upcoming += 1;
      }
    });
    return {
      all: appointments.length,
      upcoming,
      completed,
    };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return appointments.filter((app) => {
      const st = (app.status || "").toLowerCase();
      if (selectedFilter === "Upcoming") {
        if (st === "completed" || st === "cancelled" || st === "no-show" || st === "disputed") {
          return false;
        }
      } else if (selectedFilter === "Completed") {
        if (st !== "completed" && st !== "cancelled" && st !== "no-show" && st !== "disputed") {
          return false;
        }
      }

      if (selectedBarberFilter !== "All") {
        const bName = (app.barber_name || "").trim().toLowerCase();
        if (bName !== selectedBarberFilter.toLowerCase()) {
          return false;
        }
      }

      if (query) {
        const matchesClient = app.client.toLowerCase().includes(query);
        const matchesService = app.service.toLowerCase().includes(query);
        const matchesTime = app.time.toLowerCase().includes(query);
        const matchesBarber = (app.barber_name || "").toLowerCase().includes(query);
        if (!matchesClient && !matchesService && !matchesTime && !matchesBarber) {
          return false;
        }
      }

      return true;
    });
  }, [appointments, searchQuery, selectedBarberFilter, selectedFilter]);

  // Calculate 15-minute grace period status for No-Show
  const getGracePeriod = (rawStartTime?: string) => {
    if (!rawStartTime) return { isPastStart: false, canMarkNoShow: false, minutesRemaining: 15 };
    const startMs = new Date(rawStartTime).getTime();
    const nowMs = Date.now();
    const graceEndMs = startMs + 15 * 60 * 1000;
    const isPastStart = nowMs >= startMs;
    const canMarkNoShow = nowMs >= graceEndMs;
    const minutesRemaining = Math.max(1, Math.ceil((graceEndMs - nowMs) / 60000));
    return { isPastStart, canMarkNoShow, minutesRemaining };
  };

  // Inline Accept / Decline handlers
  const handleAcceptAppointment = async (app: Appointment) => {
    const targetId = app.booking_id || app.id;
    setProcessingInlineId(String(app.id));
    try {
      await bookingService.acceptBooking(targetId);
      showToast(`Accepted appointment for ${app.client}`, "success");
      setSelectedAppointment(null);
      await fetchSchedule();
    } catch (err: any) {
      showToast(err?.message || "Could not accept appointment", "error");
    } finally {
      setProcessingInlineId(null);
    }
  };

  const handleDeclineAppointment = async (app: Appointment) => {
    const targetId = app.booking_id || app.id;
    setProcessingInlineId(String(app.id));
    try {
      await bookingService.declineBooking(targetId);
      showToast(`Declined appointment for ${app.client}`, "info");
      setSelectedAppointment(null);
      await fetchSchedule();
    } catch (err: any) {
      showToast(err?.message || "Could not decline appointment", "error");
    } finally {
      setProcessingInlineId(null);
    }
  };

  // Handler: Start Service with Arrival PIN -> updates status to shaving...
  const handleConfirmStartService = async () => {
    if (!selectedAppointment) return;
    if (!isBypassingPin && arrivalPinInput.trim().length !== 4) {
      showToast("Please enter the 4-digit client arrival PIN", "error");
      return;
    }

    setIsSubmittingPin(true);
    try {
      const targetId = selectedAppointment.booking_id || selectedAppointment.id;
      await bookingService.updateBookingStatus(targetId, "shaving...", {
        arrival_pin: isBypassingPin ? undefined : arrivalPinInput.trim(),
        bypass_pin: isBypassingPin,
        bypass_reason: isBypassingPin
          ? bypassReason.trim() || "Client verified in person"
          : undefined,
      });

      showToast(`Started service for ${selectedAppointment.client}: shaving...`, "success");
      setPinModalVisible(false);
      setSelectedAppointment(null);
      setArrivalPinInput("");
      setIsBypassingPin(false);
      setBypassReason("");
      await fetchSchedule();
    } catch (err: any) {
      showToast(err?.message || "Invalid Arrival PIN. Ask the client for their code.", "error");
    } finally {
      setIsSubmittingPin(false);
    }
  };

  // Handler: Delete Past Booking from History
  const handleConfirmDeleteHistory = async () => {
    if (!bookingToDelete) return;
    setIsDeletingBooking(true);
    try {
      const targetId = bookingToDelete.booking_id || bookingToDelete.id;
      await bookingService.deleteBookingFromHistory(targetId);
      setAppointments((prev) => prev.filter((a) => (a.booking_id || a.id) !== targetId));
      showToast("Booking deleted from history", "success");
      setBookingToDelete(null);
    } catch {
      showToast("Could not delete past booking", "error");
    } finally {
      setIsDeletingBooking(false);
    }
  };

  // Handler: Complete Service with Payment Verification
  const handleConfirmPaymentComplete = async () => {
    if (!selectedAppointment) return;
    if (selectedPaymentMethod === "unpaid" && !unpaidDisputeNote.trim()) {
      showToast("Please add an incident note explaining the non-payment", "error");
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const targetId = selectedAppointment.booking_id || selectedAppointment.id;
      await bookingService.updateBookingStatus(targetId, "Completed", {
        payment_method: selectedPaymentMethod,
        note: selectedPaymentMethod === "unpaid" ? unpaidDisputeNote.trim() : undefined,
      });

      if (selectedPaymentMethod === "unpaid") {
        showToast("Service marked as disputed. Admin team alerted.", "info");
      } else {
        showToast(
          `Service completed! Payment confirmed via ${selectedPaymentMethod.toUpperCase()}.`,
          "success"
        );
      }

      setPaymentModalVisible(false);
      setSelectedAppointment(null);
      setSelectedPaymentMethod("cash");
      setUnpaidDisputeNote("");
      await fetchSchedule();
    } catch (err: any) {
      showToast(err?.message || "Could not complete service.", "error");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Handler: Mark No-Show after 15-min grace
  const handleConfirmNoShow = async () => {
    if (!selectedAppointment) return;
    setIsSubmittingNoShow(true);
    try {
      const targetId = selectedAppointment.booking_id || selectedAppointment.id;
      await bookingService.updateBookingStatus(targetId, "No-Show");
      showToast(`Marked ${selectedAppointment.client} as No-Show. Slot released.`, "info");
      setNoShowModalVisible(false);
      setSelectedAppointment(null);
      await fetchSchedule();
    } catch (err: any) {
      showToast(
        err?.message || "Cannot mark as No-Show yet. 15-min grace period applies.",
        "error"
      );
    } finally {
      setIsSubmittingNoShow(false);
    }
  };

  // Handler: Send 4-digit Service Ending Code to Client
  const handleSendEndingCode = async (targetApp?: Appointment) => {
    const app = targetApp || selectedAppointment;
    if (!app) return;
    setIsRequestingPin(true);
    try {
      const targetId = app.booking_id || app.id;
      await bookingService.requestCompletionPin(targetId);
      setPinSentSuccess(true);
      showToast(`Ending code sent to ${app.client}'s Trimly app!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to send ending code to client.", "error");
    } finally {
      setIsRequestingPin(false);
    }
  };

  // Handler: Verify Client's Ending Code, Complete Service & Release Payout
  const handleConfirmEndService = async () => {
    if (!selectedAppointment) return;
    if (!isBypassingCompletionPin && completionPinInput.trim().length !== 4) {
      showToast("Please enter the 4-digit code provided by the client", "error");
      return;
    }

    setIsSubmittingCompletion(true);
    try {
      const targetId = selectedAppointment.booking_id || selectedAppointment.id;
      await bookingService.updateBookingStatus(targetId, "Completed", {
        completion_pin: isBypassingCompletionPin ? undefined : completionPinInput.trim(),
        bypass_pin: isBypassingCompletionPin,
        bypass_reason: isBypassingCompletionPin
          ? bypassCompletionReason.trim() || "Service completion verified in person"
          : undefined,
      });

      showToast(
        `Service Ended! ${selectedAppointment.price.toLocaleString()} CFA credited to your account.`,
        "success"
      );
      setCompletionModalVisible(false);
      setSelectedAppointment(null);
      setCompletionPinInput("");
      setPinSentSuccess(false);
      setIsBypassingCompletionPin(false);
      setBypassCompletionReason("");
      await fetchSchedule();
    } catch (err: any) {
      showToast(
        err?.message || "Invalid Ending Code. Please check the code with the client.",
        "error"
      );
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const openEndServiceModal = (item: Appointment) => {
    setSelectedAppointment(item);
    setCompletionModalVisible(true);
    if (!item.completion_pin_requested) {
      handleSendEndingCode(item);
    } else {
      setPinSentSuccess(true);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Clean Dark Urban Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
              {t("barber.todayQueue")}
            </Text>
            <View style={styles.liveSubRow}>
              <View style={[styles.livePulseDot, { backgroundColor: colors.brand }]} />
              <Text style={[styles.headerSubtitle, { color: colors.secondaryText }]}>
                {t("barber.liveQueue")}
              </Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={onRefresh}
              style={[
                styles.iconActionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="refresh-outline" size={19} color={colors.primaryText} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.push("/Pages/availability" as any)}
              style={[
                styles.iconActionBtn,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={19} color={colors.brand} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Urban Search Bar */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.secondaryText} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t("bookings.searchPlaceholder") || "Search client, service or time..."}
            placeholderTextColor={colors.inputPlaceholder}
            style={[styles.searchInput, { color: colors.primaryText }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setSearchQuery("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={17} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Pills */}
        <View style={styles.dayRow}>
          {["All Bookings", "Upcoming", "Completed"].map((filterName) => {
            const isSelected = selectedFilter === filterName;
            const filterLabel =
              filterName === "All Bookings"
                ? t("notificationsScreen.allTab")
                : filterName === "Upcoming"
                ? t("booking.upcomingTab")
                : t("booking.historyTab");
            const count =
              filterName === "All Bookings"
                ? tabCounts.all
                : filterName === "Upcoming"
                ? tabCounts.upcoming
                : tabCounts.completed;

            return (
              <TouchableOpacity
                key={filterName}
                activeOpacity={0.85}
                onPress={() => setSelectedFilter(filterName)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: isSelected ? colors.brand : colors.card,
                    borderColor: isSelected ? colors.brand : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    {
                      color: isSelected ? colors.onBrand : colors.secondaryText,
                      fontWeight: isSelected ? "700" : "600",
                    },
                  ]}
                >
                  {filterLabel}
                </Text>
                <View
                  style={[
                    styles.pillCountBadge,
                    {
                      backgroundColor: isSelected
                        ? "rgba(23, 25, 24, 0.16)"
                        : colors.secondarySurface,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillCountText,
                      {
                        color: isSelected ? colors.onBrand : colors.secondaryText,
                      },
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Per-Barber Filter Strip for Salon Managers */}
        {barberFilterOptions.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.staffFilterRow}
          >
            {barberFilterOptions.map((staffName) => {
              const isPicked = selectedBarberFilter === staffName;
              const label = staffName === "All" ? "All Chairs" : staffName;
              return (
                <TouchableOpacity
                  key={staffName}
                  activeOpacity={0.8}
                  onPress={() => setSelectedBarberFilter(staffName)}
                  style={[
                    styles.staffChip,
                    {
                      backgroundColor: isPicked ? colors.brand : colors.card,
                      borderColor: isPicked ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={staffName === "All" ? "people-outline" : "cut-outline"}
                    size={13}
                    color={isPicked ? colors.onBrand : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.staffChipText,
                      {
                        color: isPicked ? colors.onBrand : colors.secondaryText,
                        fontWeight: isPicked ? "700" : "600",
                      },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
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
        {isLoading ? (
          <View style={{ marginTop: 4 }}>
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                {
                  backgroundColor: colors.secondarySurface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="calendar-outline" size={26} color={colors.brand} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primaryText }]}>{t("bookings.noBookingsFound") || "No Bookings Found"}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondaryText }]}>
              {searchQuery.trim()
                ? "No client appointments match your current search filter."
                : "Client appointments in this category will appear here."}
            </Text>
          </View>
        ) : (
          filteredAppointments.map((item) => {
            const isInChair =
              item.status === "shaving..." ||
              item.status === "In Progress" ||
              (item.status as string).toLowerCase().includes("shav");

            const getStatusMeta = (status: Appointment["status"]) => {
              const lower = (status || "").toLowerCase();
              if (lower === "completed") {
                return {
                  color: colors.success,
                  bg: colors.successSoft,
                  icon: "checkmark-circle" as const,
                  label: "Completed",
                };
              }
              if (lower === "shaving..." || lower === "shaving" || lower === "in progress") {
                return {
                  color: colors.info,
                  bg: colors.infoSoft,
                  icon: "cut" as const,
                  label: "shaving...",
                };
              }
              if (lower === "pending") {
                return {
                  color: colors.warning,
                  bg: colors.warningSoft,
                  icon: "time-outline" as const,
                  label: "Pending",
                };
              }
              if (lower === "cancelled") {
                return {
                  color: colors.error,
                  bg: colors.errorSoft,
                  icon: "close-circle" as const,
                  label: "Cancelled",
                };
              }
              if (lower === "no-show") {
                return {
                  color: colors.secondaryText,
                  bg: colors.secondarySurface,
                  icon: "alert-circle-outline" as const,
                  label: "No-Show",
                };
              }
              if (lower === "disputed") {
                return {
                  color: colors.error,
                  bg: colors.errorSoft,
                  icon: "warning-outline" as const,
                  label: "Disputed",
                };
              }
              return {
                color: colors.brand,
                bg: colors.brandSoft,
                icon: "calendar-outline" as const,
                label: "Confirmed",
              };
            };

            const meta = getStatusMeta(item.status);
            const initials =
              item.client
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || "C";
            const isRowBusy = processingInlineId === String(item.id);

            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.88}
                onPress={() => {
                  setSelectedAppointment(item);
                  if (isInChair) {
                    openEndServiceModal(item);
                  }
                }}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card,
                    borderColor: isInChair ? colors.brandBorder : colors.border,
                  },
                ]}
              >
                {/* Card Header */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.clientIdentityRow}>
                    <View
                      style={[
                        styles.avatarInitials,
                        {
                          backgroundColor: colors.secondarySurface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={[styles.avatarInitialsText, { color: colors.brand }]}>
                        {initials}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.clientName, { color: colors.primaryText }]}
                        numberOfLines={1}
                      >
                        {item.client}
                      </Text>
                      <View style={styles.serviceMetaLine}>
                        <Text
                          style={[styles.serviceSubtext, { color: colors.secondaryText }]}
                          numberOfLines={1}
                        >
                          {item.service}
                        </Text>
                        {item.barber_name ? (
                          <View
                            style={[
                              styles.assignedBarberBadge,
                              {
                                backgroundColor: colors.secondarySurface,
                                borderColor: colors.border,
                              },
                            ]}
                          >
                            <Ionicons name="person-outline" size={10} color={colors.secondaryText} />
                            <Text
                              style={[styles.assignedBarberText, { color: colors.secondaryText }]}
                              numberOfLines={1}
                            >
                              {item.barber_name}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Ionicons name={meta.icon} size={12} color={meta.color} />
                    <Text style={[styles.statusBadgeText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

                {/* Client Attached Reference Hairstyle */}
                {item.reference_photo_url ? (
                  <View
                    style={[
                      styles.photoCardIndicator,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Image
                      source={{ uri: item.reference_photo_url }}
                      style={styles.cardPhotoThumb}
                    />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                        <Ionicons name="sparkles" size={12} color={colors.brand} />
                        <Text style={[styles.photoIndicatorTitle, { color: colors.brand }]}>
                          {t("bookings.clientPhotoAttached") || "Client Selected Photo Attached"}
                        </Text>
                      </View>
                      <Text
                        style={[styles.photoIndicatorSub, { color: colors.secondaryText }]}
                      >
                        {t("bookings.tapInspectReference") || "Tap to inspect client's hairstyle reference"}
                      </Text>
                    </View>
                    <Ionicons name="eye-outline" size={16} color={colors.brand} />
                  </View>
                ) : null}

                {/* Home Service Badge */}
                {item.service_type === "home_service" && (
                  <View
                    style={[
                      styles.homeServiceBanner,
                      {
                        backgroundColor: colors.infoSoft,
                        borderColor: colors.info,
                      },
                    ]}
                  >
                    <Ionicons name="home-outline" size={16} color={colors.info} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.homeServiceTitle, { color: colors.info }]}>
                        {t("bookings.homeServiceTitle") || "HOME SERVICE (HOUSE CALL)"}
                      </Text>
                      <Text style={[styles.homeServiceSub, { color: colors.primaryText }]}>
                        Destination: {item.home_address || "Client Address"}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Schedule & Price Row */}
                <View style={styles.cardFooterRow}>
                  <View style={styles.timeMetaGroup}>
                    <Ionicons name="time-outline" size={14} color={colors.secondaryText} />
                    <Text style={[styles.timeText, { color: colors.secondaryText }]}>
                      {item.time}
                    </Text>
                    <View
                      style={[
                        styles.durationChip,
                        { backgroundColor: colors.secondarySurface },
                      ]}
                    >
                      <Text style={[styles.durationChipText, { color: colors.secondaryText }]}>
                        {item.duration}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.priceTag, { color: colors.brand }]}>
                      {item.price.toLocaleString()} CFA
                    </Text>
                    <Ionicons name="chevron-forward" size={15} color={colors.secondaryText} />
                  </View>
                </View>

                {/* Pending Quick Actions */}
                {item.status === "Pending" && (
                  <View style={styles.inlineActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isRowBusy}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleDeclineAppointment(item);
                      }}
                      style={[
                        styles.inlineSecondaryBtn,
                        {
                          backgroundColor: colors.secondarySurface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="close-outline" size={15} color={colors.error} />
                      <Text style={[styles.inlineSecondaryBtnText, { color: colors.error }]}>{t("common.decline") || "Decline"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isRowBusy}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleAcceptAppointment(item);
                      }}
                      style={[
                        styles.inlinePrimaryBtn,
                        {
                          backgroundColor: colors.brand,
                          opacity: isRowBusy ? 0.7 : 1,
                        },
                      ]}
                    >
                      {isRowBusy ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <>
                          <Ionicons name="checkmark" size={15} color={colors.onBrand} />
                          <Text
                            style={[styles.inlinePrimaryBtnText, { color: colors.onBrand }]}
                          >{t("bookings.acceptBooking") || "Accept Booking"}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {/* Confirmed Quick Action */}
                {item.status === "Confirmed" && (
                  <View style={styles.inlineActionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setSelectedAppointment(item);
                      }}
                      style={[
                        styles.inlineIconOnlyBtn,
                        {
                          backgroundColor: colors.secondarySurface,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="information-circle-outline"
                        size={17}
                        color={colors.primaryText}
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setSelectedAppointment(item);
                        setPinModalVisible(true);
                      }}
                      style={[
                        styles.inlinePrimaryBtn,
                        { backgroundColor: colors.brand },
                      ]}
                    >
                      <Ionicons name="key-outline" size={14} color={colors.onBrand} />
                      <Text style={[styles.inlinePrimaryBtnText, { color: colors.onBrand }]}>{t("bookings.startServicePin") || "Start Service (PIN)"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* In-Chair Action Banner */}
                {isInChair && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      openEndServiceModal(item);
                    }}
                    style={[
                      styles.inProgressCtaBtn,
                      { backgroundColor: colors.brand },
                    ]}
                  >
                    <Ionicons
                      name="checkmark-done-circle-outline"
                      size={16}
                      color={colors.onBrand}
                    />
                    <Text style={[styles.inProgressCtaText, { color: colors.onBrand }]}>
                      shaving... • Tap to End Service & Collect PIN
                    </Text>
                  </TouchableOpacity>
                )}

                {/* Dispute Notice */}
                {item.status === "disputed" && item.dispute_reason ? (
                  <View
                    style={[
                      styles.disputeBanner,
                      {
                        backgroundColor: colors.errorSoft,
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="warning-outline" size={14} color={colors.error} />
                    <Text style={[styles.disputeBannerText, { color: colors.error }]}>
                      {item.dispute_reason}
                    </Text>
                  </View>
                ) : null}

                {/* Delete Past Booking Option for Completed Sessions */}
                {(selectedFilter === "Completed" ||
                  item.status === "Completed" ||
                  item.status === "Cancelled") && (
                  <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.75}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        setBookingToDelete(item);
                      }}
                      style={[
                        styles.deleteHistoryChip,
                        { backgroundColor: colors.errorSoft },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={13} color={colors.error} />
                      <Text style={[styles.deleteHistoryText, { color: colors.error }]}>
                        {t("bookings.deleteFromHistory") || "Delete from History"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 1. Main Appointment Detail Modal */}
      {selectedAppointment &&
        !pinModalVisible &&
        !paymentModalVisible &&
        !noShowModalVisible &&
        !completionModalVisible && (
          <CustomModal
            visible={!!selectedAppointment}
            onClose={() => setSelectedAppointment(null)}
            title={selectedAppointment.client}
            description={`${selectedAppointment.service}\nScheduled: ${selectedAppointment.time} (${selectedAppointment.duration})\nPrice: ${selectedAppointment.price.toLocaleString()} CFA\nStatus: ${
              selectedAppointment.status === "disputed"
                ? "Disputed (Under Review)"
                : selectedAppointment.status
            }`}
            icon="person-outline"
            iconBg={colors.brandSoft}
            iconColor={colors.brand}
            primaryText={null}
            secondaryText={null}
          >
            <View style={{ width: "100%" }}>
              {selectedAppointment.reference_photo_url ? (
                <View style={styles.photoModalPreviewBox}>
                  <View style={styles.photoModalHeader}>
                    <Ionicons name="sparkles" size={13} color={colors.brand} />
                    <Text style={[styles.photoModalTitle, { color: colors.brand }]}>
                      CLIENT'S SELECTED HAIRSTYLE REFERENCE
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                      const targetBookingId = String(
                        selectedAppointment.booking_id || selectedAppointment.id
                      );
                      const pic = selectedAppointment.reference_photo_url;
                      setSelectedAppointment(null);
                      router.push({
                        pathname: "/Pages/booking-detail",
                        params: {
                          bookingId: targetBookingId,
                          pictureUrl: pic || "",
                          clientName: selectedAppointment.client,
                          clientPhone:
                            selectedAppointment.client_phone || "+237 670 12 34 56",
                          serviceName: selectedAppointment.service,
                          price: String(selectedAppointment.price),
                          status: selectedAppointment.status,
                          time: selectedAppointment.time,
                        },
                      });
                    }}
                    style={[
                      styles.photoModalImageWrap,
                      { borderColor: colors.border },
                    ]}
                  >
                    <Image
                      source={{ uri: selectedAppointment.reference_photo_url }}
                      style={styles.photoModalImage}
                      resizeMode="cover"
                    />
                    <View style={styles.photoModalOverlay}>
                      <Ionicons name="scan-outline" size={13} color={colors.white} />
                      <Text style={styles.photoModalOverlayText}>
                        {t("bookings.tapOpenFullDetails") || "Tap to Open Full Details"}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <Text style={[styles.photoModalHint, { color: colors.secondaryText }]}>
                    {t("bookings.clientPhotoZoom") || "Client selected this reference photo while booking. Tap image to zoom."}
                  </Text>
                </View>
              ) : null}

              {selectedAppointment.status === "Confirmed" &&
                getGracePeriod(selectedAppointment.rawStartTime).isPastStart && (
                  <View
                    style={[
                      styles.graceNoticeBox,
                      {
                        backgroundColor: getGracePeriod(selectedAppointment.rawStartTime)
                          .canMarkNoShow
                          ? colors.errorSoft
                          : colors.warningSoft,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: getGracePeriod(selectedAppointment.rawStartTime)
                          .canMarkNoShow
                          ? colors.error
                          : colors.warning,
                        textAlign: "center",
                      }}
                    >
                      {getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                        ? "Client is over 15 minutes late. You may mark this appointment as No-Show."
                        : `15-min arrival grace period: ${
                            getGracePeriod(selectedAppointment.rawStartTime)
                              .minutesRemaining
                          }m remaining before No-Show is permitted.`}
                    </Text>
                  </View>
                )}

              {selectedAppointment.status === "disputed" && (
                <View
                  style={[
                    styles.disputeModalBox,
                    { backgroundColor: colors.errorSoft },
                  ]}
                >
                  <View style={styles.disputeModalTitleRow}>
                    <Ionicons name="warning-outline" size={14} color={colors.error} />
                    <Text style={[styles.disputeModalTitle, { color: colors.error }]}>
                      Payment Incident Escalated
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11.5, color: colors.secondaryText }}>
                    {selectedAppointment.dispute_reason ||
                      "Payment was reported as unpaid. Trimly support has an open ticket for this case."}
                  </Text>
                </View>
              )}

              {/* Custom Dark Urban Modal Buttons */}
              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={async () => {
                    if (selectedAppointment.status === "Pending") {
                      await handleDeclineAppointment(selectedAppointment);
                    } else if (
                      selectedAppointment.status === "Confirmed" &&
                      getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                    ) {
                      setNoShowModalVisible(true);
                    } else {
                      setSelectedAppointment(null);
                    }
                  }}
                  style={[
                    styles.modalSecondaryBtn,
                    {
                      backgroundColor: colors.secondarySurface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.modalSecondaryBtnText,
                      {
                        color:
                          selectedAppointment.status === "Pending" ||
                          (selectedAppointment.status === "Confirmed" &&
                            getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow)
                            ? colors.error
                            : colors.primaryText,
                      },
                    ]}
                  >
                    {selectedAppointment.status === "Pending"
                      ? "Decline"
                      : selectedAppointment.status === "Confirmed" &&
                        getGracePeriod(selectedAppointment.rawStartTime).isPastStart
                      ? getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                        ? "Mark No-Show"
                        : "Grace Active"
                      : "Close"}
                  </Text>
                </TouchableOpacity>

                {(selectedAppointment.status === "Pending" ||
                  selectedAppointment.status === "Confirmed" ||
                  selectedAppointment.status === "In Progress" ||
                  selectedAppointment.status === "shaving..." ||
                  (selectedAppointment.status as string).toLowerCase().includes("shav") ||
                  selectedAppointment.status === "Completed" ||
                  selectedFilter === "Completed" ||
                  selectedAppointment.status === "Cancelled") && (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={async () => {
                      if (selectedAppointment.status === "Pending") {
                        await handleAcceptAppointment(selectedAppointment);
                      } else if (selectedAppointment.status === "Confirmed") {
                        setPinModalVisible(true);
                      } else if (
                        selectedAppointment.status === "In Progress" ||
                        selectedAppointment.status === "shaving..." ||
                        (selectedAppointment.status as string).toLowerCase().includes("shav")
                      ) {
                        openEndServiceModal(selectedAppointment);
                      } else if (
                        selectedAppointment.status === "Completed" ||
                        selectedFilter === "Completed" ||
                        selectedAppointment.status === "Cancelled"
                      ) {
                        const toDelete = selectedAppointment;
                        setSelectedAppointment(null);
                        setBookingToDelete(toDelete);
                      }
                    }}
                    style={[
                      styles.modalPrimaryBtn,
                      {
                        backgroundColor:
                          selectedAppointment.status === "Completed" ||
                          selectedAppointment.status === "Cancelled"
                            ? colors.error
                            : colors.brand,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalPrimaryBtnText,
                        {
                          color:
                            selectedAppointment.status === "Completed" ||
                            selectedAppointment.status === "Cancelled"
                              ? colors.white
                              : colors.onBrand,
                        },
                      ]}
                    >
                      {selectedAppointment.status === "Pending"
                        ? "Accept Appointment"
                        : selectedAppointment.status === "Confirmed"
                        ? "Start Service (Verify PIN)"
                        : selectedAppointment.status === "In Progress" ||
                          selectedAppointment.status === "shaving..." ||
                          (selectedAppointment.status as string).toLowerCase().includes("shav")
                        ? "End Service (Await Code)"
                        : (t("bookings.deleteFromHistory") || "Delete from History")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </CustomModal>
        )}

      {/* 2. Arrival PIN Handshake Modal */}
      <CustomModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        title="Verify Client Arrival"
        description={t("bookings.arrivalPinModalDesc") || "To prevent accidental starts when the client is absent, enter the 4-digit Arrival PIN shown on their Trimly app receipt."}
        icon="key-outline"
        iconBg={colors.brandSoft}
        iconColor={colors.brand}
        primaryText={null}
        secondaryText={null}
      >
        <View style={{ width: "100%", marginTop: 4 }}>
          {!isBypassingPin ? (
            <View>
              <TextInput
                value={arrivalPinInput}
                onChangeText={(val) => setArrivalPinInput(val.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="• • • •"
                placeholderTextColor={colors.mutedText}
                style={[
                  styles.pinInputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor:
                      arrivalPinInput.length === 4 ? colors.brand : colors.border,
                    color: colors.primaryText,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(true)}
                style={{ marginTop: 12, alignItems: "center" }}
              >
                <Text style={[styles.underlineLink, { color: colors.secondaryText }]}>
                  {t("bookings.bypassPinDeadPhone") || "Client phone battery dead / offline? Bypass PIN"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.bypassWarningLabel, { color: colors.warning }]}>
                Bypass Mode (Requires Verification Note)
              </Text>
              <TextInput
                value={bypassReason}
                onChangeText={setBypassReason}
                placeholder={t("bookings.bypassReasonPlaceholder") || "e.g. Verified client identity in chair, phone dead"}
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.noteInputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primaryText,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(false)}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={[styles.underlineLink, { color: colors.secondaryText }]}>
                  {t("bookings.backToPinEntry") || "Back to PIN entry"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.modalBtnRow, { marginTop: 18 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmittingPin}
              onPress={() => setPinModalVisible(false)}
              style={[
                styles.modalSecondaryBtn,
                {
                  backgroundColor: colors.secondarySurface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalSecondaryBtnText, { color: colors.primaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmittingPin}
              onPress={handleConfirmStartService}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor: colors.brand,
                  opacity: isSubmittingPin ? 0.7 : 1,
                },
              ]}
            >
              {isSubmittingPin ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <Text style={[styles.modalPrimaryBtnText, { color: colors.onBrand }]}>
                  {t("bookings.confirmAndStart") || "Confirm & Start"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* 3. Payment Verification Modal on Complete */}
      <CustomModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Collect & Finalize Payment"
        description={`Confirm how the client settled the ${selectedAppointment?.price.toLocaleString()} CFA service charge:`}
        icon="cash-outline"
        iconBg={colors.brandSoft}
        iconColor={colors.brand}
        primaryText={null}
        secondaryText={null}
      >
        <View style={{ width: "100%", gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("cash")}
            style={[
              styles.paymentOptionCard,
              {
                borderColor:
                  selectedPaymentMethod === "cash" ? colors.brand : colors.border,
                backgroundColor:
                  selectedPaymentMethod === "cash" ? colors.brandSoft : colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.paymentOptionIcon,
                {
                  backgroundColor:
                    selectedPaymentMethod === "cash"
                      ? colors.brand
                      : colors.secondarySurface,
                },
              ]}
            >
              <Ionicons
                name="cash-outline"
                size={18}
                color={
                  selectedPaymentMethod === "cash"
                    ? colors.onBrand
                    : colors.secondaryText
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.primaryText }}>
                Cash Settled
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.secondaryText }}>
                {t("bookings.clientPaidCash") || "Client paid directly in physical cash"}
              </Text>
            </View>
            {selectedPaymentMethod === "cash" && (
              <Ionicons name="checkmark-circle" size={19} color={colors.brand} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("momo")}
            style={[
              styles.paymentOptionCard,
              {
                borderColor:
                  selectedPaymentMethod === "momo" ? colors.brand : colors.border,
                backgroundColor:
                  selectedPaymentMethod === "momo" ? colors.brandSoft : colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.paymentOptionIcon,
                {
                  backgroundColor:
                    selectedPaymentMethod === "momo"
                      ? colors.brand
                      : colors.secondarySurface,
                },
              ]}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={
                  selectedPaymentMethod === "momo"
                    ? colors.onBrand
                    : colors.secondaryText
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.primaryText }}>
                Mobile Money Settled
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.secondaryText }}>
                {t("bookings.momoTransferVerified") || "MTN MoMo or Orange Money transfer verified"}
              </Text>
            </View>
            {selectedPaymentMethod === "momo" && (
              <Ionicons name="checkmark-circle" size={19} color={colors.brand} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("unpaid")}
            style={[
              styles.paymentOptionCard,
              {
                borderColor:
                  selectedPaymentMethod === "unpaid" ? colors.error : colors.border,
                backgroundColor:
                  selectedPaymentMethod === "unpaid"
                    ? colors.errorSoft
                    : colors.background,
              },
            ]}
          >
            <View
              style={[
                styles.paymentOptionIcon,
                {
                  backgroundColor:
                    selectedPaymentMethod === "unpaid"
                      ? colors.errorSoft
                      : colors.secondarySurface,
                },
              ]}
            >
              <Ionicons name="warning-outline" size={18} color={colors.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.error }}>
                Client Refused / Did Not Pay
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.secondaryText }}>
                {t("bookings.escalatesToAdmin") || "Escalates directly to Trimly Super Admin"}
              </Text>
            </View>
            {selectedPaymentMethod === "unpaid" && (
              <Ionicons name="checkmark-circle" size={19} color={colors.error} />
            )}
          </TouchableOpacity>

          {selectedPaymentMethod === "unpaid" && (
            <TextInput
              value={unpaidDisputeNote}
              onChangeText={setUnpaidDisputeNote}
              placeholder="Explain incident (e.g. Client walked out without paying)"
              placeholderTextColor={colors.inputPlaceholder}
              multiline
              numberOfLines={2}
              style={[
                styles.noteInputBox,
                {
                  minHeight: 56,
                  backgroundColor: colors.background,
                  borderColor: colors.error,
                  color: colors.primaryText,
                },
              ]}
            />
          )}

          <View style={[styles.modalBtnRow, { marginTop: 8 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={isSubmittingPayment}
              onPress={() => setPaymentModalVisible(false)}
              style={[
                styles.modalSecondaryBtn,
                {
                  backgroundColor: colors.secondarySurface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalSecondaryBtnText, { color: colors.primaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmittingPayment}
              onPress={handleConfirmPaymentComplete}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor:
                    selectedPaymentMethod === "unpaid" ? colors.error : colors.brand,
                  opacity: isSubmittingPayment ? 0.7 : 1,
                },
              ]}
            >
              {isSubmittingPayment ? (
                <ActivityIndicator
                  size="small"
                  color={
                    selectedPaymentMethod === "unpaid" ? colors.white : colors.onBrand
                  }
                />
              ) : (
                <Text
                  style={[
                    styles.modalPrimaryBtnText,
                    {
                      color:
                        selectedPaymentMethod === "unpaid"
                          ? colors.white
                          : colors.onBrand,
                    },
                  ]}
                >
                  {t("bookings.completeBooking") || "Complete Booking"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* 4. No-Show Confirmation Modal */}
      <CustomModal
        visible={noShowModalVisible}
        onClose={() => setNoShowModalVisible(false)}
        title="Mark Client as No-Show?"
        description={t("bookings.noShowModalDesc") || "The 15-minute arrival grace period has passed. Marking this booking as No-Show will notify the client and unlock your calendar slot for new bookings or walk-ins."}
        icon="alert-circle-outline"
        iconBg={colors.errorSoft}
        iconColor={colors.error}
        primaryDanger={true}
        primaryText={null}
        secondaryText={null}
      >
        <View style={[styles.modalBtnRow, { width: "100%" }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isSubmittingNoShow}
            onPress={() => setNoShowModalVisible(false)}
            style={[
              styles.modalSecondaryBtn,
              {
                backgroundColor: colors.secondarySurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalSecondaryBtnText, { color: colors.primaryText }]}>
              Keep Waiting
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmittingNoShow}
            onPress={handleConfirmNoShow}
            style={[
              styles.modalPrimaryBtn,
              {
                backgroundColor: colors.error,
                opacity: isSubmittingNoShow ? 0.7 : 1,
              },
            ]}
          >
            {isSubmittingNoShow ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.modalPrimaryBtnText, { color: colors.white }]}>
                {t("bookings.confirmNoShow") || "Confirm No-Show"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* 5. Service Ending PIN Handshake Modal */}
      <CustomModal
        visible={completionModalVisible}
        onClose={() => {
          setCompletionModalVisible(false);
          setCompletionPinInput("");
          setIsBypassingCompletionPin(false);
          setBypassCompletionReason("");
        }}
        title="End Service & Receive Payment"
        description={
          isBypassingCompletionPin
            ? "Enter a verification note to complete service without the client's code."
            : pinSentSuccess || selectedAppointment?.completion_pin_requested
            ? `A 4-digit service ending code was sent to ${
                selectedAppointment?.client || "the client"
              }'s Trimly app. Ask the client for their code to finalize the service and receive payment.`
            : `Send a 4-digit ending code to ${
                selectedAppointment?.client || "the client"
              }'s Trimly app to verify haircut completion.`
        }
        icon="checkmark-done-circle-outline"
        iconBg={colors.brandSoft}
        iconColor={colors.brand}
        primaryText={null}
        secondaryText={null}
      >
        <View style={{ width: "100%" }}>
          {isRequestingPin ? (
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={colors.brand} />
              <Text style={{ fontSize: 13, color: colors.secondaryText, marginTop: 8 }}>
                {t("bookings.sendingEndingCode") || "Sending ending code to client..."}
              </Text>
            </View>
          ) : !isBypassingCompletionPin ? (
            <View>
              {pinSentSuccess || selectedAppointment?.completion_pin_requested ? (
                <>
                  <View
                    style={[
                      styles.dispatchedBanner,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "800",
                        color: colors.brand,
                        letterSpacing: 0.6,
                      }}
                    >
                      {t("bookings.codeDispatchedToClient") || "CODE DISPATCHED TO CLIENT"}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11.5,
                        color: colors.primaryText,
                        marginTop: 2,
                        textAlign: "center",
                      }}
                    >
                      Awaiting 4-digit ending code from{" "}
                      {selectedAppointment?.client || "client"}...
                    </Text>
                  </View>

                  <TextInput
                    value={completionPinInput}
                    onChangeText={(val) =>
                      setCompletionPinInput(val.replace(/\D/g, "").slice(0, 4))
                    }
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="• • • •"
                    placeholderTextColor={colors.mutedText}
                    style={[
                      styles.pinInputBox,
                      {
                        backgroundColor: colors.background,
                        borderColor:
                          completionPinInput.length === 4 ? colors.brand : colors.border,
                        color: colors.primaryText,
                      },
                    ]}
                  />

                  <View style={styles.pinHelperLinksRow}>
                    <TouchableOpacity
                      onPress={() => handleSendEndingCode()}
                      disabled={isRequestingPin}
                    >
                      <Text style={{ fontSize: 12, color: colors.brand, fontWeight: "700" }}>
                        Resend Code
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setIsBypassingCompletionPin(true)}>
                      <Text style={[styles.underlineLink, { color: colors.secondaryText }]}>
                        {t("bookings.bypassPhoneDead") || "Client phone dead? Bypass"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={{ alignItems: "center", paddingVertical: 8 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      color: colors.secondaryText,
                      textAlign: "center",
                    }}
                  >
                    When you finish the service, send the ending code to the client to verify
                    completion and credit your earnings.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View>
              <Text style={[styles.bypassWarningLabel, { color: colors.warning }]}>
                Bypass Ending Code (Requires Verification Note)
              </Text>
              <TextInput
                value={bypassCompletionReason}
                onChangeText={setBypassCompletionReason}
                placeholder={t("bookings.endingBypassPlaceholder") || "e.g. Service finished, client phone died in shop"}
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.noteInputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primaryText,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingCompletionPin(false)}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={[styles.underlineLink, { color: colors.secondaryText }]}>
                  {t("bookings.backToCodeEntry") || "Back to Code Entry"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={[styles.modalBtnRow, { marginTop: 16 }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                setCompletionModalVisible(false);
                setCompletionPinInput("");
                setIsBypassingCompletionPin(false);
                setBypassCompletionReason("");
              }}
              style={[
                styles.modalSecondaryBtn,
                {
                  backgroundColor: colors.secondarySurface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.modalSecondaryBtnText, { color: colors.primaryText }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmittingCompletion || isRequestingPin}
              onPress={() => {
                if (
                  pinSentSuccess ||
                  selectedAppointment?.completion_pin_requested ||
                  isBypassingCompletionPin
                ) {
                  handleConfirmEndService();
                } else {
                  handleSendEndingCode();
                }
              }}
              style={[
                styles.modalPrimaryBtn,
                {
                  backgroundColor: colors.brand,
                  opacity: isSubmittingCompletion || isRequestingPin ? 0.7 : 1,
                },
              ]}
            >
              {isSubmittingCompletion || isRequestingPin ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <>
                  <Ionicons
                    name={
                      pinSentSuccess ||
                      selectedAppointment?.completion_pin_requested ||
                      isBypassingCompletionPin
                        ? "shield-checkmark-outline"
                        : "paper-plane-outline"
                    }
                    size={15}
                    color={colors.onBrand}
                  />
                  <Text style={[styles.modalPrimaryBtnText, { color: colors.onBrand }]}>
                    {pinSentSuccess ||
                    selectedAppointment?.completion_pin_requested ||
                    isBypassingCompletionPin
                      ? "Verify & End"
                      : "Send Code"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              setCompletionModalVisible(false);
              setSelectedPaymentMethod("unpaid");
              setPaymentModalVisible(true);
            }}
            style={[
              styles.reportIncidentRow,
              { borderTopColor: colors.border },
            ]}
          >
            <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
            <Text style={{ fontSize: 11.5, color: colors.error, fontWeight: "600" }}>
              {t("bookings.reportIncidentRefused") || "Client refused to pay or walked out? Report Incident"}
            </Text>
          </TouchableOpacity>
        </View>
      </CustomModal>

      {/* 6. Delete Past Booking Confirmation Modal */}
      <CustomModal
        visible={!!bookingToDelete}
        onClose={() => setBookingToDelete(null)}
        title={t("bookings.deleteBookingTitle") || "Delete Past Booking"}
        description={
          bookingToDelete
            ? `Are you sure you want to remove the past booking for ${bookingToDelete.client} (${bookingToDelete.service}) from your history? This will permanently delete this record.`
            : ""
        }
        icon="trash-outline"
        iconBg={colors.errorSoft}
        iconColor={colors.error}
        primaryDanger={true}
        primaryText={null}
        secondaryText={null}
      >
        <View style={[styles.modalBtnRow, { width: "100%" }]}>
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isDeletingBooking}
            onPress={() => setBookingToDelete(null)}
            style={[
              styles.modalSecondaryBtn,
              {
                backgroundColor: colors.secondarySurface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.modalSecondaryBtnText, { color: colors.primaryText }]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isDeletingBooking}
            onPress={handleConfirmDeleteHistory}
            style={[
              styles.modalPrimaryBtn,
              {
                backgroundColor: colors.error,
                opacity: isDeletingBooking ? 0.7 : 1,
              },
            ]}
          >
            {isDeletingBooking ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={[styles.modalPrimaryBtnText, { color: colors.white }]}>
                {t("bookings.deleteFromHistory") || "Delete from History"}
              </Text>
            )}
          </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 23,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  liveSubRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
    paddingVertical: 0,
  },
  dayRow: {
    flexDirection: "row",
    gap: 8,
  },
  dayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12.5,
  },
  pillCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  pillCountText: {
    fontSize: 11,
    fontWeight: "700",
  },
  staffFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
  },
  staffChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6.5,
    borderRadius: 13,
    borderWidth: 1,
  },
  staffChipText: {
    fontSize: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 115,
    paddingTop: 4,
    gap: 12,
  },
  emptyStateCard: {
    marginTop: 12,
    paddingVertical: 38,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
    lineHeight: 19,
  },
  card: {
    padding: 16,
    borderRadius: 19,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  clientIdentityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    flex: 1,
  },
  avatarInitials: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitialsText: {
    fontSize: 14,
    fontWeight: "800",
  },
  clientName: {
    fontSize: 15.5,
    fontWeight: "700",
  },
  serviceMetaLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  serviceSubtext: {
    fontSize: 12.5,
    flexShrink: 1,
  },
  assignedBarberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  assignedBarberText: {
    fontSize: 10.5,
    fontWeight: "600",
    maxWidth: 85,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 11,
  },
  statusBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  cardDivider: {
    height: 1,
    marginVertical: 12,
  },
  photoCardIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 9,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 11,
  },
  cardPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
  },
  photoIndicatorTitle: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 1,
  },
  photoIndicatorSub: {
    fontSize: 11,
  },
  homeServiceBanner: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeServiceTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  homeServiceSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  cardFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeMetaGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  durationChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 7,
  },
  durationChipText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  priceTag: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  inlineIconOnlyBtn: {
    width: 40,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineSecondaryBtn: {
    flex: 1,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  inlineSecondaryBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  inlinePrimaryBtn: {
    flex: 1.5,
    height: 38,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  inlinePrimaryBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  inProgressCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
  },
  inProgressCtaText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  disputeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  disputeBannerText: {
    fontSize: 11.5,
    fontWeight: "600",
    flex: 1,
  },
  deleteHistoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5.5,
    paddingHorizontal: 10,
    borderRadius: 9,
  },
  deleteHistoryText: {
    fontSize: 11,
    fontWeight: "700",
  },
  photoModalPreviewBox: {
    width: "100%",
    marginBottom: 12,
  },
  photoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 6,
  },
  photoModalTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  photoModalImageWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  photoModalImage: {
    width: "100%",
    height: "100%",
  },
  photoModalOverlay: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(15, 17, 16, 0.78)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  photoModalOverlayText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "600",
  },
  photoModalHint: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  graceNoticeBox: {
    padding: 11,
    borderRadius: 12,
    marginBottom: 12,
  },
  disputeModalBox: {
    width: "100%",
    padding: 12,
    borderRadius: 14,
    marginBottom: 12,
  },
  disputeModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  disputeModalTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  modalSecondaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  modalPrimaryBtn: {
    flex: 1.35,
    height: 46,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
  },
  modalPrimaryBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  pinInputBox: {
    height: 58,
    borderWidth: 1.5,
    borderRadius: 15,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 12,
  },
  noteInputBox: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    paddingVertical: 10,
    fontSize: 13,
  },
  bypassWarningLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  underlineLink: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  paymentOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 11,
  },
  paymentOptionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dispatchedBanner: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  pinHelperLinksRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    alignItems: "center",
  },
  reportIncidentRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 12,
  },
});
