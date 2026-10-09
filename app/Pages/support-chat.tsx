import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import useColors from "@/hooks/usecolor";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  supportService,
  SupportTicketSummary,
  SupportChatMessage,
} from "@/services/supportService";

const CATEGORIES = [
  "App Bug / Glitch",
  "Booking Dispute",
  "Payout & Earnings",
  "Shop & Profile Setup",
  "General Inquiry",
];

export default function SupportChatScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tickets, setTickets] = useState<SupportTicketSummary[]>([]);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);

  // New Ticket Modal State
  const [showNewModal, setShowNewModal] = useState(false);
  const [newCategory, setNewCategory] = useState(CATEGORIES[0]);
  const [newSubject, setNewSubject] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Load User's Tickets
  const loadTickets = useCallback(async (selectFirst = true) => {
    try {
      const data = await supportService.getMyTickets();
      setTickets(data);
      if (selectFirst && data.length > 0 && !activeTicketId) {
        setActiveTicketId(data[0].id);
      }
    } catch {
      // Keep empty if network issue
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [activeTicketId]);

  // Load Messages for Active Ticket
  const loadMessages = useCallback(async (ticketId: string, isSilent = false) => {
    if (!ticketId) return;
    try {
      const res = await supportService.getTicketDetails(ticketId);
      if (res && res.messages) {
        setMessages(res.messages);
      }
    } catch {
      if (!isSilent) {
        showToast("Could not load message history.", "error");
      }
    }
  }, [showToast]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    if (activeTicketId) {
      loadMessages(activeTicketId);
      // Auto-refresh chat thread every 4 seconds
      const timer = setInterval(() => {
        loadMessages(activeTicketId, true);
      }, 4000);
      return () => clearInterval(timer);
    } else {
      setMessages([]);
    }
  }, [activeTicketId, loadMessages]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTickets(false);
    if (activeTicketId) {
      await loadMessages(activeTicketId, true);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeTicketId || isSending) return;
    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    // Optimistic user message
    const optimisticMsg: SupportChatMessage = {
      id: `temp_${Date.now()}`,
      ticket_id: 0,
      sender_type: "user",
      sender_name: user?.name || "Partner",
      sender_role: user?.role || "barber",
      text: textToSend,
      created_at: "Just now",
      is_admin: false,
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      await supportService.sendTicketMessage(activeTicketId, textToSend);
      await loadMessages(activeTicketId, true);
      await loadTickets(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to send message.", "error");
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateTicket = async () => {
    if (!newSubject.trim() || !newMessage.trim()) {
      showToast("Please provide both a subject and an issue description.", "error");
      return;
    }
    setIsCreating(true);
    try {
      const res = await supportService.createTicket({
        subject: newSubject.trim(),
        message: newMessage.trim(),
        category: newCategory,
      });

      showToast("Issue report filed! Admin team will assist you.", "success");
      setShowNewModal(false);
      setNewSubject("");
      setNewMessage("");

      await loadTickets(false);
      if (res?.ticket?.id) {
        setActiveTicketId(res.ticket.id);
      }
    } catch (err: any) {
      showToast(err?.message || "Could not submit issue report.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const activeTicket = tickets.find((t) => t.id === activeTicketId);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.surfacevariant }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            Admin Support Chat
          </Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={[styles.headerSub, { color: colors.secondarytext }]}>
              {activeTicket ? `#${activeTicket.ticket_no} • ${activeTicket.category}` : "Operations Team • Online"}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowNewModal(true)}
          style={[styles.newTicketBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={16} color={colors.primarytext} />
          <Text style={[styles.newTicketBtnText, { color: colors.primarytext }]}>
            New Issue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Ticket Selector Tabs (if user has tickets) */}
      {tickets.length > 0 && (
        <View style={[styles.ticketTabsBar, { borderBottomColor: colors.border }]}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={tickets}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.ticketTabsList}
            renderItem={({ item }) => {
              const isSelected = item.id === activeTicketId;
              const isResolved = item.status === "resolved" || item.status === "closed";
              return (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setActiveTicketId(item.id)}
                  style={[
                    styles.ticketTab,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.surface,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.ticketTabText,
                      { color: isSelected ? colors.primarytext : colors.secondarytext },
                    ]}
                    numberOfLines={1}
                  >
                    {item.ticket_no}
                  </Text>
                  <View
                    style={[
                      styles.ticketStatusDot,
                      { backgroundColor: isResolved ? "#10B981" : "#F59E0B" },
                    ]}
                  />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Main Chat Body */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        style={styles.chatArea}
      >
        {isLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.secondarytext }]}>
              Connecting to support...
            </Text>
          </View>
        ) : tickets.length === 0 ? (
          /* Empty State: Prompt to report an issue */
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="chatbubbles" size={38} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              No Support Tickets Yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              Need assistance with payouts, clients, app bugs, or bookings? Chat directly with the Trimly administration team.
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setShowNewModal(true)}
              style={[styles.startReportBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={18} color={colors.primarytext} style={{ marginRight: 8 }} />
              <Text style={[styles.startReportText, { color: colors.primarytext }]}>
                Report an Issue / Start Chat
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Active Chat Thread */
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item, index) => item.id || `msg_${index}`}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            renderItem={({ item }) => {
              const isAdmin = item.is_admin || item.sender_type === "admin";
              return (
                <View
                  style={[
                    styles.messageBubbleWrap,
                    isAdmin ? styles.messageBubbleWrapLeft : styles.messageBubbleWrapRight,
                  ]}
                >
                  {isAdmin && (
                    <View style={[styles.adminAvatar, { backgroundColor: colors.primary }]}>
                      <Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <View
                    style={[
                      styles.messageBubble,
                      isAdmin
                        ? [
                            styles.adminBubble,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                            },
                          ]
                        : [
                            styles.userBubble,
                            { backgroundColor: colors.primary },
                          ],
                    ]}
                  >
                    <View style={styles.messageMetaRow}>
                      <Text
                        style={[
                          styles.senderNameText,
                          { color: isAdmin ? colors.primary : "#FFFFFF" },
                        ]}
                      >
                        {isAdmin ? "Trimly Admin Support" : "You"}
                      </Text>
                      <Text
                        style={[
                          styles.messageTimeText,
                          { color: isAdmin ? colors.secondarytext : "rgba(255,255,255,0.7)" },
                        ]}
                      >
                        {item.created_at}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.messageBodyText,
                        { color: isAdmin ? colors.primarytext : "#FFFFFF" },
                      ]}
                    >
                      {item.text}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Bottom Chat Input Bar (Only visible if there is an active ticket) */}
        {activeTicket && (
          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: colors.surface,
                borderTopColor: colors.border,
              },
            ]}
          >
            <TextInput
              style={[styles.chatTextInput, { color: colors.primarytext }]}
              placeholder="Type your reply or question to admin..."
              placeholderTextColor={colors.inputPlaceholder}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              activeOpacity={0.85}
              disabled={!inputText.trim() || isSending}
              onPress={handleSendMessage}
              style={[
                styles.sendBtn,
                {
                  backgroundColor: colors.primary,
                  opacity: !inputText.trim() || isSending ? 0.5 : 1,
                },
              ]}
            >
              {isSending ? (
                <ActivityIndicator size="small" color={colors.primarytext} />
              ) : (
                <Ionicons name="send" size={16} color={colors.primarytext} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* New Issue Report Modal */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowNewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                  Report Issue to Admin
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondarytext }]}>
                  Describe what went wrong and our team will reply here.
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowNewModal(false)}
                style={[styles.modalCloseBtn, { backgroundColor: colors.surfacevariant }]}
              >
                <Ionicons name="close" size={18} color={colors.primarytext} />
              </TouchableOpacity>
            </View>

            {/* Category presets */}
            <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
              {CATEGORIES.map((cat) => {
                const isSelected = cat === newCategory;
                return (
                  <TouchableOpacity
                    key={cat}
                    activeOpacity={0.8}
                    onPress={() => setNewCategory(cat)}
                    style={[
                      styles.categoryChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.surfacevariant,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? colors.primarytext : colors.secondarytext },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Subject */}
            <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>Subject / Topic</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.primarytext,
                },
              ]}
              placeholder="e.g. Problem withdrawing earnings / booking dispute"
              placeholderTextColor={colors.inputPlaceholder}
              value={newSubject}
              onChangeText={setNewSubject}
            />

            {/* Message */}
            <Text style={[styles.fieldLabel, { color: colors.primarytext }]}>Details</Text>
            <TextInput
              style={[
                styles.modalTextArea,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.primarytext,
                },
              ]}
              placeholder="Provide complete details (booking numbers, client names, timestamps, error messages)..."
              placeholderTextColor={colors.inputPlaceholder}
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={4}
            />

            {/* Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowNewModal(false)}
                style={[styles.modalCancelBtn, { backgroundColor: colors.surfacevariant }]}
              >
                <Text style={[styles.modalCancelText, { color: colors.secondarytext }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isCreating}
                onPress={handleCreateTicket}
                style={[
                  styles.modalSubmitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isCreating ? 0.7 : 1,
                  },
                ]}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color={colors.primarytext} />
                ) : (
                  <Text style={[styles.modalSubmitText, { color: colors.primarytext }]}>
                    Submit Report & Chat
                  </Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    gap: 6,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "500",
  },
  newTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  newTicketBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  ticketTabsBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  ticketTabsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  ticketTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  ticketTabText: {
    fontSize: 12,
    fontWeight: "600",
  },
  ticketStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chatArea: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 24,
  },
  startReportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  startReportText: {
    fontSize: 14,
    fontWeight: "700",
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  messageBubbleWrap: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
  },
  messageBubbleWrapLeft: {
    justifyContent: "flex-start",
  },
  messageBubbleWrapRight: {
    justifyContent: "flex-end",
  },
  adminAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  adminBubble: {
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    borderBottomRightRadius: 4,
  },
  messageMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  senderNameText: {
    fontSize: 11,
    fontWeight: "700",
  },
  messageTimeText: {
    fontSize: 10,
  },
  messageBodyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  chatTextInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    padding: 22,
    maxHeight: "85%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  categoriesScroll: {
    marginBottom: 4,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  modalTextArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 2,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: "700",
  },
});
