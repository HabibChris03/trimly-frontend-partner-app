import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Image,
  Linking,
  Modal,
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
import { marketingService } from "@/services/marketingService";
import {
  openWhatsApp,
  SUPPORT_WHATSAPP_NUMBER,
  SUPPORT_PHONE_DISPLAY,
} from "@/utils/whatsapp";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

const FAQ_DATA_EN: FAQItem[] = [
  {
    id: "1",
    question: "How do I book an appointment?",
    answer:
      "Select a barber from the Explore or Home page, pick your preferred hairstyle or service, select an available date and time slot, and confirm your booking through checkout.",
  },
  {
    id: "2",
    question: "How do I cancel or reschedule a booking?",
    answer:
      "Go to your Appointments tab, select the active booking, and tap 'Reschedule' or 'Cancel Appointment'. Cancellations made at least 2 hours before the start time are free of charge.",
  },
  {
    id: "3",
    question: "What payment methods are supported?",
    answer:
      "We accept Mobile Money (Wave, Orange Money, MTN MoMo) directly denominated in CFA as well as cash at shop.",
  },
  {
    id: "4",
    question: "How are ratings and reviews verified?",
    answer:
      "Only clients who have booked and completed an appointment with a barber are eligible to submit reviews and star ratings.",
  },
];

const FAQ_DATA_FR: FAQItem[] = [
  {
    id: "1",
    question: "Comment réserver un rendez-vous ?",
    answer:
      "Sélectionnez un coiffeur sur la page d'accueil ou Découvrir, choisissez votre prestation, sélectionnez une date et un créneau horaire, puis confirmez votre réservation.",
  },
  {
    id: "2",
    question: "Comment annuler ou reporter un rendez-vous ?",
    answer:
      "Allez dans l'onglet Rendez-vous, sélectionnez la réservation active et appuyez sur 'Reporter' ou 'Annuler'. Les annulations effectuées au moins 2 heures à l'avance sont gratuites.",
  },
  {
    id: "3",
    question: "Quels sont les moyens de paiement acceptés ?",
    answer:
      "Nous acceptons Mobile Money (Wave, Orange Money, MTN MoMo) en CFA ainsi que le paiement en espèces au salon.",
  },
  {
    id: "4",
    question: "Comment sont vérifiés les avis et notes ?",
    answer:
      "Seuls les clients ayant réservé et terminé un rendez-vous avec un coiffeur peuvent soumettre un avis et attribuer une note.",
  },
];

import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/notificationService";
import { ActivityIndicator } from "react-native";

export default function HelpSupportScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const faqList = language === "fr" ? FAQ_DATA_FR : FAQ_DATA_EN;
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>("1");
  const [refreshing, setRefreshing] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);

  const handleSubmitTicket = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) {
      showToast("Please provide both a subject and details for your ticket.", "error");
      return;
    }
    setIsSubmittingTicket(true);
    try {
      const res = await marketingService.submitSupportTicket({
        name: user?.name || "Barber / Partner",
        email: user?.email || "partner@trimly237.com",
        phone: user?.phone || "+237 600000000",
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      showToast(res?.message || "Partner support ticket submitted! Our team will review it shortly.", "success");
      setTicketSubject("");
      setTicketMessage("");
      setShowTicketModal(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to submit support ticket.", "error");
    } finally {
      setIsSubmittingTicket(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    setRefreshing(false);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredFaqs = faqList.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSendTestEmail = async () => {
    setIsSendingEmail(true);
    try {
      const res = await notificationService.sendTestEmail(user?.email);
      showToast(
        res?.message || `Test email sent to ${user?.email || "your account"}! Check your inbox.`,
        "success"
      );
    } catch (err: any) {
      showToast(err?.message || "Could not send test email.", "error");
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleAction = async (type: string) => {
    if (type === "chat") {
      await openWhatsApp(
        SUPPORT_WHATSAPP_NUMBER,
        "Hello Trimly Support, I need assistance with the app."
      );
    } else if (type === "call") {
      const telUrl = `tel:+237${SUPPORT_WHATSAPP_NUMBER}`;
      try {
        const canCall = await Linking.canOpenURL(telUrl);
        if (canCall) {
          await Linking.openURL(telUrl);
        } else {
          await openWhatsApp(
            SUPPORT_WHATSAPP_NUMBER,
            "Hello Trimly Support, I would like to speak with a specialist."
          );
        }
      } catch {
        await openWhatsApp(
          SUPPORT_WHATSAPP_NUMBER,
          "Hello Trimly Support, I would like to speak with a specialist."
        );
      }
    } else if (type === "email") {
      handleSendTestEmail();
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("profile.helpSupport")}
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A3B39C"
            colors={["#A3B39C"]}
          />
        }
      >
        {/* Search FAQ */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.secondarytext} />
          <TextInput
            style={[styles.searchInput, { color: colors.primarytext }]}
            placeholder={t("home.searchPlaceholder")}
            placeholderTextColor={colors.inputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Quick Contact Actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleAction("chat")}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.primarytext }]}>
              WhatsApp
            </Text>
            <Text style={[styles.actionSub, { color: colors.secondarytext }]}>
              653811357
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => handleAction("call")}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="call-outline" size={22} color="#A3B39C" />
            </View>
            <Text style={[styles.actionTitle, { color: colors.primarytext }]}>
              Support Call
            </Text>
            <Text style={[styles.actionSub, { color: colors.secondarytext }]}>
              +237 653 81 13 57
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setShowTicketModal(true)}
            style={[
              styles.actionCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.actionIconCircle}>
              <Ionicons name="help-buoy-outline" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.actionTitle, { color: colors.primarytext }]}>
              Open Ticket
            </Text>
            <Text style={[styles.actionSub, { color: colors.secondarytext }]}>
              Admin Desk
            </Text>
          </TouchableOpacity>
        </View>

        {/* Live Test Email Banner Card */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSendingEmail}
          onPress={handleSendTestEmail}
          style={{
            backgroundColor: "rgba(163, 179, 156, 0.12)",
            borderColor: colors.primary,
            borderWidth: 1.5,
            borderRadius: 18,
            padding: 16,
            marginBottom: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 14, flex: 1 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: colors.primary,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {isSendingEmail ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Ionicons name="mail" size={22} color={colors.background} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primarytext }}>
                Send Test Email
              </Text>
              <Text style={{ fontSize: 12, color: colors.secondarytext, marginTop: 2 }}>
                Delivers to: {user?.email || "your account email"}
              </Text>
            </View>
          </View>
          <View
            style={{
              backgroundColor: colors.primary,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: colors.background, fontSize: 12, fontWeight: "700" }}>
              {isSendingEmail ? "Sending..." : "Send Now"}
            </Text>
          </View>
        </TouchableOpacity>

        {/* FAQ Accordion Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.primarytext }]}>
            Frequently Asked Questions
          </Text>

          <View style={styles.faqList}>
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedId === faq.id;
              return (
                <View
                  key={faq.id}
                  style={[
                    styles.faqCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: isExpanded
                        ? "#A3B39C"
                        : colors.surfacevariant,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => toggleExpand(faq.id)}
                    style={styles.faqHeaderRow}
                  >
                    <Text
                      style={[
                        styles.faqQuestion,
                        { color: colors.primarytext },
                      ]}
                    >
                      {faq.question}
                    </Text>
                    <Ionicons
                      name={isExpanded ? "chevron-up" : "chevron-down"}
                      size={18}
                      color={isExpanded ? "#A3B39C" : colors.secondarytext}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.faqBody}>
                      <Text
                        style={[
                          styles.faqAnswer,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {faq.answer}
                      </Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Contact / WhatsApp Support Banner */}
        <View
          style={[
            styles.ticketBanner,
            {
              backgroundColor: "rgba(37, 211, 102, 0.10)",
              borderColor: "rgba(37, 211, 102, 0.28)",
            },
          ]}
        >
          <Ionicons name="logo-whatsapp" size={26} color="#25D366" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.ticketTitle, { color: colors.primarytext }]}>
              Still have questions?
            </Text>
            <Text style={[styles.ticketSub, { color: colors.secondarytext }]}>
              Chat directly with our support team on WhatsApp (653811357).
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() =>
              openWhatsApp(
                SUPPORT_WHATSAPP_NUMBER,
                "Hello Trimly Support, I need assistance with the app."
              )
            }
            style={[
              styles.ticketBtn,
              {
                backgroundColor: "#25D366",
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
              },
            ]}
          >
            <Ionicons name="logo-whatsapp" size={14} color="#FFFFFF" />
            <Text style={[styles.ticketBtnText, { color: "#FFFFFF" }]}>Contact</Text>
          </TouchableOpacity>
        </View>

        {/* Trimly App Branding Footer */}
        <View style={{ alignItems: "center", marginTop: 32, marginBottom: 12 }}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={{ width: 44, height: 44, borderRadius: 12, marginBottom: 8 }}
            resizeMode="contain"
          />
          <Text style={{ color: colors.primarytext, fontSize: 14, fontWeight: "700" }}>
            Trimly App
          </Text>
          <Text style={{ color: colors.secondarytext, fontSize: 12, marginTop: 2 }}>
            Version 1.0.0 · Grooming on Demand
          </Text>
        </View>
      </ScrollView>

      {/* Support Ticket Modal */}
      <Modal
        visible={showTicketModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTicketModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={[styles.modalIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="help-buoy" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                    Partner Support Desk
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.secondarytext }]}>
                    Direct to Trimly Operations & Admin
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowTicketModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={colors.primarytext} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.primarytext }]}>Subject</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surfacevariant, color: colors.primarytext, borderColor: colors.surfacevariant }]}
                placeholder="e.g. Payout Inquiry, Shop Listing, or Technical Issue"
                placeholderTextColor={colors.inputPlaceholder}
                value={ticketSubject}
                onChangeText={setTicketSubject}
              />

              <Text style={[styles.inputLabel, { color: colors.primarytext, marginTop: 12 }]}>Details & Description</Text>
              <TextInput
                style={[styles.modalTextarea, { backgroundColor: colors.surfacevariant, color: colors.primarytext, borderColor: colors.surfacevariant }]}
                placeholder="Describe your inquiry, booking issue, or payout question..."
                placeholderTextColor={colors.inputPlaceholder}
                value={ticketMessage}
                onChangeText={setTicketMessage}
                multiline
                numberOfLines={4}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingTicket}
                onPress={handleSubmitTicket}
                style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]}
              >
                {isSubmittingTicket ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Ionicons name="send" size={16} color={colors.background} style={{ marginRight: 6 }} />
                    <Text style={[styles.modalSubmitText, { color: colors.background }]}>
                      Submit Ticket
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: "100%",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  actionIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(163, 179, 156, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  actionSub: {
    fontSize: 10.5,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  faqList: {
    gap: 10,
  },
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  faqHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    paddingRight: 10,
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 0,
  },
  faqAnswer: {
    fontSize: 13,
    lineHeight: 19,
  },
  ticketBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  ticketTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  ticketSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  ticketBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  ticketBtnText: {
    color: "#1C1E1B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalInput: {
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  modalTextarea: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    textAlignVertical: "top",
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
