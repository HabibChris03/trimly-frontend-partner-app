import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
import { barberService } from "@/services/barberService";
import { setActiveMode } from "@/services/api";
import { CustomModal } from "@/components/ui/CustomModal";

export default function SubBarberProfileScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [staffStatus, setStaffStatus] = useState<"Active" | "On Break" | "Off Duty">(
    (user as any)?.staff_status || "Active"
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleStatusChange = async (newStatus: "Active" | "On Break" | "Off Duty") => {
    if (!user?.id || !user?.parent_salon_id) {
      setStaffStatus(newStatus);
      return;
    }
    setIsUpdatingStatus(true);
    try {
      await barberService.updateStaffStatus(user.parent_salon_id, user.id, newStatus);
      setStaffStatus(newStatus);
      showToast(t("subBarber.dutyStatusUpdated", { status: newStatus }), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const handleLogOutConfirm = async () => {
    setLogoutModalVisible(false);
    await logout();
    router.replace("/(auth)/login");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.surfacevariant }]}>
        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>{t("subBarber.myProfile")}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.background }]}>
              {(user?.name || user?.email || "U").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.primarytext }]}>
              {user?.name || t("subBarber.stylist")}
            </Text>
            <Text style={[styles.userEmail, { color: colors.secondarytext }]}>
              {user?.email || ""}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.roleBadge, { backgroundColor: "rgba(163, 179, 156, 0.2)" }]}>
                <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                  {(user as any)?.staff_title || t("subBarber.salonStylist")}
                </Text>
              </View>
              {user?.parent_salon_id && (
                <View style={[styles.salonBadge, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                  <Text style={styles.salonBadgeText}>
                    {user?.parent_salon_name ? `Salon: ${user.parent_salon_name}` : t("subBarber.salonTeamMember")}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>


        {/* Duty Status Selector */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>{t("subBarber.dutyStatus")}</Text>
          <View style={styles.statusButtonGroup}>
            {(["Active", "On Break", "Off Duty"] as const).map((status) => {
              const isSelected = staffStatus === status;
              const color =
                status === "Active" ? "#10B981" : status === "On Break" ? "#F59E0B" : "#6B7280";
              const label =
                status === "Active"
                  ? t("common.active")
                  : status === "On Break"
                  ? t("common.onBreak")
                  : t("common.offDuty");

              return (
                <TouchableOpacity
                  key={status}
                  activeOpacity={0.8}
                  disabled={isUpdatingStatus}
                  onPress={() => handleStatusChange(status)}
                  style={[
                    styles.statusBtn,
                    {
                      backgroundColor: isSelected ? color : "transparent",
                      borderColor: color,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isSelected ? "#FFFFFF" : color },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusBtnText,
                      { color: isSelected ? "#FFFFFF" : color },
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* App Settings */}
        <View style={[styles.sectionCard, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>{t("profile.preferences")}</Text>

          {/* Dark Mode */}
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              <Ionicons name={isDark ? "moon-outline" : "sunny-outline"} size={20} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>{t("profile.darkMode")}</Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: "#767577", true: colors.primary }}
              thumbColor={isDark ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.surfacevariant }]} />

          {/* Language Selection */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/language-selection")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="language-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>{t("profile.switchLanguage")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondarytext} />
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: colors.surfacevariant }]} />

          {/* Help & Support */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.push("/Pages/help-support")}
            style={styles.menuRow}
          >
            <View style={styles.menuLeft}>
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.menuLabel, { color: colors.primarytext }]}>{t("profile.helpSupport")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.secondarytext} />
          </TouchableOpacity>
        </View>

        {/* Log Out Button */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleLogout}
          style={[styles.logoutBtn, { borderColor: "#EF4444" }]}
        >
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>{t("common.logout")}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Logout Confirmation Modal */}
      <CustomModal
        visible={logoutModalVisible}
        onClose={() => setLogoutModalVisible(false)}
        title={t("common.logoutConfirmTitle")}
        description={t("common.logoutConfirmMsg")}
        icon="log-out-outline"
        primaryText={t("common.logout")}
        primaryDanger={true}
        secondaryText={t("common.stayLoggedIn") || "Cancel"}
        onPrimary={handleLogOutConfirm}
        onSecondary={() => setLogoutModalVisible(false)}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  headerSwitchText: {
    fontSize: 12,
    fontWeight: "700",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  content: {
    padding: 16,
    paddingBottom: 80,
    gap: 16,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "700",
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  salonBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  salonBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3B82F6",
  },
  switchCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  switchLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  switchIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  clientTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  clientTagText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  statusButtonGroup: {
    flexDirection: "row",
    gap: 10,
  },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  menuRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  divider: {
    height: 1,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    gap: 8,
    marginTop: 8,
  },
  logoutText: {
    color: "#EF4444",
    fontSize: 15,
    fontWeight: "700",
  },
});
