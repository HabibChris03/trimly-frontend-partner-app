import { BarberCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { MANAGE_STAFF_TUTORIAL } from "@/constants/barberTutorials";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
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
  status: "Active" | "Off Duty" | "On Break";
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
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const themeImages = useThemeImages();
  const profilePic = themeImages.profilePic;
  const { user } = useAuth();
  const { showToast } = useToast();

  const salonId = user?.id || 4;
  const salonName = user?.name ? `${user.name}'s Salon` : "Trimly VIP Lounge";

  // Navigation Tab State (Search & Invite, Active, Pending, Still To Send)
  const [activeTab, setActiveTab] = useState<"invite" | "active" | "pending" | "still_to_send">("invite");

  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [stillToSendInvites, setStillToSendInvites] = useState<any[]>([]);
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
      const [apiStaff, clients, allInvites] = await Promise.all([
        barberService.listSalonStaff(salonId).catch(() => []),
        barberService.searchClients("").catch(() => []),
        barberService.listSalonInvites(salonId).catch(() => []),
      ]);

      const rawInvites = Array.isArray(allInvites) ? allInvites : [];
      const pending = rawInvites.filter((i: any) => i.rawStatus === "pending" || i.status === "Pending");
      const drafts = rawInvites.filter((i: any) => i.rawStatus === "still_to_send" || i.status === "Still To Send");
      const activeFromInvites = rawInvites.filter((i: any) => i.rawStatus === "active" || i.status === "Active");

      const baseStaff = Array.isArray(apiStaff) ? apiStaff : [];
      // Combine registered staff and any stylists who accepted their invite in the DB
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
      setClientsDirectory(Array.isArray(clients) ? clients : []);
    } catch (err) {
      console.log("[ManageStaff] Error loading staff/invites:", err);
    }
  }, [salonId]);

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
    showToast("Staff directory & invites updated from database.", "info");
  }, [fetchStaffAndClients, showToast]);

  const handleSearchClients = async (query: string) => {
    setClientSearchQuery(query);
    const results = await barberService.searchClients(query);
    setClientsDirectory(results);
  };

  const handleSendInvite = async (isDraft: boolean = false) => {
    if (!selectedClient) {
      showToast("Please select a registered client first.", "warning");
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
        showToast(`Invitation for ${selectedClient.name} saved to drafts (Still to Send).`, "success");
        setSelectedClient(null);
        setClientSearchQuery("");
        setActiveTab("still_to_send");
      } else {
        setPendingInvites((prev) => [invite, ...prev]);
        showToast(`Invitation sent to ${selectedClient.name}! Once accepted, their profile will display "${salonName} Barber".`, "success");
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
      `Are you sure you want to remove ${member.name} from ${salonName}? They will revert to a standard client profile.`,
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
        return "#10B981";
      case "On Break":
        return "#F59E0B";
      case "Off Duty":
        return "#6B7280";
      default:
        return "#10B981";
    }
  };

  const filteredStaff = staffList.filter(
    (s) =>
      s.name.toLowerCase().includes(activeStaffSearch.toLowerCase()) ||
      (s.role && s.role.toLowerCase().includes(activeStaffSearch.toLowerCase()))
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "bottom"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.surface }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("manageStaff.title")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {salonName} • {staffList.length} {t("manageStaff.totalMembers", { count: staffList.length })}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setTutorialVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="help-circle-outline" size={19} color={colors.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onRefresh}
            style={[styles.headerBtn, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Segmented Top Navigation */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tabTrack,
            { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("invite")}
            style={[
              styles.tabItem,
              activeTab === "invite" && [styles.tabItemActive, { backgroundColor: colors.primary }],
            ]}
          >
            <Ionicons
              name="person-add"
              size={14}
              color={activeTab === "invite" ? "#1C1E1B" : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "invite" ? "#1C1E1B" : colors.secondarytext },
              ]}
            >
              {t("manageStaff.searchAndInviteTab")}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("active")}
            style={[
              styles.tabItem,
              activeTab === "active" && [styles.tabItemActive, { backgroundColor: colors.primary }],
            ]}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeTab === "active" ? "#1C1E1B" : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "active" ? "#1C1E1B" : colors.secondarytext },
              ]}
            >
              {t("manageStaff.activeStaffTab")} ({staffList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("pending")}
            style={[
              styles.tabItem,
              activeTab === "pending" && [styles.tabItemActive, { backgroundColor: colors.primary }],
            ]}
          >
            <Ionicons
              name="mail-unread"
              size={14}
              color={activeTab === "pending" ? "#1C1E1B" : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "pending" ? "#1C1E1B" : colors.secondarytext },
              ]}
            >
              {t("manageStaff.invitationsTab")} ({pendingInvites.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setActiveTab("still_to_send")}
            style={[
              styles.tabItem,
              activeTab === "still_to_send" && [styles.tabItemActive, { backgroundColor: colors.primary }],
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={activeTab === "still_to_send" ? "#1C1E1B" : colors.secondarytext}
            />
            <Text
              style={[
                styles.tabText,
                { color: activeTab === "still_to_send" ? "#1C1E1B" : colors.secondarytext },
              ]}
            >
              {t("manageStaff.stillToSendTab")} ({stillToSendInvites.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* TAB 1: SEARCH & INVITE CLIENTS */}
        {activeTab === "invite" && (
          <View style={{ gap: 16 }}>
            {/* Info Banner */}
            <View
              style={[
                styles.infoCard,
                { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}35` },
              ]}
            >
              <View style={[styles.infoIconCircle, { backgroundColor: `${colors.primary}25` }]}>
                <Ionicons name="sparkles" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoTitle, { color: colors.primary }]}>
                  {t("manageStaff.inviteStylistBannerTitle")}
                </Text>
                <Text style={[styles.infoText, { color: colors.secondarytext }]}>
                  {t("manageStaff.inviteStylistBannerSub", { salonName })}
                </Text>
              </View>
            </View>

            {/* Selected Client & Role Configuration Card */}
            {selectedClient && (
              <View
                style={[
                  styles.configureInviteCard,
                  { backgroundColor: colors.surface, borderColor: colors.primary },
                ]}
              >
                <View style={styles.selectedClientHeader}>
                  <View style={styles.selectedClientAvatar}>
                    <Text style={[styles.selectedClientAvatarText, { color: colors.primary }]}>
                      {selectedClient.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.selectedClientName, { color: colors.primarytext }]}>
                      {selectedClient.name}
                    </Text>
                    <Text style={[styles.selectedClientMeta, { color: colors.secondarytext }]}>
                      {selectedClient.email} • {selectedClient.phone || "No phone"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setSelectedClient(null)}
                    style={styles.closeSelectedBtn}
                  >
                    <Ionicons name="close-circle" size={22} color={colors.secondarytext} />
                  </TouchableOpacity>
                </View>

                {/* Role Picker Section */}
                <View style={{ marginTop: 12 }}>
                  <Text style={[styles.sectionHeading, { color: colors.primarytext }]}>
                    {t("manageStaff.selectRole")}
                  </Text>
                  <View style={styles.rolesGrid}>
                    {ROLES.map((r) => {
                      const isSelected = staffRole === r.label;
                      return (
                        <TouchableOpacity
                          key={r.label}
                          activeOpacity={0.8}
                          onPress={() => setStaffRole(r.label)}
                          style={[
                            styles.roleCard,
                            {
                              backgroundColor: isSelected ? `${colors.primary}20` : colors.background,
                              borderColor: isSelected ? colors.primary : colors.surfacevariant,
                            },
                          ]}
                        >
                          <Ionicons
                            name={r.icon}
                            size={16}
                            color={isSelected ? colors.primary : colors.secondarytext}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.roleCardTitle,
                                { color: isSelected ? colors.primary : colors.primarytext },
                              ]}
                            >
                              {r.label}
                            </Text>
                            <Text
                              style={[
                                styles.roleCardDesc,
                                { color: colors.secondarytext },
                              ]}
                            >
                              {r.desc}
                            </Text>
                          </View>
                          {isSelected && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Action Buttons: Save as Draft vs Send Official Invite */}
                <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleSendInvite(true)}
                    disabled={isInviting}
                    style={[
                      styles.secondaryActionBtn,
                      {
                        flex: 1,
                        backgroundColor: colors.background,
                        borderColor: colors.surfacevariant,
                      },
                    ]}
                  >
                    <Ionicons name="time-outline" size={15} color={colors.primarytext} />
                    <Text style={[styles.secondaryActionBtnText, { color: colors.primarytext }]}>
                      {t("manageStaff.saveAsDraft")}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => handleSendInvite(false)}
                    disabled={isInviting}
                    style={[
                      styles.primaryActionBtn,
                      {
                        flex: 1.4,
                        backgroundColor: colors.primary,
                        marginTop: 0,
                      },
                    ]}
                  >
                    {isInviting ? (
                      <ActivityIndicator size="small" color="#1C1E1B" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={15} color="#1C1E1B" />
                        <Text style={styles.primaryActionBtnText}>
                          {t("manageStaff.sendInviteNow")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Client Search Bar */}
            <View style={{ gap: 8 }}>
              <Text style={[styles.sectionHeading, { color: colors.primarytext }]}>
                {t("manageStaff.findClientToInvite")}
              </Text>
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
                  placeholder={t("manageStaff.searchClientPlaceholder")}
                  placeholderTextColor={colors.secondarytext}
                  value={clientSearchQuery}
                  onChangeText={handleSearchClients}
                  autoCapitalize="none"
                />
                {clientSearchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => handleSearchClients("")}>
                    <Ionicons name="close-circle" size={18} color={colors.secondarytext} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Client Directory Results */}
            <View style={{ gap: 10 }}>
              <Text style={[styles.subSectionTitle, { color: colors.secondarytext }]}>
                {clientSearchQuery.trim() ? t("manageStaff.searchResultsHeading") : t("manageStaff.directoryHeading")}
              </Text>

              {clientsDirectory.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
                  <Ionicons name="person-remove-outline" size={28} color={colors.secondarytext} />
                  <Text style={[styles.emptyBoxTitle, { color: colors.primarytext }]}>
                    {clientSearchQuery.trim() ? t("manageStaff.noClientsFound") : t("manageStaff.noClientsYet")}
                  </Text>
                  <Text style={[styles.emptyBoxSubtitle, { color: colors.secondarytext }]}>
                    {clientSearchQuery.trim()
                      ? t("manageStaff.noClientsFoundSub", { query: clientSearchQuery })
                      : t("manageStaff.noClientsYetSub")}
                  </Text>
                </View>
              ) : (
                clientsDirectory.map((client) => {
                  const isSelected = selectedClient?.id === client.id;
                  const isAlreadyStaff = staffList.some(
                    (s) => s.id === client.id || s.name.toLowerCase() === client.name.toLowerCase()
                  );
                  const isPending = pendingInvites.some(
                    (inv) => inv.clientId === client.id || inv.clientEmail === client.email
                  );

                  return (
                    <TouchableOpacity
                      key={client.id}
                      activeOpacity={0.85}
                      onPress={() => {
                        if (isAlreadyStaff) {
                          showToast(`${client.name} is already a staff barber.`, "info");
                          return;
                        }
                        if (isPending) {
                          showToast(`Invitation already pending for ${client.name}.`, "info");
                          return;
                        }
                        setSelectedClient(client);
                      }}
                      style={[
                        styles.clientCard,
                        {
                          backgroundColor: isSelected ? `${colors.primary}15` : colors.surface,
                          borderColor: isSelected
                            ? colors.primary
                            : isPending
                            ? "rgba(245, 158, 11, 0.4)"
                            : colors.surfacevariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.clientAvatar,
                          {
                            backgroundColor: isSelected
                              ? `${colors.primary}30`
                              : isPending
                              ? "rgba(245, 158, 11, 0.15)"
                              : colors.background,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.clientAvatarText,
                            {
                              color: isSelected
                                ? colors.primary
                                : isPending
                                ? "#F59E0B"
                                : colors.primarytext,
                            },
                          ]}
                        >
                          {client.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>

                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={[styles.clientCardName, { color: colors.primarytext }]}>
                          {client.name}
                        </Text>
                        <Text style={[styles.clientCardEmail, { color: colors.secondarytext }]}>
                          {client.email}
                        </Text>
                        {client.phone && (
                          <Text style={[styles.clientCardPhone, { color: colors.secondarytext }]}>
                            📞 {client.phone}
                          </Text>
                        )}
                      </View>

                      {isAlreadyStaff ? (
                        <View style={styles.badgeAlreadyStaff}>
                          <Text style={styles.badgeAlreadyStaffText}>Staff</Text>
                        </View>
                      ) : isPending ? (
                        <View style={styles.badgePendingInvite}>
                          <Text style={styles.badgePendingInviteText}>Invited</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.actionPill,
                            {
                              backgroundColor: isSelected ? colors.primary : `${colors.primary}18`,
                            },
                          ]}
                        >
                          <Ionicons
                            name={isSelected ? "checkmark" : "add"}
                            size={14}
                            color={isSelected ? "#1C1E1B" : colors.primary}
                          />
                          <Text
                            style={[
                              styles.actionPillText,
                              { color: isSelected ? "#1C1E1B" : colors.primary },
                            ]}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* TAB 2: ACTIVE SALON STAFF */}
        {activeTab === "active" && (
          <View style={{ gap: 14 }}>
            {staffList.length > 0 && (
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
                  placeholder={t("manageStaff.searchStaff")}
                  placeholderTextColor={colors.secondarytext}
                  value={activeStaffSearch}
                  onChangeText={setActiveStaffSearch}
                />
              </View>
            )}

            {isLoading ? (
              <View style={{ gap: 12 }}>
                <BarberCardSkeleton />
                <BarberCardSkeleton />
              </View>
            ) : filteredStaff.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
                  ]}
                >
                  <Ionicons name="people-outline" size={34} color={colors.secondarytext} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  {staffList.length === 0 ? "No active stylists yet" : "No matching stylists"}
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  {staffList.length === 0
                    ? `Invite registered clients to join ${salonName}. Once accepted, they will appear here.`
                    : `No stylist found matching "${activeStaffSearch}".`}
                </Text>

                {staffList.length === 0 && (
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setActiveTab("invite")}
                    style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                  >
                    <Ionicons name="person-add" size={16} color="#1C1E1B" />
                    <Text style={styles.primaryActionBtnText}>
                      Go to Search & Invite Clients
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.staffGrid}>
                {filteredStaff.map((member) => (
                  <TouchableOpacity
                    key={member.id}
                    activeOpacity={0.88}
                    onPress={() => {
                      setSelectedStaff(member);
                      setStatusModalVisible(true);
                    }}
                    style={[
                      styles.staffCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfacevariant,
                      },
                    ]}
                  >
                    <Image source={profilePic} style={styles.avatarImage} />

                    <View style={styles.staffInfo}>
                      <View style={styles.nameRow}>
                        <Text style={[styles.staffName, { color: colors.primarytext }]}>
                          {member.name}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: `${getStatusColor(member.status)}20` },
                          ]}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: getStatusColor(member.status) },
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusColor(member.status) },
                            ]}
                          >
                            {member.status === "Active"
                              ? t("manageStaff.statusActive")
                              : member.status === "On Break"
                              ? t("manageStaff.statusBreak")
                              : t("manageStaff.statusOffDuty")}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.staffRole, { color: colors.secondarytext }]}>
                        {member.role || "Salon Barber"}
                      </Text>

                      <View style={styles.metaRow}>
                        {member.phone && (
                          <View style={styles.metaItem}>
                            <Ionicons
                              name="call-outline"
                              size={12}
                              color={colors.secondarytext}
                            />
                            <Text style={[styles.metaText, { color: colors.secondarytext }]}>
                              {member.phone}
                            </Text>
                          </View>
                        )}
                        <View style={styles.metaItem}>
                          <Ionicons
                            name="cut-outline"
                            size={12}
                            color={colors.secondarytext}
                          />
                          <Text style={[styles.metaText, { color: colors.secondarytext }]}>
                            {salonName} Barber
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Ionicons
                      name="ellipsis-vertical"
                      size={18}
                      color={colors.secondarytext}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* TAB 3: PENDING INVITATIONS */}
        {activeTab === "pending" && (
          <View style={{ gap: 14 }}>
            {pendingInvites.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
                  ]}
                >
                  <Ionicons name="mail-outline" size={34} color={colors.secondarytext} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  No pending invitations
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  When you invite clients to become salon stylists, their pending invitation statuses will show here.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setActiveTab("invite")}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                >
                  <Ionicons name="person-add" size={16} color="#1C1E1B" />
                  <Text style={styles.primaryActionBtnText}>
                    Invite a Client Now
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              pendingInvites.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.pendingInviteCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: "rgba(245, 158, 11, 0.4)",
                    },
                  ]}
                >
                  <View style={styles.pendingInviteHeader}>
                    <View
                      style={[
                        styles.pendingAvatarCircle,
                        { backgroundColor: "rgba(245, 158, 11, 0.15)" },
                      ]}
                    >
                      <Ionicons name="mail-unread" size={20} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingClientName, { color: colors.primarytext }]}>
                        {inv.clientName}
                      </Text>
                      <Text style={[styles.pendingClientMeta, { color: colors.secondarytext }]}>
                        {inv.clientEmail} {inv.clientPhone ? `• ${inv.clientPhone}` : ""}
                      </Text>
                    </View>
                    <View style={styles.badgePendingPill}>
                      <Text style={styles.badgePendingPillText}>Pending</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.pendingInviteDetails,
                      { backgroundColor: colors.background, borderColor: colors.surfacevariant },
                    ]}
                  >
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.secondarytext }]}>
                        Assigned Role:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.primary }]}>
                        {inv.role || "Barber"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.secondarytext }]}>
                        Affiliation on Accept:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.primarytext }]}>
                        {inv.salonName} Barber
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCancelInvite(inv.id, inv.clientName)}
                    style={[
                      styles.revokeBtn,
                      { borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.08)" },
                    ]}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                    <Text style={styles.revokeBtnText}>{t("manageStaff.revokeInvite")}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 4: STILL TO SEND (DRAFTS STORED IN DB) */}
        {activeTab === "still_to_send" && (
          <View style={{ gap: 14 }}>
            {stillToSendInvites.length === 0 ? (
              <View style={styles.emptyState}>
                <View
                  style={[
                    styles.emptyIconCircle,
                    { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={34} color={colors.secondarytext} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                  No queued drafts
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
                  When you prepare invitations to send later, they are safely stored in your database and appear here.
                </Text>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => setActiveTab("invite")}
                  style={[styles.primaryActionBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
                >
                  <Ionicons name="person-add" size={16} color="#1C1E1B" />
                  <Text style={styles.primaryActionBtnText}>
                    Create an Invite Draft
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              stillToSendInvites.map((inv) => (
                <View
                  key={inv.id}
                  style={[
                    styles.pendingInviteCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: "rgba(163, 179, 156, 0.4)",
                    },
                  ]}
                >
                  <View style={styles.pendingInviteHeader}>
                    <View
                      style={[
                        styles.pendingAvatarCircle,
                        { backgroundColor: "rgba(163, 179, 156, 0.2)" },
                      ]}
                    >
                      <Ionicons name="time-outline" size={20} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pendingClientName, { color: colors.primarytext }]}>
                        {inv.clientName}
                      </Text>
                      <Text style={[styles.pendingClientMeta, { color: colors.secondarytext }]}>
                        {inv.clientEmail} {inv.clientPhone ? `• ${inv.clientPhone}` : ""}
                      </Text>
                    </View>
                    <View style={[styles.badgePendingPill, { backgroundColor: "rgba(163, 179, 156, 0.2)" }]}>
                      <Text style={[styles.badgePendingPillText, { color: colors.primary }]}>Still to Send</Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.pendingInviteDetails,
                      { backgroundColor: colors.background, borderColor: colors.surfacevariant },
                    ]}
                  >
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.secondarytext }]}>
                        Configured Role:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.primary }]}>
                        {inv.role || "Barber"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={[styles.detailLabel, { color: colors.secondarytext }]}>
                        Status:
                      </Text>
                      <Text style={[styles.detailValue, { color: colors.primarytext }]}>
                        Saved in Database (Draft)
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleSendDraftNow(inv)}
                      style={[
                        styles.sendDraftNowBtn,
                        { backgroundColor: colors.primary, flex: 1.3 },
                      ]}
                    >
                      <Ionicons name="paper-plane" size={15} color="#1C1E1B" />
                      <Text style={styles.sendDraftNowBtnText}>{t("manageStaff.sendOfficialInvite")}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleDeleteDraft(inv)}
                      style={[
                        styles.revokeBtn,
                        { flex: 1, borderColor: "rgba(239, 68, 68, 0.3)", backgroundColor: "rgba(239, 68, 68, 0.08)" },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      <Text style={styles.revokeBtnText}>{t("manageStaff.deleteDraft")}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Staff Options Modal (Status toggle / Removal) */}
      <CustomModal
        visible={statusModalVisible}
        title={selectedStaff?.name || "Staff Member Options"}
        onClose={() => {
          setStatusModalVisible(false);
          setSelectedStaff(null);
        }}
      >
        {selectedStaff && (
          <View style={{ gap: 12, paddingTop: 4 }}>
            <Text style={[styles.modalSubHeader, { color: colors.secondarytext }]}>
              Current Role: <Text style={{ color: colors.primarytext, fontWeight: "700" }}>{selectedStaff.role}</Text>
            </Text>

            <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
              {t("manageStaff.changeWorkStatus")}
            </Text>

            {(["Active", "On Break", "Off Duty"] as const).map((st) => {
              const isCurrent = selectedStaff.status === st;
              return (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.8}
                  onPress={() => handleToggleStatus(selectedStaff, st)}
                  style={[
                    styles.statusOptionRow,
                    {
                      backgroundColor: isCurrent ? `${getStatusColor(st)}18` : colors.background,
                      borderColor: isCurrent ? getStatusColor(st) : colors.surfacevariant,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusDotLarge,
                      { backgroundColor: getStatusColor(st) },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusOptionText,
                      { color: isCurrent ? getStatusColor(st) : colors.primarytext },
                    ]}
                  >
                    {st === "Active"
                      ? t("manageStaff.statusActive")
                      : st === "On Break"
                      ? t("manageStaff.statusBreak")
                      : t("manageStaff.statusOffDuty")}
                  </Text>
                  {isCurrent && (
                    <Ionicons name="checkmark" size={18} color={getStatusColor(st)} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => handleRemoveStaff(selectedStaff)}
              style={[
                styles.deleteOptionBtn,
                { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.3)" },
              ]}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={styles.deleteOptionBtnText}>
                {t("manageStaff.removeFromSalonTeam")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </CustomModal>

      {/* In-App Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="manage_staff"
        title={MANAGE_STAFF_TUTORIAL.title}
        subtitle={MANAGE_STAFF_TUTORIAL.subtitle}
        steps={MANAGE_STAFF_TUTORIAL.steps}
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        autoTrigger={true}
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
    paddingVertical: 12,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabContainer: {
    paddingHorizontal: 18,
    paddingBottom: 12,
  },
  tabTrack: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 12,
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  infoTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 3,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 17,
  },
  configureInviteCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 12,
  },
  selectedClientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  selectedClientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(163, 179, 156, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedClientAvatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: "700",
  },
  selectedClientMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  closeSelectedBtn: {
    padding: 4,
  },
  sectionHeading: {
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 4,
  },
  subSectionTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  rolesGrid: {
    gap: 8,
    marginTop: 6,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  roleCardTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  roleCardDesc: {
    fontSize: 11,
    marginTop: 1,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 24,
    marginTop: 4,
  },
  primaryActionBtnText: {
    color: "#1C1E1B",
    fontSize: 14,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 46,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },
  clientCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  clientAvatarText: {
    fontSize: 15,
    fontWeight: "700",
  },
  clientCardName: {
    fontSize: 14,
    fontWeight: "700",
  },
  clientCardEmail: {
    fontSize: 11.5,
  },
  clientCardPhone: {
    fontSize: 11,
    marginTop: 1,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionPillText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  badgeAlreadyStaff: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeAlreadyStaffText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  badgePendingInvite: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendingInviteText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  staffGrid: {
    gap: 12,
  },
  staffCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  staffInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  staffName: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  staffRole: {
    fontSize: 12.5,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11.5,
  },
  pendingInviteCard: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
  },
  pendingInviteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  pendingAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  pendingClientName: {
    fontSize: 14,
    fontWeight: "700",
  },
  pendingClientMeta: {
    fontSize: 11.5,
    marginTop: 1,
  },
  badgePendingPill: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgePendingPillText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "700",
  },
  pendingInviteDetails: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    fontSize: 11.5,
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  revokeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
  },
  revokeBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  secondaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  secondaryActionBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  sendDraftNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    borderRadius: 12,
  },
  sendDraftNowBtnText: {
    color: "#1C1E1B",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyBox: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 6,
  },
  emptyBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyBoxSubtitle: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 50,
    paddingHorizontal: 20,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 17,
  },
  modalSubHeader: {
    fontSize: 13,
    marginBottom: 4,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusOptionText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13.5,
    fontWeight: "700",
  },
  deleteOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 6,
  },
  deleteOptionBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },
});
