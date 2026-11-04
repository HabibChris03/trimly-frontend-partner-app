import * as ImagePicker from "expo-image-picker";
import { FontFamily } from "@/constants/theme";
import { barberService } from "@/services/barberService";
import { CustomModal } from "@/components/ui/CustomModal";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import TrimlyLogoLoader from "@/components/ui/TrimlyLogoLoader";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
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

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48) / 2;

const STYLE_SUGGESTIONS = [
  "Skin Fade & Beard",
  "Sharp Taper Fade",
  "Line Up & Clean Shave",
  "Buzz Cut + Shave",
  "Dreadlocks Retwist",
  "Wave Sculpt",
  "Afro Shape Up",
  "Temple Fade",
];

const PRICE_PRESETS = [1500, 2500, 3500, 5000, 10000];

export interface PortfolioItem {
  id: string;
  title: string;
  uri: string;
  likes: number;
  price: number;
  duration_minutes: number;
  category?: string;
  barber_id?: number;
}

export default function BarberPortfolioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ action?: string }>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  const barberId = user?.id || 4;

  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [cutTitle, setCutTitle] = useState("");
  const [cutPrice, setCutPrice] = useState("1000");
  const [cutDuration, setCutDuration] = useState("30");
  const [cutCategory, setCutCategory] = useState("Haircuts & Styling");
  const [pickedImageUri, setPickedImageUri] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Cut Modal State
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editPrice, setEditPrice] = useState("1000");
  const [editDuration, setEditDuration] = useState("30");
  const [editCategory, setEditCategory] = useState("Haircuts & Styling");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Telemetry metrics
  const totalCuts = portfolio.length;
  const bookableCount = portfolio.filter((p) => p.price && p.price > 0).length;
  const avgPrice =
    totalCuts > 0
      ? Math.round(portfolio.reduce((acc, p) => acc + (p.price || 0), 0) / totalCuts)
      : 0;
  const totalLikes = portfolio.reduce((acc, p) => acc + (p.likes || 0), 0);

  // Fullscreen ImageViewer state
  const [viewerItem, setViewerItem] = useState<PortfolioItem | null>(null);

  // Delete confirmation state
  const [itemToDelete, setItemToDelete] = useState<PortfolioItem | null>(null);

  // Auto-open modal if navigated with ?action=add
  useEffect(() => {
    if (params.action === "add") {
      setModalVisible(true);
    }
  }, [params.action]);

  const isSubBarber = Boolean(
    user?.parent_salon_id ||
      user?.is_sub_barber ||
      (user as any)?.staff_title
  );

  const fetchPortfolio = useCallback(async () => {
    try {
      const items = await barberService.getBarberPortfolio(barberId);
      if (Array.isArray(items)) {
        // Sub-barbers strictly see ONLY their own cuts; salons see cuts uploaded under their salon
        const filtered = isSubBarber
          ? items.filter(
              (item) =>
                !item.barber_id ||
                item.barber_id === user?.id ||
                String(item.barber_id) === String(user?.id)
            )
          : items;

        const mapped: PortfolioItem[] = filtered
          .filter((item) => item.media_url || item.uri)
          .map((item, idx) => ({
            id: (item.id || idx + 1).toString(),
            title:
              item.hairstyle_name ||
              item.hairstyle_or_service_name ||
              "Hairstyle Cut",
            uri: item.media_url || item.uri,
            likes: item.likes || 0,
            price: Number(item.price) > 0 ? Number(item.price) : 1000,
            duration_minutes: Number(item.duration_minutes) > 0 ? Number(item.duration_minutes) : 30,
            category: item.category || "Haircuts & Styling",
            barber_id: item.barber_id,
          }));
        setPortfolio(mapped);
      } else {
        setPortfolio([]);
      }
    } catch {
      setPortfolio([]);
    } finally {
      setIsLoading(false);
    }
  }, [barberId, isSubBarber, user?.id]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPortfolio();
    setRefreshing(false);
  }, [fetchPortfolio]);

  const handlePickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.status !== "granted") {
      showToast("Please allow photo library access to upload cuts.", "warning");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted && perm.status !== "granted") {
      showToast("Please allow camera access to take cut photos.", "warning");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.85,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setPickedImageUri(result.assets[0].uri);
    }
  };

  const handleUploadCut = async () => {
    if (!pickedImageUri) {
      showToast("Please select or take a photo of the cut.", "warning");
      return;
    }
    if (!cutTitle.trim()) {
      showToast("Please enter a title or style name for this cut.", "warning");
      return;
    }

    const rawPrice = parseInt(cutPrice.replace(/[^0-9]/g, ""), 10);
    const finalPrice = !isNaN(rawPrice) && rawPrice >= 1000 ? rawPrice : 1000;
    const rawDur = parseInt(cutDuration.replace(/[^0-9]/g, ""), 10);
    const finalDur = !isNaN(rawDur) && rawDur > 0 ? rawDur : 30;

    setIsUploading(true);
    try {
      const res = await barberService.uploadPortfolio({
        media_url: pickedImageUri,
        media_type: "image",
        hairstyle_or_service_name: cutTitle.trim(),
        price: finalPrice,
        duration_minutes: finalDur,
        category: cutCategory,
      });

      const newItem: PortfolioItem = {
        id: (res?.portfolio_item?.id || res?.id || Date.now()).toString(),
        title: cutTitle.trim(),
        uri: res?.portfolio_item?.media_url || res?.media_url || pickedImageUri,
        likes: 0,
        price: finalPrice,
        duration_minutes: finalDur,
        category: cutCategory,
        barber_id: user?.id,
      };

      setPortfolio((prev) => [newItem, ...prev]);
      setModalVisible(false);
      setCutTitle("");
      setCutPrice("1000");
      setCutDuration("30");
      setPickedImageUri(null);
      showToast("New hairstyle cut added to your portfolio.", "success");
    } catch {
      showToast("Failed to upload portfolio cut.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenEditModal = (item: PortfolioItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditPrice((item.price || 1000).toString());
    setEditDuration((item.duration_minutes || 30).toString());
    setEditCategory(item.category || "Haircuts & Styling");
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    const rawPrice = parseInt(editPrice.replace(/[^0-9]/g, ""), 10);
    const finalPrice = !isNaN(rawPrice) && rawPrice >= 1000 ? rawPrice : 1000;
    const rawDur = parseInt(editDuration.replace(/[^0-9]/g, ""), 10);
    const finalDur = !isNaN(rawDur) && rawDur > 0 ? rawDur : 30;
    const finalTitle = editTitle.trim() || editingItem.title;

    setIsSavingEdit(true);
    try {
      const numId = parseInt(editingItem.id, 10);
      if (!isNaN(numId)) {
        await barberService.updatePortfolioItem(numId, {
          hairstyle_or_service_name: finalTitle,
          price: finalPrice,
          duration_minutes: finalDur,
          category: editCategory,
        });
      }

      setPortfolio((prev) =>
        prev.map((p) =>
          p.id === editingItem.id
            ? {
                ...p,
                title: finalTitle,
                price: finalPrice,
                duration_minutes: finalDur,
                category: editCategory,
              }
            : p
        )
      );

      setEditModalVisible(false);
      setEditingItem(null);
      showToast("Portfolio cut updated successfully!", "success");
    } catch (err: any) {
      showToast(err?.message || "Failed to update cut.", "error");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const confirmDeleteCut = async () => {
    if (!itemToDelete) return;
    const itemIdNum = parseInt(itemToDelete.id, 10);
    try {
      if (!isNaN(itemIdNum)) {
        await barberService.deletePortfolioItem(itemIdNum).catch(() => null);
      }
      setPortfolio((prev) => prev.filter((p) => p.id !== itemToDelete.id));
      showToast("Hairstyle cut removed from portfolio.", "info");
    } catch {
      showToast("Could not delete portfolio cut.", "error");
    } finally {
      setItemToDelete(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Clean Dark Urban Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[
            styles.headerCircleBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.primarytext} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
            {t("barber.myPortfolio") || "My Portfolio"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {portfolio.length} cuts uploaded • Bookable styles
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color={colors.onBrand} />
        </TouchableOpacity>
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
        {/* Portfolio Executive Telemetry Strip */}
        <View
          style={[
            styles.telemetryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: colors.primarytext }]}>
              {totalCuts}
            </Text>
            <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
              Total Cuts
            </Text>
          </View>
          <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: colors.primary }]}>
              {bookableCount}
            </Text>
            <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
              Bookable
            </Text>
          </View>
          <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.telemetryItem}>
            <Text style={[styles.telemetryVal, { color: colors.primarytext }]}>
              {avgPrice > 0 ? `${avgPrice.toLocaleString()} CFA` : "—"}
            </Text>
            <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
              {t("portfolio.avgPrice") || "Avg. Price"}
            </Text>
          </View>
          <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.telemetryItem}>
            <View style={styles.telemetryHeartRow}>
              <Ionicons name="heart" size={13} color={colors.error} />
              <Text style={[styles.telemetryVal, { color: colors.primarytext }]}>
                {totalLikes}
              </Text>
            </View>
            <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
              Likes
            </Text>
          </View>
        </View>

        {/* Book-From-Photo Info Strip */}
        <View
          style={[
            styles.infoBanner,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View
            style={[
              styles.infoBannerIcon,
              {
                backgroundColor: colors.brandSoft,
                borderColor: colors.brandBorder,
              },
            ]}
          >
            <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoBannerTitle, { color: colors.primarytext }]}>
              {t("portfolio.clientsBookDirectly") || "Clients book directly from your photos"}
            </Text>
            <Text style={[styles.infoBannerSub, { color: colors.secondarytext }]}>
              {t("portfolio.attachStyleNamePrice") || "Attach a style name & CFA price to every cut you upload."}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <TrimlyLogoLoader size="medium" />
            <Text style={[styles.loadingText, { color: colors.secondarytext }]}>
              {t("common.loading")}
            </Text>
          </View>
        ) : portfolio.length === 0 ? (
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
              <Ionicons name="images-outline" size={34} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {t("barberProfile.noPortfolioYet") || "No Portfolio Photos Yet"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              {t("portfolio.uploadPortfolioDesc") || "Upload photos of your haircuts, fades, and beard trims with their CFA price so clients can book directly from your pictures."}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setModalVisible(true)}
              style={[styles.emptyUploadBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="camera-outline" size={18} color={colors.onBrand} />
              <Text style={[styles.emptyUploadBtnText, { color: colors.onBrand }]}>
                {language === "fr" ? "Ajouter une première coupe" : "Add First Cut"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.grid}>
            {portfolio.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setViewerItem(item)}
                  style={styles.imageWrap}
                >
                  <Image
                    source={{ uri: item.uri }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                  {/* Price Tag Overlay */}
                  <View
                    style={[
                      styles.priceOverlayPill,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[styles.priceOverlayText, { color: colors.onBrand }]}>
                      {item.price ? `${item.price.toLocaleString()} ${t("common.cfa") || "CFA"}` : `1,000 ${t("common.cfa") || "CFA"}`}
                    </Text>
                  </View>

                  {/* Fullscreen Expand Hint */}
                  <View style={[styles.expandPill, { borderColor: colors.border }]}>
                    <Ionicons name="expand-outline" size={13} color="#F5F5F2" />
                  </View>
                </TouchableOpacity>

                <View style={styles.cardInfo}>
                  <Text
                    style={[styles.cardTitle, { color: colors.primarytext }]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>

                  {/* Duration Badge */}
                  <View style={styles.durationRow}>
                    <Ionicons name="time-outline" size={12} color={colors.primary} />
                    <Text style={[styles.durationText, { color: colors.secondarytext }]}>
                      {item.duration_minutes || 30} {language === "fr" ? "min" : "mins"}
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <View style={styles.likesRow}>
                      <Ionicons name="heart" size={13} color={colors.error} />
                      <Text
                        style={[
                          styles.likesText,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {item.likes}
                      </Text>
                    </View>

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      {/* Edit Cut Button */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => handleOpenEditModal(item)}
                        style={[
                          styles.deleteBtn,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color={colors.primary}
                        />
                      </TouchableOpacity>

                      {/* Delete Cut Button */}
                      <TouchableOpacity
                        activeOpacity={0.75}
                        onPress={() => setItemToDelete(item)}
                        style={[
                          styles.deleteBtn,
                          {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                          },
                        ]}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color={colors.secondarytext}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Fullscreen Image Viewer Modal */}
      <ImageViewerModal
        visible={!!viewerItem}
        onClose={() => setViewerItem(null)}
        imageUrl={viewerItem?.uri || null}
        title={viewerItem?.title}
        barberName={user?.name || "My Portfolio"}
        likesCount={viewerItem?.likes}
        price={viewerItem?.price}
        duration_minutes={viewerItem?.duration_minutes || 30}
      />

      {/* Delete Cut Custom Modal */}
      <CustomModal
        visible={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        title={language === "fr" ? "Supprimer la coupe" : "Remove Portfolio Cut"}
        description={
          language === "fr"
            ? `Êtes-vous sûr de vouloir retirer "${itemToDelete?.title}" de votre portfolio public ?`
            : `Are you sure you want to remove "${itemToDelete?.title}" from your public portfolio?`
        }
        icon="trash-outline"
        primaryText={language === "fr" ? "Supprimer" : "Delete Cut"}
        primaryDanger={true}
        onPrimary={confirmDeleteCut}
        secondaryText={t("common.cancel") || (language === "fr" ? "Annuler" : "Cancel")}
        onSecondary={() => setItemToDelete(null)}
      />

      {/* Add New Cut Modal (Preserving Photo + Price Upload!) */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                  {t("portfolio.addHairstylePortfolio") || "Add Hairstyle to Portfolio"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondarytext }]}>
                  {t("portfolio.clientsCanTap") || "Clients can tap this photo to book at your listed price."}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
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

            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {language === "fr" ? "Nom ou titre de la coupe" : "Style / Cut Title"}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.primarytext,
                },
              ]}
              placeholder={language === "fr" ? "Ex: Dégradé à blanc américain" : "e.g. Sharp Taper Fade"}
              placeholderTextColor={colors.inputPlaceholder}
              value={cutTitle}
              onChangeText={setCutTitle}
            />

            {/* Quick Style Suggestions */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestionRow}
            >
              {STYLE_SUGGESTIONS.map((sug) => {
                const isSelected = cutTitle === sug;
                return (
                  <TouchableOpacity
                    key={sug}
                    activeOpacity={0.8}
                    onPress={() => setCutTitle(sug)}
                    style={[
                      styles.suggestionChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.background,
                        borderColor: isSelected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.suggestionChipText,
                        {
                          color: isSelected ? colors.onBrand : colors.secondarytext,
                          fontWeight: isSelected ? "700" : "500",
                        },
                      ]}
                    >
                      {sug}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {t("portfolio.bookingPriceCFA") || "Booking Price (CFA)"}
            </Text>
            <View
              style={[
                styles.priceInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <TextInput
                style={[styles.priceTextInput, { color: colors.primarytext }]}
                placeholder="e.g. 1000"
                placeholderTextColor={colors.inputPlaceholder}
                value={cutPrice}
                onChangeText={setCutPrice}
                keyboardType="numeric"
              />
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>
                  CFA
                </Text>
              </View>
            </View>

            {/* Quick Price Presets */}
            <View style={styles.presetsRow}>
              {PRICE_PRESETS.map((p) => {
                const isSel = cutPrice === String(p);
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.8}
                    onPress={() => setCutPrice(String(p))}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        {
                          color: isSel ? colors.onBrand : colors.primarytext,
                          fontWeight: isSel ? "700" : "500",
                        },
                      ]}
                    >
                      {p.toLocaleString()} CFA
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Estimated Duration Input & Presets */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {language === "fr" ? "Durée estimée (minutes)" : "Estimated Duration (minutes)"}
            </Text>
            <View
              style={[
                styles.priceInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <TextInput
                style={[styles.priceTextInput, { color: colors.primarytext }]}
                placeholder="30"
                placeholderTextColor={colors.inputPlaceholder}
                value={cutDuration}
                onChangeText={setCutDuration}
                keyboardType="numeric"
              />
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>
                  mins
                </Text>
              </View>
            </View>

            <View style={styles.presetsRow}>
              {[15, 30, 45, 60, 90, 120].map((d) => {
                const isSel = cutDuration === String(d);
                return (
                  <TouchableOpacity
                    key={d}
                    activeOpacity={0.8}
                    onPress={() => setCutDuration(String(d))}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        {
                          color: isSel ? colors.onBrand : colors.primarytext,
                          fontWeight: isSel ? "700" : "500",
                        },
                      ]}
                    >
                      {d} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Photo Selection Preview & Buttons */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {language === "fr" ? "Photo de la coupe" : "Hairstyle Photo"}
            </Text>

            {pickedImageUri ? (
              <View
                style={[
                  styles.previewImageWrap,
                  { borderColor: colors.border },
                ]}
              >
                <Image
                  source={{ uri: pickedImageUri }}
                  style={styles.previewImage}
                />
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.changePhotoBadge, { borderColor: colors.border }]}
                  onPress={handlePickFromGallery}
                >
                  <Ionicons name="refresh-outline" size={12} color="#F5F5F2" />
                  <Text style={styles.changePhotoText}>{language === "fr" ? "Changer" : "Change"}</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handlePickFromGallery}
                style={[
                  styles.photoActionBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="image-outline" size={17} color={colors.primary} />
                <Text style={[styles.photoActionText, { color: colors.primarytext }]}>
                  {t("common.gallery") || (language === "fr" ? "Galerie" : "Gallery")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleTakePhoto}
                style={[
                  styles.photoActionBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons name="camera-outline" size={17} color={colors.primary} />
                <Text style={[styles.photoActionText, { color: colors.primarytext }]}>
                  {t("common.camera") || (language === "fr" ? "Prendre photo" : "Take Photo")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setModalVisible(false)}
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelBtnText,
                    { color: colors.secondarytext },
                  ]}
                >
                  {t("common.cancel") || (language === "fr" ? "Annuler" : "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleUploadCut}
                disabled={isUploading}
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isUploading ? 0.7 : 1,
                  },
                ]}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={17}
                      color={colors.onBrand}
                    />
                    <Text style={[styles.modalSaveBtnText, { color: colors.onBrand }]}>
                      {t("portfolio.uploadToPortfolio") || "Upload to Portfolio"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Cut Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isSavingEdit) {
            setEditModalVisible(false);
            setEditingItem(null);
          }
        }}
      >
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.modalTitle, { color: colors.primarytext }]}>
                  {language === "fr" ? "Modifier la coupe" : "Edit Style Cut"}
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.secondarytext }]}>
                  {language === "fr"
                    ? "Ajustez le nom, le tarif et la durée de la prestation"
                    : "Update style name, price, and estimated duration."}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSavingEdit}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingItem(null);
                }}
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

            {editingItem?.uri ? (
              <View
                style={[
                  styles.previewImageWrap,
                  { borderColor: colors.border, height: 110, marginBottom: 6 },
                ]}
              >
                <Image
                  source={{ uri: editingItem.uri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              </View>
            ) : null}

            {/* Cut Name */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext, marginTop: 4 }]}>
              {language === "fr" ? "Nom de la coupe" : "Style / Cut Title"}
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.primarytext,
                },
              ]}
              placeholder={language === "fr" ? "Ex: Dégradé à blanc américain" : "e.g. Sharp Taper Fade"}
              placeholderTextColor={colors.inputPlaceholder}
              value={editTitle}
              onChangeText={setEditTitle}
            />

            {/* Price Input & Presets */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {t("portfolio.bookingPriceCFA") || (language === "fr" ? "Tarif de réservation (CFA)" : "Booking Price (CFA)")}
            </Text>
            <View
              style={[
                styles.priceInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="pricetag-outline" size={16} color={colors.primary} />
              <TextInput
                style={[styles.priceTextInput, { color: colors.primarytext }]}
                placeholder="1000"
                placeholderTextColor={colors.inputPlaceholder}
                value={editPrice}
                onChangeText={setEditPrice}
                keyboardType="numeric"
              />
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>
                  {t("common.cfa") || "CFA"}
                </Text>
              </View>
            </View>

            <View style={styles.presetsRow}>
              {PRICE_PRESETS.map((p) => {
                const isSel = editPrice === String(p);
                return (
                  <TouchableOpacity
                    key={p}
                    activeOpacity={0.8}
                    onPress={() => setEditPrice(String(p))}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        {
                          color: isSel ? colors.onBrand : colors.primarytext,
                          fontWeight: isSel ? "700" : "500",
                        },
                      ]}
                    >
                      {p.toLocaleString()} {t("common.cfa") || "CFA"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Duration Input & Presets */}
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              {language === "fr" ? "Durée estimée (minutes)" : "Estimated Duration (minutes)"}
            </Text>
            <View
              style={[
                styles.priceInputWrap,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <TextInput
                style={[styles.priceTextInput, { color: colors.primarytext }]}
                placeholder="30"
                placeholderTextColor={colors.inputPlaceholder}
                value={editDuration}
                onChangeText={setEditDuration}
                keyboardType="numeric"
              />
              <View
                style={[
                  styles.currencyBadge,
                  {
                    backgroundColor: colors.brandSoft,
                    borderColor: colors.brandBorder,
                  },
                ]}
              >
                <Text style={[styles.currencyBadgeText, { color: colors.primary }]}>
                  {language === "fr" ? "min" : "mins"}
                </Text>
              </View>
            </View>

            <View style={styles.presetsRow}>
              {[15, 30, 45, 60, 90, 120].map((d) => {
                const isSel = editDuration === String(d);
                return (
                  <TouchableOpacity
                    key={d}
                    activeOpacity={0.8}
                    onPress={() => setEditDuration(String(d))}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSel ? colors.primary : colors.background,
                        borderColor: isSel ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        {
                          color: isSel ? colors.onBrand : colors.primarytext,
                          fontWeight: isSel ? "700" : "500",
                        },
                      ]}
                    >
                      {d} min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSavingEdit}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingItem(null);
                }}
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelBtnText,
                    { color: colors.secondarytext },
                  ]}
                >
                  {t("common.cancel") || (language === "fr" ? "Annuler" : "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSaveEdit}
                disabled={isSavingEdit}
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: isSavingEdit ? 0.7 : 1,
                  },
                ]}
              >
                {isSavingEdit ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={17}
                      color={colors.onBrand}
                    />
                    <Text style={[styles.modalSaveBtnText, { color: colors.onBrand }]}>
                      {language === "fr" ? "Enregistrer" : "Save Changes"}
                    </Text>
                  </>
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
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 104,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  infoBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoBannerSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 13.5,
  },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    marginTop: 14,
    gap: 12,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 8,
  },
  emptyUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 22,
    height: 46,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyUploadBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  imageWrap: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 178,
  },
  priceOverlayPill: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 9,
  },
  priceOverlayText: {
    fontSize: 11,
    fontWeight: "800",
  },
  expandPill: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    backgroundColor: "rgba(23, 25, 24, 0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    padding: 11,
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  durationText: {
    fontSize: 11,
    fontFamily: FontFamily.medium,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  likesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  likesText: {
    fontSize: 12,
    fontWeight: "600",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
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
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  priceInputWrap: {
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priceTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  currencyBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  previewImageWrap: {
    position: "relative",
    width: "100%",
    height: 145,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 10,
    marginTop: 2,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  changePhotoBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(23, 25, 24, 0.82)",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  changePhotoText: {
    color: "#F5F5F2",
    fontSize: 11,
    fontWeight: "600",
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 2,
  },
  photoActionBtn: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  photoActionText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  modalCancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flex: 1.8,
    height: 46,
    borderRadius: 13,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  telemetryCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  telemetryItem: {
    flex: 1,
    alignItems: "center",
  },
  telemetryVal: {
    fontSize: 15,
    fontWeight: "800",
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  telemetryDivider: {
    width: 1,
    height: 24,
  },
  telemetryHeartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  suggestionRow: {
    gap: 8,
    paddingVertical: 8,
  },
  suggestionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  suggestionChipText: {
    fontSize: 12,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 8,
  },
  presetPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 9,
    borderWidth: 1,
  },
  presetPillText: {
    fontSize: 11.5,
  },
});
