import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";
import { setActiveMode } from "@/services/api";
import { useRouter } from "expo-router";

export const AccountActivationModal: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const { colors } = useTheme();
  const router = useRouter();

  const [isActivatingSolo, setIsActivatingSolo] = useState(false);
  const [salonEmailInput, setSalonEmailInput] = useState("");
  const [isSendingJoin, setIsSendingJoin] = useState(false);
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Trigger modal when user has departed salon and needs activation
  const needsActivation =
    user?.account_status === "pending_activation" ||
    (!user?.parent_salon_id && !user?.has_admin_rights && user?.staff_status === "Inactive");

  if (!needsActivation) {
    return null;
  }

  const handleActivateSolo = async () => {
    setIsActivatingSolo(true);
    try {
      const res = await barberService.activateSolo();
      updateUser({
        has_admin_rights: true,
        is_manager: false,
        is_lead: false,
        parent_salon_id: null,
        account_status: "active",
        staff_status: "Active",
      });
      await setActiveMode("barber");
      showToast(
        res?.message ||
          (language === "fr"
            ? "Compte réactivé en tant que coiffeur indépendant !"
            : "Account activated as independent solo provider!"),
        "success"
      );
      router.replace("/(barbers)");
    } catch (e: any) {
      showToast(
        e?.message ||
          (language === "fr"
            ? "Échec de l'activation en solo."
            : "Failed to activate solo account."),
        "error"
      );
    } finally {
      setIsActivatingSolo(false);
    }
  };

  const handleSendJoinRequest = async () => {
    const cleanEmail = salonEmailInput.trim().toLowerCase();
    if (!cleanEmail) {
      showToast(
        language === "fr"
          ? "Veuillez renseigner l'e-mail du salon."
          : "Please enter a salon email address.",
        "warning"
      );
      return;
    }

    setIsSendingJoin(true);
    try {
      const res = await barberService.retrySalonRequest(cleanEmail);
      updateUser({
        account_status: "pending_salon_approval",
        staff_status: "Pending",
      });
      await setActiveMode("sub-barber");
      showToast(
        res?.message ||
          (language === "fr"
            ? "Demande d'adhésion envoyée au salon !"
            : "Join request sent to salon!"),
        "success"
      );
      setShowJoinInput(false);
      setSalonEmailInput("");
      router.replace("/(sub-barber)/bookings" as any);
    } catch (e: any) {
      showToast(
        e?.message ||
          (language === "fr"
            ? "Impossible d'envoyer la demande. Vérifiez l'e-mail du salon."
            : "Failed to send join request. Please verify salon email."),
        "error"
      );
    } finally {
      setIsSendingJoin(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <Modal
      visible={needsActivation}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon */}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: "rgba(199, 243, 107, 0.15)", borderColor: colors.primary },
              ]}
            >
              <Ionicons name="sparkles" size={28} color={colors.primary} />
            </View>

            {/* Title & Description */}
            <Text style={[styles.title, { color: colors.primarytext }]}>
              {language === "fr"
                ? "Activation de votre compte"
                : "Activate Your Account"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondarytext }]}>
              {language === "fr"
                ? "Vous avez quitté votre précédent salon. Pour réactiver votre compte et pouvoir recevoir des réservations, choisissez comment vous souhaitez exercer :"
                : "You have departed from your previous salon. To activate your account and start receiving client bookings again, please choose how you want to work:"}
            </Text>

            {/* OPTION 1: Work as Solo Barber */}
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleActivateSolo}
              disabled={isActivatingSolo}
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <View style={styles.optionHeaderRow}>
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons name="person" size={20} color={colors.onBrand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.primarytext }]}>
                    {language === "fr"
                      ? "1. Travailler en solo / Indépendant"
                      : "1. Work as Solo Barber / Stylist"}
                  </Text>
                  <Text style={[styles.optionBadge, { color: colors.primary }]}>
                    {language === "fr"
                      ? "Droits d'administrateur complets restaurés"
                      : "Full admin rights restored • Bookable"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.optionDesc, { color: colors.secondarytext }]}>
                {language === "fr"
                  ? "Exercez de manière indépendante avec votre propre grille tarifaire, planning et clientèle directe. Vous serez immédiatement réservable."
                  : "Operate independently with your own custom schedule, pricing, and clients. You will immediately be visible and bookable by clients."}
              </Text>

              <View
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: colors.primary },
                ]}
              >
                {isActivatingSolo ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                    <Text style={[styles.primaryActionBtnText, { color: colors.onBrand }]}>
                      {language === "fr"
                        ? "Activer le statut Solo"
                        : "Activate as Solo Barber"}
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <Text style={[styles.dividerText, { color: colors.secondarytext }]}>
                {language === "fr" ? "OU" : "OR"}
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>

            {/* OPTION 2: Join a Salon */}
            <View
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  borderWidth: 1,
                },
              ]}
            >
              <View style={styles.optionHeaderRow}>
                <View
                  style={[
                    styles.optionIconWrap,
                    { backgroundColor: "rgba(59, 130, 246, 0.15)" },
                  ]}
                >
                  <Ionicons name="business" size={20} color="#3B82F6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.optionTitle, { color: colors.primarytext }]}>
                    {language === "fr"
                      ? "2. Rejoindre un autre salon"
                      : "2. Join Another Salon"}
                  </Text>
                  <Text style={[styles.optionBadge, { color: "#3B82F6" }]}>
                    {language === "fr"
                      ? "Membre d'équipe de salon"
                      : "Salon Floor Staff Member"}
                  </Text>
                </View>
              </View>

              <Text style={[styles.optionDesc, { color: colors.secondarytext }]}>
                {language === "fr"
                  ? "Envoyez une demande d'adhésion au gérant d'un autre salon. Une fois acceptée, vous intégrerez le salon floor."
                  : "Submit a join request to another salon manager. Once approved, you will join their salon floor and take appointments."}
              </Text>

              {!showJoinInput ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setShowJoinInput(true)}
                  style={[
                    styles.secondaryActionBtn,
                    { borderColor: "#3B82F6", backgroundColor: "rgba(59, 130, 246, 0.08)" },
                  ]}
                >
                  <Ionicons name="paper-plane-outline" size={16} color="#3B82F6" />
                  <Text style={[styles.secondaryActionBtnText, { color: "#3B82F6" }]}>
                    {language === "fr" ? "Rejoindre un salon" : "Request to Join a Salon"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={{ gap: 8, marginTop: 4 }}>
                  <TextInput
                    style={[
                      styles.salonInput,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.primarytext,
                      },
                    ]}
                    placeholder={
                      language === "fr"
                        ? "E-mail du salon (ex: salon@trimly.com)"
                        : "Salon email (e.g. salon@trimly.com)"
                    }
                    placeholderTextColor={colors.secondarytext}
                    value={salonEmailInput}
                    onChangeText={setSalonEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setShowJoinInput(false)}
                      style={[
                        styles.cancelInputBtn,
                        { borderColor: colors.border, backgroundColor: colors.background },
                      ]}
                    >
                      <Text style={{ fontSize: 13, color: colors.secondarytext, fontWeight: "600" }}>
                        {language === "fr" ? "Annuler" : "Cancel"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isSendingJoin || !salonEmailInput.trim()}
                      onPress={handleSendJoinRequest}
                      style={[
                        styles.sendJoinBtn,
                        { backgroundColor: "#3B82F6", opacity: isSendingJoin || !salonEmailInput.trim() ? 0.6 : 1 },
                      ]}
                    >
                      {isSendingJoin ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={{ fontSize: 13, color: "#FFFFFF", fontWeight: "700" }}>
                          {language === "fr" ? "Envoyer la demande" : "Send Request"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* Sign Out Option */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleLogout}
              style={styles.logoutBtn}
            >
              <Ionicons name="log-out-outline" size={16} color={colors.secondarytext} />
              <Text style={[styles.logoutBtnText, { color: colors.secondarytext }]}>
                {language === "fr" ? "Se déconnecter" : "Sign Out"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "90%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  scrollContent: {
    alignItems: "center",
    paddingVertical: 4,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  optionCard: {
    width: "100%",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  optionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  optionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  optionBadge: {
    fontSize: 11.5,
    fontWeight: "700",
    marginTop: 2,
  },
  optionDesc: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 12,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 44,
    borderRadius: 12,
    gap: 6,
  },
  primaryActionBtnText: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  secondaryActionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 8,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: "700",
  },
  salonInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  cancelInputBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  sendJoinBtn: {
    flex: 2,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  logoutBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
});
