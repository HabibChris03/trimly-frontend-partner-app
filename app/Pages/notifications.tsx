import { useNotifications, NotificationItem, normalizePartnerRoute } from "@/context/NotificationContext";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { barberService } from "@/services/barberService";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const FILTER_PILLS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "bookings", label: "Bookings" },
  { key: "updates", label: "Updates" },
] as const;

export default function NotificationsScreen() {
  const { colors, isDark } = useTheme();
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
    refreshNotifications,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "bookings" | "updates">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [inviteProcessingId, setInviteProcessingId] = useState<string | null>(null);

  // Facebook-style bottom sheet menu for individual notifications
  const [selectedItemForMenu, setSelectedItemForMenu] = useState<NotificationItem | null>(null);

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
    const targetRoute = normalizePartnerRoute(item.actionRoute, item.type);
    if (targetRoute) {
      router.push(targetRoute as any);
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
    if (activeFilter === "unread") return !n.read;
    if (activeFilter === "bookings")
      return n.type === "booking" || n.type === "barber" || n.type === "reminder";
    if (activeFilter === "updates") return n.type === "promo" || n.type === "system";
    return true;
  });

  // Group notifications into New (unread) and Earlier (read)
  const newNotifications = filteredNotifications.filter((n) => !n.read);
  const earlierNotifications = filteredNotifications.filter((n) => n.read);

  // Badge icon mapping based on notification type
  const getBadgeIcon = (type: string): { name: keyof typeof Ionicons.glyphMap; color: string; bg: string } => {
    switch (type) {
      case "booking":
        return { name: "calendar", color: colors.onBrand, bg: colors.brand };
      case "reminder":
        return { name: "alarm", color: "#FFFFFF", bg: "#F59E0B" };
      case "promo":
        return { name: "pricetag", color: colors.onBrand, bg: colors.brand };
      case "staff_invite":
        return { name: "people", color: "#FFFFFF", bg: "#6366F1" };
      case "review":
        return { name: "star", color: "#FFFFFF", bg: "#F59E0B" };
      default:
        return { name: "notifications", color: colors.onBrand, bg: colors.brand };
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
      />

      {/* Facebook-style Top Navigation Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={[styles.headerCircleBtn, { backgroundColor: colors.surfacevariant }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
          </TouchableOpacity>
          <Text style={[styles.fbHeaderTitle, { color: colors.primarytext }]}>
            {t("notificationsScreen.title") || "Notifications"}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {unreadCount > 0 && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleMarkAllRead}
              style={[styles.headerActionPill, { backgroundColor: colors.surfacevariant }]}
            >
              <Ionicons name="checkmark-done" size={16} color={colors.primary} />
              <Text style={[styles.headerActionPillText, { color: colors.primary }]}>
                {t("notifications.markAllRead") || "Mark all read"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              showToast("Partner notifications preferences are up to date.", "info");
            }}
            style={[styles.headerCircleBtn, { backgroundColor: colors.surfacevariant }]}
          >
            <Ionicons name="settings-sharp" size={18} color={colors.primarytext} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Facebook-style Filter Pills Bar */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTER_PILLS.map((pill) => {
            const isSelected = activeFilter === pill.key;
            const count = pill.key === "unread" ? unreadCount : null;
            return (
              <TouchableOpacity
                key={pill.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(pill.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected
                      ? colors.brand
                      : colors.card,
                    borderColor: isSelected
                      ? colors.brand
                      : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected
                        ? colors.onBrand
                        : colors.secondaryText,
                      fontWeight: isSelected ? "700" : "600",
                    },
                  ]}
                >
                  {pill.label}
                  {count !== null && count > 0 ? ` (${count})` : ""}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Notifications Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedScroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surfacevariant }]}>
              <Ionicons name="notifications-outline" size={44} color={colors.secondarytext} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {activeFilter === "unread"
                ? "No unread notifications"
                : "No notifications right now"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              {activeFilter === "unread"
                ? "You're all caught up with your salon appointments and alerts."
                : "Updates about your client bookings, team members, and reviews will appear here."}
            </Text>
          </View>
        ) : (
          <>
            {/* "New" Section (Unread Notifications) */}
            {newNotifications.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.primarytext }]}>
                    New
                  </Text>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleMarkAllRead}>
                    <Text style={[styles.seeAllAction, { color: colors.brand }]}>
                      Mark all as read
                    </Text>
                  </TouchableOpacity>
                </View>

                {newNotifications.map((item) => renderFacebookItem(item))}
              </View>
            )}

            {/* "Earlier" Section */}
            {earlierNotifications.length > 0 && (
              <View style={styles.sectionWrap}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: colors.primarytext }]}>
                    Earlier
                  </Text>
                </View>

                {earlierNotifications.map((item) => renderFacebookItem(item))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Facebook-style 3-Dot Options Bottom Sheet Modal */}
      <Modal
        visible={!!selectedItemForMenu}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedItemForMenu(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setSelectedItemForMenu(null)}
          style={styles.sheetOverlay}
        >
          <View style={[styles.sheetContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.primarytext }]} numberOfLines={1}>
                {selectedItemForMenu?.title || "Notification"}
              </Text>
              <Text style={[styles.sheetSub, { color: colors.secondarytext }]} numberOfLines={2}>
                {selectedItemForMenu?.description}
              </Text>
            </View>

            <View style={[styles.sheetDivider, { backgroundColor: colors.border }]} />

            {/* Action 1: Mark as Read */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (selectedItemForMenu) {
                  markAsRead(selectedItemForMenu.id);
                  showToast("Marked as read.", "info");
                }
                setSelectedItemForMenu(null);
              }}
              style={styles.sheetRow}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: colors.surfacevariant }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={colors.primarytext} />
              </View>
              <View style={styles.sheetRowText}>
                <Text style={[styles.sheetRowTitle, { color: colors.primarytext }]}>
                  Mark as read
                </Text>
                <Text style={[styles.sheetRowDesc, { color: colors.secondarytext }]}>
                  Keep this notification without removing it
                </Text>
              </View>
            </TouchableOpacity>

            {/* Action 2: Remove Notification */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (selectedItemForMenu) {
                  deleteNotification(selectedItemForMenu.id);
                  showToast("Notification removed.", "info");
                }
                setSelectedItemForMenu(null);
              }}
              style={styles.sheetRow}
            >
              <View style={[styles.sheetIconCircle, { backgroundColor: "rgba(239, 68, 68, 0.12)" }]}>
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.sheetRowText}>
                <Text style={[styles.sheetRowTitle, { color: "#EF4444" }]}>
                  Remove this notification
                </Text>
                <Text style={[styles.sheetRowDesc, { color: colors.secondarytext }]}>
                  {t("notifications.deleteNotificationDesc") || "Delete this notification from your partner feed"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setSelectedItemForMenu(null)}
              style={[styles.sheetCancelBtn, { backgroundColor: colors.surfacevariant }]}
            >
              <Text style={[styles.sheetCancelText, { color: colors.primarytext }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );

  function renderFacebookItem(item: NotificationItem) {
    const badge = getBadgeIcon(item.type);
    const isUnread = !item.read;

    return (
      <TouchableOpacity
        key={item.id}
        activeOpacity={0.75}
        onPress={() => handleNotificationPress(item)}
        style={[
          styles.fbNotificationRow,
          {
            backgroundColor: isUnread
              ? isDark
                ? "rgba(199, 243, 107, 0.08)"
                : "rgba(199, 243, 107, 0.14)"
              : "transparent",
          },
        ]}
      >
        {/* Left: Avatar with Overlapping Type Badge Icon */}
        <View style={styles.avatarContainer}>
          <View
            style={[
              styles.mainAvatarCircle,
              {
                backgroundColor: item.iconBg || colors.card,
              },
            ]}
          >
            <Ionicons
              name={item.iconName || "notifications"}
              size={24}
              color={colors.primaryText}
            />
          </View>

          {/* Overlapping Bottom-Right Corner Badge */}
          <View style={[styles.badgeCircle, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.name} size={12} color={badge.color} />
          </View>
        </View>

        {/* Center: Story & Content */}
        <View style={styles.contentWrap}>
          <Text
            style={[
              styles.fbMessageText,
              { color: colors.primaryText },
            ]}
          >
            <Text style={{ fontWeight: isUnread ? "800" : "700" }}>{item.title} </Text>
            <Text style={{ fontWeight: isUnread ? "500" : "400", color: isUnread ? colors.primaryText : colors.secondaryText }}>
              {item.description}
            </Text>
          </Text>

          {/* Timestamp Row */}
          <Text
            style={[
              styles.fbTimestampText,
              {
                color: isUnread ? colors.brand : colors.secondaryText,
                fontWeight: isUnread ? "700" : "500",
              },
            ]}
          >
            {item.timeAgo || "Recently"}
          </Text>

          {/* Special Inline Action: Staff Invitation */}
          {item.type === "staff_invite" && (
            <View style={styles.inlineActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={inviteProcessingId === item.id}
                onPress={() => handleAcceptStaffInvite(item)}
                style={[styles.fbPrimaryActionBtn, { backgroundColor: colors.brand }]}
              >
                {inviteProcessingId === item.id ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={[styles.fbPrimaryActionText, { color: colors.onBrand }]}>{t("common.confirm") || "Confirm"}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                disabled={inviteProcessingId === item.id}
                onPress={() => handleDeclineStaffInvite(item)}
                style={[styles.fbSecondaryActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.fbSecondaryActionText, { color: colors.primaryText }]}>
                  {t("common.delete") || "Delete"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Special Inline Action: Reviews / Reply */}
          {(item.type === "review" || item.actionRoute?.includes("review")) && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                markAsRead(item.id);
                router.push("/reviews" as any);
              }}
              style={[styles.fbInlineReviewBtn, { backgroundColor: "rgba(245, 158, 11, 0.15)", borderColor: "rgba(245, 158, 11, 0.3)" }]}
            >
              <Ionicons name="chatbubble-ellipses" size={13} color="#F59E0B" />
              <Text style={styles.fbInlineReviewText}>{t("notifications.viewReplyReview") || "View & Reply to Review"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Right: Unread Blue Dot & 3-Dot More Menu */}
        <View style={styles.rightActionWrap}>
          {isUnread && <View style={styles.fbUnreadDot} />}
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => setSelectedItemForMenu(item)}
            style={styles.moreThreeDotsBtn}
          >
            <Ionicons name="ellipsis-horizontal" size={18} color={colors.secondarytext} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  }
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  fbHeaderTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerActionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  headerActionPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  filterBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  feedScroll: {
    paddingBottom: 40,
  },
  sectionWrap: {
    marginTop: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "700",
  },
  seeAllAction: {
    fontSize: 13,
    fontWeight: "600",
  },
  fbNotificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  avatarContainer: {
    position: "relative",
    width: 52,
    height: 52,
  },
  mainAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeCircle: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  contentWrap: {
    flex: 1,
    paddingRight: 6,
  },
  fbMessageText: {
    fontSize: 14.5,
    lineHeight: 20,
  },
  fbTimestampText: {
    fontSize: 12,
    marginTop: 4,
  },
  inlineActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  fbPrimaryActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fbPrimaryActionText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  fbSecondaryActionBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  fbSecondaryActionText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  fbInlineReviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  fbInlineReviewText: {
    color: "#F59E0B",
    fontSize: 12.5,
    fontWeight: "700",
  },
  rightActionWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 4,
  },
  fbUnreadDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#C7F36B", // Dark urban lime unread indicator
  },
  moreThreeDotsBtn: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 28,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13.5,
    textAlign: "center",
    lineHeight: 19,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  sheetSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 14,
  },
  sheetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetRowText: {
    flex: 1,
  },
  sheetRowTitle: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  sheetRowDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetCancelBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
