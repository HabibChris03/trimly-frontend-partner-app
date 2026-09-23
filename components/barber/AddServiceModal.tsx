import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
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
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import useColors from "@/hooks/usecolor";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { barberService, BarberServiceItem } from "@/services/barberService";

export interface AddServiceModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: (service: BarberServiceItem) => void;
  editingService?: BarberServiceItem | null;
  barberId: number;
}

const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Haircuts & Styling": "cut-outline",
  "Braids & Locs": "git-merge-outline",
  "Weaves & Extensions": "sparkles-outline",
  "Silk Press & Natural Hair": "leaf-outline",
  "Color & Treatments": "color-palette-outline",
  "Beard & Shave": "man-outline",
  "Skincare & Facials": "water-outline",
  "Extra Services": "bookmark-outline",
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

const DURATION_PRESETS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 240];
const PRICE_PRESETS = [5000, 10000, 15000, 20000, 25000, 30000, 40000, 50000];

function formatDurationDisplay(minutes: number): string {
  if (minutes < 60) return `${minutes} mins`;
  const hrs = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hrs}h`;
  return `${hrs}h ${rem}m`;
}

export function AddServiceModal({
  visible,
  onClose,
  onSaved,
  editingService,
  barberId,
}: AddServiceModalProps) {
  const colors = useColors();
  const { t } = useLanguage();
  const { showToast } = useToast();

  const [serviceName, setServiceName] = useState("");
  const [serviceCategory, setServiceCategory] = useState("Haircuts & Styling");
  const [serviceDuration, setServiceDuration] = useState("45");
  const [servicePrice, setServicePrice] = useState("25000");
  const [isExtra, setIsExtra] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Category State
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");

  // Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load custom categories registered by barber
  useEffect(() => {
    if (visible && barberId) {
      barberService.getCategories(barberId).then((res) => {
        if (res?.categories) {
          const defaults = Object.keys(KNOWN_SERVICES_BY_CATEGORY);
          const extras = res.categories.filter((c) => !defaults.includes(c));
          if (extras.length > 0) {
            setCustomCategories(extras);
          }
        }
      }).catch(() => {});
    }
  }, [visible, barberId]);

  // Sync with editing service or reset on open
  useEffect(() => {
    if (visible) {
      if (editingService) {
        setServiceName(editingService.name || "");
        setServiceCategory(
          editingService.category ||
            (editingService.is_extra ? "Extra Services" : "Haircuts & Styling")
        );
        setServiceDuration(
          editingService.duration_minutes?.toString() || "45"
        );
        setServicePrice(editingService.price?.toString() || "25000");
        setIsExtra(!!editingService.is_extra);
        setImageUrl(editingService.image_url || "");
        setShowUrlInput(
          Boolean(
            editingService.image_url &&
              !editingService.image_url.startsWith("file:")
          )
        );
      } else {
        setServiceName("");
        setServiceCategory("Haircuts & Styling");
        setServiceDuration("45");
        setServicePrice("25000");
        setIsExtra(false);
        setImageUrl("");
        setShowUrlInput(false);
      }
      setDropdownOpen(false);
      setIsAddingNewCategory(false);
      setNewCategoryInput("");
    }
  }, [visible, editingService]);

  const allCategories = [
    ...Object.keys(KNOWN_SERVICES_BY_CATEGORY),
    ...customCategories.filter(
      (c) => !Object.keys(KNOWN_SERVICES_BY_CATEGORY).includes(c)
    ),
  ];

  const handlePickDesignPhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        showToast(
          "Please allow photo library access to upload service designs.",
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
      showToast("Failed to open image picker.", "error");
    }
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) {
      showToast("Please enter a category name.", "warning");
      return;
    }
    const alreadyExists = allCategories.some(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (alreadyExists) {
      const existingName = allCategories.find(
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

  const handleSave = async () => {
    if (!serviceName.trim()) {
      showToast("Please enter a service name.", "error");
      return;
    }
    const priceNum = parseFloat(servicePrice.replace(/[^0-9.]/g, "")) || 0;
    const durNum = isExtra
      ? 0
      : parseInt(serviceDuration.replace(/[^0-9]/g, ""), 10) || 30;

    if (priceNum <= 0) {
      showToast("Please enter a valid price in CFA.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const saved = await barberService.addService(
        {
          id: editingService?.id || undefined,
          name: serviceName.trim(),
          category: serviceCategory,
          duration_minutes: durNum,
          price: priceNum,
          is_extra: isExtra,
          image_url: imageUrl.trim() || null,
        },
        barberId
      );

      showToast(
        editingService ? "Service updated successfully." : "New service added to catalog!",
        "success"
      );
      onSaved(saved);
      onClose();
    } catch (err: any) {
      showToast(
        err?.message || "Failed to save service. Please try again.",
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
        edges={["top", "bottom"]}
      >
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />

        {/* Full Screen Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.surfacevariant,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.background }]}
          >
            <Ionicons name="close" size={22} color={colors.primarytext} />
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={[styles.title, { color: colors.primarytext }]}>
              {editingService ? "Edit Service" : "Add New Service"}
            </Text>
            <Text
              style={[styles.subtitle, { color: colors.secondarytext }]}
              numberOfLines={1}
            >
              {editingService
                ? "Modify pricing, custom duration & details"
                : "Set custom duration, price, category & design photo"}
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
            style={styles.resetBtn}
          >
            <Text style={[styles.resetText, { color: colors.primary }]}>
              Reset
            </Text>
          </TouchableOpacity>
        </View>

        {/* Full Screen Scrollable Body */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* 1. Design Photo Upload Section */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons name="camera-outline" size={18} color={colors.primary} />
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.primarytext, marginBottom: 0 },
                  ]}
                >
                  Showcase Design Photo
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
            <Text
              style={[styles.sectionHintText, { color: colors.secondarytext }]}
            >
              Upload high-definition photos of this specific cut or hairstyle to showcase on your profile.
            </Text>

            {imageUrl ? (
              <View
                style={[
                  styles.previewContainer,
                  {
                    borderColor: colors.surfacevariant,
                    backgroundColor: colors.background,
                    marginTop: 10,
                  },
                ]}
              >
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.previewImg}
                  resizeMode="cover"
                />
                <View style={styles.previewActionsRow}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handlePickDesignPhoto}
                    style={[
                      styles.photoActionBtn,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.surfacevariant,
                      },
                    ]}
                  >
                    <Ionicons
                      name="image-outline"
                      size={14}
                      color={colors.primarytext}
                    />
                    <Text
                      style={[
                        styles.photoActionText,
                        { color: colors.primarytext },
                      ]}
                    >
                      Change Photo
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
                      Remove Photo
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
                <View
                  style={[
                    styles.uploadIconCircle,
                    { backgroundColor: "rgba(163, 179, 156, 0.15)" },
                  ]}
                >
                  <Ionicons
                    name="cloud-upload-outline"
                    size={26}
                    color={colors.primary}
                  />
                </View>
                <Text
                  style={[
                    styles.uploadBoxTitle,
                    { color: colors.primarytext },
                  ]}
                >
                  Choose from Gallery
                </Text>
                <Text
                  style={[
                    styles.uploadBoxSubtitle,
                    { color: colors.secondarytext },
                  ]}
                >
                  Supports JPG, PNG, WEBP design snapshots
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
                placeholderTextColor={colors.inputPlaceholder}
                value={imageUrl}
                onChangeText={setImageUrl}
              />
            )}
          </View>

          {/* 2. Category Section with Vector Icons & Add Category */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionTitleWithIcon}>
                <Ionicons
                  name="pricetags-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.inputLabel,
                    { color: colors.primarytext, marginBottom: 0 },
                  ]}
                >
                  Service Category
                </Text>
              </View>

              {!isAddingNewCategory ? (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setIsAddingNewCategory(true)}
                  style={[
                    styles.addCategoryHeaderBtn,
                    { backgroundColor: "rgba(163, 179, 156, 0.15)" },
                  ]}
                >
                  <Ionicons name="add" size={14} color={colors.primary} />
                  <Text
                    style={[
                      styles.addCategoryHeaderText,
                      { color: colors.primary },
                    ]}
                  >
                    + Add New Category
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Inline Custom Category Creator */}
            {isAddingNewCategory && (
              <View
                style={[
                  styles.newCategoryCard,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.primary,
                    marginTop: 10,
                  },
                ]}
              >
                <TextInput
                  style={[styles.newCategoryInput, { color: colors.primarytext }]}
                  placeholder="Enter new category name..."
                  placeholderTextColor={colors.inputPlaceholder}
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
                    style={[
                      styles.newCatCancelBtn,
                      { borderColor: colors.surfacevariant },
                    ]}
                  >
                    <Text style={{ color: colors.secondarytext, fontSize: 12 }}>
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleAddNewCategory}
                    style={[
                      styles.newCatAddBtn,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={{
                        color: "#1C1E1B",
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      Save Category
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Category Grid with Vector Icons */}
            <View style={[styles.categoryGrid, { marginTop: 10 }]}>
              {allCategories.map((cat) => {
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
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons
                name="sparkles-outline"
                size={18}
                color={colors.primary}
              />
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.primarytext, marginBottom: 0 },
                ]}
              >
                Service Name & Style
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
                  borderColor: dropdownOpen
                    ? colors.primary
                    : colors.surfacevariant,
                  marginTop: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.dropdownButtonText,
                  {
                    color: serviceName
                      ? colors.primarytext
                      : colors.secondarytext,
                  },
                ]}
                numberOfLines={1}
              >
                {serviceName
                  ? `Selected: ${serviceName}`
                  : `Choose popular ${serviceCategory} style...`}
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
                  {(KNOWN_SERVICES_BY_CATEGORY[serviceCategory] || []).map(
                    (known) => {
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
                    }
                  )}

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setDropdownOpen(false)}
                    style={[
                      styles.dropdownItem,
                      {
                        borderTopWidth: 1,
                        borderTopColor: colors.surfacevariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        { color: colors.primary, fontWeight: "600" },
                      ]}
                    >
                      Or type custom name below ✍️
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            )}

            {/* Direct Service Name TextInput */}
            <View style={{ marginTop: 12 }}>
              <Text
                style={[
                  styles.fieldSubLabel,
                  { color: colors.secondarytext, marginBottom: 6 },
                ]}
              >
                Custom Service Name:
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
                placeholder="e.g. Skin Fade + Beard Sculpt"
                placeholderTextColor={colors.inputPlaceholder}
                value={serviceName}
                onChangeText={setServiceName}
              />
            </View>
          </View>

          {/* 4. BARBER DURATION SETTINGS (Prominent duration control) */}
          {!isExtra && (
            <View
              style={[
                styles.cardSection,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionTitleWithIcon}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={colors.primary}
                  />
                  <Text
                    style={[
                      styles.inputLabel,
                      { color: colors.primarytext, marginBottom: 0 },
                    ]}
                  >
                    Appointment Duration (Set by Barber)
                  </Text>
                </View>
                <View
                  style={[
                    styles.durationBadgePill,
                    { backgroundColor: "rgba(163, 179, 156, 0.2)" },
                  ]}
                >
                  <Text
                    style={[
                      styles.durationBadgePillText,
                      { color: colors.primary },
                    ]}
                  >
                    {formatDurationDisplay(
                      parseInt(serviceDuration, 10) || 45
                    )}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  styles.sectionHintText,
                  { color: colors.secondarytext },
                ]}
              >
                You have full control over the duration. Client booking slots on the calendar will be automatically partitioned according to this exact duration.
              </Text>

              {/* Quick Presets */}
              <Text
                style={[
                  styles.fieldSubLabel,
                  { color: colors.secondarytext, marginTop: 12, marginBottom: 8 },
                ]}
              >
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
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.background,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.surfacevariant,
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
                        {mins < 60
                          ? `${mins}m`
                          : mins % 60 === 0
                          ? `${mins / 60}h`
                          : `${Math.floor(mins / 60)}h ${mins % 60}m`}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Stepper and Custom Minutes Input */}
              <Text
                style={[
                  styles.fieldSubLabel,
                  { color: colors.secondarytext, marginTop: 12, marginBottom: 8 },
                ]}
              >
                Or Fine-tune Minutes:
              </Text>
              <View style={styles.durationStepperRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const cur = parseInt(serviceDuration, 10) || 45;
                    setServiceDuration(String(Math.max(15, cur - 15)));
                  }}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepperButtonText,
                      { color: colors.primarytext },
                    ]}
                  >
                    -15m
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const cur = parseInt(serviceDuration, 10) || 45;
                    setServiceDuration(String(Math.max(15, cur - 5)));
                  }}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={colors.primarytext}
                  />
                </TouchableOpacity>

                <View
                  style={[
                    styles.durationInputBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.durationTextInput,
                      { color: colors.primarytext },
                    ]}
                    keyboardType="numeric"
                    value={serviceDuration}
                    onChangeText={(val) =>
                      setServiceDuration(val.replace(/[^0-9]/g, ""))
                    }
                    placeholder="45"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <Text
                    style={[
                      styles.durationInputUnit,
                      { color: colors.secondarytext },
                    ]}
                  >
                    mins
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const cur = parseInt(serviceDuration, 10) || 45;
                    setServiceDuration(String(cur + 5));
                  }}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <Ionicons name="add" size={18} color={colors.primarytext} />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    const cur = parseInt(serviceDuration, 10) || 45;
                    setServiceDuration(String(cur + 15));
                  }}
                  style={[
                    styles.stepperButton,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.stepperButtonText,
                      { color: colors.primarytext },
                    ]}
                  >
                    +15m
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={[
                  styles.durationNoticeBox,
                  {
                    backgroundColor: "rgba(163, 179, 156, 0.12)",
                    borderColor: "rgba(163, 179, 156, 0.3)",
                  },
                ]}
              >
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={colors.primary}
                />
                <Text
                  style={[
                    styles.durationNoticeText,
                    { color: colors.primary },
                  ]}
                >
                  Clients booking "{serviceName || "this service"}" will be offered slots every {serviceDuration || 45} minutes.
                </Text>
              </View>
            </View>
          )}

          {/* 5. Pricing Section */}
          <View
            style={[
              styles.cardSection,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View style={styles.sectionTitleWithIcon}>
              <Ionicons name="cash-outline" size={18} color={colors.primary} />
              <Text
                style={[
                  styles.inputLabel,
                  { color: colors.primarytext, marginBottom: 0 },
                ]}
              >
                Price in FCFA
              </Text>
            </View>
            <Text
              style={[styles.sectionHintText, { color: colors.secondarytext }]}
            >
              Set your standard price in FCFA for this service.
            </Text>

            <View
              style={[
                styles.priceInputWrapper,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.surfacevariant,
                  marginTop: 10,
                },
              ]}
            >
              <Text
                style={[
                  styles.priceCurrencyPrefix,
                  { color: colors.primary },
                ]}
              >
                FCFA
              </Text>
              <TextInput
                style={[styles.priceTextInput, { color: colors.primarytext }]}
                keyboardType="numeric"
                placeholder="25000"
                placeholderTextColor={colors.inputPlaceholder}
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
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.background,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.surfacevariant,
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
              <Text
                style={[
                  styles.extraToggleTitle,
                  { color: colors.primarytext },
                ]}
              >
                Extra Service / Add-on
              </Text>
              <Text
                style={[
                  styles.extraToggleSub,
                  { color: colors.secondarytext },
                ]}
              >
                No separate calendar slot required (e.g. Beard Oil, Facial Scrub, Eyebrows). Added alongside primary cut.
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
        <View
          style={[
            styles.footerBar,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.surfacevariant,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleSave}
            disabled={isSubmitting}
            style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#1C1E1B" />
            ) : (
              <>
                <Ionicons
                  name={
                    editingService
                      ? "save-outline"
                      : "checkmark-circle-outline"
                  }
                  size={20}
                  color="#1C1E1B"
                />
                <Text style={styles.saveBtnText}>
                  {editingService ? "Update Service" : "Add to Service Catalog"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  titleWrap: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 17.5,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  resetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  resetText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    gap: 14,
    paddingBottom: 60,
  },
  cardSection: {
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitleWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  toggleUrlText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionHintText: {
    fontSize: 11.5,
    marginTop: 4,
    lineHeight: 16,
  },
  previewContainer: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },
  previewImg: {
    width: "100%",
    height: 180,
  },
  previewActionsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 10,
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
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadBoxTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  uploadBoxSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryGridItem: {
    width: "31%",
    aspectRatio: 1.1,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
    gap: 5,
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
  extraToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  extraToggleTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  extraToggleSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 16,
  },
  footerBar: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 25,
  },
  saveBtnText: {
    color: "#1C1E1B",
    fontSize: 15,
    fontWeight: "800",
  },
});
