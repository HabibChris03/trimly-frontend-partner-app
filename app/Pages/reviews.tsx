import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { reviewService, ReviewItemResponse } from "@/services/reviewService";
import { feedback } from "@/utils/feedback";

const QUICK_REPLIES_EN = [
  "Thank you for your visit! Glad you loved the cut.",
  "Appreciate your review! See you next time at the chair.",
  "Thank you for trusting our stylists with your look.",
  "Always a pleasure having you! Thanks for the great feedback.",
];

const QUICK_REPLIES_FR = [
  "Merci pour votre visite ! Ravi(e) que la coupe vous plaise.",
  "Merci pour votre avis ! À très bientôt au salon.",
  "Merci de faire confiance à nos coiffeurs pour votre style.",
  "Toujours un plaisir de vous accueillir ! Merci pour votre confiance.",
];

export default function BarberReviewsScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const params = useLocalSearchParams<{ barberId?: string }>();
  const targetBarberId = params.barberId ? parseInt(params.barberId, 10) : user?.id;

  const [reviews, setReviews] = useState<ReviewItemResponse[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0.0);
  const [totalReviews, setTotalReviews] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<
    "all" | "needs_reply" | "replied" | "5star" | "critical"
  >("all");

  // Reply Modal State
  const [replyModalVisible, setReplyModalVisible] = useState<boolean>(false);
  const [selectedReview, setSelectedReview] = useState<ReviewItemResponse | null>(null);
  const [replyText, setReplyText] = useState<string>("");
  const [isSubmittingReply, setIsSubmittingReply] = useState<boolean>(false);

  const fetchReviews = useCallback(async () => {
    if (!targetBarberId) {
      setReviews([]);
      setAverageRating(0.0);
      setTotalReviews(0);
      return;
    }
    try {
      const res = await reviewService.getBarberReviews(targetBarberId);
      if (res && Array.isArray(res.reviews)) {
        setReviews(res.reviews);
        setAverageRating(typeof res.average_rating === "number" ? res.average_rating : 0.0);
        setTotalReviews(
          typeof res.total_reviews === "number" ? res.total_reviews : res.reviews.length
        );
      } else {
        setReviews([]);
        setAverageRating(0.0);
        setTotalReviews(0);
      }
    } catch {
      setReviews([]);
      setAverageRating(0.0);
      setTotalReviews(0);
    }
  }, [targetBarberId]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchReviews();
      setIsLoading(false);
    }
    load();
  }, [fetchReviews]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReviews();
    setRefreshing(false);
  }, [fetchReviews]);

  // Rating Distribution Calculation
  const ratingCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const rounded = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
      if (counts[rounded] !== undefined) {
        counts[rounded] += 1;
      }
    });
    return counts;
  }, [reviews]);

  // Filtered Reviews
  const filteredReviews = useMemo(() => {
    return reviews.filter((r) => {
      // Query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesClient = r.client_name?.toLowerCase().includes(q);
        const matchesComment = r.comment?.toLowerCase().includes(q);
        const matchesTags = r.tags?.some((tag) => tag.toLowerCase().includes(q));
        if (!matchesClient && !matchesComment && !matchesTags) return false;
      }

      // Tab filter
      if (activeFilter === "needs_reply" && r.reply) return false;
      if (activeFilter === "replied" && !r.reply) return false;
      if (activeFilter === "5star" && r.rating < 5) return false;
      if (activeFilter === "critical" && r.rating >= 4) return false;

      return true;
    });
  }, [reviews, searchQuery, activeFilter]);

  const needsReplyCount = useMemo(() => {
    return reviews.filter((r) => !r.reply).length;
  }, [reviews]);

  const handleOpenReplyModal = (review: ReviewItemResponse) => {
    feedback.triggerImpact();
    setSelectedReview(review);
    setReplyText(review.reply || "");
    setReplyModalVisible(true);
  };

  const handleSendReply = async () => {
    if (!selectedReview || !selectedReview.id) return;
    if (!replyText.trim()) {
      showToast("Please enter a reply message.", "error");
      return;
    }

    setIsSubmittingReply(true);
    try {
      await reviewService.replyToReview(selectedReview.id, replyText.trim());
      feedback.triggerSuccessHaptic();

      // Update in local state
      setReviews((prev) =>
        prev.map((r) => {
          if (r.id === selectedReview.id) {
            return {
              ...r,
              reply: replyText.trim(),
              replied_at: new Date().toISOString(),
            };
          }
          return r;
        })
      );

      showToast("Reply published successfully!", "success");
      setReplyModalVisible(false);
      setSelectedReview(null);
      setReplyText("");
    } catch {
      showToast("Failed to post reply. Please try again.", "error");
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const renderStars = (rating: number, size: number = 14) => {
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= Math.round(rating);
          return (
            <Ionicons
              key={star}
              name={filled ? "star" : "star-outline"}
              size={size}
              color={filled ? colors.star : colors.mutedText}
            />
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Clean Dark Urban Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.backButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text
            style={[styles.headerTitle, { color: colors.primarytext }]}
            numberOfLines={1}
          >
            {t("profile.reviews") || "Client Reviews & Ratings"}
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.secondarytext }]}
            numberOfLines={1}
          >
            {totalReviews} verified client reviews
          </Text>
        </View>

        <View
          style={[
            styles.headerBadge,
            {
              backgroundColor: colors.brandSoft,
              borderColor: colors.brandBorder,
            },
          ]}
        >
          <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
          <Text style={[styles.headerBadgeText, { color: colors.primary }]}>
            Verified
          </Text>
        </View>
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
        {/* Rating KPI & Distribution Card */}
        <View
          style={[
            styles.kpiCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.kpiTopRow}>
            {/* Left Score Block */}
            <View style={styles.scoreBlock}>
              <Text style={[styles.averageNumber, { color: colors.primarytext }]}>
                {averageRating.toFixed(1)}
              </Text>
              {renderStars(averageRating, 16)}
              <Text
                style={[styles.totalReviewsSub, { color: colors.secondarytext }]}
              >
                Based on {totalReviews} ratings
              </Text>
            </View>

            {/* Right Distribution Bars */}
            <View style={styles.distributionBlock}>
              {[5, 4, 3, 2, 1].map((starNum) => {
                const count = (ratingCounts as any)[starNum] || 0;
                const percentage =
                  totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <View key={starNum} style={styles.distRow}>
                    <View style={styles.distStarLabelRow}>
                      <Text
                        style={[
                          styles.distStarLabel,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {starNum}
                      </Text>
                      <Ionicons name="star" size={9} color={colors.star} />
                    </View>
                    <View
                      style={[
                        styles.distBarTrack,
                        { backgroundColor: colors.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.distBarFill,
                          {
                            backgroundColor:
                              starNum >= 4 ? colors.primary : colors.warning,
                            width: `${Math.max(percentage, 3)}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[styles.distCount, { color: colors.secondarytext }]}
                    >
                      {count}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Quick Metrics Strip */}
          <View
            style={[
              styles.metricsStrip,
              {
                backgroundColor: colors.background,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.metricItem}>
              <Ionicons
                name="chatbubbles-outline"
                size={15}
                color={colors.primary}
              />
              <Text style={[styles.metricText, { color: colors.primarytext }]}>
                {needsReplyCount === 0
                  ? "All Replied"
                  : `${needsReplyCount} Need Reply`}
              </Text>
            </View>

            <View
              style={[styles.metricDivider, { backgroundColor: colors.border }]}
            />

            <View style={styles.metricItem}>
              <Ionicons
                name="flash-outline"
                size={15}
                color={colors.success}
              />
              <Text style={[styles.metricText, { color: colors.primarytext }]}>
                100% Verified Clients
              </Text>
            </View>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchSection}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={colors.secondarytext}
            />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t("reviews.searchPlaceholder") || "Search reviews by client or keyword..."}
              placeholderTextColor={colors.inputPlaceholder}
              style={[styles.searchInput, { color: colors.primarytext }]}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.secondarytext}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Segmented Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {(
            [
              { key: "all", label: `All (${reviews.length})` },
              {
                key: "needs_reply",
                label: `Needs Reply (${needsReplyCount})`,
              },
              { key: "replied", label: "Replied" },
              { key: "5star", label: "5 Stars Only" },
              { key: "critical", label: "Needs Attention" },
            ] as const
          ).map((pill) => {
            const isSelected = activeFilter === pill.key;
            return (
              <TouchableOpacity
                key={pill.key}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(pill.key)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: isSelected ? colors.onBrand : colors.secondarytext,
                      fontWeight: isSelected ? "700" : "600",
                    },
                  ]}
                >
                  {pill.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Reviews List */}
        <View style={styles.reviewsList}>
          {isLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text
                style={[styles.loadingText, { color: colors.secondarytext }]}
              >
                {t("reviews.loadingReviews") || "Loading client reviews..."}
              </Text>
            </View>
          ) : filteredReviews.length === 0 ? (
            <View
              style={[
                styles.emptyCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIconCircle,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={30}
                  color={colors.primary}
                />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
                {t("reviews.noReviewsFound") || "No Reviews Found"}
              </Text>
              <Text
                style={[styles.emptySubtitle, { color: colors.secondarytext }]}
              >
                {searchQuery
                  ? "No reviews match your search query."
                  : "Reviews submitted by clients after completed cuts will appear here."}
              </Text>
            </View>
          ) : (
            filteredReviews.map((review) => {
              const reviewDate = review.created_at
                ? new Date(review.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "Recent";

              const clientInitial = (
                review.client_name ? review.client_name[0] : "C"
              ).toUpperCase();

              return (
                <View
                  key={String(review.id)}
                  style={[
                    styles.reviewCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {/* Client Info Row */}
                  <View style={styles.reviewHeader}>
                    <View
                      style={[
                        styles.clientAvatar,
                        {
                          backgroundColor: colors.brandSoft,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.clientInitial, { color: colors.primary }]}
                      >
                        {clientInitial}
                      </Text>
                    </View>

                    <View style={styles.clientMetaWrap}>
                      <View style={styles.clientNameRow}>
                        <Text
                          style={[
                            styles.clientName,
                            { color: colors.primarytext },
                          ]}
                          numberOfLines={1}
                        >
                          {review.client_name || "Verified Client"}
                        </Text>
                        <Ionicons
                          name="checkmark-circle"
                          size={14}
                          color={colors.primary}
                        />
                      </View>
                      <Text
                        style={[
                          styles.reviewDate,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {reviewDate}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.ratingPill,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Ionicons name="star" size={12} color={colors.star} />
                      <Text
                        style={[
                          styles.ratingPillText,
                          { color: colors.primarytext },
                        ]}
                      >
                        {Number(review.rating || 5).toFixed(1)}
                      </Text>
                    </View>
                  </View>

                  {/* Tags */}
                  {review.tags && review.tags.length > 0 && (
                    <View style={styles.tagWrap}>
                      {review.tags.map((tag, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.tagChip,
                            {
                              backgroundColor: colors.background,
                              borderColor: colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.tagText,
                              { color: colors.secondarytext },
                            ]}
                          >
                            #{tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Comment */}
                  {review.comment ? (
                    <Text
                      style={[styles.commentText, { color: colors.primarytext }]}
                    >
                      &ldquo;{review.comment}&rdquo;
                    </Text>
                  ) : null}

                  {/* Barber Response Block */}
                  {review.reply ? (
                    <View
                      style={[
                        styles.replyBox,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.border,
                          borderLeftColor: colors.primary,
                        },
                      ]}
                    >
                      <View style={styles.replyBoxHeader}>
                        <View style={styles.replyAuthorRow}>
                          <Ionicons
                            name="cut-outline"
                            size={13}
                            color={colors.primary}
                          />
                          <Text
                            style={[
                              styles.replyAuthor,
                              { color: colors.primary },
                            ]}
                          >
                            {t("reviews.yourSalonResponse") || "Your Salon Response"}
                          </Text>
                        </View>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={() => handleOpenReplyModal(review)}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Text
                            style={[
                              styles.editReplyText,
                              { color: colors.primary },
                            ]}
                          >
                            Edit
                          </Text>
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={[styles.replyText, { color: colors.primarytext }]}
                      >
                        {review.reply}
                      </Text>
                    </View>
                  ) : (
                    /* Reply Action Button */
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => handleOpenReplyModal(review)}
                      style={[
                        styles.replyBtn,
                        {
                          backgroundColor: colors.brandSoft,
                          borderColor: colors.brandBorder,
                        },
                      ]}
                    >
                      <Ionicons
                        name="arrow-undo-outline"
                        size={14}
                        color={colors.primary}
                      />
                      <Text
                        style={[styles.replyBtnText, { color: colors.primary }]}
                      >
                        {t("reviews.replyToClient") || "Reply to Client"}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Reply Modal */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
        >
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                  {selectedReview?.reply ? (language === "fr" ? "Modifier votre réponse" : "Edit Your Reply") : (language === "fr" ? "Répondre au client" : "Reply to Client")}
                </Text>
                <Text
                  style={[styles.modalSub, { color: colors.secondarytext }]}
                >
                  Replying to {selectedReview?.client_name || "client"}
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => setReplyModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.modalCloseBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.primarytext} />
              </TouchableOpacity>
            </View>

            {/* Client Review Snippet */}
            <View
              style={[
                styles.snippetBox,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[styles.snippetClient, { color: colors.secondarytext }]}
              >
                {t("reviews.clientReview") || "Client Review:"}
              </Text>
              <Text
                style={[styles.snippetComment, { color: colors.primarytext }]}
                numberOfLines={2}
              >
                &ldquo;{selectedReview?.comment}&rdquo;
              </Text>
            </View>

            {/* Quick Templates */}
            <Text
              style={[styles.quickRepliesTitle, { color: colors.secondarytext }]}
            >
              {language === "fr" ? "MODÈLES RAPIDES" : "QUICK TEMPLATES"}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickRepliesScroll}
            >
              {(language === "fr" ? QUICK_REPLIES_FR : QUICK_REPLIES_EN).map((tmpl, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.75}
                  onPress={() => setReplyText(tmpl)}
                  style={[
                    styles.quickReplyChip,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.quickReplyChipText,
                      { color: colors.primarytext },
                    ]}
                    numberOfLines={1}
                  >
                    {tmpl}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Reply Input Area */}
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder={t("reviews.replyPlaceholder") || "Write your professional response to the client..."}
                placeholderTextColor={colors.inputPlaceholder}
                multiline
                numberOfLines={4}
                maxLength={500}
                style={[styles.modalTextInput, { color: colors.primarytext }]}
              />
              <Text style={[styles.charCount, { color: colors.secondarytext }]}>
                {replyText.length}/500
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setReplyModalVisible(false)}
                style={[
                  styles.cancelBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[styles.cancelBtnText, { color: colors.secondarytext }]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSubmittingReply || !replyText.trim()}
                onPress={handleSendReply}
                style={[
                  styles.sendReplyBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSubmittingReply || !replyText.trim() ? 0.55 : 1,
                  },
                ]}
              >
                {isSubmittingReply ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color={colors.onBrand} />
                    <Text
                      style={[
                        styles.sendReplyBtnText,
                        { color: colors.onBrand },
                      ]}
                    >
                      Publish Reply
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  headerBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  kpiCard: {
    marginHorizontal: 18,
    marginTop: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  kpiTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  scoreBlock: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 106,
  },
  averageNumber: {
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 2,
  },
  totalReviewsSub: {
    fontSize: 11,
    marginTop: 6,
    textAlign: "center",
  },
  distributionBlock: {
    flex: 1,
    gap: 6,
  },
  distRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  distStarLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    width: 22,
  },
  distStarLabel: {
    fontSize: 11,
    fontWeight: "700",
  },
  distBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  distBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  distCount: {
    fontSize: 11,
    fontWeight: "600",
    width: 20,
    textAlign: "right",
  },
  metricsStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 13,
    borderWidth: 1,
  },
  metricItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metricText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 18,
  },
  searchSection: {
    paddingHorizontal: 18,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    paddingVertical: 0,
  },
  filterScroll: {
    paddingHorizontal: 18,
    gap: 8,
    marginBottom: 14,
  },
  filterPill: {
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterPillText: {
    fontSize: 12.5,
  },
  reviewsList: {
    paddingHorizontal: 18,
    gap: 12,
  },
  loadingWrap: {
    paddingVertical: 44,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 12,
  },
  emptyCard: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  reviewCard: {
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  clientAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  clientInitial: {
    fontSize: 16,
    fontWeight: "800",
  },
  clientMetaWrap: {
    flex: 1,
  },
  clientNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  clientName: {
    fontSize: 14.5,
    fontWeight: "700",
  },
  reviewDate: {
    fontSize: 11.5,
    marginTop: 2,
  },
  ratingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
    borderWidth: 1,
  },
  ratingPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  tagWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  tagChip: {
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  commentText: {
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 12,
  },
  replyBox: {
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderLeftWidth: 3.5,
    marginTop: 2,
  },
  replyBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  replyAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: "700",
  },
  editReplyText: {
    fontSize: 12,
    fontWeight: "700",
  },
  replyText: {
    fontSize: 13,
    lineHeight: 18,
  },
  replyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  replyBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 26,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  snippetBox: {
    padding: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 14,
  },
  snippetClient: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  snippetComment: {
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 18,
  },
  quickRepliesTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginBottom: 7,
  },
  quickRepliesScroll: {
    gap: 8,
    paddingBottom: 10,
  },
  quickReplyChip: {
    paddingHorizontal: 12,
    height: 34,
    borderRadius: 11,
    borderWidth: 1,
    maxWidth: 250,
    justifyContent: "center",
  },
  quickReplyChipText: {
    fontSize: 12,
  },
  inputWrapper: {
    borderRadius: 13,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    marginTop: 4,
  },
  modalTextInput: {
    fontSize: 14,
    minHeight: 84,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    textAlign: "right",
    marginTop: 4,
  },
  modalActionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  sendReplyBtn: {
    flex: 1.8,
    flexDirection: "row",
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sendReplyBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
