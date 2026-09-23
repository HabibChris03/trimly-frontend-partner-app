import { useNotifications, NotificationItem } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { notificationService } from "@/services/notificationService";
import { barberService } from "@/services/barberService";
import useColors from "@/hooks/usecolor";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_TABS = ["All", "Unread", "Bookings", "Offers"] as const;

export default function NotificationsScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    refreshNotifications,
  } = useNotifications();

  const [selectedFilter, setSelectedFilter] =
    useState<(typeof FILTER_TABS)[number]>("All");
  const [refreshing, setRefreshing] = useState(false);
  const [inviteProcessingId, setInviteProcessingId] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      refreshNotifications();
    }, [refreshNotifications])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
    showToast("Notifications synced.", "info");
  }, [refreshNotifications, showToast]);

  const handleNotificationPress = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.actionRoute) {
      router.push(item.actionRoute as any);
    } else {
      showToast(item.description, "info");
    }
  };

  const handleAcceptStaffInvite = async (item: NotificationItem) => {
    try {
      setInviteProcessingId(item.id);
      const match = item.actionRoute?.match(/(\d+)/);
      const salonId = match ? parseInt(match[1], 10) : null;
      if (!salonId) {
        showToast("Invalid invite link.", "error");
        return;
      }
      await barberService.acceptSalonInvite(salonId);
      if (user) {
        (user as any).role = "barber";
        (user as any).parent_salon_id = salonId;
      }
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      deleteNotification(item.id);
      showToast("Invitation accepted! Welcome to the salon team.", "success");
      router.replace("/(sub-barber)/bookings" as any);
    } catch (err: any) {
      showToast(err.message || "Failed to accept invite.", "error");
    } finally {
      setInviteProcessingId(null);
    }
  };

  const handleDeclineStaffInvite = async (item: NotificationItem) => {
    try {
      setInviteProcessingId(item.id);
      const match = item.actionRoute?.match(/(\d+)/);
      const salonId = match ? parseInt(match[1], 10) : null;
      if (salonId) {
        await barberService.declineSalonInvite(salonId);
      }
      deleteNotification(item.id);
      showToast("Invitation declined.", "info");
    } catch {
      deleteNotification(item.id);
    } finally {
      setInviteProcessingId(null);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0) {
      showToast("All notifications are already read.", "info");
      return;
    }
    markAllAsRead();
    showToast("All notifications marked as read.", "success");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === "Unread") return !n.read;
    if (selectedFilter === "Bookings")
      return n.type === "booking" || n.type === "barber";
    if (selectedFilter === "Offers") return n.type === "promo";
    return true;
  });

  const sections: ("Today" | "Yesterday" | "Earlier")[] = [
    "Today",
    "Yesterday",
    "Earlier",
  ];

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

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("notificationsScreen.title")}
          </Text>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>

        {notifications.length > 0 ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleMarkAllRead}
            style={styles.markAllBtn}
          >
            <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {FILTER_TABS.map((tab) => {
          const isSelected = selectedFilter === tab;
          const tabLabel =
            tab === "All"
              ? t("notificationsScreen.allTab")
              : tab === "Unread"
              ? t("notificationsScreen.unreadTab")
              : tab === "Bookings"
              ? t("notificationsScreen.bookingsTab")
              : t("notificationsScreen.offersTab");
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              onPress={() => setSelectedFilter(tab)}
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
                  {
                    color: isSelected ? "#1C1E1B" : colors.secondarytext,
                    fontWeight: isSelected ? "700" : "500",
                  },
                ]}
              >
                {tabLabel}
                {tab === "Unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
              </Text>
            </TouchableOpacity>
          );
        })}
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
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyStateContainer}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
              ]}
            >
              <Ionicons
                name="notifications-off-outline"
                size={40}
                color={colors.secondarytext}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {selectedFilter === "Unread"
                ? t("notificationsScreen.noUnread")
                : t("notificationsScreen.noNotifications")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              {selectedFilter === "Unread"
                ? t("notificationsScreen.allCaughtUp")
                : t("onboarding.slide3Subtitle")}
            </Text>
          </View>
        ) : (
          sections.map((sectionName) => {
            const items = filteredNotifications.filter(
              (n) => n.section === sectionName
            );
            if (items.length === 0) return null;

            return (
              <View key={sectionName} style={styles.sectionBlock}>
                <Text
                  style={[styles.sectionTitle, { color: colors.secondarytext }]}
                >
                  {sectionName}
                </Text>

                <View style={styles.cardsList}>
                  {items.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.88}
                      onPress={() => handleNotificationPress(item)}
                      style={[
                        styles.notificationCard,
                        {
                          backgroundColor: item.read
                            ? colors.surface
                            : "rgba(163, 179, 156, 0.08)",
                          borderColor: item.read
                            ? colors.surfacevariant
                            : colors.primary,
                        },
                      ]}
                    >
                      {/* Icon */}
                      <View
                        style={[
                          styles.iconBox,
                          {
                            backgroundColor: item.iconBg || "rgba(163, 179, 156, 0.2)",
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.iconName || "notifications-outline"}
                          size={20}
                          color="#FFFFFF"
                        />
                      </View>

                      {/* Content */}
                      <View style={styles.cardContent}>
                        <View style={styles.cardHeaderRow}>
                          <Text
                            style={[
                              styles.cardTitle,
                              {
                                color: colors.primarytext,
                                fontWeight: item.read ? "600" : "800",
                              },
                            ]}
                          >
                            {item.title}
                          </Text>

                          <View style={styles.timeRow}>
                            <Text
                              style={[
                                styles.timeText,
                                { color: colors.secondarytext },
                              ]}
                            >
                              {item.timeAgo}
                            </Text>
                            {!item.read && (
                              <View
                                style={[
                                  styles.unreadDot,
                                  { backgroundColor: colors.primary },
                                ]}
                              />
                            )}
                          </View>
                        </View>

                        <Text
                          style={[
                            styles.cardDescription,
                            { color: colors.secondarytext },
                          ]}
                        >
                          {item.description}
                        </Text>

                        {item.type === "staff_invite" && (
                          <View style={styles.inviteActionRow}>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={inviteProcessingId === item.id}
                              onPress={() => handleDeclineStaffInvite(item)}
                              style={[styles.inviteActionBtn, styles.inviteDeclineBtn, { opacity: inviteProcessingId === item.id ? 0.7 : 1 }]}
                            >
                              {inviteProcessingId === item.id ? (
                                <ActivityIndicator size="small" color="#EF4444" />
                              ) : (
                                <Text style={styles.inviteDeclineText}>Decline</Text>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              activeOpacity={0.8}
                              disabled={inviteProcessingId === item.id}
                              onPress={() => handleAcceptStaffInvite(item)}
                              style={[styles.inviteActionBtn, styles.inviteAcceptBtn, { backgroundColor: colors.primary }]}
                            >
                              {inviteProcessingId === item.id ? (
                                <ActivityIndicator size="small" color={colors.background} />
                              ) : (
                                <>
                                  <Ionicons name="checkmark-circle" size={16} color={colors.background} />
                                  <Text style={[styles.inviteAcceptText, { color: colors.background }]}>
                                    Accept & Join
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        )}

                        {(item.type === "review" || item.actionRoute?.includes("review-submission")) && (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => handleNotificationPress(item)}
                            style={[
                              styles.reviewActionBtn,
                              { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(245, 158, 11, 0.4)" },
                            ]}
                          >
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={styles.reviewActionBtnText}>
                              {t("barberProfile.writeReview") || "Write a Review"}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Dismiss / Delete button */}
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          deleteNotification(item.id);
                          showToast("Notification removed.", "info");
                        }}
                        style={styles.deleteBtn}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={colors.secondarytext}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  unreadBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadBadgeText: {
    color: "#1C1E1B",
    fontSize: 11,
    fontWeight: "800",
  },
  markAllBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  filterTabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  sectionBlock: {
    marginBottom: 22,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardsList: {
    gap: 10,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 3,
  },
  cardTitle: {
    fontSize: 14.5,
    flex: 1,
    marginRight: 8,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeText: {
    fontSize: 11.5,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cardDescription: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  deleteBtn: {
    padding: 6,
    marginLeft: 6,
  },
  emptyStateContainer: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  inviteActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  inviteActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 4,
  },
  inviteDeclineBtn: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.25)",
  },
  inviteDeclineText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  inviteAcceptBtn: {},
  inviteAcceptText: {
    fontSize: 12,
    fontWeight: "700",
  },
  reviewActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  reviewActionBtnText: {
    color: "#F59E0B",
    fontSize: 12.5,
    fontWeight: "700",
  },
});
