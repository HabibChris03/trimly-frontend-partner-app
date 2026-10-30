import React, { useEffect, useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import {
  websocketService,
  BarberSuspensionEvent,
} from "@/services/websocketService";

export const BarberSuspensionModal: React.FC = () => {
  const { user, refreshUser, updateUser, logout } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [eventSuspended, setEventSuspended] = useState<boolean | null>(null);
  const [eventSalonName, setEventSalonName] = useState<string>("");
  const [eventPhone, setEventPhone] = useState<string>("");
  const [isChecking, setIsChecking] = useState<boolean>(false);

  // Check if current user is the owner/top-level salon manager (who shouldn't be blocked)
  const isOwnerOrManager = useMemo(() => {
    if (!user) return false;
    if (user.role === "salon" && !user.parent_salon_id) return true;
    if (user.is_manager && !user.parent_salon_id) return true;
    return false;
  }, [user]);

  // Listen to real-time WebSocket suspension events
  useEffect(() => {
    const unsubscribe = websocketService.subscribeToSuspension(
      (data: BarberSuspensionEvent) => {
        if (data.event === "barber_suspended") {
          setEventSuspended(true);
          if (data.salon_name) setEventSalonName(data.salon_name);
          if (data.manager_phone) setEventPhone(data.manager_phone);
          updateUser({ staff_status: "Suspended", account_status: "suspended" });
        } else if (data.event === "barber_reactivated") {
          setEventSuspended(false);
          updateUser({ staff_status: "Active", account_status: "active" });
          showToast(
            t("suspensionModal.suspensionLifted") ||
              "Your suspension has been lifted! You are now back active.",
            "success"
          );
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [updateUser, showToast, t]);

  // Determine effective suspension status
  const isSuspended = useMemo(() => {
    if (!user) return false;
    if (isOwnerOrManager) return false;

    if (eventSuspended === true) return true;
    if (eventSuspended === false) return false;

    return (
      user.staff_status === "Suspended" || user.account_status === "suspended"
    );
  }, [user, isOwnerOrManager, eventSuspended]);

  const salonName = useMemo(() => {
    return (
      eventSalonName ||
      user?.parent_salon_name ||
      "Salon"
    );
  }, [eventSalonName, user?.parent_salon_name]);

  const managerPhone = useMemo(() => {
    return (
      eventPhone ||
      (user as any)?.parent_salon_phone ||
      ""
    );
  }, [eventPhone, user]);

  const handleCallManager = () => {
    if (managerPhone) {
      const cleanPhone = managerPhone.replace(/\s+/g, "");
      Linking.openURL(`tel:${cleanPhone}`).catch(() => {
        showToast("Unable to open phone dialer.", "error");
      });
    } else {
      showToast(
        `Contact ${salonName} directly via phone or WhatsApp.`,
        "info"
      );
    }
  };

  const handleCheckStatus = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      await refreshUser();
      // If user staff_status is no longer Suspended
      if (
        user?.staff_status !== "Suspended" &&
        user?.account_status !== "suspended"
      ) {
        setEventSuspended(false);
        showToast(
          t("suspensionModal.suspensionLifted") ||
            "Your suspension has been lifted! You are now back active.",
          "success"
        );
      } else {
        showToast(
          t("suspensionModal.stillSuspended") ||
            "Your account is still suspended. Please contact your salon manager.",
          "error"
        );
      }
    } catch {
      showToast("Unable to verify status. Please try again.", "error");
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogOut = () => {
    setEventSuspended(false);
    logout();
  };

  if (!isSuspended) {
    return null;
  }

  const rawMessage =
    t("suspensionModal.message") ||
    "You have been suspended, Contact {salonName} Manager to unsuspend you.";
  const displayMessage = rawMessage.replace("{salonName}", salonName);

  return (
    <Modal
      visible={isSuspended}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {
        // Prevent hardware back button dismiss on Android
      }}
    >
      <View style={styles.overlay}>
        <View style={styles.backdrop} />

        <View style={styles.card}>
          {/* Red Alert Halo Badge */}
          <View style={styles.iconHalo}>
            <View style={styles.iconBadge}>
              <Ionicons name="pause-circle" size={38} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {t("suspensionModal.title") || "Account Suspended"}
          </Text>

          {/* Core User Message */}
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>{displayMessage}</Text>
          </View>

          {/* Subtitle explanation */}
          <Text style={styles.subMessage}>
            {t("suspensionModal.subMessage") ||
              "Your chair and booking calendar have been temporarily paused by salon management. You cannot accept new client bookings until the suspension is lifted."}
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Call / Contact Manager Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.primaryBtn}
              onPress={handleCallManager}
            >
              <Ionicons name="call" size={18} color="#171918" style={styles.btnIcon} />
              <Text style={styles.primaryBtnText}>
                {t("suspensionModal.callManager") || "Call Salon Manager"}
              </Text>
            </TouchableOpacity>

            {/* Check Status Button */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isChecking}
              style={styles.secondaryBtn}
              onPress={handleCheckStatus}
            >
              {isChecking ? (
                <ActivityIndicator size="small" color="#F5F5F2" />
              ) : (
                <>
                  <Ionicons
                    name="refresh-circle-outline"
                    size={20}
                    color="#F5F5F2"
                    style={styles.btnIcon}
                  />
                  <Text style={styles.secondaryBtnText}>
                    {t("suspensionModal.checkStatus") || "Check Status"}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Log Out */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.logoutBtn}
              onPress={handleLogOut}
            >
              <Ionicons
                name="log-out-outline"
                size={16}
                color="#A6ACA5"
                style={styles.btnIcon}
              />
              <Text style={styles.logoutBtnText}>
                {t("suspensionModal.logOut") || "Log Out"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    zIndex: 999999,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#252926",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.35)",
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 20,
  },
  iconHalo: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  iconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 20,
    color: "#F5F5F2",
    textAlign: "center",
    marginBottom: 14,
  },
  messageBox: {
    width: "100%",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  messageText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14.5,
    lineHeight: 21,
    color: "#F5F5F2",
    textAlign: "center",
  },
  subMessage: {
    fontFamily: "PlusJakartaSans_400Regular",
    fontSize: 13,
    lineHeight: 18,
    color: "#A6ACA5",
    textAlign: "center",
    marginBottom: 24,
    paddingHorizontal: 6,
  },
  actionsContainer: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    flexDirection: "row",
    height: 48,
    borderRadius: 14,
    backgroundColor: "#C7F36B",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  btnIcon: {
    marginRight: 8,
  },
  primaryBtnText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 15,
    color: "#171918",
  },
  secondaryBtn: {
    flexDirection: "row",
    height: 46,
    borderRadius: 14,
    backgroundColor: "#171918",
    borderWidth: 1,
    borderColor: "#383D38",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontFamily: "PlusJakartaSans_600SemiBold",
    fontSize: 14,
    color: "#F5F5F2",
  },
  logoutBtn: {
    flexDirection: "row",
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  logoutBtnText: {
    fontFamily: "PlusJakartaSans_500Medium",
    fontSize: 13,
    color: "#A6ACA5",
  },
});
