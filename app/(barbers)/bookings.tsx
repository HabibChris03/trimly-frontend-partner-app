import { AppointmentCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { bookingService } from "@/services/bookingService";
import { useTabBarVisibility } from "@/context/TabBarVisibilityContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";

interface Appointment {
  id: string;
  booking_id?: number | string;
  client: string;
  service: string;
  time: string;
  duration: string;
  price: number;
  accent: string;
  status: "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Pending";
}

export default function BarberBookingsScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const barberId = user?.id || 4;
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { handleScroll, showTabBar } = useTabBarVisibility();

  const [selectedFilter, setSelectedFilter] = useState("All Bookings");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const fetchSchedule = useCallback(async () => {
    try {
      const schedule = await bookingService.getMySchedule(barberId).catch(() => null);
      if (schedule) {
        const list = Array.isArray(schedule)
          ? schedule
          : schedule.schedule || schedule.bookings || schedule.upcoming_bookings || [];

        if (list.length > 0) {
          const mapped: Appointment[] = list.map((b: any, idx: number) => {
            const d = b.start_time ? new Date(b.start_time) : new Date();
            const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            const timeStr = d.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            });
            const isCancelled = b.status === "Cancelled";
            const isPending = b.status === "Pending";
            const isPast = !isCancelled && !isPending && d.getTime() < Date.now() && b.status !== "Confirmed" && b.status !== "In Progress";

            const finalStatus: "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Pending" =
              isCancelled ? "Cancelled" : isPending ? "Pending" : isPast ? "Completed" : (b.status as any || "Confirmed");

            return {
              id: `b-sched-${b.booking_id || b.id || idx}`,
              booking_id: b.booking_id || b.id,
              client: b.client_name || b.name || "Jordan Daniels",
              service: b.custom_hairstyle_name || "Signature Skin Fade & Beard",
              time: `${dateStr} • ${timeStr}`,
              duration: "45 mins",
              price: b.total_price || 25000,
              accent:
                idx % 4 === 0
                  ? "#8BA888"
                  : idx % 4 === 1
                  ? "#C48A8A"
                  : idx % 4 === 2
                  ? "#C2A374"
                  : "#9AA685",
              status: finalStatus,
            };
          });
          setAppointments(mapped);
        } else {
          setAppointments([]);
        }
      }
    } catch {
      setAppointments([]);
    }
  }, [barberId]);

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

  const filteredAppointments = appointments.filter((app) => {
    if (selectedFilter === "Upcoming") return app.status === "Confirmed" || app.status === "In Progress" || app.status === "Pending";
    if (selectedFilter === "Completed") return app.status === "Completed" || app.status === "Cancelled";
    return true;
  });

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("barber.todayQueue")}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
          {t("barber.liveQueue")}
        </Text>

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
            return (
              <TouchableOpacity
                key={filterName}
                activeOpacity={0.8}
                onPress={() => setSelectedFilter(filterName)}
                style={[
                  styles.dayPill,
                  {
                    backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                    borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    {
                      color: isSelected ? "#1C1E1B" : colors.primarytext,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {filterLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
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
          <View style={{ marginTop: 4 }}>
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
            <AppointmentCardSkeleton />
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={{ paddingVertical: 40, alignItems: "center" }}>
            <Ionicons
              name="calendar-outline"
              size={44}
              color={colors.secondarytext}
            />
            <Text
              style={{
                color: colors.primarytext,
                fontSize: 15,
                fontWeight: "600",
                marginTop: 12,
              }}
            >
              No Bookings Found
            </Text>
            <Text
              style={{
                color: colors.secondarytext,
                fontSize: 13,
                marginTop: 4,
                textAlign: "center",
              }}
            >
              Client appointments in this category will appear here.
            </Text>
          </View>
        ) : (
          filteredAppointments.map((item) => (
            <TouchableOpacity
              key={item.id}
              activeOpacity={0.85}
              onPress={() => setSelectedAppointment(item)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
            <View
              style={[styles.accentBar, { backgroundColor: item.accent }]}
            />
            <View style={styles.cardBody}>
              <View style={styles.topRow}>
                <Text style={[styles.timeText, { color: colors.primarytext }]}>
                  {item.time}
                </Text>
                <Text
                  style={[
                    styles.statusText,
                    {
                      color:
                        item.status === "Cancelled"
                          ? "#EF4444"
                          : item.status === "Completed"
                          ? "#10B981"
                          : item.status === "In Progress"
                          ? "#F59E0B"
                          : item.status === "Pending"
                          ? "#F59E0B"
                          : colors.primary,
                    },
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              <Text
                style={[styles.clientName, { color: colors.primarytext }]}
              >
                {item.client}
              </Text>
              <Text
                style={[styles.serviceSubtext, { color: colors.secondarytext }]}
              >
                {item.service} • {item.price.toLocaleString()} CFA
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={colors.secondarytext}
            />
          </TouchableOpacity>
        )))}
      </ScrollView>

      {/* Appointment Detail Custom Modal */}
      <CustomModal
        visible={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title={selectedAppointment ? selectedAppointment.client : "Appointment"}
        description={
          selectedAppointment
            ? `${selectedAppointment.service}\nScheduled: ${selectedAppointment.time} (${selectedAppointment.duration})\nPrice: ${selectedAppointment.price.toLocaleString()} CFA\nStatus: ${selectedAppointment.status}`
            : ""
        }
        icon="person-outline"
        primaryText={
          selectedAppointment?.status === "Pending"
            ? "Accept Appointment"
            : selectedAppointment?.status === "In Progress"
            ? "Mark Completed"
            : "Start Service"
        }
        onPrimary={async () => {
          if (selectedAppointment) {
            const targetId = selectedAppointment.booking_id || selectedAppointment.id;
            if (selectedAppointment.status === "Pending") {
              await bookingService.acceptBooking(targetId);
              showToast(`Accepted appointment for ${selectedAppointment.client}`, "success");
              await fetchSchedule();
            } else {
              const nextStatus = selectedAppointment.status === "In Progress" ? "Completed" : "In Progress";
              await bookingService.updateBookingStatus(targetId, nextStatus);
              setAppointments((prev) =>
                prev.map((a) => (a.id === selectedAppointment.id ? { ...a, status: nextStatus as any } : a))
              );
              showToast(`${nextStatus === "Completed" ? "Completed" : "Started"} service for ${selectedAppointment.client}`, "success");
            }
          }
          setSelectedAppointment(null);
        }}
        secondaryText={selectedAppointment?.status === "Pending" ? "Decline" : "Close"}
        onSecondary={async () => {
          if (selectedAppointment && selectedAppointment.status === "Pending") {
            const targetId = selectedAppointment.booking_id || selectedAppointment.id;
            await bookingService.declineBooking(targetId);
            showToast(`Declined appointment for ${selectedAppointment.client}`, "info");
            await fetchSchedule();
          }
          setSelectedAppointment(null);
        }}
      />
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 12,
  },
  dayRow: {
    flexDirection: "row",
    gap: 8,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110,
    paddingTop: 6,
    gap: 10,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
  },
  accentBar: {
    width: 4,
    height: 38,
    borderRadius: 2,
    marginRight: 14,
  },
  cardBody: {
    flex: 1,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  statusText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  clientName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  serviceSubtext: {
    fontSize: 12.5,
  },
});
