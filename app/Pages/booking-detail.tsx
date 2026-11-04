import { CustomModal } from "@/components/ui/CustomModal";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import { bookingService, BookingReceipt } from "@/services/bookingService";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

export default function BarberBookingDetailScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const params = useLocalSearchParams<{
    bookingId?: string;
    clientName?: string;
    clientPhone?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    price?: string;
    pictureUrl?: string;
    status?: string;
    referenceNumber?: string;
  }>();

  const bookingIdParam = params.bookingId;
  // If we were navigated here with data, render immediately and refresh silently.
  const hasParamData = !!(params.clientName || params.serviceName);

  const [booking, setBooking] = useState<BookingReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(!hasParamData);
  const [fullscreenPhotoVisible, setFullscreenPhotoVisible] = useState(false);

  // Handshake modals & Bypass State
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [arrivalPinInput, setArrivalPinInput] = useState("");
  const [isBypassingPin, setIsBypassingPin] = useState(false);
  const [bypassReason, setBypassReason] = useState("");
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);

  const [completionModalVisible, setCompletionModalVisible] = useState(false);
  const [unpaidModalVisible, setUnpaidModalVisible] = useState(false);
  const [unpaidDisputeNote, setUnpaidDisputeNote] = useState('');
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false);
  const [completionPinInput, setCompletionPinInput] = useState("");
  const [isBypassingCompletionPin, setIsBypassingCompletionPin] = useState(false);
  const [bypassCompletionReason, setBypassCompletionReason] = useState("");
  const [isSubmittingCompletion, setIsSubmittingCompletion] = useState(false);
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [pinSentSuccess, setPinSentSuccess] = useState(false);

  // Live status transition state
  const [currentStatus, setCurrentStatus] = useState<string | null>(null);

  // Load once per booking ID. Depending on the `params` object caused an
  // infinite re-fetch loop because its identity changes on every render.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (bookingIdParam) {
          const found = await bookingService.getBookingById(bookingIdParam);
          if (!cancelled && found) setBooking(found);
        }
      } catch {
        // Keep rendering from navigation params
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingIdParam]);

  const clientName = booking?.client_name || params.clientName || "Valued Client";
  const clientPhone = booking?.client_phone || params.clientPhone || "+237 670 12 34 56";
  const serviceTitle = booking?.custom_hairstyle_name || params.serviceName || "Haircut & Grooming";
  const priceVal = booking?.total_price || (params.price ? parseInt(params.price, 10) : 1000);
  const statusVal = currentStatus || booking?.status || params.status || "Confirmed";
  const photoUrl = booking?.reference_photo_url || params.pictureUrl || null;
  const isHomeService =
    booking?.service_type === "home_service" || (params as any).serviceType === "home_service";
  const homeAddressVal = booking?.home_address || (params as any).homeAddress || "";
  const homeInstructionsVal =
    booking?.home_instructions || (params as any).homeInstructions || "";
  const refNum = useMemo(
    () =>
      booking?.reference_number ||
      params.referenceNumber ||
      `TRM-${String(bookingIdParam || Date.now()).slice(-6)}`,
    [booking?.reference_number, params.referenceNumber, bookingIdParam]
  );

  const timeLabel = useMemo(() => {
    if (params.date && params.time) return `${params.date} at ${params.time}`;
    if (booking?.start_time) {
      const d = new Date(booking.start_time);
      return `${d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })} at ${d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
    }
    return "Today at 10:30 AM";
  }, [params.date, params.time, booking?.start_time]);

  const handleCallClient = () => {
    if (clientPhone) {
      Linking.openURL(`tel:${clientPhone}`).catch(() => {
        showToast(`Client Phone: ${clientPhone}`, "info");
      });
    }
  };

  const handleNavigateToClient = () => {
    const dest = homeAddressVal || clientName;
    const encoded = encodeURIComponent(dest);
    const mapUrl =
      Platform.select({
        ios: `maps://app?daddr=${encoded}&dirflg=d`,
        android: `google.navigation:q=${encoded}`,
        default: `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
      }) || `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;

    Linking.openURL(mapUrl).catch(() => {
      Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encoded}`).catch(
        () => {
          showToast(`Client Address: ${dest}`, "info");
        }
      );
    });
  };

  const handleSendEndingCode = async () => {
    const targetId = booking?.booking_id || booking?.id || params.bookingId;
    if (!targetId) return;
    setIsRequestingPin(true);
    try {
      await bookingService.requestCompletionPin(targetId);
      setPinSentSuccess(true);
      showToast(`Ending code sent to ${clientName}'s Trimly app!`, "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to send ending code to client.", "error");
    } finally {
      setIsRequestingPin(false);
    }
  };

  const handleStartService = async () => {
    if (!isBypassingPin && arrivalPinInput.trim().length !== 4) {
      showToast(
        language === "fr"
          ? "Veuillez saisir le code d'arrivée à 4 chiffres du client"
          : "Please enter the 4-digit client arrival PIN",
        "error"
      );
      return;
    }
    setIsSubmittingPin(true);
    try {
      const targetId = booking?.booking_id || booking?.id || params.bookingId;
      if (targetId) {
        await bookingService.updateBookingStatus(targetId, "shaving...", {
          arrival_pin: isBypassingPin ? undefined : arrivalPinInput.trim(),
          bypass_pin: isBypassingPin,
          bypass_reason: isBypassingPin
            ? bypassReason.trim() || "Client verified in person"
            : undefined,
        });
      }
      setCurrentStatus("shaving...");
      setBooking((prev) => ({ ...(prev || {}), status: "shaving..." } as any));
      showToast(
        language === "fr"
          ? "Prestation démarrée : coupe en cours..."
          : "Service started: shaving...",
        "success"
      );
      setPinModalVisible(false);
      setArrivalPinInput("");
      setIsBypassingPin(false);
      setBypassReason("");
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr"
            ? "Code d'arrivée invalide. Demandez son code au client."
            : "Invalid Arrival PIN. Ask the client for their code."),
        "error"
      );
    } finally {
      setIsSubmittingPin(false);
    }
  };

  const handleReportUnpaidDispute = async () => {
    setIsSubmittingDispute(true);
    try {
      const targetId = bookingIdParam || booking?.id;
      if (!targetId) return;
      const note = unpaidDisputeNote.trim() || (language === "fr"
        ? "Le client a validé le code d'arrivée mais n'a pas réglé en espèces avant de fournir le code de fin."
        : "Client provided arrival PIN but did not pay in cash before giving ending PIN.");

      await bookingService.updateBookingStatus(targetId, "disputed", {
        payment_method: "unpaid",
        note: note,
      });

      if (booking) {
        setBooking({ ...booking, status: "disputed", payment_status: "unpaid" });
      }

      showToast(
        language === "fr"
          ? "Rapport transmis à l'administrateur. Le litige de paiement est en cours de traitement."
          : "Report sent to admin. The cash dispute is now under admin review.",
        "info"
      );
      setUnpaidModalVisible(false);
      setCompletionModalVisible(false);
      setUnpaidDisputeNote("");
    } catch (err: any) {
      showToast(err?.message || "Failed to submit dispute report.", "error");
    } finally {
      setIsSubmittingDispute(false);
    }
  };

  const handleEndService = async () => {
    if (!isBypassingCompletionPin && completionPinInput.trim().length !== 4) {
      showToast(
        language === "fr"
          ? "Veuillez saisir le code de fin à 4 chiffres fourni par le client"
          : "Please enter the 4-digit ending code provided by the client",
        "error"
      );
      return;
    }
    setIsSubmittingCompletion(true);
    try {
      const targetId = booking?.booking_id || booking?.id || params.bookingId;
      if (targetId) {
        await bookingService.updateBookingStatus(targetId, "Completed", {
          completion_pin: isBypassingCompletionPin ? undefined : completionPinInput.trim(),
          bypass_pin: isBypassingCompletionPin,
          bypass_reason: isBypassingCompletionPin
            ? bypassCompletionReason.trim() || "Service completion verified in person"
            : undefined,
        });
      }
      setCurrentStatus("Completed");
      setBooking((prev) => ({ ...(prev || {}), status: "Completed" } as any));
      showToast(
        language === "fr"
          ? `Prestation terminée ! ${priceVal.toLocaleString()} CFA crédités sur votre solde.`
          : `Service Ended! ${priceVal.toLocaleString()} CFA credited to your balance.`,
        "success"
      );
      setCompletionModalVisible(false);
      setCompletionPinInput("");
      setIsBypassingCompletionPin(false);
      setBypassCompletionReason("");
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr"
            ? "Code de fin invalide. Demandez son code au client."
            : "Invalid Ending Code. Ask the client for their code."),
        "error"
      );
    } finally {
      setIsSubmittingCompletion(false);
    }
  };

  const getStatusColor = (st: string) => {
    switch (st.toLowerCase()) {
      case "completed":
        return { color: colors.success, bg: colors.successSoft };
      case "shaving...":
      case "shaving":
      case "in progress":
        return { color: colors.info, bg: colors.infoSoft };
      case "pending":
        return { color: colors.warning, bg: colors.warningSoft };
      case "cancelled":
        return { color: colors.error, bg: colors.errorSoft };
      default:
        return { color: colors.primary, bg: colors.brandSoft };
    }
  };

  const statusMeta = getStatusColor(statusVal);
  const initials =
    clientName
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "C";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Clean Urban Top Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 8, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleGroup}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("bookings.bookingDetails") || "Booking Details"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            Ref: {refNum}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleCallClient}
          style={[
            styles.headerBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="call-outline" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondarytext }]}>{language === "fr" ? "Chargement des détails du rendez-vous..." : "Loading booking details..."}</Text>
          </View>
        ) : (
          <>
            {/* 1. PROMINENT CLIENT-SELECTED PHOTO REFERENCE */}
            {photoUrl ? (
              <View
                style={[
                  styles.photoSectionCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <View style={styles.photoHeaderRow}>
                  <View
                    style={[
                      styles.photoBadge,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons name="sparkles" size={12} color={colors.primary} />
                    <Text style={[styles.photoBadgeText, { color: colors.primary }]}>{language === "fr" ? "LE CLIENT A RÉSERVÉ AVEC CETTE PHOTO" : "CLIENT BOOKED USING THIS PHOTO"}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setFullscreenPhotoVisible(true)}
                    style={styles.expandIconBtn}
                  >
                    <Ionicons name="scan-outline" size={16} color={colors.primary} />
                    <Text style={[styles.expandText, { color: colors.primary }]}>{language === "fr" ? "Agrandir" : "Zoom"}</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => setFullscreenPhotoVisible(true)}
                  style={[styles.photoWrap, { borderColor: colors.border }]}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.referenceImage}
                    resizeMode="cover"
                  />
                  <View style={[styles.photoOverlayBadge, { borderColor: colors.border }]}>
                    <Ionicons name="eye-outline" size={14} color="#F5F5F2" />
                    <Text style={styles.photoOverlayText}>{t("bookings.tapToViewFullPhoto") || "Tap to View Full Photo"}</Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.photoCaptionBox}>
                  <View style={styles.photoCaptionTitleRow}>
                    <Ionicons name="cut-outline" size={15} color={colors.primary} />
                    <Text style={[styles.photoCaptionTitle, { color: colors.primarytext }]}>
                      Style Reference: {serviceTitle}
                    </Text>
                  </View>
                  <Text style={[styles.photoCaptionSub, { color: colors.secondarytext }]}>{language === "fr" ? "Le client a choisi cette photo lors de la réservation. Reproduisez cette coupe pendant la prestation." : "The client selected this specific photo when booking. Replicate this hairstyle during the session."}</Text>
                </View>
              </View>
            ) : null}

            {/* 2. CLIENT INFORMATION CARD */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardSectionLabel, { color: colors.secondarytext }]}>{language === "fr" ? "INFORMATIONS CLIENT" : "CLIENT INFORMATION"}</Text>
              <View style={styles.clientRow}>
                <View
                  style={[
                    styles.avatarCircle,
                    {
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.clientNameText, { color: colors.primarytext }]}>
                    {clientName}
                  </Text>
                  <Text style={[styles.clientPhoneText, { color: colors.secondarytext }]}>
                    {clientPhone}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleCallClient}
                  style={[styles.callActionBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="call" size={14} color={colors.onBrand} />
                  <Text style={[styles.callActionText, { color: colors.onBrand }]}>{language === "fr" ? "Appeler" : "Call"}</Text>
                </TouchableOpacity>
              </View>

              {/* Home Service / House Call Location Box */}
              {isHomeService && (
                <View
                  style={[
                    styles.homeServiceCard,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.homeServiceBadgeRow}>
                    <View
                      style={[
                        styles.homeServiceIconWrap,
                        { backgroundColor: colors.brandSoft },
                      ]}
                    >
                      <Ionicons name="home-outline" size={15} color={colors.primary} />
                    </View>
                    <Text style={[styles.homeServiceLabel, { color: colors.primary }]}>{language === "fr" ? "SERVICE À DOMICILE / DÉPLACEMENT" : "HOME SERVICE / HOUSE CALL"}</Text>
                  </View>
                  <Text style={[styles.homeServiceDest, { color: colors.primarytext }]}>
                    Destination: {homeAddressVal || "Client Home"}
                  </Text>
                  {homeInstructionsVal ? (
                    <Text style={[styles.homeServiceNote, { color: colors.secondarytext }]}>
                      Instructions: {homeInstructionsVal}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleNavigateToClient}
                    style={[
                      styles.directionsBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons name="navigate-outline" size={15} color={colors.primary} />
                    <Text style={[styles.directionsBtnText, { color: colors.primary }]}>
                      Get Directions to Client&apos;s House
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* 3. APPOINTMENT SPECIFICATIONS */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardSectionLabel, { color: colors.secondarytext }]}>{language === "fr" ? "DÉTAILS DU RENDEZ-VOUS" : "APPOINTMENT DETAILS"}</Text>

              <View style={styles.specRow}>
                <View
                  style={[
                    styles.specIconCircle,
                    {
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.brandBorder,
                    },
                  ]}
                >
                  <Ionicons name="calendar-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.specTitle, { color: colors.primarytext }]}>{language === "fr" ? "Heure prévue" : "Scheduled Time"}</Text>
                  <Text style={[styles.specValue, { color: colors.secondarytext }]}>
                    {timeLabel}
                  </Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusMeta.bg }]}>
                  <Text style={[styles.statusPillText, { color: statusMeta.color }]}>
                    {statusVal}
                  </Text>
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.specRow}>
                <View
                  style={[
                    styles.specIconCircle,
                    {
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.brandBorder,
                    },
                  ]}
                >
                  <Ionicons name="cut-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.specTitle, { color: colors.primarytext }]}>{language === "fr" ? "Service demandé" : "Requested Service"}</Text>
                  <Text style={[styles.specValue, { color: colors.secondarytext }]}>
                    {serviceTitle} (45 mins)
                  </Text>
                </View>
                {photoUrl && (
                  <View
                    style={[
                      styles.photoTagPill,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons name="camera-outline" size={11} color={colors.primary} />
                    <Text style={[styles.photoTagText, { color: colors.primary }]}>{language === "fr" ? "Photo jointe" : "Photo Attached"}</Text>
                  </View>
                )}
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.specRow}>
                <View
                  style={[
                    styles.specIconCircle,
                    {
                      backgroundColor: colors.brandSoft,
                      borderColor: colors.brandBorder,
                    },
                  ]}
                >
                  <Ionicons name="cash-outline" size={17} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.specTitle, { color: colors.primarytext }]}>{language === "fr" ? "Prix total de la réservation" : "Total Booking Price"}</Text>
                  <Text style={[styles.specValue, { color: colors.secondarytext }]}>{language === "fr" ? "À encaisser / débloqué après la prestation" : "To be collected / released upon completion"}</Text>
                </View>
                <Text style={[styles.priceHighlight, { color: colors.primary }]}>
                  {priceVal.toLocaleString()} CFA
                </Text>
              </View>
            </View>

            {/* 4. PIN HANDSHAKE VERIFICATION ACTIONS */}
            <View
              style={[
                styles.infoCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text style={[styles.cardSectionLabel, { color: colors.secondarytext }]}>
                PHYSICAL HANDSHAKE & SERVICE CONTROL
              </Text>

              {statusVal === "Confirmed" ? (
                <View style={{ marginTop: 4 }}>
                  <Text style={[styles.handshakeNotice, { color: colors.secondarytext }]}>
                    When the client is physically seated in your chair, ask for their 4-digit
                    Arrival PIN from their Trimly receipt to start the session.
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setPinModalVisible(true)}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons name="key-outline" size={18} color={colors.onBrand} />
                    <Text style={[styles.primaryActionBtnText, { color: colors.onBrand }]}>{language === "fr" ? "Démarrer le service (Valider code d'arrivée)" : "Start Service (Verify Arrival PIN)"}</Text>
                  </TouchableOpacity>
                </View>
              ) : statusVal.toLowerCase().includes("shav") || statusVal === "In Progress" ? (
                <View style={{ marginTop: 4 }}>
                  <View
                    style={[
                      styles.activeBanner,
                      {
                        backgroundColor: colors.infoSoft,
                        borderColor: "rgba(59, 130, 246, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="cut-outline" size={16} color={colors.info} />
                    <Text style={[styles.activeBannerText, { color: colors.info }]}>{language === "fr" ? "Coiffure en cours... (Au fauteuil)" : "shaving... (Active In Your Chair)"}</Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setCompletionModalVisible(true)}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary }]}
                  >
                    <Ionicons
                      name="checkmark-done-circle-outline"
                      size={19}
                      color={colors.onBrand}
                    />
                    <Text style={[styles.primaryActionBtnText, { color: colors.onBrand }]}>
                      End Service & Verify Ending Code
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.completedNoticeRow}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={18}
                    color={colors.secondarytext}
                  />
                  <Text
                    style={[
                      styles.handshakeNotice,
                      { color: colors.secondarytext, marginBottom: 0, flex: 1 },
                    ]}
                  >
                    Appointment is {statusVal}. No further physical handshakes are required.
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* FULLSCREEN PHOTO VIEWER MODAL */}
      <Modal
        visible={fullscreenPhotoVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullscreenPhotoVisible(false)}
      >
        <View style={styles.fullscreenModalBackdrop}>
          <StatusBar barStyle="light-content" />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setFullscreenPhotoVisible(false)}
            style={[
              styles.fullscreenCloseBtn,
              {
                top: insets.top + 16,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="close" size={22} color="#F5F5F2" />
          </TouchableOpacity>

          <View style={styles.fullscreenCenter}>
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            ) : null}
            <View style={styles.fullscreenBottomBar}>
              <View
                style={[
                  styles.photoBadge,
                  {
                    backgroundColor: "rgba(199, 243, 107, 0.16)",
                    borderColor: "rgba(199, 243, 107, 0.35)",
                  },
                ]}
              >
                <Ionicons name="sparkles" size={12} color="#C7F36B" />
                <Text style={[styles.photoBadgeText, { color: "#C7F36B" }]}>{language === "fr" ? "RÉFÉRENCE DU STYLE CHOISI PAR LE CLIENT" : "CLIENT CHOSEN STYLE REFERENCE"}</Text>
              </View>
              <Text style={styles.fullscreenStyleTitle}>{serviceTitle}</Text>
              <Text style={styles.fullscreenClientNote}>
                Client: {clientName} • {priceVal.toLocaleString()} CFA
              </Text>
            </View>
          </View>
        </View>
      </Modal>

      {/* ARRIVAL PIN MODAL */}
      <CustomModal
        visible={pinModalVisible}
        onClose={() => setPinModalVisible(false)}
        title={language === "fr" ? "Vérifier le code PIN d'arrivée du client" : "Verify Client Arrival PIN"}
        description={t("bookings.confirmSeatedDesc") || "Ask the client for the 4-digit PIN displayed on their Trimly booking receipt to confirm they are physically seated."}
        icon="key-outline"
        primaryText={isSubmittingPin ? (language === "fr" ? "Vérification..." : "Verifying...") : (language === "fr" ? "Confirmer & Démarrer le service" : "Confirm & Start Service")}
        onPrimary={handleStartService}
        secondaryText="Cancel"
        onSecondary={() => {
          setPinModalVisible(false);
          setIsBypassingPin(false);
          setArrivalPinInput("");
        }}
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
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(true)}
                style={styles.bypassLinkBtn}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>
                  Client phone offline / dead battery? Bypass PIN
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.bypassWarningLabel, { color: colors.warning }]}>{language === "fr" ? "Mode dérogation (Note de vérification requise)" : "Bypass Mode (Requires Verification Note)"}</Text>
              <TextInput
                value={bypassReason}
                onChangeText={setBypassReason}
                placeholder={t("bookings.arrivalBypassPlaceholder") || "Reason (e.g. verified client in person, phone dead)"}
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.bypassReasonInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingPin(false)}
                style={styles.switchBackLinkBtn}
              >
                <Text style={[styles.bypassLinkText, { color: colors.primary }]}>
                  Switch back to 4-digit PIN
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CustomModal>

      {/* END SERVICE COMPLETION PIN MODAL */}
      <CustomModal
        visible={completionModalVisible}
        onClose={() => setCompletionModalVisible(false)}
        title={language === "fr" ? "Terminer la prestation & Libérer le paiement" : "Complete Service & Release Payout"}
        description={t("bookings.completionModalDesc") || (language === "fr" ? "Saisissez le code de fin à 4 chiffres fourni par le client pour finaliser la prestation et débloquer les fonds sur votre compte." : "Enter the 4-digit completion code provided by the client to finalize the session and release payment to your account.")}
        icon="checkmark-done-circle-outline"
        primaryText={
          isSubmittingCompletion
            ? "Finalizing..."
            : pinSentSuccess || isBypassingCompletionPin
            ? "Release Payout & Complete"
            : isRequestingPin
            ? "Sending..."
            : "Send Ending Code to Client"
        }
        onPrimary={() => {
          if (
            pinSentSuccess ||
            isBypassingCompletionPin ||
            completionPinInput.length === 4
          ) {
            handleEndService();
          } else {
            handleSendEndingCode();
          }
        }}
        secondaryText="Cancel"
        onSecondary={() => {
          setCompletionModalVisible(false);
          setCompletionPinInput("");
          setIsBypassingCompletionPin(false);
          setBypassCompletionReason("");
        }}
      >
        <View style={{ width: "100%", marginVertical: 12 }}>
          {isRequestingPin ? (
            <View style={{ alignItems: "center", paddingVertical: 16 }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 13, color: colors.secondarytext, marginTop: 8 }}>{language === "fr" ? "Envoi du code de fin au client..." : "Sending ending code to client..."}</Text>
            </View>
          ) : !isBypassingCompletionPin ? (
            <View>
              <View
                style={[
                  styles.awaitingCodeBanner,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.awaitingCodeLabel, { color: colors.primary }]}>{language === "fr" ? "EN ATTENTE DU CODE DE FIN À 4 CHIFFRES" : "AWAITING 4-DIGIT ENDING CODE"}</Text>
                <Text style={[styles.awaitingCodeSub, { color: colors.primarytext }]}>
                  Ask {clientName} for the 4-digit ending code on their Trimly receipt
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
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.pinInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />

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
                style={styles.bypassLinkBtn}
              >
                <Text style={[styles.bypassLinkText, { color: colors.secondarytext }]}>{language === "fr" ? "Client hors-ligne ? Terminer sans code" : "Client offline? Complete without code"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text style={[styles.bypassWarningLabel, { color: colors.warning }]}>{language === "fr" ? "Mode dérogation (Note de fin de service requise)" : "Bypass Mode (Service Completion Verification Note)"}</Text>
              <TextInput
                value={bypassCompletionReason}
                onChangeText={setBypassCompletionReason}
                placeholder={t("bookings.completionBypassPlaceholder") || "Reason (e.g. Haircut completed, client paid in cash)"}
                placeholderTextColor={colors.inputPlaceholder}
                style={[
                  styles.bypassReasonInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.primarytext,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={() => setIsBypassingCompletionPin(false)}
                style={styles.switchBackLinkBtn}
              >
                <Text style={[styles.bypassLinkText, { color: colors.primary }]}>
                  Switch back to 4-digit code
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
    </View>
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
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleGroup: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  loadingWrap: {
    paddingVertical: 60,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 14,
    fontSize: 13,
  },
  photoSectionCard: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  photoHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  photoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  photoBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  expandIconBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  expandText: {
    fontSize: 12,
    fontWeight: "700",
  },
  photoWrap: {
    width: "100%",
    height: 240,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    position: "relative",
  },
  referenceImage: {
    width: "100%",
    height: "100%",
  },
  photoOverlayBadge: {
    position: "absolute",
    bottom: 10,
    right: 10,
    backgroundColor: "rgba(23, 25, 24, 0.82)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  photoOverlayText: {
    color: "#F5F5F2",
    fontSize: 11,
    fontWeight: "600",
  },
  photoCaptionBox: {
    marginTop: 12,
  },
  photoCaptionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  photoCaptionTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  photoCaptionSub: {
    fontSize: 12,
    lineHeight: 17,
  },
  infoCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  clientNameText: {
    fontSize: 15.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  clientPhoneText: {
    fontSize: 13,
  },
  callActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 13,
  },
  callActionText: {
    fontSize: 13,
    fontWeight: "700",
  },
  homeServiceCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 14,
  },
  homeServiceBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 6,
  },
  homeServiceIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  homeServiceLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  homeServiceDest: {
    fontSize: 13,
    fontWeight: "600",
  },
  homeServiceNote: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 17,
  },
  directionsBtn: {
    marginTop: 11,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
  },
  directionsBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  specRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  specIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  specTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  specValue: {
    fontSize: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  photoTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 8,
  },
  photoTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  priceHighlight: {
    fontSize: 15,
    fontWeight: "800",
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  handshakeNotice: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 14,
  },
  completedNoticeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  primaryActionBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 11,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  activeBannerText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  pinInput: {
    height: 56,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 10,
  },
  bypassLinkBtn: {
    marginTop: 12,
    alignItems: "center",
  },
  switchBackLinkBtn: {
    marginTop: 10,
    alignItems: "center",
  },
  bypassLinkText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  bypassWarningLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  bypassReasonInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  awaitingCodeBanner: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  awaitingCodeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  awaitingCodeSub: {
    fontSize: 11.5,
    marginTop: 2,
    textAlign: "center",
  },
  fullscreenModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 10, 0.96)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenCloseBtn: {
    position: "absolute",
    right: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullscreenCenter: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  fullscreenImage: {
    width: width - 32,
    height: height * 0.65,
    borderRadius: 16,
  },
  fullscreenBottomBar: {
    marginTop: 18,
    alignItems: "center",
  },
  fullscreenStyleTitle: {
    color: "#F5F5F2",
    fontSize: 17,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 3,
  },
  fullscreenClientNote: {
    color: "#A6ACA5",
    fontSize: 13,
  },
});
