import { BarberCardSkeleton } from "@/components/ui/Skeleton";
import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { MANAGE_SERVICES_TUTORIAL } from "@/constants/barberTutorials";
import { FontFamily } from "@/constants/theme";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { barberService, BarberServiceItem } from "@/services/barberService";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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

const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120, 150, 180];
const PRICE_PRESETS = [1000, 2000, 3500, 5000, 10000, 15000, 20000, 30000, 50000];

const CATEGORY_NAMES_FR: Record<string, string> = {
  All: "Tous",
  "Haircuts & Styling": "Coupes & Coiffures",
  "Braids & Locs": "Tresses & Locks",
  "Weaves & Extensions": "Tissages & Extensions",
  "Silk Press & Natural Hair": "Silk Press & Cheveux Naturels",
  "Color & Treatments": "Coloration & Soins",
  "Beard & Shave": "Barbe & Rasage",
  "Skincare & Facials": "Soins du Visage",
  "Extra Services": "Services Supplémentaires",
};

function formatDurationDisplay(mins: number, lang: string = "en"): string {
  if (mins <= 0) return lang === "fr" ? "Supplément" : "Add-on";
  if (mins < 60) return lang === "fr" ? `${mins} min` : `${mins} mins`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (lang === "fr") {
    return m === 0 ? `${h} h` : `${h}h ${m}m`;
  }
  return m === 0 ? `${h} hr${h > 1 ? "s" : ""}` : `${h}h ${m}m`;
}

export default function ManageServicesScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t, language } = useLanguage();

  const barberId = user?.id || 4;

  const [services, setServices] = useState<BarberServiceItem[]>([]);
  const [catalogTab, setCatalogTab] = useState<"hairstyles" | "extras">("hairstyles");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);

  // Add / Edit Modal state
  const isSalon = Boolean(user?.role === "salon" || user?.is_manager || user?.is_lead);
  const [salonStaff, setSalonStaff] = useState<any[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | number | null>(null);
  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Haircuts & Styling");
  const [serviceDuration, setServiceDuration] = useState("45");
  const [servicePrice, setServicePrice] = useState("1000");
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

      if (isSalon) {
        try {
          const staffRes = await barberService.listSalonStaff(barberId);
          setSalonStaff(Array.isArray(staffRes) ? staffRes : (staffRes as any)?.staff || []);
        } catch {}
      }

      const existingCustom = list
        .map((s) => s.category)
        .filter((cat): cat is string => Boolean(cat) && !DEFAULT_CATEGORIES.includes(cat));

      if (existingCustom.length > 0) {
        setCustomCategories((prev) => Array.from(new Set([...prev, ...existingCustom])));
      }

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
      showToast(
        language === "fr"
          ? "Impossible de charger le catalogue de services."
          : "Unable to load services catalog.",
        "error"
      );
    }
  }, [barberId, showToast, language]);

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
    showToast(
      language === "fr"
        ? "Catalogue de services mis à jour."
        : "Services catalog updated.",
      "info"
    );
  }, [fetchServices, showToast, language]);

  const handleOpenAddModal = () => {
    setEditingServiceId(null);
    setServiceName("");
    if (catalogTab === "extras") {
      setIsExtra(true);
      setServiceCategory("Extra Services");
      setServiceDuration("0");
    } else {
      setIsExtra(false);
      setServiceCategory("Haircuts & Styling");
      setServiceDuration("45");
    }
    setServicePrice("1000");
    setImageUrl("");
    setSelectedStaffIds([]);
    setDropdownOpen(false);
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
    setShowUrlInput(false);
    setModalVisible(true);
  };

  const handleOpenEditModal = (service: BarberServiceItem) => {
    setEditingServiceId(service.id || null);
    setServiceName(service.name);
    setServiceCategory(
      service.category || (service.is_extra ? "Extra Services" : "Haircuts & Styling")
    );
    setServiceDuration(service.duration_minutes?.toString() || "30");
    setServicePrice(service.price ? service.price.toString() : "1000");
    setIsExtra(!!service.is_extra);
    setImageUrl(service.image_url || "");
    setSelectedStaffIds(service.assigned_staff_ids || []);
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
        showToast(
          language === "fr"
            ? "Veuillez autoriser l'accès aux photos pour télécharger des modèles."
            : "Please allow photo access to upload service designs.",
          "warning"
        );
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
      showToast(
        language === "fr"
          ? "Échec de l'ouverture de la galerie photo."
          : "Failed to open image picker.",
        "error"
      );
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      showToast(
        language === "fr"
          ? "Veuillez saisir un nom de catégorie."
          : "Please enter a category name.",
        "warning"
      );
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
      showToast(
        language === "fr"
          ? `Catégorie "${trimmed}" ajoutée.`
          : `Category "${trimmed}" added.`,
        "success"
      );
    }
    setIsAddingNewCategory(false);
    setNewCategoryInput("");
  };

  const handleSaveService = async () => {
    if (!serviceName.trim()) {
      showToast(
        language === "fr"
          ? "Veuillez saisir un nom de service."
          : "Please enter a service name.",
        "error"
      );
      return;
    }
    const rawPrice = parseFloat(servicePrice.replace(/[^0-9.]/g, ""));
    const priceNum = !isNaN(rawPrice) && rawPrice >= 1000 ? rawPrice : 1000;
    const durNum = isExtra ? 0 : (parseInt(serviceDuration.replace(/[^0-9]/g, ""), 10) || 30);

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
          assigned_staff_ids: isSalon ? selectedStaffIds : undefined,
        },
        barberId
      );

      if (editingServiceId) {
        setServices((prev) =>
          prev.map((s) => (s.id === editingServiceId ? { ...s, ...saved } : s))
        );
        showToast(
          language === "fr"
            ? `"${serviceName}" mis à jour avec succès.`
            : `"${serviceName}" updated successfully.`,
          "success"
        );
      } else {
        setServices((prev) => [saved, ...prev]);
        showToast(
          language === "fr"
            ? `"${serviceName}" ajouté au catalogue.`
            : `"${serviceName}" added to services catalog.`,
          "success"
        );
      }
      setModalVisible(false);
    } catch {
      showToast(
        language === "fr"
          ? "Échec de l'enregistrement du service. Veuillez réessayer."
          : "Failed to save service. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDeleteService = async () => {
    if (serviceToDelete && serviceToDelete.id != null) {
      try {
        await barberService.deleteService(serviceToDelete.id, barberId);
        setServices((prev) => prev.filter((s) => s.id !== serviceToDelete.id));
        showToast(
          language === "fr"
            ? `Service "${serviceToDelete.name}" supprimé.`
            : `Service "${serviceToDelete.name}" deleted.`,
          "info"
        );
      } catch {
        showToast(
          language === "fr"
            ? "Échec de la suppression du service."
            : "Failed to delete service.",
          "error"
        );
      } finally {
        setServiceToDelete(null);
      }
    }
  };

  const filteredServices = services.filter((s) => {
    if (catalogTab === "hairstyles" && s.is_extra) return false;
    if (catalogTab === "extras" && !s.is_extra) return false;
    if (selectedCategory !== "All" && s.category !== selectedCategory)
      return false;
    return true;
  });

  // Telemetry Aggregates
  const haircutsCount = services.filter((s) => !s.is_extra).length;
  const extrasCount = services.filter((s) => s.is_extra).length;
  const avgPrice =
    services.length > 0
      ? Math.round(services.reduce((acc, s) => acc + (s.price || 0), 0) / services.length)
      : 0;

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
            {language === "fr" ? "Services & Tarifs" : "Services & Pricing"}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.secondarytext }]}>
            {services.length} services • {language === "fr" ? "Moy." : "Avg"} {avgPrice.toLocaleString()} CFA
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
            onPress={handleOpenAddModal}
            style={[styles.addServiceBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color={colors.onBrand} />
            <Text style={[styles.addServiceBtnText, { color: colors.onBrand }]}>
              {language === "fr" ? "Ajouter" : "Add Service"}
            </Text>
          </TouchableOpacity>
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
        {/* Telemetry Summary Command Card */}
        <View
          style={[
            styles.telemetryCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.telemetryGrid}>
            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                {services.length}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                {language === "fr" ? "Total Catalogue" : "Total Catalog"}
              </Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {haircutsCount}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                {language === "fr" ? "Coupes Principales" : "Core Styles"}
              </Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primarytext }]}>
                {extrasCount}
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                {language === "fr" ? "Suppléments" : "Add-ons"}
              </Text>
            </View>

            <View style={[styles.telemetryDivider, { backgroundColor: colors.border }]} />

            <View style={styles.telemetryCell}>
              <Text style={[styles.telemetryValue, { color: colors.primary }]}>
                {avgPrice.toLocaleString()} CFA
              </Text>
              <Text style={[styles.telemetryLabel, { color: colors.secondarytext }]}>
                {t("manageServices.averagePrice") || "Average Price"}
              </Text>
            </View>
          </View>
        </View>

        {/* Catalog Segment Switcher (Hairstyles vs Extras) */}
        <View
          style={[
            styles.catalogTabTrack,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setCatalogTab("hairstyles");
              setSelectedCategory("All");
            }}
            style={[
              styles.catalogTabPill,
              catalogTab === "hairstyles"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="cut-outline"
              size={15}
              color={catalogTab === "hairstyles" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.catalogTabPillText,
                { color: catalogTab === "hairstyles" ? colors.onBrand : colors.primarytext },
              ]}
            >
              {language === "fr" ? "Coupes Principales" : "Core Hairstyles"} ({haircutsCount})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              setCatalogTab("extras");
              setSelectedCategory("All");
            }}
            style={[
              styles.catalogTabPill,
              catalogTab === "extras"
                ? { backgroundColor: colors.primary }
                : { backgroundColor: "transparent" },
            ]}
          >
            <Ionicons
              name="sparkles-outline"
              size={15}
              color={catalogTab === "extras" ? colors.onBrand : colors.secondarytext}
            />
            <Text
              style={[
                styles.catalogTabPillText,
                { color: catalogTab === "extras" ? colors.onBrand : colors.primarytext },
              ]}
            >
              {language === "fr" ? "Suppléments & Extras" : "Add-ons & Extras"} ({extrasCount})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter Carousel */}
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
                  styles.categoryChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.surface,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Ionicons
                  name={cat === "All" ? "grid-outline" : getCategoryIcon(cat)}
                  size={13}
                  color={isSelected ? colors.onBrand : colors.primary}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    {
                      color: isSelected ? colors.onBrand : colors.primarytext,
                      fontWeight: isSelected ? "700" : "500",
                    },
                  ]}
                >
                  {language === "fr" ? (CATEGORY_NAMES_FR[cat] || cat) : cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Services List */}
        {isLoading ? (
          <View style={{ gap: 12 }}>
            <BarberCardSkeleton />
            <BarberCardSkeleton />
          </View>
        ) : filteredServices.length === 0 ? (
          <View
            style={[
              styles.emptyStateCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: colors.background, borderColor: colors.border },
              ]}
            >
              <Ionicons name="cut-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.primarytext }]}>
              {language === "fr" ? "Aucun service trouvé" : "No Services Found"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondarytext }]}>
              {t("manageServices.tapAddServiceFirst") || "Tap \"Add Service\" above to add your first hairstyle or grooming service."}
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
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Thumbnail / Monogram */}
                {service.image_url ? (
                  <Image
                    source={{ uri: service.image_url }}
                    style={styles.serviceThumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.serviceThumbnailFallback,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons
                      name={
                        service.is_extra
                          ? "sparkles"
                          : getCategoryIcon(service.category || "Haircuts & Styling")
                      }
                      size={24}
                      color={colors.primary}
                    />
                  </View>
                )}

                {/* Details */}
                <View style={styles.serviceInfo}>
                  <View style={styles.serviceNamePriceRow}>
                    <Text
                      style={[styles.serviceName, { color: colors.primarytext }]}
                      numberOfLines={1}
                    >
                      {service.name}
                    </Text>
                    <Text style={[styles.servicePrice, { color: colors.primary }]}>
                      {(Number(service.price) > 0 ? Number(service.price) : 1000).toLocaleString()} CFA
                    </Text>
                  </View>

                  <View style={styles.serviceMetaRow}>
                    <View
                      style={[
                        styles.categoryPillSmall,
                        {
                          backgroundColor: service.is_extra
                            ? "rgba(245, 158, 11, 0.12)"
                            : "rgba(199, 243, 107, 0.12)",
                          borderColor: service.is_extra
                            ? "rgba(245, 158, 11, 0.3)"
                            : "rgba(199, 243, 107, 0.3)",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryPillSmallText,
                          { color: service.is_extra ? "#F59E0B" : colors.primary },
                        ]}
                      >
                        {service.is_extra
                          ? (language === "fr" ? "Supplément" : "Extra Add-on")
                          : (language === "fr" ? (CATEGORY_NAMES_FR[service.category || ""] || service.category || "Général") : (service.category || "General"))}
                      </Text>
                    </View>

                    <View style={styles.durationRow}>
                      <Ionicons
                        name={service.is_extra ? "sparkles-outline" : "time-outline"}
                        size={12}
                        color={colors.secondarytext}
                      />
                      <Text style={[styles.durationText, { color: colors.secondarytext }]}>
                        {formatDurationDisplay(service.duration_minutes || 0, language)}
                      </Text>
                    </View>
                  </View>
                  {isSalon && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 }}>
                      <Ionicons name="people-outline" size={12} color={colors.primary} />
                      <Text style={{ fontSize: 11, color: colors.secondarytext }} numberOfLines={1}>
                        {service.assigned_staff_names && service.assigned_staff_names.length > 0
                          ? `${language === "fr" ? "Attribué à" : "Assigned"}: ${service.assigned_staff_names.join(", ")}`
                          : (language === "fr" ? "Attribué à tous les coiffeurs" : "Assigned to all stylists")}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Actions: Edit & Delete */}
                <View style={styles.actionBtnsCol}>
                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => handleOpenEditModal(service)}
                    style={[
                      styles.actionIconBtn,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <Ionicons name="pencil" size={14} color={colors.primarytext} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.75}
                    onPress={() => setServiceToDelete(service)}
                    style={[
                      styles.actionIconBtn,
                      {
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderColor: "rgba(239, 68, 68, 0.25)",
                      },
                    ]}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FULL SCREEN ADD / EDIT SERVICE MODAL */}
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
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

          {/* Modal Header */}
          <View style={[styles.fullScreenHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setModalVisible(false)}
              style={[
                styles.headerCircleBtn,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.primarytext} />
            </TouchableOpacity>

            <View style={styles.headerTitleWrap}>
              <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
                {editingServiceId
                  ? (language === "fr" ? "Modifier le service" : "Edit Service")
                  : (language === "fr" ? "Nouveau service" : "Add New Service")}
              </Text>
              <Text
                style={[styles.headerSubtitle, { color: colors.secondarytext }]}
                numberOfLines={1}
              >
                {editingServiceId
                  ? (language === "fr"
                      ? "Mettre à jour la durée, le prix et les détails"
                      : "Update duration, pricing & catalog details")
                  : (language === "fr"
                      ? "Définir le prix, la durée, la catégorie et la photo"
                      : "Set custom price, duration, category & design photo")}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setServiceName("");
                setServiceDuration("45");
                setServicePrice("1000");
                setImageUrl("");
              }}
              style={styles.fullScreenResetBtn}
            >
              <Text style={[styles.fullScreenResetText, { color: colors.primary }]}>
                {language === "fr" ? "Réinitialiser" : "Reset"}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.fullScreenScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Design Photo Upload Dropzone */}
            <View
              style={[
                styles.modalCardSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="camera-outline" size={17} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                    {language === "fr" ? "Photo de la coupe" : "Hairstyle Cut Photo"}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowUrlInput(!showUrlInput)}
                >
                  <Text style={[styles.toggleUrlText, { color: colors.primary }]}>
                    {showUrlInput
                      ? (language === "fr" ? "Masquer le lien" : "Hide Link")
                      : (language === "fr" ? "Coller l'URL" : "Paste URL")}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionHintText, { color: colors.secondarytext }]}>
                {t("manageServices.showcasePhotosDesc") || "Showcase high-definition reference photos of this cut so clients can book directly from your photos."}
              </Text>

              {imageUrl ? (
                <View
                  style={[
                    styles.previewContainer,
                    { borderColor: colors.border, backgroundColor: colors.background },
                  ]}
                >
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.designPreviewImg}
                    resizeMode="cover"
                  />
                  <View style={styles.previewActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickDesignPhoto}
                      style={[
                        styles.photoActionBtn,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="image-outline" size={14} color={colors.primarytext} />
                      <Text style={[styles.photoActionText, { color: colors.primarytext }]}>
                        {language === "fr" ? "Changer la photo" : "Change Photo"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setImageUrl("")}
                      style={[
                        styles.photoActionBtn,
                        {
                          backgroundColor: "rgba(239, 68, 68, 0.12)",
                          borderColor: "rgba(239, 68, 68, 0.3)",
                        },
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.photoActionText, { color: "#EF4444" }]}>
                        {language === "fr" ? "Supprimer" : "Remove"}
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
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.uploadIconCircle,
                      {
                        backgroundColor: "rgba(199, 243, 107, 0.12)",
                        borderColor: "rgba(199, 243, 107, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.uploadBoxTitle, { color: colors.primarytext }]}>
                    {language === "fr" ? "Téléverser la photo du modèle" : "Upload Cut Design Photo"}
                  </Text>
                  <Text style={[styles.uploadBoxSubtitle, { color: colors.secondarytext }]}>
                    {t("manageServices.tapSelectLibrary") || "Tap to select an image from your library"}
                  </Text>
                </TouchableOpacity>
              )}

              {showUrlInput && (
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.border,
                      color: colors.primarytext,
                      marginTop: 10,
                    },
                  ]}
                  placeholder="https://images.unsplash.com/..."
                  placeholderTextColor={colors.secondarytext}
                  value={imageUrl}
                  onChangeText={setImageUrl}
                />
              )}
            </View>

            {/* 2. Service Category Selection */}
            <View
              style={[
                styles.modalCardSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="pricetags-outline" size={17} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                    {language === "fr" ? "Catégorie de service" : "Service Category"}
                  </Text>
                </View>

                {!isAddingNewCategory ? (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setIsAddingNewCategory(true)}
                    style={[
                      styles.addCategoryHeaderBtn,
                      {
                        backgroundColor: "rgba(199, 243, 107, 0.12)",
                        borderColor: "rgba(199, 243, 107, 0.3)",
                      },
                    ]}
                  >
                    <Ionicons name="add" size={13} color={colors.primary} />
                    <Text style={[styles.addCategoryHeaderText, { color: colors.primary }]}>
                      {t("manageServices.newCategory") || "New Category"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* Inline Custom Category Creator */}
              {isAddingNewCategory && (
                <View
                  style={[
                    styles.newCategoryCard,
                    { backgroundColor: colors.background, borderColor: colors.primary },
                  ]}
                >
                  <TextInput
                    style={[styles.newCategoryInput, { color: colors.primarytext }]}
                    placeholder={t("manageServices.enterCategoryPlaceholder") || "Enter category name..."}
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
                      style={[styles.newCatCancelBtn, { borderColor: colors.border }]}
                    >
                      <Text style={{ color: colors.secondarytext, fontSize: 12 }}>{t("common.cancel") || "Cancel"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={handleAddNewCategory}
                      style={[styles.newCatAddBtn, { backgroundColor: colors.primary }]}
                    >
                      <Text style={{ color: colors.onBrand, fontWeight: "700", fontSize: 12 }}>
                        {t("manageServices.addCategory") || "Add Category"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Category Grid */}
              <View style={styles.categoryGrid}>
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
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name={getCategoryIcon(cat)}
                        size={18}
                        color={isSelected ? colors.onBrand : colors.primary}
                      />
                      <Text
                        style={[
                          styles.categoryGridItemText,
                          {
                            color: isSelected ? colors.onBrand : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                        numberOfLines={2}
                      >
                        {language === "fr" ? (CATEGORY_NAMES_FR[cat] || cat) : cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 3. Service Name & Quick Suggestions */}
            <View
              style={[
                styles.modalCardSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="sparkles-outline" size={17} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                  {t("manageServices.serviceNamePresets") || "Service Name & Presets"}
                </Text>
              </View>

              {/* Suggestions Dropdown Trigger */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setDropdownOpen(!dropdownOpen)}
                style={[
                  styles.dropdownButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: dropdownOpen ? colors.primary : colors.border,
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
                  {serviceName
                    ? `${language === "fr" ? "Sélectionné" : "Selected"}: ${serviceName}`
                    : (language === "fr" ? "Choisir un service populaire..." : "Choose popular service name...")}
                </Text>
                <Ionicons
                  name={dropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.secondarytext}
                />
              </TouchableOpacity>

              {dropdownOpen && (
                <View
                  style={[
                    styles.dropdownMenu,
                    { backgroundColor: colors.background, borderColor: colors.border },
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
                              backgroundColor: "rgba(199, 243, 107, 0.12)",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              {
                                color: isKnownSelected ? colors.primary : colors.primarytext,
                                fontWeight: isKnownSelected ? "700" : "500",
                              },
                            ]}
                          >
                            {known}
                          </Text>
                          {isKnownSelected && (
                            <Ionicons name="checkmark" size={16} color={colors.primary} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Direct Name TextInput */}
              <View style={{ marginTop: 12 }}>
                <Text style={[styles.fieldSubLabel, { color: colors.secondarytext }]}>
                  {t("manageServices.orEnterCustomService") || "Or Enter Custom Service Name"}
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
                  placeholder="e.g. Executive Beard Sculpt & Razor Line"
                  placeholderTextColor={colors.secondarytext}
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>
            </View>

            {/* 4. Service Duration (Barber Set) */}
            {!isExtra && (
              <View
                style={[
                  styles.modalCardSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.sectionHeaderRow}>
                  <View style={styles.sectionTitleWithIcon}>
                    <Ionicons name="time-outline" size={17} color={colors.primary} />
                    <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                      {language === "fr" ? "Durée du service" : "Service Duration"}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.durationBadgePill,
                      {
                        backgroundColor: "rgba(199, 243, 107, 0.12)",
                        borderColor: "rgba(199, 243, 107, 0.3)",
                      },
                    ]}
                  >
                    <Text style={[styles.durationBadgePillText, { color: colors.primary }]}>
                      {formatDurationDisplay(parseInt(serviceDuration, 10) || 45, language)}
                    </Text>
                  </View>
                </View>

                {/* Duration Presets */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetScroll}
                >
                  {DURATION_PRESETS.map((d) => {
                    const isSelected = parseInt(serviceDuration, 10) === d;
                    return (
                      <TouchableOpacity
                        key={d}
                        activeOpacity={0.8}
                        onPress={() => setServiceDuration(d.toString())}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            {
                              color: isSelected ? colors.onBrand : colors.primarytext,
                              fontWeight: isSelected ? "700" : "500",
                            },
                          ]}
                        >
                          {formatDurationDisplay(d, language)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* 5. Service Pricing (XAF / CFA) */}
            <View
              style={[
                styles.modalCardSection,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="cash-outline" size={17} color={colors.primary} />
                <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                  {t("manageServices.servicePriceCFA") || "Service Price (CFA)"}
                </Text>
              </View>

              <View
                style={[
                  styles.priceInputBox,
                  { backgroundColor: colors.background, borderColor: colors.border },
                ]}
              >
                <TextInput
                  style={[styles.priceInput, { color: colors.primary }]}
                  placeholder="5000"
                  placeholderTextColor={colors.secondarytext}
                  keyboardType="numeric"
                  value={servicePrice}
                  onChangeText={(val) => setServicePrice(val.replace(/[^0-9]/g, ""))}
                />
                <Text style={[styles.priceCurrencyTag, { color: colors.primary }]}>
                  CFA
                </Text>
              </View>

              {/* Price Presets */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.presetScroll, { marginTop: 10 }]}
              >
                {PRICE_PRESETS.map((p) => {
                  const isSelected = parseInt(servicePrice, 10) === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      activeOpacity={0.8}
                      onPress={() => setServicePrice(p.toString())}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.background,
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          {
                            color: isSelected ? colors.onBrand : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                          },
                        ]}
                      >
                        {p.toLocaleString()} CFA
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 6. Extra Add-on Toggle */}
            <View
              style={[
                styles.extraToggleCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Ionicons name="sparkles" size={16} color="#F59E0B" />
                  <Text style={[styles.extraToggleTitle, { color: colors.primarytext }]}>
                    {language === "fr" ? "Service supplémentaire / Extra" : "Extra / Add-on Service"}
                  </Text>
                </View>
                <Text style={[styles.extraToggleSub, { color: colors.secondarytext }]}>
                  {t("manageServices.extrasOptional") || "Extras are optional add-ons during booking (e.g. shampoo, facial mask, hot towel)."}
                </Text>
              </View>

              <Switch
                value={isExtra}
                onValueChange={(val) => {
                  setIsExtra(val);
                  if (val) {
                    setServiceDuration("0");
                  }
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDark ? colors.background : "#FFFFFF"}
              />
            </View>

                        {/* Staff Assignment Section (Salon Managers only) */}
            {isSalon && salonStaff.length > 0 && (
              <View
                style={[
                  styles.modalCardSection,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons name="people-outline" size={17} color={colors.primary} />
                  <Text style={[styles.inputLabel, { color: colors.primarytext }]}>
                    {language === "fr" ? "Attribuer au personnel individuel" : "Assign to Individual Staff"}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.secondarytext, marginBottom: 10 }}>
                  {language === "fr"
                    ? "Cochez les coiffeurs de votre salon capables d'effectuer ce service :"
                    : "Select which stylists in your salon can perform this specific service:"}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {salonStaff.map((staff) => {
                    const isSelected = selectedStaffIds.includes(staff.id);
                    return (
                      <TouchableOpacity
                        key={staff.id}
                        activeOpacity={0.8}
                        onPress={() => {
                          setSelectedStaffIds((prev) =>
                            isSelected ? prev.filter((id) => id !== staff.id) : [...prev, staff.id]
                          );
                        }}
                        style={[
                          styles.presetChip,
                          {
                            backgroundColor: isSelected ? colors.primary : colors.background,
                            borderColor: isSelected ? colors.primary : colors.border,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            paddingHorizontal: 12,
                            paddingVertical: 7,
                          },
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "person-outline"}
                          size={14}
                          color={isSelected ? colors.onBrand : colors.primary}
                        />
                        <Text
                          style={{
                            color: isSelected ? colors.onBrand : colors.primarytext,
                            fontWeight: isSelected ? "700" : "500",
                            fontSize: 12.5,
                          }}
                        >
                          {staff.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Submit Action CTA */}
            <TouchableOpacity
              activeOpacity={0.85}
              disabled={isSubmitting}
              onPress={handleSaveService}
              style={[styles.saveServiceCTA, { backgroundColor: colors.primary }]}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.onBrand} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={19} color={colors.onBrand} />
                  <Text style={[styles.saveServiceCTAText, { color: colors.onBrand }]}>
                    {editingServiceId
                      ? (language === "fr" ? "Enregistrer les modifications" : "Save Service Changes")
                      : (language === "fr" ? "Publier au catalogue" : "Publish to Salon Catalog")}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Delete Service Confirmation Modal */}
      <CustomModal
        visible={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        title={t("manageServices.deleteServiceTitle") || (language === "fr" ? "Supprimer le service" : "Delete Service")}
        description={
          serviceToDelete
            ? (language === "fr"
                ? `Êtes-vous sûr de vouloir retirer "${serviceToDelete.name}" de votre catalogue de services ? Cette action est irréversible.`
                : `Are you sure you want to remove "${serviceToDelete.name}" from your service catalog? This action cannot be undone.`)
            : ""
        }
        icon="trash-outline"
        primaryText={language === "fr" ? "Supprimer le service" : "Delete Service"}
        primaryDanger={true}
        secondaryText={language === "fr" ? "Conserver" : "Keep Service"}
        onPrimary={confirmDeleteService}
      />

      {/* Tutorial Modal */}
      <PageTutorialModal
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
        screenKey="manage_services"
        title={MANAGE_SERVICES_TUTORIAL.title}
        subtitle={MANAGE_SERVICES_TUTORIAL.subtitle}
        steps={MANAGE_SERVICES_TUTORIAL.steps}
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
  addServiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  addServiceBtnText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 104,
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
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  telemetryLabel: {
    fontSize: 10.5,
    fontFamily: FontFamily.medium,
    textAlign: "center",
  },
  catalogTabTrack: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  catalogTabPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  catalogTabPillText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  categoriesScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
  },
  emptyStateCard: {
    padding: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
  },
  emptyIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
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
  servicesList: {
    gap: 12,
  },
  serviceCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 12,
  },
  serviceThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  serviceThumbnailFallback: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceInfo: {
    flex: 1,
    gap: 6,
  },
  serviceNamePriceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  serviceName: {
    fontSize: 14.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
    flex: 1,
  },
  servicePrice: {
    fontSize: 13.5,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  serviceMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryPillSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    borderWidth: 1,
  },
  categoryPillSmallText: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  durationText: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  actionBtnsCol: {
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
  fullScreenModalContainer: {
    flex: 1,
  },
  fullScreenHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  fullScreenResetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  fullScreenResetText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  fullScreenScrollContent: {
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },
  modalCardSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  toggleUrlText: {
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  sectionHintText: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    marginTop: 2,
    lineHeight: 16,
  },
  previewContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    padding: 8,
    gap: 8,
    marginTop: 6,
  },
  designPreviewImg: {
    width: "100%",
    height: 160,
    borderRadius: 8,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  photoActionText: {
    fontSize: 12,
    fontFamily: FontFamily.semibold,
    fontWeight: "600",
  },
  uploadDottedBox: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  uploadIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  uploadBoxSubtitle: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
  },
  textInput: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  addCategoryHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  addCategoryHeaderText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  newCategoryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 8,
    marginTop: 8,
  },
  newCategoryInput: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
    paddingVertical: 4,
  },
  newCategoryBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  newCatCancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  newCatAddBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  categoryGridItem: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryGridItemText: {
    fontSize: 11.5,
    fontFamily: FontFamily.semibold,
    flex: 1,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  dropdownButtonText: {
    fontSize: 13,
    fontFamily: FontFamily.medium,
  },
  dropdownMenu: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    marginTop: 4,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 12.5,
    fontFamily: FontFamily.medium,
  },
  fieldSubLabel: {
    fontSize: 11.5,
    fontFamily: FontFamily.medium,
    marginBottom: 6,
  },
  durationBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationBadgePillText: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 11.5,
    fontFamily: FontFamily.semibold,
  },
  priceInputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginTop: 6,
  },
  priceInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  priceCurrencyTag: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  extraToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  extraToggleTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
  extraToggleSub: {
    fontSize: 11.5,
    fontFamily: FontFamily.regular,
    lineHeight: 16,
  },
  saveServiceCTA: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 14,
    marginTop: 6,
  },
  saveServiceCTAText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: "700",
  },
});
