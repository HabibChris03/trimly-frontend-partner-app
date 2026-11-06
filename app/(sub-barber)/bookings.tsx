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
  const { t, language } = useLanguage();
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

  // Worst-Case & Handshake PIN Modals for Sub-Barber
  const [selectedBooking, setSelectedBooking] = useState<BookingReceipt | null>(null);

  // Arrival PIN Handshake Modal State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [arrivalPinInput, setArrivalPinInput] = useState("");
  const [isBypassingPin, setIsBypassingPin] = useState(false);
  const [bypassReason, setBypassReason] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  // Ending Service Handshake Modal State
  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [unpaidModalVisible, setUnpaidModalVisible] = useState(false);
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [completionPinInput, setCompletionPinInput] = useState("");
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [pinSentSuccess, setPinSentSuccess] = useState(false);
  const [isBypassingCompletionPin, setIsBypassingCompletionPin] = useState(false);
  const [bypassCompletionReason, setBypassCompletionReason] = useState("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);

  // Payment Verification Modal State
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"cash" | "momo" | "unpaid">("cash");
  const [unpaidDisputeNote, setUnpaidDisputeNote] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

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

  const openArrivalPinModal = (booking: BookingReceipt) => {
    setSelectedBooking(booking);
    setArrivalPinInput("");
    setIsBypassingPin(false);
    setBypassReason("");
    setPinModalVisible(true);
  };

  const handleConfirmStartService = async () => {
    if (!selectedBooking) return;
    if (!isBypassingPin && arrivalPinInput.trim().length !== 4) {
      showToast(
        language === "fr"
          ? "Veuillez entrer le code d'arrivée à 4 chiffres du client"
          : "Please enter the 4-digit client arrival PIN",
        "error"
      );
      return;
    }

    setIsSubmittingPin(true);
    try {
      const id = selectedBooking.booking_id || selectedBooking.id;
      if (!id) return;
      await bookingService.updateBookingStatus(id, "shaving...", {
        arrival_pin: isBypassingPin ? undefined : arrivalPinInput.trim(),
        bypass_pin: isBypassingPin,
        bypass_reason: isBypassingPin
          ? bypassReason.trim() || (language === "fr" ? "Client vérifié en personne" : "Client verified in person")
          : undefined,
      });

      showToast(
        language === "fr"
          ? "Service démarré : coupe en cours..."
          : "Service started: in progress...",
        "success"
      );
      setPinModalVisible(false);
      setSelectedBooking(null);
      setArrivalPinInput("");
      setIsBypassingPin(false);
      setBypassReason("");
      await fetchBookings();
    } catch (err: any) {
      showToast(
        err?.message || (language === "fr" ? "Code d'arrivée invalide. Demandez le code au client." : "Invalid Arrival PIN. Ask the client for their code."),
        "error"
      );
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const openEndServiceModal = (booking: BookingReceipt) => {
    setSelectedBooking(booking);
    setCompletionPinInput("");
    setPinSentSuccess(false);
    setIsBypassingCompletionPin(false);
    setBypassCompletionReason("");
    setCompletionModalVisible(true);
  };

  const handleSendEndingCode = async (targetBooking?: BookingReceipt) => {
    const b = targetBooking || selectedBooking;
    if (!b) return;
    setIsRequestingPin(true);
    try {
      const id = b.booking_id || b.id;
      if (!id) return;
      await bookingService.requestCompletionPin(id);
      setPinSentSuccess(true);
      showToast(
        language === "fr"
          ? `Code de fin envoyé sur l'application Trimly du client !`
          : `Ending code sent to client's Trimly app!`,
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message || (language === "fr" ? "Échec de l'envoi du code au client." : "Failed to send ending code to client."),
        "error"
      );
    } finally {
      setIsRequestingPin(false);
    }
  };

  const handleReportUnpaidDispute = async () => {
    if (!selectedBooking) return;
    setIsSubmittingDispute(true);
    try {
      const id = selectedBooking.booking_id || selectedBooking.id;
      if (!id) return;
      const note = unpaidDisputeNote.trim() || (language === "fr" 
        ? "Le client a validé le code d'arrivée mais n'a pas réglé en espèces avant de fournir le code de fin."
        : "Client provided arrival PIN but did not pay in cash before giving ending PIN.");

      await bookingService.updateBookingStatus(id, "disputed", {
        payment_method: "unpaid",
        note: note,
      });

      showToast(
        language === "fr"
          ? "Rapport transmis à l'administrateur. Le litige de paiement est en cours de traitement."
          : "Report sent to admin. The cash dispute is now under admin review.",
        "info"
      );
      setUnpaidModalVisible(false);
      setCompletionModalVisible(false);
      setSelectedBooking(null);
      setUnpaidDisputeNote("");
      await fetchBookings();
    } catch (err: any) {
      showToast(err?.message || "Failed to submit dispute report.", "error");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleConfirmEndService = async () => {
    if (!selectedBooking) return;
    if (!isBypassingCompletionPin && completionPinInput.trim().length !== 4) {
      showToast(
        language === "fr"
          ? "Veuillez entrer le code à 4 chiffres fourni par le client"
          : "Please enter the 4-digit code provided by the client",
        "error"
      );
      return;
    }

    setIsSubmittingCompletion(true);
    try {
      const id = selectedBooking.booking_id || selectedBooking.id;
      if (!id) return;
      await bookingService.updateBookingStatus(id, "Completed", {
        completion_pin: isBypassingCompletionPin ? undefined : completionPinInput.trim(),
        bypass_pin: isBypassingCompletionPin,
        bypass_reason: isBypassingCompletionPin
          ? bypassCompletionReason.trim() || (language === "fr" ? "Fin de service vérifiée en personne" : "Service completion verified in person")
          : undefined,
      });

      showToast(
        language === "fr"
          ? `Service terminé ! ${(selectedBooking.total_price || 1000).toLocaleString()} CFA crédités.`
          : `Service completed! ${(selectedBooking.total_price || 1000).toLocaleString()} CFA credited.`,
        "success"
      );
      setCompletionModalVisible(false);
      setSelectedBooking(null);
      setCompletionPinInput("");
      setPinSentSuccess(false);
      setIsBypassingCompletionPin(false);
      setBypassCompletionReason("");
      await fetchBookings();
    } catch (err: any) {
      showToast(
        err?.message || (language === "fr" ? "Code de fin invalide. Veuillez vérifier le code avec le client." : "Invalid ending code. Please check with client."),
        "error"
      );
    } finally {
      setIsSubmittingCompletion(false);
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
  const personalEarnings = useMemo(
    () =>
      bookings
        .filter((b) => b.status === "Completed")
        .reduce((sum, b) => sum + (Number(b.total_price) || 0), 0),
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
                : (language === "fr" ? "Professionnel Indépendant Solo" : "Independent Solo Provider")}
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
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>{language === "fr" ? "Actif" : "Active"}</Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: "#F59E0B" }]}>
              {pendingCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>{language === "fr" ? "En attente" : "Pending"}</Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: colors.success }]}>
              {completedCount}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>{language === "fr" ? "Terminé" : "Done"}</Text>
          </View>
          <View
            style={[styles.summaryDivider, { backgroundColor: colors.border }]}
          />
          <View style={styles.summaryCell}>
            <Text style={[styles.summaryNum, { color: colors.primary, fontSize: 13 }]}>
              {personalEarnings.toLocaleString()}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.secondarytext }]}>
              My CFA
            </Text>
          </View>
        </View>
      </View>

      {/* Active In-Chair Ongoing Service Banner */}
      {(() => {
        const inChairBooking = bookings.find(
          (b) => b.status === "In Progress" || b.status === "shaving..." || b.status === "shaving"
        );
        if (!inChairBooking) return null;
        return (
          <View
            style={[
              styles.inChairBanner,
              { backgroundColor: colors.surface, borderColor: colors.primary },
            ]}
          >
            <View style={styles.inChairHeaderRow}>
              <View style={[styles.inChairLiveDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.inChairTitle, { color: colors.primary }]}>
                {language === "fr" ? "EN COURS AU FAUTEUIL" : "CLIENT CURRENTLY IN CHAIR"}
              </Text>
              <Text style={[styles.inChairPrice, { color: colors.primarytext }]}>
                {(inChairBooking.total_price || 1000).toLocaleString()} CFA
              </Text>
            </View>
            <Text style={[styles.inChairClientName, { color: colors.primarytext }]}>
              {inChairBooking.client_name || (inChairBooking as any).client || "Client"}
            </Text>
            <Text style={[styles.inChairServiceName, { color: colors.secondarytext }]}>
              {inChairBooking.services && inChairBooking.services[0]?.name
                ? inChairBooking.services.map((s: any) => s.name).join(", ")
                : inChairBooking.custom_hairstyle_name || "Hairstyle Service"}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => openEndServiceModal(inChairBooking)}
              style={[styles.inChairCompleteBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="checkmark-done" size={17} color={colors.onBrand} />
              <Text style={[styles.inChairCompleteBtnText, { color: colors.onBrand }]}>
                {language === "fr" ? "Entrer le code de fin & terminer" : "Enter Ending Code & Complete"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      })()}

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
                      activeOpacity={0.85}
                      onPress={() => openArrivalPinModal(b)}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                        },
                      ]}
                    >
                      <Ionicons
                        name="key-outline"
                        size={16}
                        color={colors.onBrand}
                      />
                      <Text
                        style={[
                          styles.acceptBtnText,
                          { color: colors.onBrand },
                        ]}
                      >
                        {language === "fr" ? "Entrer code d'arrivée" : "Enter Arrival PIN"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {isInProgress && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => openEndServiceModal(b)}
                      style={[
                        styles.actionBtn,
                        {
                          backgroundColor: colors.primary,
                          flex: 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name="checkmark-done-outline"
                        size={16}
                        color={colors.onBrand}
                      />
                      <Text
                        style={[
                          styles.acceptBtnText,
                          { color: colors.onBrand },
                        ]}
                      >
                        {language === "fr" ? "Entrer code de fin & terminer" : "Enter Ending PIN & Complete"}
                      </Text>
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

      {/* 1. ARRIVAL PIN HANDSHAKE MODAL */}
      <CustomModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        title={language === "fr" ? "Code d'arrivée client" : "Enter Arrival PIN"}
        description={
          language === "fr"
            ? "Pour démarrer la coupe et valider l'assise du client, demandez et saisissez son code à 4 chiffres."
            : "To start the haircut and confirm the client is in your chair, ask for the 4-digit code shown on their Trimly screen."
        }
        icon="key-outline"
        iconBg="rgba(199, 243, 107, 0.15)"
        iconColor={colors.primary}
        primaryText={null}
        secondaryText={null}
      >
        <View style={{ width: "100%", marginTop: 8 }}>
          {!isBypassingPin ? (
            <View>
              <TextInput
                value={arrivalPinInput}
                onChangeText={(val) => setArrivalPinInput(val.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="• • • •"
                placeholderTextColor={colors.secondarytext}
                style={[
                  styles.handshakePinInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: arrivalPinInput.length === 4 ? colors.primary : colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingPin || arrivalPinInput.length !== 4}
                onPress={handleConfirmStartService}
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: arrivalPinInput.length === 4 ? colors.primary : colors.border,
                    marginTop: 14,
                  },
                ]}
              >
                {isSubmittingPin ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, { color: arrivalPinInput.length === 4 ? colors.onBrand : colors.secondarytext }]}>
                    {language === "fr" ? "Valider & Démarrer la coupe" : "Verify & Start Service"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsBypassingPin(true)}
                style={{ marginTop: 12, alignItems: "center" }}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>
                  {language === "fr" ? "Batterie à plat / Hors ligne ? Contourner" : "Client phone offline / dead? Bypass"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "700", marginBottom: 6 }}>
                {language === "fr" ? "Mode Contournement (Note requise)" : "Bypass Mode (Verification Note Required)"}
              </Text>
              <TextInput
                value={bypassReason}
                onChangeText={setBypassReason}
                placeholder={language === "fr" ? "Ex: Client vérifié en fauteuil" : "e.g. Verified client in chair"}
                placeholderTextColor={colors.secondarytext}
                style={[
                  styles.noteInputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingPin}
                onPress={handleConfirmStartService}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              >
                {isSubmittingPin ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, { color: colors.onBrand }]}>
                    {language === "fr" ? "Confirmer le démarrage" : "Confirm Start"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsBypassingPin(false)}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>
                  {language === "fr" ? "Retour à la saisie du code" : "Back to PIN entry"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CustomModal>

      {/* 2. ENDING SERVICE HANDSHAKE COMPLETION MODAL */}
      <CustomModal
        visible={completionModalVisible}
        onClose={() => setCompletionModalVisible(false)}
        title={language === "fr" ? "Valider la fin de la coupe" : "Complete Service"}
        description={
          language === "fr"
            ? "Pour finaliser la prestation et créditer vos gains, demandez au client son code de fin à 4 chiffres."
            : "To finish the appointment and release payment, enter the client's 4-digit ending code."
        }
        icon="checkmark-done-circle-outline"
        iconBg="rgba(199, 243, 107, 0.15)"
        iconColor={colors.primary}
        primaryText={null}
        secondaryText={null}
      >
        <View style={{ width: "100%", marginTop: 8 }}>
          {!isBypassingCompletionPin ? (
            <View>
              {pinSentSuccess ? (
                <View
                  style={{
                    backgroundColor: "rgba(199, 243, 107, 0.12)",
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 12,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 11.5, fontWeight: "700", color: colors.primary }}>
                    {language === "fr" ? "CODE TRANSMIS AU CLIENT" : "CODE SENT TO CLIENT"}
                  </Text>
                  <Text style={{ fontSize: 11, color: colors.secondarytext, marginTop: 2 }}>
                    {language === "fr" ? "Demandez au client le code affiché sur son téléphone." : "Ask the client for the code displayed on their screen."}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isRequestingPin}
                  onPress={() => handleSendEndingCode()}
                  style={{
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    borderWidth: 1,
                    borderRadius: 12,
                    padding: 10,
                    marginBottom: 12,
                    alignItems: "center",
                  }}
                >
                  {isRequestingPin ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                      {language === "fr" ? "📲 Envoyer le code sur le téléphone du client" : "📲 Send Ending Code to Client's Phone"}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              <TextInput
                value={completionPinInput}
                onChangeText={(val) => setCompletionPinInput(val.replace(/\D/g, "").slice(0, 4))}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="• • • •"
                placeholderTextColor={colors.secondarytext}
                style={[
                  styles.handshakePinInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: completionPinInput.length === 4 ? colors.primary : colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingCompletion || completionPinInput.length !== 4}
                onPress={handleConfirmEndService}
                style={[
                  styles.modalConfirmBtn,
                  {
                    backgroundColor: completionPinInput.length === 4 ? colors.primary : colors.border,
                    marginTop: 14,
                  },
                ]}
              >
                {isSubmittingCompletion ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, { color: completionPinInput.length === 4 ? colors.onBrand : colors.secondarytext }]}>
                    {language === "fr" ? "Valider le code & Terminer" : "Verify Code & Complete"}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Report Unpaid Cash to Admin Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setCompletionModalVisible(false);
                  setUnpaidModalVisible(true);
                }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 14,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  borderWidth: 1,
                  borderColor: "rgba(239, 68, 68, 0.25)",
                }}
              >
                <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444" }}>
                  {language === "fr"
                    ? "Le client n'a pas payé en espèces ? Signaler à l'administrateur"
                    : "Client hasn't paid in cash? Report to Admin"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsBypassingCompletionPin(true)}
                style={{ marginTop: 12, alignItems: "center" }}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>
                  {language === "fr" ? "Téléphone déchargé ? Contourner" : "Client phone dead? Bypass"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={{ fontSize: 12, color: "#F59E0B", fontWeight: "700", marginBottom: 6 }}>
                {language === "fr" ? "Contourner le code de fin (Note requise)" : "Bypass Mode (Verification Note Required)"}
              </Text>
              <TextInput
                value={bypassCompletionReason}
                onChangeText={setBypassCompletionReason}
                placeholder={language === "fr" ? "Ex: Prestation terminée et payée en espèces" : "e.g. Service finished and paid cash"}
                placeholderTextColor={colors.secondarytext}
                style={[
                  styles.noteInputBox,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingCompletion}
                onPress={handleConfirmEndService}
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              >
                {isSubmittingCompletion ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.modalConfirmBtnText, { color: colors.onBrand }]}>
                    {language === "fr" ? "Confirmer la fin du service" : "Confirm Completion"}
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsBypassingCompletionPin(false)}
                style={{ marginTop: 10, alignItems: "center" }}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>
                  {language === "fr" ? "Retour à la saisie du code" : "Back to PIN entry"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CustomModal>
      {/* Unpaid Cash Dispute Modal */}
      <CustomModal
        visible={unpaidModalVisible}
        onClose={() => setUnpaidModalVisible(false)}
        title={language === "fr" ? "Signaler un non-paiement à l'administrateur" : "Report Unpaid Cash to Admin"}
        description={
          language === "fr"
            ? "Le client a validé le code d'arrivée mais n'a pas réglé en espèces avant la fin de la prestation ? Soumettez un rapport officiel à l'administrateur pour intervention et régularisation."
            : "The client gave the start PIN but did not pay in cash before giving the end PIN? Submit a formal dispute report to the admin for resolution."
        }
        icon="alert-circle-outline"
        iconBg="rgba(239, 68, 68, 0.12)"
        iconColor="#EF4444"
        primaryText={isSubmittingDispute ? (language === "fr" ? "Envoi du rapport..." : "Submitting...") : (language === "fr" ? "Envoyer le rapport à l'admin" : "Submit Report to Admin")}
        primaryDanger={true}
        loading={isSubmittingDispute}
        secondaryText={language === "fr" ? "Annuler" : "Cancel"}
        onPrimary={handleReportUnpaidDispute}
        onSecondary={() => setUnpaidModalVisible(false)}
      >
        <View style={{ gap: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.secondarytext }}>
            {language === "fr" ? "Détails de l'incident (optionnel) :" : "Incident Details (Optional):"}
          </Text>
          <TextInput
            value={unpaidDisputeNote}
            onChangeText={setUnpaidDisputeNote}
            placeholder={
              language === "fr"
                ? "Ex: Le client refuse de payer les 5 000 XAF convenus en espèces..."
                : "e.g. Client refused to pay 5,000 XAF cash after haircut completed..."
            }
            placeholderTextColor={colors.secondarytext}
            multiline
            numberOfLines={3}
            style={{
              minHeight: 70,
              padding: 10,
              borderRadius: 8,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.primarytext,
              fontSize: 13,
              textAlignVertical: "top",
            }}
          />
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
  inChairBanner: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  inChairHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  inChairLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  inChairTitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    letterSpacing: 0.5,
    flex: 1,
  },
  inChairPrice: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  inChairClientName: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  inChairServiceName: {
    fontSize: 12.5,
    fontFamily: FontFamily.medium,
  },
  inChairCompleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 12,
    marginTop: 4,
  },
  inChairCompleteBtnText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  handshakePinInput: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    fontSize: 24,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 10,
  },
  modalConfirmBtn: {
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmBtnText: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  bypassLinkText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    textDecorationLine: "underline",
  },
  noteInputBox: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: FontFamily.regular,
  },
});
