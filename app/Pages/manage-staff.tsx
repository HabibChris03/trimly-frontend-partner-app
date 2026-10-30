import { BarberCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { MANAGE_STAFF_TUTORIAL } from "@/constants/barberTutorials";
import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeImages } from "@/hooks/useThemeImages";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone?: string;
  status: "Active" | "Off Duty" | "On Break" | "Suspended";
  experience?: string;
  avatarIndex?: number;
}

interface RegisteredClient {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role?: string;
}

const ROLES = [
  { label: "Master Barber", icon: "cut" as const, desc: "Lead specialist" },
  { label: "Fade Specialist", icon: "sparkles" as const, desc: "Precision fades" },
  { label: "Beard Sculptor", icon: "man" as const, desc: "Beard grooming & razor" },
  { label: "Senior Stylist", icon: "star" as const, desc: "Cuts & contemporary styles" },
  { label: "Colorist", icon: "color-palette" as const, desc: "Hair dyes & treatments" },
  { label: "Apprentice", icon: "school" as const, desc: "Junior stylist" },
];

export default function ManageStaffScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;
  const { user } = useAuth();
  const { showToast } = useToast();

  const salonId = user?.id || 4;
  const salonName = user?.name ? `${user.name}'s Salon` : "Trimly Salon";

  // Navigation Tab State (Search & Invite, Active, Pending, Still To Send)
  const [activeTab, setActiveTab] = useState<"active" | "requests" | "invite" | "pending" | "still_to_send">("active");

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [stillToSendInvites, setStillToSendInvites] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [isRespondingToRequest, setIsRespondingToRequest] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // Client Search & Invite State
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientsDirectory, setClientsDirectory] = useState<RegisteredClient[]>([]);
  const [selectedClient, setSelectedClient] = useState<RegisteredClient | null>(null);
  const [staffRole, setStaffRole] = useState(ROLES[0].label);
  const [isInviting, setIsInviting] = useState(false);

  // Staff Search & Action Modal State
  const [activeStaffSearch, setActiveStaffSearch] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const fetchStaffAndClients = useCallback(async () => {
    try {
      const [apiStaff, clients, allInvites, requests] = await Promise.all([
        barberService.listSalonStaff(salonId).catch(() => []),
        barberService.searchClients("").catch(() => []),
        barberService.listSalonInvites(salonId).catch(() => []),
        barberService.getSalonJoinRequests(salonId).catch(() => []),
      ]);

      const rawInvites = Array.isArray(allInvites) ? allInvites : [];
      const pending = rawInvites.filter((i: any) => i.rawStatus === "pending" || i.status === "Pending");
      const drafts = rawInvites.filter((i: any) => i.rawStatus === "still_to_send" || i.status === "Still To Send");
      const activeFromInvites = rawInvites.filter((i: any) => i.rawStatus === "active" || i.status === "Active");

      const baseStaff = Array.isArray(apiStaff) ? apiStaff : [];
      const combinedActive: StaffMember[] = [
        ...baseStaff,
        ...activeFromInvites
          .filter((inv: any) => !baseStaff.some((s: any) => s.id === inv.clientId || s.name === inv.clientName))
          .map((inv: any) => ({
            id: inv.clientId || inv.id,
            name: inv.clientName,
            role: inv.role || "Salon Stylist",
            phone: inv.clientPhone,
            status: "Active" as const,
          })),
      ];

      setStaffList(combinedActive);
      setPendingInvites(pending);
      setStillToSendInvites(drafts);
      setJoinRequests(Array.isArray(requests) ? requests : []);
      setClientsDirectory(Array.isArray(clients) ? clients : []);
    } catch {
      showToast("Unable to refresh staff roster.", "error");
    }
  }, [salonId, showToast]);

  const handleRespondJoinRequest = async (requestId: number, action: "accept" | "reject") => {
    setIsRespondingToRequest(requestId);
    try {
      await barberService.respondToJoinRequest(salonId, requestId, action);
      showToast(
        action === "accept"
          ? "Stylist accepted onto salon floor!"
          : "Stylist join request declined.",
        action === "accept" ? "success" : "info"
      );
      await fetchStaffAndClients();
    } catch (e: any) {
      showToast(e?.message || "Failed to respond to join request.", "error");
    } finally {
      setIsRespondingToRequest(null);
    }
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchStaffAndClients();
      setIsLoading(false);
    }
    load();
  }, [fetchStaffAndClients]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStaffAndClients();
    setRefreshing(false);
    showToast("Staff directory & invites refreshed.", "info");
  }, [fetchStaffAndClients, showToast]);

  const handleSearchClients = async (query: string) => {
    setClientSearchQuery(query);
    const results = await barberService.searchClients(query);
    setClientsDirectory(results);
  };

  const handleSendInvite = async (isDraft: boolean = false) => {
    if (!selectedClient) {
      showToast("Please select a registered stylist from the directory.", "warning");
      return;
    }

    const isAlreadyStaff = staffList.some(
      (s) => s.id === selectedClient.id || s.name.toLowerCase() === selectedClient.name.toLowerCase()
    );
    if (isAlreadyStaff) {
      showToast(`${selectedClient.name} is already an active staff member.`, "info");
      return;
    }

    const isAlreadyPending = pendingInvites.some(
      (inv) => inv.clientId === selectedClient.id || inv.clientEmail === selectedClient.email
    );
    if (isAlreadyPending && !isDraft) {
      showToast(`An invitation has already been sent to ${selectedClient.name}.`, "info");
      return;
    }

    setIsInviting(true);
    try {
      const invite = await barberService.sendStaffInvite({
        salonId,
        salonName,
        client: selectedClient,
        role: staffRole,
        status: isDraft ? "still_to_send" : "pending",
      });

      if (isDraft) {
        setStillToSendInvites((prev) => [invite, ...prev]);
        showToast(`Invitation for ${selectedClient.name} saved to drafts.`, "success");
        setSelectedClient(null);
        setClientSearchQuery("");
        setActiveTab("still_to_send");
      } else {
        setPendingInvites((prev) => [invite, ...prev]);
        showToast(`Invitation sent to ${selectedClient.name}!`, "success");
        setSelectedClient(null);
        setClientSearchQuery("");
        setActiveTab("pending");
      }
    } catch {
      showToast("Failed to process invitation. Please try again.", "error");
    } finally {
      setIsInviting(false);
    }
  };

  const handleSendDraftNow = async (invite: any) => {
    try {
      await barberService.updateStaffInviteStatus(salonId, invite.id, "pending");
      setStillToSendInvites((prev) => prev.filter((i) => i.id !== invite.id));
      setPendingInvites((prev) => [{ ...invite, status: "Pending", rawStatus: "pending" }, ...prev]);
      showToast(`Invitation sent to ${invite.clientName}!`, "success");
    } catch {
      showToast("Failed to send draft invitation.", "error");
    }
  };

  const handleDeleteDraft = (invite: any) => {
    Alert.alert(
      "Delete Draft",
      `Delete the draft invite for ${invite.clientName}?`,
      [
        { text: "Keep Draft", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await barberService.cancelStaffInvite(salonId, invite.id);
            setStillToSendInvites((prev) => prev.filter((i) => i.id !== invite.id));
            showToast(`Draft for ${invite.clientName} deleted.`, "info");
          },
        },
      ]
    );
  };

  const handleCancelInvite = (inviteId: string | number, clientName: string) => {
    Alert.alert(
      "Revoke Invitation",
      `Are you sure you want to cancel the staff invite for ${clientName}?`,
      [
        { text: "Keep Invite", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            await barberService.cancelStaffInvite(salonId, inviteId);
            setPendingInvites((prev) => prev.filter((i) => i.id !== inviteId));
            showToast(`Invitation for ${clientName} revoked.`, "info");
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (member: StaffMember, nextStatus: StaffMember["status"]) => {
    try {
      await barberService.updateStaffStatus(salonId, member.id, nextStatus);
      setStaffList((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, status: nextStatus } : s))
      );
      setStatusModalVisible(false);
      setSelectedStaff(null);
      showToast(`${member.name}'s status changed to ${nextStatus}.`, "success");
    } catch {
      showToast("Failed to update staff status.", "error");
    }
  };

  const handleRemoveStaff = async (member: StaffMember) => {
    Alert.alert(
      "Remove Staff Member",
      `Are you sure you want to remove ${member.name} from ${salonName}? They will revert to a standard profile.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await barberService.removeSalonStaff(salonId, member.id);
              setStaffList((prev) => prev.filter((s) => s.id !== member.id));
              setStatusModalVisible(false);
              setSelectedStaff(null);
              showToast(`${member.name} removed from salon staff.`, "info");
            } catch {
              showToast("Failed to remove staff member.", "error");
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: StaffMember["status"]) => {
    switch (status) {
      case "Active":
        return "#22C55E";
      case "On Break":
        return "#F59E0B";
      case "Off Duty":
        return "#6B7280";
      case "Suspended":
        return "#EF4444";
      default:
        return "#22C55E";
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(activeStaffSearch.toLowerCase()) ||
      (s.role && s.role.toLowerCase().includes(activeStaffSearch.toLowerCase()))
  );

  const activeCount = staffList.filter((s) => s.status === "Active").length;
  const suspendedCount = staffList.filter((s) => s.status === "Suspended").length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Screen Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerCircleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("manageStaff.staffManagement") || "Staff Management"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {salonName} • {staffList.length} stylists registered
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTutorialVisible(true)}
            style={[
              styles.headerCircleBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onRefresh}
            style={[
              styles.headerCircleBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Top Navigation Track */}
      <View
        style={[
          styles.tabContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabTrack}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("active")}
            style={[
              styles.tabItem,
              activeTab === "active"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeTab === "active" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "active" ? colors.onBrand : colors.primarytext },
              ]}
            >{t("manageStaff.activeStaffTab")} ({staffList.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("requests")}
            style={[
              styles.tabItem,
              activeTab === "requests"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="person-add-outline"
              size={14}
              color={activeTab === "requests" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "requests" ? colors.onBrand : colors.primarytext },
              ]}
            >{t("manageStaff.requestsTab")} ({joinRequests.length})</Text>
            {joinRequests.length > 0 && activeTab !== "requests" && (
              <View style={[styles.tabBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.tabBadgeText, { color: colors.onBrand }]}>
                  {joinRequests.length}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("invite")}
            style={[
              styles.tabItem,
              activeTab === "invite"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="person-add"
              size={14}
              color={activeTab === "invite" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "invite" ? colors.onBrand : colors.primarytext },
              ]}
            >{t("manageStaff.searchAndInviteTab")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("pending")}
            style={[
              styles.tabItem,
              activeTab === "pending"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="mail-unread"
              size={14}
              color={activeTab === "pending" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "pending" ? colors.onBrand : colors.primarytext },
              ]}
            >{t("manageStaff.pendingTab")} ({pendingInvites.length})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("still_to_send")}
            style={[
              styles.tabItem,
              activeTab === "still_to_send"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeTab === "still_to_send" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "still_to_send" ? colors.onBrand : colors.primarytext },
              ]}
            >{t("manageStaff.draftsTab")} ({stillToSendInvites.length})</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* TAB 1: ACTIVE STAFF */}
        {activeTab === "active" && (
          <View style={{ gap: 14 }}>
            {/* Quick Summary Telemetry Strip */}
            <View
              style={[
                styles.telemetryCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryCell}>
                  <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                    {staffList.length}
                  </Text>
                  <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                    Total Stylists
                  </Text>
                </View>

                <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

                <View style={styles.telemetryCell}>
                  <Text style={[styles.telemetryValue, { color: colors.success }]}>
                    {activeCount}
                  </Text>
                  <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                    {t("manageStaff.activeOnDuty") || "Active On Duty"}
                  </Text>
                </View>

                <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

                <View style={styles.telemetryCell}>
                  <Text style={[styles.telemetryValue, { color: "#EF4444" }]}>
                    {suspendedCount}
                  </Text>
                  <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                    Suspended
                  </Text>
                </View>

                <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

                <View style={styles.telemetryCell}>
                  <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                    {pendingInvites.length}
                  </Text>
                  <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                    Invites Sent
                  </Text>
                </View>
              </View>
            </View>

            {/* Staff Search Input */}
            <View
              style={[
                styles.searchBox,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={17} color={colors.secondarytext} />
              <TextInput
                style={[styles.searchInput, { color: colors.primarytext }]}
                placeholder={t("manageStaff.searchStaffPlaceholder") || "Search staff by name or specialty..."}
                placeholderTextColor={colors.secondarytext}
                value={activeStaffSearch}
                onChangeText={setActiveStaffSearch}
              />
              {activeStaffSearch.length > 0 && (
                <TouchableOpacity onPress={() => setActiveStaffSearch("")}>
                  <Ionicons name="close-circle" size={16} color={colors.secondarytext} />
                </TouchableOpacity>
              )}
            </View>

            {/* Staff Members List */}
            {isLoading ? (
              <View style={{ gap: 12 }}>
                <BarberCardSkeleton />
                <BarberCardSkeleton />
              </View>
            ) : filteredStaff.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="people-outline" size={40} color={colors.secondarytext} />
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  {t("manageStaff.noStaffFound") || "No Staff Members Found"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  {activeStaffSearch
                    ? `No staff matches "${activeStaffSearch}".`
                    : "No staff barbers registered under your salon yet."}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setActiveTab("invite")}
                  style={[styles.emptyCTA, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="person-add" size={16} color={colors.onBrand} />
                  <Text style={[styles.emptyCTAText, { color: colors.onBrand }]}>
                    {t("manageStaff.inviteFirstStylist") || "Invite Your First Stylist"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 12 }}>
                {filteredStaff.map((member) => {
                  const statusColor = getStatusColor(member.status);
                  const isSuspended = member.status === "Suspended";

                  return (
                    <View
                      key={member.id}
                      style={[
                        styles.staffCard,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isSuspended ? "rgba(239, 68, 68, 0.4)" : colors.border,
                        },
                      ]}
                    >
                      {/* Avatar with Status Dot */}
                      <View style={styles.staffAvatarWrap}>
                        <Image source={profilePic} style={styles.staffAvatarImg} />
                        <View
                          style={[
                            styles.avatarStatusDot,
                            { backgroundColor: statusColor, borderColor: colors.surface },
                          ]}
                        />
                      </View>

                      {/* Info */}
                      <View style={{ flex: 1 }}>
                        <View style={styles.nameStatusRow}>
                          <Text
                            style={[styles.staffNameText, { color: colors.primarytext }]}
                            numberOfLines={1}
                          >
                            {member.name}
                          </Text>

                          <View
                            style={[
                              styles.statusBadge,
                              {
                                backgroundColor: isSuspended
                                  ? "rgba(239, 68, 68, 0.12)"
                                  : "rgba(34, 197, 94, 0.12)",
                                borderColor: isSuspended
                                  ? "rgba(239, 68, 68, 0.3)"
                                  : "rgba(34, 197, 94, 0.3)",
                              },
                            ]}
                          >
                            <View style={[styles.statusBadgeDot, { backgroundColor: statusColor }]} />
                            <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                              {member.status}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.staffRoleText, { color: colors.secondarytext }]}>
                          {member.role || "Salon Stylist"}
                        </Text>
                        {member.phone && (
                          <Text style={[styles.staffPhoneText, { color: colors.secondarytext }]}>
                            {member.phone}
                          </Text>
                        )}
                      </View>

                      {/* Action Triggers */}
                      <View style={styles.staffActionsCol}>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            setSelectedStaff(member);
                            setStatusModalVisible(true);
                          }}
                          style={[
                            styles.actionIconBtn,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                        >
                          <Ionicons name="options-outline" size={16} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => handleRemoveStaff(member)}
                          style={[
                            styles.actionIconBtn,
                            {
                              backgroundColor: "rgba(239, 68, 68, 0.1)",
                              borderColor: "rgba(239, 68, 68, 0.25)",
                            },
                          ]}
                        >
                          <Ionicons name="trash-outline" size={16} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* TAB 2: INCOMING JOIN REQUESTS */}
        {activeTab === "requests" && (
          <View style={{ gap: 14 }}>
            {joinRequests.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="people-outline" size={40} color={colors.secondarytext} />
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>{t("manageStaff.noPendingJoinRequests")}</Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>{t("manageStaff.noPendingJoinRequestsDesc", { email: user?.email || "" })}</Text>
              </View>
            ) : (
              joinRequests.map((req) => (
                <View
                  key={req.id}
                  style={[
                    styles.joinRequestCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.joinRequestHeader}>
                    <View
                      style={[
                        styles.avatarWrap,
                        { backgroundColor: colors.card, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="cut" size={18} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.joinRequestName, { color: colors.primarytext }]}>
                          {req.name}
                        </Text>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: colors.card, borderColor: colors.border },
                          ]}
                        >
                          <Text style={[styles.roleBadgeText, { color: colors.primary }]}>
                            {req.role || "Barber"}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.joinRequestEmail, { color: colors.secondarytext }]}>
                        {req.email || "No email provided"}
                      </Text>
                      {req.phone ? (
                        <Text style={[styles.joinRequestPhone, { color: colors.secondarytext }]}>
                          {req.phone}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.joinRequestActions}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      disabled={isRespondingToRequest === req.id}
                      onPress={() => handleRespondJoinRequest(req.id, "reject")}
                      style={[
                        styles.requestDeclineBtn,
                        {
                          borderColor: "rgba(239, 68, 68, 0.4)",
                          backgroundColor: "rgba(239, 68, 68, 0.08)",
                        },
                      ]}
                    >
                      {isRespondingToRequest === req.id ? (
                        <ActivityIndicator size="small" color="#EF4444" />
                      ) : (
                        <>
                          <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                          <Text style={styles.requestDeclineText}>{t("manageStaff.decline")}</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isRespondingToRequest === req.id}
                      onPress={() => handleRespondJoinRequest(req.id, "accept")}
                      style={[styles.requestAcceptBtn, { backgroundColor: colors.primary }]}
                    >
                      {isRespondingToRequest === req.id ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <>
                          <Ionicons name="checkmark-circle" size={16} color={colors.onBrand} />
                          <Text style={[styles.requestAcceptText, { color: colors.onBrand }]}>{t("manageStaff.acceptToFloor")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 3: SEARCH & INVITE */}
        {activeTab === "invite" && (
          <View style={{ gap: 14 }}>
            {/* Step 1: Select Stylist */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.formCardHeader}>
                <Ionicons name="search-outline" size={18} color={colors.primary} />
                <Text style={[styles.formCardTitle, { color: colors.primarytext }]}>
                  {t("manageStaff.findRegisteredBarber") || "Find Registered Barber or Client"}
                </Text>
              </View>
              <Text style={[styles.formCardSubtitle, { color: colors.secondarytext }]}>
                {t("manageStaff.searchUserBaseDesc") || "Search our registered Trimly user base to send an official salon staff invitation."}
              </Text>

              <View
                style={[
                  styles.searchBox,
                  { backgroundColor: colors.background, borderColor: colors.border, marginTop: 10 },
                ]}
              >
                <Ionicons name="search" size={17} color={colors.secondarytext} />
                <TextInput
                  style={[styles.searchInput, { color: colors.primarytext }]}
                  placeholder={t("manageStaff.searchInvitePlaceholder") || "Search by name, email, or phone..."}
                  placeholderTextColor={colors.secondarytext}
                  value={clientSearchQuery}
                  onChangeText={handleSearchClients}
                />
              </View>

              {/* Directory Results */}
              {clientsDirectory.length > 0 && (
                <View style={styles.directoryResultsList}>
                  {clientsDirectory.slice(0, 5).map((client) => {
                    const isSelected = selectedClient?.id === client.id;
                    return (
                      <TouchableOpacity
                        key={client.id}
                        activeOpacity={0.8}
                        onPress={() => setSelectedClient(client)}
                        style={[
                          styles.directoryItem,
                          {
                            backgroundColor: isSelected
                              ? "rgba(199, 243, 107, 0.12)"
                              : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <View style={styles.dirAvatarWrap}>
                          <Image source={profilePic} style={styles.dirAvatarImg} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.dirClientName, { color: colors.primarytext }]}>
                            {client.name}
                          </Text>
                          <Text style={[styles.dirClientEmail, { color: colors.secondarytext }]}>
                            {client.email}
                          </Text>
                        </View>
                        {isSelected && (
                          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Step 2: Assign Specialty Role */}
            {selectedClient && (
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.formCardHeader}>
                  <Ionicons name="ribbon-outline" size={18} color={colors.primary} />
                  <Text style={[styles.formCardTitle, { color: colors.primarytext }]}>
                    Assign Staff Title for {selectedClient.name}
                  </Text>
                </View>

                <View style={styles.rolesGrid}>
                  {ROLES.map((role) => {
                    const isSelected = staffRole === role.label;
                    return (
                      <TouchableOpacity
                        key={role.label}
                        activeOpacity={0.8}
                        onPress={() => setStaffRole(role.label)}
                        style={[
                          styles.roleChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name={role.icon}
                          size={15}
                          color={isSelected ? colors.onBrand : colors.primary}
                        />
                        <Text
                          style={[
                            styles.roleChipText,
                            { color: isSelected ? colors.onBrand : colors.primarytext },
                          ]}
                        >
                          {role.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Actions: Send or Save as Draft */}
                <View style={styles.inviteActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    disabled={isInviting}
                    onPress={() => handleSendInvite(true)}
                    style={[
                      styles.draftInviteBtn,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="time-outline" size={16} color={colors.primarytext} />
                    <Text style={[styles.draftInviteBtnText, { color: colors.primarytext }]}>
                      {t("manageStaff.saveDraft") || "Save Draft"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    disabled={isInviting}
                    onPress={() => handleSendInvite(false)}
                    style={[styles.sendInviteCTA, { backgroundColor: colors.primary }]}
                  >
                    {isInviting ? (
                      <ActivityIndicator size="small" color={colors.onBrand} />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={16} color={colors.onBrand} />
                        <Text style={[styles.sendInviteCTAText, { color: colors.onBrand }]}>
                          Send Official Invite
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* TAB 3: PENDING INVITATIONS */}
        {activeTab === "pending" && (
          <View style={{ gap: 14 }}>
            {pendingInvites.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="mail-open-outline" size={40} color={colors.secondarytext} />
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  {t("manageStaff.noPendingInvites") || "No Pending Invites"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  {t("manageStaff.allStaffResolved") || "All sent staff invitations have been resolved or accepted."}
                </Text>
              </View>
            ) : (
              pendingInvites.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.inviteCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteClientName, { color: colors.primarytext }]}>
                      {inv.clientName || inv.clientEmail}
                    </Text>
                    <Text style={[styles.inviteRoleText, { color: colors.secondarytext }]}>
                      Role: {inv.role || "Stylist"}
                    </Text>
                    <Text style={[styles.inviteStatusBadgeText, { color: "#F59E0B" }]}>
                      {t("manageStaff.pendingStylistAcceptance") || "Pending Stylist Acceptance"}
                    </Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCancelInvite(inv.id, inv.clientName || "Stylist")}
                    style={[
                      styles.revokeBtn,
                      {
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderColor: "rgba(239, 68, 68, 0.3)",
                      },
                    ]}
                  >
                    <Text style={styles.revokeBtnText}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: STILL TO SEND / DRAFTS */}
        {activeTab === "still_to_send" && (
          <View style={{ gap: 14 }}>
            {stillToSendInvites.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="document-text-outline" size={40} color={colors.secondarytext} />
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  No Saved Drafts
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  {t("manageStaff.noUnissuedDrafts") || "You don't have any unissued draft invitations pending."}
                </Text>
              </View>
            ) : (
              stillToSendInvites.map((draft) => (
                <View
                  key={draft.id}
                  style={[
                    styles.inviteCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inviteClientName, { color: colors.primarytext }]}>
                      {draft.clientName}
                    </Text>
                    <Text style={[styles.inviteRoleText, { color: colors.secondarytext }]}>
                      Role: {draft.role || "Stylist"}
                    </Text>
                    <Text style={[styles.inviteStatusBadgeText, { color: colors.primary }]}>
                      {t("manageStaff.draftStillToSend") || "Draft • Still to Send"}
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDeleteDraft(draft)}
                      style={[
                        styles.revokeBtn,
                        {
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleSendDraftNow(draft)}
                      style={[styles.sendNowBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={[styles.sendNowBtnText, { color: colors.onBrand }]}>
                        Send Now
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* STAFF STATUS MODAL (Active, Suspended, On Break, Off Duty) */}
      <CustomModal
        visible={statusModalVisible}
        onClose={() => {
          setStatusModalVisible(false);
          setSelectedStaff(null);
        }}
        title={selectedStaff?.name || "Staff Duty Status"}
        description={t("manageStaff.floorStatusDesc") || "Select the operational floor status for this staff member."}
        scrollable={false}
      >
        {selectedStaff && (
          <View style={styles.statusModalBody}>
            {(["Active", "Suspended", "On Break", "Off Duty"] as const).map((st) => {
              const isCurrent = selectedStaff.status === st;
              const col = getStatusColor(st);
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.8}
                  onPress={() => handleToggleStatus(selectedStaff, st)}
                  style={[
                    styles.statusModalOption,
                    {
                      backgroundColor: isCurrent ? "rgba(199, 243, 107, 0.12)" : colors.background,
                      borderColor: isCurrent ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.statusOptionDot, { backgroundColor: col }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statusOptionTitle, { color: colors.primarytext }]}>
                      {st}
                    </Text>
                    <Text style={[styles.statusOptionDesc, { color: colors.secondarytext }]}>
                      {st === "Active"
                        ? "Stylist is taking bookings and active on chair."
                        : st === "Suspended"
                        ? "Temporarily paused from accepting bookings."
                        : st === "On Break"
                        ? "Midday pause or temporary meal break."
                        : "Offline and not available for walk-ins."}
                    </Text>
                  </View>
                  {isCurrent && (
                    <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </CustomModal>

      {/* Tutorial Modal */}
      <PageTutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        screenKey="manage_staff"
        title={MANAGE_STAFF_TUTORIAL.title}
        subtitle={MANAGE_STAFF_TUTORIAL.subtitle}
        steps={MANAGE_STAFF_TUTORIAL.steps}
      />
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
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerCircleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  tabContainer: {
    borderBottomWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  tabTrack: {
    flexDirection: "row",
    gap: 8,
  },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  tabText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  telemetryCard: {
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  telemetryGrid: {
    flexDirection: "row",
    alignItems: "center",
  },
  telemetryCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  telemetryDivider: {
    width: 1,
    height: 28,
  },
  telemetryValue: {
    fontSize: 15,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 10,
    fontFamily: FontFamily.medium,
    textAlign: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  emptyStateCard: {
    padding: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 12.5,
    fontFamily: FontFamily.regular,
    textAlign: "center",
  },
  emptyCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  emptyCTAText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  staffAvatarWrap: {
    position: "relative",
  },
  staffAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarStatusDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  nameStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  staffNameText: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  staffRoleText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginTop: 2,
  },
  staffPhoneText: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  staffActionsCol: {
    gap: 6,
  },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  formCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  formCardTitle: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  formCardSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
  },
  directoryResultsList: {
    gap: 8,
    marginTop: 8,
  },
  directoryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  dirAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: "hidden",
  },
  dirAvatarImg: {
    width: "100%",
    height: "100%",
  },
  dirClientName: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  dirClientEmail: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
  },
  rolesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  roleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  roleChipText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  inviteActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  draftInviteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
  },
  draftInviteBtnText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  sendInviteCTA: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 12,
  },
  sendInviteCTAText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  inviteCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
  },
  inviteClientName: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  inviteRoleText: {
    fontSize: 12,
    fontFamily: FontFamily.medium,
    marginBottom: 2,
  },
  inviteStatusBadgeText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  revokeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  revokeBtnText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    color: "#EF4444",
  },
  sendNowBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  sendNowBtnText: {
    fontSize: 11.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  statusModalBody: {
    gap: 8,
    paddingVertical: 8,
  },
  statusModalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusOptionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionTitle: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    marginBottom: 2,
  },
  statusOptionDesc: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
  },
  tabBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    marginLeft: 2,
  },
  tabBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "800",
  },
  joinRequestCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  joinRequestHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  joinRequestName: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  joinRequestEmail: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
  },
  joinRequestPhone: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    marginTop: 1,
  },
  joinRequestActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  requestDeclineBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  requestDeclineText: {
    fontSize: 12.5,
    fontFamily: FontFamily.semiBold,
    color: "#EF4444",
    fontWeight: "600",
  },
  requestAcceptBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  requestAcceptText: {
    fontSize: 12.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});
