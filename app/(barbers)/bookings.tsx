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
  TextInput,
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
  rawStartTime?: string;
  duration: string;
  price: number;
  accent: string;
  status: "Confirmed" | "In Progress" | "Completed" | "Cancelled" | "Pending" | "No-Show" | "disputed";
  payment_status?: string;
  dispute_reason?: string;
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

  // Worst-Case Scenario Modals
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [arrivalPinInput, setArrivalPinInput] = useState("");
  const [isBypassingPin, setIsBypassingPin] = useState(false);
  const [bypassReason, setBypassReason] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "momo" | "unpaid">("cash");
  const [unpaidDisputeNote, setUnpaidDisputeNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const [noShowModalVisible, setNoShowModalVisible] = useState(false);
  const [isSubmittingNoShow, setIsSubmittingNoShow] = useState(false);

  const fetchSchedule = useCallback(async () => {
    try {
      const schedule = await bookingService.getMySchedule(barberId).catch(() => null);
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
            else if (rawStat === "in progress" || rawStat === "in_progress") finalStatus = "In Progress";
            else if (rawStat === "no-show" || rawStat === "noshow") finalStatus = "No-Show";
            else if (rawStat === "disputed" || rawStat === "unpaid") finalStatus = "disputed";
            else if (rawStat === "completed") finalStatus = "Completed";
            else finalStatus = "Confirmed";

            return {
              id: `b-sched-${b.booking_id || b.id || idx}`,
              booking_id: b.booking_id || b.id,
              client: b.client_name || b.name || "Valued Client",
              service: b.custom_hairstyle_name || "Haircut & Styling",
              time: `${dateStr} • ${timeStr}`,
              rawStartTime: rawStart,
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
              payment_status: b.payment_status || "unpaid",
              dispute_reason: b.dispute_reason,
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
    if (selectedFilter === "Completed") return app.status === "Completed" || app.status === "Cancelled" || app.status === "No-Show" || app.status === "disputed";
    return true;
  });

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

  // Handler: Start Service with Arrival PIN
  const handleConfirmStartService = async () => {
    if (!selectedAppointment) return;
    if (!isBypassingPin && arrivalPinInput.trim().length !== 4) {
      showToast("Please enter the 4-digit client arrival PIN", "error");
      return;
    }

    setIsSubmittingPin(true);
    try {
      const targetId = selectedAppointment.booking_id || selectedAppointment.id;
      await bookingService.updateBookingStatus(targetId, "In Progress", {
        arrival_pin: isBypassingPin ? undefined : arrivalPinInput.trim(),
        bypass_pin: isBypassingPin,
        bypass_reason: isBypassingPin ? (bypassReason.trim() || "Client verified in person") : undefined,
      });

      showToast(`Started service for ${selectedAppointment.client}`, "success");
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
        showToast(`Service completed! Payment confirmed via ${selectedPaymentMethod.toUpperCase()}.`, "success");
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
      showToast(err?.message || "Cannot mark as No-Show yet. 15-min grace period applies.", "error");
    } finally {
      setIsSubmittingNoShow(false);
    }
  };

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
                            : item.status === "No-Show"
                            ? "#9CA3AF"
                            : item.status === "disputed"
                            ? "#EF4444"
                            : colors.primary,
                      },
                    ]}
                  >
                    {item.status === "disputed" ? "Disputed" : item.status}
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
                {item.status === "disputed" && item.dispute_reason ? (
                  <Text style={{ fontSize: 11, color: "#EF4444", marginTop: 3 }}>
                    ⚠️ {item.dispute_reason}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.secondarytext}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* 1. Main Appointment Detail Modal */}
      {selectedAppointment && !pinModalVisible && !paymentModalVisible && !noShowModalVisible && (
        <CustomModal
          visible={!!selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          title={selectedAppointment.client}
          description={`${selectedAppointment.service}\nScheduled: ${selectedAppointment.time} (${selectedAppointment.duration})\nPrice: ${selectedAppointment.price.toLocaleString()} CFA\nStatus: ${selectedAppointment.status === "disputed" ? "Disputed (Under Review)" : selectedAppointment.status}`}
          icon="person-outline"
          primaryText={
            selectedAppointment.status === "Pending"
              ? "Accept Appointment"
              : selectedAppointment.status === "Confirmed"
              ? "Start Service (Verify PIN)"
              : selectedAppointment.status === "In Progress"
              ? "Complete & Collect Payment"
              : null
          }
          onPrimary={async () => {
            if (selectedAppointment.status === "Pending") {
              const targetId = selectedAppointment.booking_id || selectedAppointment.id;
              await bookingService.acceptBooking(targetId);
              showToast(`Accepted appointment for ${selectedAppointment.client}`, "success");
              setSelectedAppointment(null);
              await fetchSchedule();
            } else if (selectedAppointment.status === "Confirmed") {
              setPinModalVisible(true);
            } else if (selectedAppointment.status === "In Progress") {
              setPaymentModalVisible(true);
            }
          }}
          secondaryText={
            selectedAppointment.status === "Pending"
              ? "Decline"
              : selectedAppointment.status === "Confirmed" && getGracePeriod(selectedAppointment.rawStartTime).isPastStart
              ? (getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow ? "Mark No-Show" : "Grace Active")
              : "Close"
          }
          onSecondary={async () => {
            if (selectedAppointment.status === "Pending") {
              const targetId = selectedAppointment.booking_id || selectedAppointment.id;
              await bookingService.declineBooking(targetId);
              showToast(`Declined appointment for ${selectedAppointment.client}`, "info");
              setSelectedAppointment(null);
              await fetchSchedule();
            } else if (
              selectedAppointment.status === "Confirmed" &&
              getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
            ) {
              setNoShowModalVisible(true);
            } else {
              setSelectedAppointment(null);
            }
          }}
        >
          {selectedAppointment.status === "Confirmed" && (
            <View style={{ width: "100%", marginTop: 8 }}>
              {getGracePeriod(selectedAppointment.rawStartTime).isPastStart && (
                <View
                  style={{
                    backgroundColor: getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                      ? "rgba(239, 68, 68, 0.1)"
                      : "rgba(245, 158, 11, 0.1)",
                    padding: 10,
                    borderRadius: 12,
                    marginBottom: 10,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                        ? "#EF4444"
                        : "#F59E0B",
                      textAlign: "center",
                    }}
                  >
                    {getGracePeriod(selectedAppointment.rawStartTime).canMarkNoShow
                      ? "Client is over 15 minutes late. You may mark this appointment as No-Show."
                      : `15-min arrival grace period: ${getGracePeriod(selectedAppointment.rawStartTime).minutesRemaining}m remaining before No-Show is permitted.`}
                  </Text>
                </View>
              )}
            </View>
          )}

          {selectedAppointment.status === "disputed" && (
            <View
              style={{
                width: "100%",
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                padding: 12,
                borderRadius: 14,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444", marginBottom: 2 }}>
                ⚠️ Payment Incident Escalated
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.secondarytext }}>
                {selectedAppointment.dispute_reason || "Payment was reported as unpaid. Trimly support has an open ticket for this case."}
              </Text>
            </View>
          )}
        </CustomModal>
      )}

      {/* 2. Arrival PIN Handshake Modal */}
      <CustomModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        title="Verify Client Arrival"
        description="To prevent accidental starts when the client is absent, enter the 4-digit Arrival PIN shown on their Trimly app receipt."
        icon="key-outline"
        primaryText={isSubmittingPin ? "Verifying..." : "Confirm & Start Service"}
        onPrimary={handleConfirmStartService}
        secondaryText="Cancel"
        onSecondary={() => setPinModalVisible(false)}
      >
        <View style={{ width: "100%", marginVertical: 12 }}>
          {!isBypassingPin ? (
            <View>
              <TextInput
                value={arrivalPinInput}
                onChangeText={(val) => setArrivalPinInput(val.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="• • • •"
                placeholderTextColor={colors.secondarytext}
                style={{
                  height: 56,
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                  borderWidth: 1.5,
                  borderRadius: 16,
                  textAlign: "center",
                  fontSize: 28,
                  fontWeight: "800",
                  letterSpacing: 10,
                  color: colors.primarytext,
                }}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(true)}
                style={{ marginTop: 12, alignItems: "center" }}
              >
                <Text style={{ fontSize: 12, color: colors.secondarytext, textDecorationLine: "underline" }}>
                  Client phone battery dead / offline? Bypass PIN
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "600", marginBottom: 6 }}>
                Bypass Mode (Requires Verification Note)
              </Text>
              <TextInput
                value={bypassReason}
                onChangeText={setBypassReason}
                placeholder="e.g. Verified client identity in chair, phone dead"
                placeholderTextColor={colors.secondarytext}
                style={{
                  minHeight: 46,
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  fontSize: 13,
                  color: colors.primarytext,
                }}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(false)}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={{ fontSize: 12, color: colors.secondarytext, textDecorationLine: "underline" }}>
                  Back to PIN entry
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CustomModal>

      {/* 3. Payment Verification Modal on Complete */}
      <CustomModal
        visible={paymentModalVisible}
        onClose={() => setPaymentModalVisible(false)}
        title="Collect & Finalize Payment"
        description={`Confirm how the client settled the ${selectedAppointment?.price.toLocaleString()} CFA service charge:`}
        icon="cash-outline"
        primaryText={isSubmittingPayment ? "Processing..." : "Complete Booking"}
        onPrimary={handleConfirmPaymentComplete}
        secondaryText="Cancel"
        onSecondary={() => setPaymentModalVisible(false)}
      >
        <View style={{ width: "100%", gap: 8, marginVertical: 10 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("cash")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: selectedPaymentMethod === "cash" ? "#8BA888" : colors.surfacevariant,
              backgroundColor: selectedPaymentMethod === "cash" ? "rgba(139, 168, 136, 0.15)" : colors.surface,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>💵</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primarytext }}>Cash Settled</Text>
              <Text style={{ fontSize: 11, color: colors.secondarytext }}>Client paid directly in physical cash</Text>
            </View>
            {selectedPaymentMethod === "cash" && <Ionicons name="checkmark-circle" size={18} color="#8BA888" />}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("momo")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: selectedPaymentMethod === "momo" ? "#8BA888" : colors.surfacevariant,
              backgroundColor: selectedPaymentMethod === "momo" ? "rgba(139, 168, 136, 0.15)" : colors.surface,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>📱</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primarytext }}>Mobile Money Settled</Text>
              <Text style={{ fontSize: 11, color: colors.secondarytext }}>MTN MoMo or Orange Money transfer verified</Text>
            </View>
            {selectedPaymentMethod === "momo" && <Ionicons name="checkmark-circle" size={18} color="#8BA888" />}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSelectedPaymentMethod("unpaid")}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: selectedPaymentMethod === "unpaid" ? "#EF4444" : colors.surfacevariant,
              backgroundColor: selectedPaymentMethod === "unpaid" ? "rgba(239, 68, 68, 0.12)" : colors.surface,
            }}
          >
            <Text style={{ fontSize: 18, marginRight: 10 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#EF4444" }}>Client Refused / Did Not Pay</Text>
              <Text style={{ fontSize: 11, color: colors.secondarytext }}>Escalates directly to Trimly Super Admin</Text>
            </View>
            {selectedPaymentMethod === "unpaid" && <Ionicons name="checkmark-circle" size={18} color="#EF4444" />}
          </TouchableOpacity>

          {selectedPaymentMethod === "unpaid" && (
            <TextInput
              value={unpaidDisputeNote}
              onChangeText={setUnpaidDisputeNote}
              placeholder="Explain incident (e.g. Client walked out without paying)"
              placeholderTextColor={colors.secondarytext}
              multiline
              numberOfLines={2}
              style={{
                minHeight: 52,
                backgroundColor: colors.background,
                borderColor: "#EF4444",
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 12,
                paddingVertical: 8,
                fontSize: 12,
                color: colors.primarytext,
                marginTop: 4,
              }}
            />
          )}
        </View>
      </CustomModal>

      {/* 4. No-Show Confirmation Modal */}
      <CustomModal
        visible={noShowModalVisible}
        onClose={() => setNoShowModalVisible(false)}
        title="Mark Client as No-Show?"
        description="The 15-minute arrival grace period has passed. Marking this booking as No-Show will notify the client and unlock your calendar slot for new bookings or walk-ins."
        icon="alert-circle-outline"
        primaryDanger={true}
        primaryText={isSubmittingNoShow ? "Submitting..." : "Confirm No-Show"}
        onPrimary={handleConfirmNoShow}
        secondaryText="Keep Waiting"
        onSecondary={() => setNoShowModalVisible(false)}
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
