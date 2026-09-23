import { BarberCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { MANAGE_SERVICES_TUTORIAL } from "@/constants/barberTutorials";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
import { barberService, BarberServiceItem } from "@/services/barberService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_CATEGORIES = [
  "Haircuts & Styling",
  "Braids & Locs",
  "Weaves & Extensions",
  "Silk Press & Natural Hair",
  "Color & Treatments",
  "Beard & Shave",
  "Skincare & Facials",
  "Extra Services",
];

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Haircuts & Styling": "cut-outline",
  "Braids & Locs": "git-merge-outline",
  "Weaves & Extensions": "sparkles-outline",
  "Silk Press & Natural Hair": "leaf-outline",
  "Color & Treatments": "color-palette-outline",
  "Beard & Shave": "man-outline",
  "Skincare & Facials": "water-outline",
  "Extra Services": "add-circle-outline",
};

const getCategoryIcon = (cat: string): keyof typeof Ionicons.glyphMap => {
  return CATEGORY_ICONS[cat] || "bookmark-outline";
};

const KNOWN_SERVICES_BY_CATEGORY: Record<string, string[]> = {
  "Haircuts & Styling": [
    "Low Fade",
    "Mid Fade",
    "High / Skin Fade",
    "Taper Fade",
    "Buzz Cut",
    "Caesar Cut",
    "Crew Cut",
    "Pompadour / Comb Over",
    "Line Up / Shape Up",
    "Textured Crop / Scissor Cut",
    "Beard + Haircut Combo",
  ],
  "Braids & Locs": [
    "Box Braids",
    "Knotless Braids",
    "Cornrows",
    "Dreadlocks Starter",
    "Dreadlocks Retwist & Style",
    "Senegalese Twists",
    "French Curls",
    "Feed-in Braids",
  ],
  "Weaves & Extensions": [
    "Sew-In Weave",
    "Quick Weave",
    "Tape-In Extensions",
    "Microlinks / I-Tips",
    "Wig Installation & Styling",
    "Closure / Frontal Maintenance",
  ],
  "Silk Press & Natural Hair": [
    "Classic Silk Press",
    "Deep Condition & Silk Press",
    "Wash & Go Curl Definition",
    "Two-Strand Twist Out",
    "Scalp Detox & Trim",
  ],
  "Color & Treatments": [
    "Full Hair Bleach / Blonde",
    "Single Process Color",
    "Highlights / Balayage",
    "Grey Blending & Coverage",
    "Keratin Smoothing Treatment",
    "Hot Oil Treatment",
  ],
  "Beard & Shave": [
    "Beard Trim & Sculpting",
    "Hot Towel Shave",
    "Full Razor Shave",
    "Beard Lineup & Razor Edge",
    "Beard Conditioning & Oil Treatment",
    "Mustache Trim & Styling",
  ],
  "Skincare & Facials": [
    "Deep Cleansing Facial",
    "Blackhead & Pore Extraction",
    "Charcoal Detox Mask",
    "Hydrating Steam Facial",
    "Exfoliating Face Scrub",
    "Anti-Aging Eye Treatment",
  ],
  "Extra Services": [
    "Shampoo & Scalp Massage",
    "Hair Design / Freestyle Artwork",
    "Eyebrow Shaping / Slit",
    "Enhancements (Hair Fibers / Airbrush)",
    "Nose & Ear Waxing",
  ],
};

// Suggested default durations per category (in minutes)
const CATEGORY_DEFAULT_DURATIONS: Record<string, string> = {
  "Haircuts & Styling": "45",
  "Braids & Locs": "120",
  "Weaves & Extensions": "180",
  "Silk Press & Natural Hair": "90",
  "Color & Treatments": "60",
  "Beard & Shave": "30",
  "Skincare & Facials": "45",
  "Extra Services": "0",
};

const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const PRICE_PRESETS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

function formatDurationDisplay(mins: number): string {
  if (mins <= 0) return "0 min";
  if (mins < 60) return `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m === 0 ? `${h} hr${h > 1 ? "s" : ""}` : `${h}h ${m}m`;
}

export default function ManageServicesScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const barberId = user?.id || 4;

  const [services, setServices] = useState<BarberServiceItem[]>([]);
  const [catalogTab, setCatalogTab] = useState<"hairstyles" | "extras">("hairstyles");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // Add / Edit Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | number | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Haircuts & Styling");
  const [serviceDuration, setServiceDuration] = useState("45");
  const [servicePrice, setServicePrice] = useState("25000");
  const [isExtra, setIsExtra] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Custom Category creator state
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Known services dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Delete modal state
  const [serviceToDelete, setServiceToDelete] = useState<BarberServiceItem | null>(null);

  const allDisplayCategories = Array.from(
    new Set(["All", ...DEFAULT_CATEGORIES, ...customCategories])
  );
  const modalCategories = Array.from(
    new Set([...DEFAULT_CATEGORIES, ...customCategories])
  );

  const fetchServices = useCallback(async () => {
    try {
      const list = await barberService.getBarberServices(barberId);
      setServices(list);

      // Extract custom categories from existing services
      const existingCustom = list
        .map((s) => s.category)
        .filter((cat): cat is string => Boolean(cat) && !DEFAULT_CATEGORIES.includes(cat));

      if (existingCustom.length > 0) {
        setCustomCategories((prev) => Array.from(new Set([...prev, ...existingCustom])));
      }

      // Also fetch categories registered on backend
      try {
        const catRes = await barberService.getCategories(barberId);
        if (catRes?.categories && Array.isArray(catRes.categories)) {
          const backendCustom = catRes.categories.filter(
            (c) => !DEFAULT_CATEGORIES.includes(c)
          );
          if (backendCustom.length > 0) {
            setCustomCategories((prev) => Array.from(new Set([...prev, ...backendCustom])));
          }
        }
      } catch {
        // Fallback
      }
    } catch {
      showToast("Unable to load services catalog.", "error");
    }
  }, [barberId, showToast]);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      await fetchServices();
      setIsLoading(false);
    }
    load();
  }, [fetchServices]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchServices();
    setRefreshing(false);
    showToast("Services catalog updated.", "info");
  }, [fetchServices, showToast]);

  const handleOpenAddModal = () => {
    setEditingServiceId(null);
    setServiceName("");
    if (catalogTab === "extras") {
      setIsExtra(true);
      setServiceCategory("Skincare & Facials");
      setServiceDuration("0");
    } else {
      setIsExtra(false);
      setServiceCategory("Haircuts & Styling");
      setServiceDuration("45");
    }
    setServicePrice("25000");
    setImageUrl("");
    setDropdownOpen(false);
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    setShowUrlInput(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (service: BarberServiceItem) => {
    setEditingServiceId(service.id || null);
    setServiceName(service.name);
    setServiceCategory(service.category || (service.is_extra ? "Skincare & Facials" : "Haircuts & Styling"));
    setServiceDuration(service.duration_minutes?.toString() || "30");
    setServicePrice(service.price?.toString() || "20000");
    setIsExtra(!!service.is_extra);
    setImageUrl(service.image_url || "");
    setDropdownOpen(false);
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    setShowUrlInput(Boolean(service.image_url && !service.image_url.startsWith("file:")));
    setModalVisible(true);
  };

  const handlePickDesignPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast("Please allow photo access to upload service designs.", "warning");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setImageUrl(result.assets[0].uri);
      }
    } catch {
      showToast("Failed to open image picker.", "error");
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      showToast("Please enter a category name.", "warning");
      return;
    }
    const alreadyExists = modalCategories.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      const existingName = modalCategories.find(
        (c) => c.toLowerCase() === trimmed.toLowerCase()
      )!;
      setServiceCategory(existingName);
    } else {
      setCustomCategories((prev) => [...prev, trimmed]);
      setServiceCategory(trimmed);
      showToast(`Category "${trimmed}" added.`, "success");
    }
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      showToast("Please enter a service name.", "error");
      return;
    }
    const priceNum = parseFloat(servicePrice.replace(/[^0-9.]/g, "")) || 0;
    const durNum = isExtra ? 0 : (parseInt(serviceDuration.replace(/[^0-9]/g, ""), 10) || 30);

    if (priceNum <= 0) {
      showToast("Please enter a valid price in CFA.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await barberService.addService(
        {
          id: editingServiceId || undefined,
          name: serviceName.trim(),
          category: serviceCategory,
          duration_minutes: durNum,
          price: priceNum,
          is_extra: isExtra,
          image_url: imageUrl.trim() || null,
        },
        barberId
      );

      if (editingServiceId) {
        setServices((prev) =>
          prev.map((s) => (s.id === editingServiceId ? saved : s))
        );
        showToast(`Service "${saved.name}" updated successfully.`, "success");
      } else {
        setServices((prev) => [saved, ...prev]);
        showToast(`Service "${saved.name}" added to your menu.`, "success");
      }

      setModalVisible(false);
    } catch {
      showToast("Failed to save service.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (serviceToDelete) {
      await barberService.deleteService(serviceToDelete.id!, barberId);
      setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
      showToast(`"${serviceToDelete.name}" removed from catalog.`, "info");
      setServiceToDelete(null);
    }
  };

  const filteredServices = services.filter((s) => {
    if (catalogTab === "hairstyles" && s.is_extra) return false;
    if (catalogTab === "extras" && !s.is_extra) return false;
    if (selectedCategory === "All") return true;
    return s.category === selectedCategory;
  });

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
            {t("manageServices.title")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {t("manageServices.subtitle")}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[
              styles.headerBtn,
              {
                backgroundColor: colors.surface,
                borderWidth: 1,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <Ionicons
              name="help-circle-outline"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleOpenAddModal}
            style={[styles.addHeaderBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#1C1E1B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Catalog Tabs: Hairstyles vs Extra Services */}
      <View style={styles.catalogTabRow}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setCatalogTab("hairstyles");
            setSelectedCategory("All");
          }}
          style={[
            styles.catalogTabBtn,
            {
              backgroundColor: catalogTab === "hairstyles" ? colors.primary : colors.surface,
              borderColor: catalogTab === "hairstyles" ? colors.primary : colors.surfacevariant,
            },
          ]}
        >
          <Ionicons
            name="cut-outline"
            size={16}
            color={catalogTab === "hairstyles" ? "#1C1E1B" : colors.secondarytext}
          />
          <Text
            style={[
              styles.catalogTabBtnText,
              { color: catalogTab === "hairstyles" ? "#1C1E1B" : colors.primarytext },
            ]}
          >
            {t("manageServices.hairstylesTab")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            setCatalogTab("extras");
            setSelectedCategory("All");
          }}
          style={[
            styles.catalogTabBtn,
            {
              backgroundColor: catalogTab === "extras" ? colors.primary : colors.surface,
              borderColor: catalogTab === "extras" ? colors.primary : colors.surfacevariant,
            },
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={16}
            color={catalogTab === "extras" ? "#1C1E1B" : colors.secondarytext}
          />
          <Text
            style={[
              styles.catalogTabBtnText,
              { color: catalogTab === "extras" ? "#1C1E1B" : colors.primarytext },
            ]}
          >
            {t("manageServices.extrasTab")}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Pills */}
      <View style={styles.categoriesRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {allDisplayCategories.map((cat) => {
            const isSelected = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.8}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderColor: isSelected
                      ? colors.primary
                      : colors.surfacevariant,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Ionicons
                    name={cat === "All" ? "grid-outline" : getCategoryIcon(cat)}
                    size={13}
                    color={isSelected ? "#1C1E1B" : colors.secondarytext}
                  />
                  <Text
                    style={[
                      styles.categoryText,
                      {
                        color: isSelected ? "#1C1E1B" : colors.secondarytext,
                        fontWeight: isSelected ? "700" : "500",
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <BarberCardSkeleton />
            <BarberCardSkeleton />
          </View>
        ) : filteredServices.length === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
              ]}
            >
              <Ionicons name="cut-outline" size={36} color={colors.secondarytext} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {t("manageServices.noServicesFound")}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              {t("manageServices.noServicesHint")}
            </Text>
          </View>
        ) : (
          <View style={styles.servicesList}>
            {filteredServices.map((service) => (
              <View
                key={service.id}
                style={[
                  styles.serviceCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                {service.image_url ? (
                  <Image
                    source={{ uri: service.image_url }}
                    style={styles.serviceThumbnail}
                    resizeMode="cover"
                  />
                ) : null}

                <View style={styles.serviceInfo}>
                  <View style={styles.serviceTitleRow}>
                    <Text
                      style={[styles.serviceName, { color: colors.primarytext }]}
                    >
                      {service.name}
                    </Text>
                    <View
                      style={[
                        styles.categoryBadge,
                        { backgroundColor: service.is_extra ? "rgba(245, 158, 11, 0.15)" : "rgba(163, 179, 156, 0.15)" },
                      ]}
                    >
                      <Text style={[styles.categoryBadgeText, { color: service.is_extra ? "#F59E0B" : colors.primary }]}>
                        {service.is_extra ? "Extra Service" : (service.category || "General")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.serviceMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons
                        name={service.is_extra ? "sparkles-outline" : "time-outline"}
                        size={14}
                        color={colors.secondarytext}
                      />
                      <Text style={[styles.metaText, { color: colors.secondarytext }]}>
                        {service.is_extra ? t("manageServices.extraServiceAddon") : `${service.duration_minutes} mins`}
                      </Text>
                    </View>
                    <Text style={[styles.priceTag, { color: colors.primary }]}>
                      {service.price.toLocaleString()} CFA
                    </Text>
                  </View>
                </View>

                {/* Card Action Buttons */}
                <View style={styles.actionBtnsRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => handleOpenEditModal(service)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "rgba(255, 255, 255, 0.06)" },
                    ]}
                  >
                    <Ionicons name="create-outline" size={16} color={colors.primarytext} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setServiceToDelete(service)}
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "rgba(239, 68, 68, 0.12)" },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Full Screen Add / Edit Service Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView
          style={[styles.fullScreenModalContainer, { backgroundColor: colors.background }]}
          edges={["top", "bottom"]}
        >
          <StatusBar barStyle="light-content" backgroundColor={colors.background} />

          {/* Full Screen Header */}
          <View style={[styles.fullScreenHeader, { borderBottomColor: colors.surfacevariant }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
              style={[styles.fullScreenCloseBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={22} color={colors.primarytext} />
            </TouchableOpacity>

            <View style={styles.fullScreenTitleWrap}>
              <Text style={[styles.fullScreenTitle, { color: colors.primarytext }]}>
                {editingServiceId ? t("manageServices.editService") : t("manageServices.addService")}
              </Text>
              <Text style={[styles.fullScreenSubtitle, { color: colors.secondarytext }]} numberOfLines={1}>
                {editingServiceId ? "Modify pricing, custom duration & details" : "Set custom duration, price, category & design photo"}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setServiceName("");
                setServiceDuration("45");
                setServicePrice("25000");
                setImageUrl("");
              }}
              style={styles.fullScreenResetBtn}
            >
              <Text style={[styles.fullScreenResetText, { color: colors.primary }]}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Full Screen Scrollable Body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.fullScreenScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Design Photo Upload Section */}
            <View style={[styles.modalCardSection, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="camera-outline" size={18} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.primarytext, marginBottom: 0 }]}>
                    {t("manageServices.uploadDesignPhoto")}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowUrlInput(!showUrlInput)}
                >
                  <Text style={[styles.toggleUrlText, { color: colors.primary }]}>
                    {showUrlInput ? "Hide Link" : "Paste Link"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionHintText, { color: colors.secondarytext }]}>
                Upload high-definition photos of this specific cut or hairstyle to showcase on your profile.
              </Text>

              {imageUrl ? (
                <View style={[styles.previewContainer, { borderColor: colors.surfacevariant, backgroundColor: colors.background, marginTop: 10 }]}>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.designPreviewImg}
                    resizeMode="cover"
                  />
                  <View style={styles.previewActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickDesignPhoto}
                      style={[styles.photoActionBtn, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}
                    >
                      <Ionicons name="image-outline" size={14} color={colors.primarytext} />
                      <Text style={[styles.photoActionText, { color: colors.primarytext }]}>
                        {t("manageServices.changePhoto")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setImageUrl("")}
                      style={[styles.photoActionBtn, { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.3)" }]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.photoActionText, { color: "#EF4444" }]}>
                        {t("manageServices.removePhoto")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={handlePickDesignPhoto}
                  style={[
                    styles.uploadDottedBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                      marginTop: 10,
                    },
                  ]}
                >
                  <View style={[styles.uploadIconCircle, { backgroundColor: "rgba(163, 179, 156, 0.15)" }]}>
                    <Ionicons name="cloud-upload-outline" size={26} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBoxTitle, { color: colors.primarytext }]}>
                    {t("manageServices.chooseFromGallery")}
                  </Text>
                  <Text style={[styles.uploadBoxSubtitle, { color: colors.secondarytext }]}>
                    {t("manageServices.uploadPhotoPrompt")}
                  </Text>
                </TouchableOpacity>
              )}

              {showUrlInput && (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                      color: colors.primarytext,
                      marginTop: 10,
                    },
                  ]}
                  placeholder="https://images.unsplash.com/photo-..."
                  placeholderTextColor={colors.secondarytext}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                />
              )}
            </View>

            {/* 2. Category Section with Vector Icons & Add Category */}
            <View style={[styles.modalCardSection, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="pricetags-outline" size={18} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.primarytext, marginBottom: 0 }]}>
                    {t("manageServices.categoryLabel")}
                  </Text>
                </View>

                {!isAddingNewCategory ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsAddingNewCategory(true)}
                    style={[styles.addCategoryHeaderBtn, { backgroundColor: "rgba(163, 179, 156, 0.15)" }]}
                  >
                    <Ionicons name="add" size={14} color={colors.primary} />
                    <Text style={[styles.addCategoryHeaderText, { color: colors.primary }]}>
                      {t("manageServices.addNewCategory")}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Inline Custom Category Creator */}
              {isAddingNewCategory && (
                <View style={[styles.newCategoryCard, { backgroundColor: colors.background, borderColor: colors.primary, marginTop: 10 }]}>
                  <TextInput
                    style={[styles.newCategoryInput, { color: colors.primarytext }]}
                    placeholder={t("manageServices.enterCategoryName")}
                    placeholderTextColor={colors.secondarytext}
                    value={newCategoryInput}
                    onChangeText={setNewCategoryInput}
                    autoFocus
                  />
                  <View style={styles.newCategoryBtnRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => {
                        setIsAddingNewCategory(false);
                        setNewCategoryInput("");
                      }}
                      style={[styles.newCatCancelBtn, { borderColor: colors.surfacevariant }]}
                    >
                      <Text style={{ color: colors.secondarytext, fontSize: 12 }}>
                        {t("common.cancel")}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleAddNewCategory}
                      style={[styles.newCatAddBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={{ color: "#1C1E1B", fontWeight: "700", fontSize: 12 }}>
                        {t("manageServices.addCategoryBtn")}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Category Grid with Vector Icons */}
              <View style={[styles.categoryGrid, { marginTop: 10 }]}>
                {modalCategories.map((cat) => {
                  const isSelected = serviceCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      activeOpacity={0.8}
                      onPress={() => {
                        setServiceCategory(cat);
                        const suggested = CATEGORY_DEFAULT_DURATIONS[cat];
                        if (suggested !== undefined && !isExtra) {
                          setServiceDuration(suggested);
                        }
                        setDropdownOpen(false);
                      }}
                      style={[
                        styles.categoryGridItem,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.background,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.surfacevariant,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(cat)}
                        size={20}
                        color={isSelected ? "#1C1E1B" : colors.primary}
                      />
                      <Text
                        style={{
                          color: isSelected ? "#1C1E1B" : colors.primarytext,
                          fontSize: 11.5,
                          fontWeight: isSelected ? "700" : "500",
                          textAlign: "center",
                          lineHeight: 15,
                        }}
                        numberOfLines={2}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Service Name & Popular Presets */}
            <View style={[styles.modalCardSection, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="sparkles-outline" size={18} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.primarytext, marginBottom: 0 }]}>
                  {t("manageServices.selectPopularService")}
                </Text>
              </View>

              {/* Dropdown Selector Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDropdownOpen(!dropdownOpen)}
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: dropdownOpen ? colors.primary : colors.surfacevariant,
                    marginTop: 10,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownButtonText,
                    { color: serviceName ? colors.primarytext : colors.secondarytext },
                  ]}
                  numberOfLines={1}
                >
                  {serviceName ? `Selected: ${serviceName}` : t("manageServices.selectPopularService")}
                </Text>
                <Ionicons
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.secondarytext}
                />
              </TouchableOpacity>

              {/* Dropdown Menu List */}
              {dropdownOpen && (
                <View
                  style={[
                    styles.dropdownMenu,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                  >
                    {(KNOWN_SERVICES_BY_CATEGORY[serviceCategory] || []).map((known) => {
                      const isKnownSelected = serviceName === known;
                      return (
                        <TouchableOpacity
                          key={known}
                          activeOpacity={0.7}
                          onPress={() => {
                            setServiceName(known);
                            setDropdownOpen(false);
                          }}
                          style={[
                            styles.dropdownItem,
                            isKnownSelected && {
                              backgroundColor: "rgba(163, 179, 156, 0.15)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color: isKnownSelected
                                  ? colors.primary
                                  : colors.primarytext,
                                fontWeight: isKnownSelected ? "700" : "500",
                              },
                            ]}
                          >
                            {known}
                          </Text>
                          {isKnownSelected && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={colors.primary}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}

                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => {
                        setDropdownOpen(false);
                      }}
                      style={[
                        styles.dropdownItem,
                        { borderTopWidth: 1, borderTopColor: colors.surfacevariant },
                      ]}
                    >
                      <Text
                        style={[
                          styles.dropdownItemText,
                          { color: colors.primary, fontWeight: "600" },
                        ]}
                      >
                        {t("manageServices.customServiceOption")}
                      </Text>
                    </TouchableOpacity>
                  </ScrollView>
                </View>
              )}

              {/* Direct Service Name TextInput */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldSubLabel, { color: colors.secondarytext, marginBottom: 6 }]}>
                  {t("manageServices.orEnterCustomName")}
                </Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                      color: colors.primarytext,
                    },
                  ]}
                  placeholder={t("manageServices.serviceNamePlaceholder")}
                  placeholderTextColor={colors.secondarytext}
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>
            </View>

            {/* 4. BARBER DURATION SETTINGS (Prominent duration control) */}
            {!isExtra && (
              <View style={[styles.modalCardSection, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWithIcon}>
                    <Ionicons name="time-outline" size={18} color={colors.primary} />
                    <Text style={[styles.inputLabel, { color: colors.primarytext, marginBottom: 0 }]}>
                      Service Duration (Set by Barber)
                    </Text>
                  </View>
                  <View style={[styles.durationBadgePill, { backgroundColor: "rgba(163, 179, 156, 0.2)" }]}>
                    <Text style={[styles.durationBadgePillText, { color: colors.primary }]}>
                      {formatDurationDisplay(parseInt(serviceDuration, 10) || 45)}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.sectionHintText, { color: colors.secondarytext }]}>
                  You have full control over the duration. Client booking slots on the calendar will be automatically partitioned according to this exact duration.
                </Text>

                {/* Quick Presets */}
                <Text style={[styles.fieldSubLabel, { color: colors.secondarytext, marginTop: 12, marginBottom: 8 }]}>
                  Quick Select Duration:
                </Text>
                <View style={styles.durationPresetWrap}>
                  {DURATION_PRESETS.map((mins) => {
                    const isSelected = parseInt(serviceDuration, 10) === mins;
                    return (
                      <TouchableOpacity
                        key={mins}
                        activeOpacity={0.8}
                        onPress={() => setServiceDuration(String(mins))}
                        style={[
                          styles.durationPresetChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.surfacevariant,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.durationPresetText,
                            {
                              color: isSelected ? "#1C1E1B" : colors.primarytext,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {mins < 60 ? `${mins}m` : mins % 60 === 0 ? `${mins / 60}h` : `${Math.floor(mins / 60)}h ${mins % 60}m`}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Stepper and Custom Minutes Input */}
                <Text style={[styles.fieldSubLabel, { color: colors.secondarytext, marginTop: 12, marginBottom: 8 }]}>
                  Or Enter Custom Minutes:
                </Text>
                <View style={styles.durationStepperRow}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const cur = parseInt(serviceDuration, 10) || 45;
                      setServiceDuration(String(Math.max(15, cur - 15)));
                    }}
                    style={[styles.stepperButton, { backgroundColor: colors.background, borderColor: colors.surfacevariant }]}
                  >
                    <Text style={[styles.stepperButtonText, { color: colors.primarytext }]}>-15m</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const cur = parseInt(serviceDuration, 10) || 45;
                      setServiceDuration(String(Math.max(15, cur - 5)));
                    }}
                    style={[styles.stepperButton, { backgroundColor: colors.background, borderColor: colors.surfacevariant }]}
                  >
                    <Ionicons name="remove" size={18} color={colors.primarytext} />
                  </TouchableOpacity>

                  <View style={[styles.durationInputBox, { backgroundColor: colors.background, borderColor: colors.surfacevariant }]}>
                    <TextInput
                      style={[styles.durationTextInput, { color: colors.primarytext }]}
                      keyboardType="numeric"
                      value={serviceDuration}
                      onChangeText={(val) => setServiceDuration(val.replace(/[^0-9]/g, ""))}
                      placeholder="45"
                      placeholderTextColor={colors.secondarytext}
                    />
                    <Text style={[styles.durationInputUnit, { color: colors.secondarytext }]}>mins</Text>
                  </View>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const cur = parseInt(serviceDuration, 10) || 45;
                      setServiceDuration(String(cur + 5));
                    }}
                    style={[styles.stepperButton, { backgroundColor: colors.background, borderColor: colors.surfacevariant }]}
                  >
                    <Ionicons name="add" size={18} color={colors.primarytext} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      const cur = parseInt(serviceDuration, 10) || 45;
                      setServiceDuration(String(cur + 15));
                    }}
                    style={[styles.stepperButton, { backgroundColor: colors.background, borderColor: colors.surfacevariant }]}
                  >
                    <Text style={[styles.stepperButtonText, { color: colors.primarytext }]}>+15m</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.durationNoticeBox, { backgroundColor: "rgba(163, 179, 156, 0.12)", borderColor: "rgba(163, 179, 156, 0.3)" }]}>
                  <Ionicons name="calendar-outline" size={16} color={colors.primary} />
                  <Text style={[styles.durationNoticeText, { color: colors.primary }]}>
                    Clients booking "{serviceName || "this service"}" will be offered slots every {serviceDuration || 45} minutes.
                  </Text>
                </View>
              </View>
            )}

            {/* 5. Pricing Section */}
            <View style={[styles.modalCardSection, { backgroundColor: colors.surface, borderColor: colors.surfacevariant }]}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="cash-outline" size={18} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.primarytext, marginBottom: 0 }]}>
                  {t("manageServices.priceLabel")} (CFA)
                </Text>
              </View>
              <Text style={[styles.sectionHintText, { color: colors.secondarytext }]}>
                Set your standard price in FCFA for this service.
              </Text>

              <View style={[styles.priceInputWrapper, { backgroundColor: colors.background, borderColor: colors.surfacevariant, marginTop: 10 }]}>
                <Text style={[styles.priceCurrencyPrefix, { color: colors.primary }]}>FCFA</Text>
                <TextInput
                  style={[styles.priceTextInput, { color: colors.primarytext }]}
                  keyboardType="numeric"
                  placeholder="25000"
                  placeholderTextColor={colors.secondarytext}
                  value={servicePrice}
                  onChangeText={setServicePrice}
                />
              </View>

              {/* Price Shortcuts */}
              <View style={styles.priceShortcutsRow}>
                {PRICE_PRESETS.map((p) => {
                  const isSelected = servicePrice === String(p);
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.8}
                      onPress={() => setServicePrice(String(p))}
                      style={[
                        styles.priceShortcutChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.surfacevariant,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priceShortcutText,
                          {
                            color: isSelected ? "#1C1E1B" : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {p.toLocaleString()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 6. Extra Service / Add-on Toggle */}
            <View
              style={[
                styles.extraToggleCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isExtra ? "#F59E0B" : colors.surfacevariant,
                },
              ]}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.extraToggleTitle, { color: colors.primarytext }]}>
                  Extra Service / Add-on
                </Text>
                <Text style={[styles.extraToggleSub, { color: colors.secondarytext }]}>
                  No separate calendar slot required (e.g. Beard Oil, Facial Scrub, Eyebrows). Added alongside primary haircut.
                </Text>
              </View>
              <Switch
                value={isExtra}
                onValueChange={setIsExtra}
                trackColor={{ false: "#767577", true: colors.primary }}
                thumbColor={isExtra ? "#1C1E1B" : "#f4f3f4"}
              />
            </View>
          </ScrollView>

          {/* Sticky Bottom Full Screen Footer */}
          <View style={[styles.fullScreenFooterBar, { backgroundColor: colors.surface, borderTopColor: colors.surfacevariant }]}>
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleSaveService}
              disabled={isSubmitting}
              style={[styles.fullScreenSaveBtn, { backgroundColor: colors.primary }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#1C1E1B" />
              ) : (
                <>
                  <Ionicons name={editingServiceId ? "save-outline" : "checkmark-circle-outline"} size={20} color="#1C1E1B" />
                  <Text style={styles.fullScreenSaveBtnText}>
                    {editingServiceId ? t("manageServices.updateService") : t("manageServices.addToCatalog")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Modal */}
      <CustomModal
        visible={!!serviceToDelete}
        title={t("manageServices.removeService")}
        onClose={() => setServiceToDelete(null)}
      >
        <View style={{ gap: 16 }}>
          <Text style={{ color: colors.secondarytext, fontSize: 13.5, lineHeight: 19 }}>
            Are you sure you want to remove "{serviceToDelete?.name}" from your service
            catalog? {t("manageServices.removeServiceMsg")}
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setServiceToDelete(null)}
              style={[
                styles.modalCancelBtn,
                { borderColor: colors.surfacevariant },
              ]}
            >
              <Text style={{ color: colors.primarytext, fontWeight: "600" }}>
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleConfirmDelete}
              style={[styles.modalDeleteBtn, { backgroundColor: "#EF4444" }]}
            >
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>{t("manageServices.remove")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </CustomModal>

      {/* In-App Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="manage_services"
        title={MANAGE_SERVICES_TUTORIAL.title}
        subtitle={MANAGE_SERVICES_TUTORIAL.subtitle}
        steps={MANAGE_SERVICES_TUTORIAL.steps}
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
    flex: 1,
    marginHorizontal: 12,
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  addHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  categoriesRow: {
    paddingBottom: 10,
  },
  categoriesScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
  },
  categoryText: {
    fontSize: 12.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: "700",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryBadgeText: {
    fontSize: 10.5,
    fontWeight: "600",
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  priceTag: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  actionBtnsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 13.5,
  },
  categorySelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  saveBtnText: {
    color: "#1C1E1B",
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
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
  catalogTabRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },
  catalogTabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  catalogTabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  serviceThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
  },
  extraToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  extraToggleTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  extraToggleSub: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  categoryGridItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 6,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  toggleUrlText: {
    fontSize: 12,
    fontWeight: "600",
  },
  previewContainer: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 8,
    gap: 8,
  },
  designPreviewImg: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: "600",
  },
  uploadDottedBox: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  uploadBoxTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  uploadBoxSubtitle: {
    fontSize: 11,
    textAlign: "center",
  },
  addCategoryHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addCategoryHeaderText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  newCategoryCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginBottom: 10,
  },
  newCategoryInput: {
    fontSize: 13.5,
    paddingVertical: 4,
  },
  newCategoryBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  newCatCancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  newCatAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginTop: 6,
  },
  dropdownButtonText: {
    fontSize: 13.5,
    flex: 1,
    marginRight: 8,
  },
  dropdownMenu: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  dropdownItemText: {
    fontSize: 13,
  },
  fieldSubLabel: {
    fontSize: 11.5,
    marginBottom: 4,
  },
  fullScreenModalContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  fullScreenCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenTitleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  fullScreenTitle: {
    fontSize: 17.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  fullScreenSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  fullScreenResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullScreenResetText: {
    fontSize: 13,
    fontWeight: "600",
  },
  fullScreenScrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 60,
  },
  modalCardSection: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  sectionHintText: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  durationBadgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationBadgePillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  durationPresetWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  durationPresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  durationPresetText: {
    fontSize: 12,
  },
  durationStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepperButton: {
    height: 42,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperButtonText: {
    fontSize: 12,
    fontWeight: "700",
  },
  durationInputBox: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
  },
  durationTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },
  durationInputUnit: {
    fontSize: 12,
    marginLeft: 2,
  },
  durationNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  durationNoticeText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  priceInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    paddingHorizontal: 14,
  },
  priceCurrencyPrefix: {
    fontSize: 14,
    fontWeight: "800",
    marginRight: 8,
  },
  priceTextInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  priceShortcutsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  priceShortcutChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  priceShortcutText: {
    fontSize: 11.5,
  },
  fullScreenFooterBar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  fullScreenSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
  },
  fullScreenSaveBtnText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "800",
  },
});
