import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
import { bookingService, BookingReceipt } from "@/services/bookingService";

export default function SubBarberBookingsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [filter, setFilter] = useState<"All" | "Pending" | "Confirmed" | "Completed">("All");
  const [bookings, setBookings] = useState<BookingReceipt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | number | null>(null);

  const fetchBookings = useCallback(async () => {
    try {
      if (!user?.id) return;
      const res = await bookingService.getMySchedule(user.id);
      const list = res?.bookings || [];
      // Sub-barber only sees bookings assigned to their own user id
      const myOnly = list.filter(
        (b: any) => !b.barber_id || b.barber_id === user.id || String(b.barber_id) === String(user.id)
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

  const handleUpdateStatus = async (booking: BookingReceipt, newStatus: "In Progress" | "Completed") => {
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
    if (filter === "Confirmed") return b.status === "Confirmed" || b.status === "In Progress";
    if (filter === "Completed") return b.status === "Completed" || b.status === "Cancelled";
    return true;
  });

  const filterTabs = [
    { key: "All" as const, label: t("common.all") },
    { key: "Pending" as const, label: t("common.pending") },
    { key: "Confirmed" as const, label: t("common.confirmed") },
    { key: "Completed" as const, label: t("common.completed") },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfacevariant }]}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={[styles.title, { color: colors.primarytext }]}>{t("subBarber.myAppointments")}</Text>
          <Text style={[styles.subtitle, { color: colors.secondarytext }]}>
            {user?.parent_salon_name ? `Stylist at ${user.parent_salon_name}` : t("subBarber.assignedSubtitle")}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRefresh}
          style={[styles.refreshIconBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="refresh" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
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
              activeOpacity={0.8}
              onPress={() => setFilter(tab.key)}
              style={[
                styles.filterTab,
                {
                  backgroundColor: isSelected ? colors.primary : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.surfacevariant,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  { color: isSelected ? colors.background : colors.primarytext },
                ]}
              >
                {tab.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={56} color={colors.secondarytext} />
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>{t("subBarber.noAppointmentsFound")}</Text>
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
            const isCancelled = b.status === "Cancelled";
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
                    borderColor: isPending ? "#F59E0B" : colors.surfacevariant,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.clientInfo}>
                    <Text style={[styles.clientName, { color: colors.primarytext }]}>
                      {b.client_name || "Client"}
                    </Text>
                    {b.client_phone ? (
                      <Text style={[styles.clientPhone, { color: colors.secondarytext }]}>
                        📞 {b.client_phone}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isPending
                          ? "rgba(245, 158, 11, 0.15)"
                          : isConfirmed
                          ? "rgba(16, 185, 129, 0.15)"
                          : isInProgress
                          ? "rgba(59, 130, 246, 0.15)"
                          : isCompleted
                          ? "rgba(107, 114, 128, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
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
                            ? "#10B981"
                            : isInProgress
                            ? "#3B82F6"
                            : isCompleted
                            ? "#9CA3AF"
                            : "#EF4444",
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
                        : (b.status || t("common.confirmed"))}
                    </Text>
                  </View>
                </View>

                {/* Service Details */}
                <View style={[styles.serviceRow, { borderTopColor: colors.surfacevariant }]}>
                  <View style={styles.serviceLeft}>
                    <Ionicons name="cut-outline" size={18} color={colors.primary} />
                    <Text style={[styles.serviceName, { color: colors.primarytext }]}>
                      {b.custom_hairstyle_name || t("subBarber.hairstyleService")}
                    </Text>
                  </View>
                  <Text style={[styles.priceText, { color: colors.primary }]}>
                    {(b.total_price || 0).toLocaleString()} XAF
                  </Text>
                </View>

                {/* Date & Time */}
                <View style={styles.timeRow}>
                  <Ionicons name="time-outline" size={16} color={colors.secondarytext} />
                  <Text style={[styles.timeText, { color: colors.secondarytext }]}>
                    {dateStr} • {timeStr}
                  </Text>
                </View>

                {/* Action Buttons */}
                {isPending && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDecline(b)}
                      disabled={isActionLoading}
                      style={[styles.actionBtn, styles.declineBtn, { opacity: isActionLoading ? 0.7 : 1 }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                          <Text style={styles.declineBtnText}>{t("common.decline")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleAccept(b)}
                      disabled={isActionLoading}
                      style={[styles.actionBtn, styles.acceptBtn, { backgroundColor: colors.primary }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color={colors.background} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle-outline" size={16} color={colors.background} />
                          <Text style={[styles.acceptBtnText, { color: colors.background }]}>
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
                      activeOpacity={0.8}
                      onPress={() => handleUpdateStatus(b, "In Progress")}
                      disabled={isActionLoading}
                      style={[styles.actionBtn, { backgroundColor: "#3B82F6", opacity: isActionLoading ? 0.75 : 1 }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                          <Text style={[styles.acceptBtnText, { color: "#FFFFFF" }]}>{t("subBarber.startService")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUpdateStatus(b, "Completed")}
                      disabled={isActionLoading}
                      style={[styles.actionBtn, { backgroundColor: "#10B981", opacity: isActionLoading ? 0.75 : 1 }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                          <Text style={[styles.acceptBtnText, { color: "#FFFFFF" }]}>{t("common.completed")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

                {isInProgress && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleUpdateStatus(b, "Completed")}
                      disabled={isActionLoading}
                      style={[styles.actionBtn, { backgroundColor: "#10B981", flex: 1, opacity: isActionLoading ? 0.75 : 1 }]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Ionicons name="checkmark-done" size={16} color="#FFFFFF" />
                          <Text style={[styles.acceptBtnText, { color: "#FFFFFF" }]}>{t("subBarber.completeAppointment")}</Text>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 80,
    gap: 12,
  },
  centerContainer: {
    paddingTop: 80,
    alignItems: "center",
  },
  emptyContainer: {
    paddingTop: 80,
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
  },
  clientPhone: {
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  serviceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  serviceLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  serviceName: {
    fontSize: 14,
    fontWeight: "600",
  },
  priceText: {
    fontSize: 14,
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
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  declineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  declineBtnText: {
    color: "#EF4444",
    fontWeight: "600",
    fontSize: 13,
  },
  acceptBtn: {},
  acceptBtnText: {
    fontWeight: "700",
    fontSize: 13,
  },
});
