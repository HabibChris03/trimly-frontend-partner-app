import { CustomModal } from "@/components/ui/CustomModal";
import { PageTutorialModal } from "@/components/barber/PageTutorialModal";
import { SALON_MANAGEMENT_TUTORIAL } from "@/constants/barberTutorials";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";
import BarberLocationPickerModal from "@/components/map/BarberLocationPickerModal";
import ChairOccupantsEditor, {
  ChairSlotStatus,
  verifyAllChairOccupants,
} from "@/components/barber/ChairOccupantsEditor";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
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

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone?: string;
  status: "Active" | "Off Duty" | "On Break";
}

const AMENITIES_LIST = [
  { id: "ac", label: "Air Conditioned", icon: "snow-outline" },
  { id: "wifi", label: "Free Wi-Fi", icon: "wifi-outline" },
  { id: "lounge", label: "VIP Waiting Lounge", icon: "cafe-outline" },
  { id: "parking", label: "Free Parking", icon: "car-outline" },
  { id: "drinks", label: "Complimentary Drinks", icon: "wine-outline" },
  { id: "pos", label: "Card & MoMo Accepted", icon: "card-outline" },
  { id: "tv", label: "Sports & Entertainment TV", icon: "tv-outline" },
  { id: "kids", label: "Kid Friendly Stations", icon: "happy-outline" },
];

const PRESET_CHAIRS = [2, 4, 6, 8, 12];

export default function SalonManagementScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const salonId = user?.id || 4;

  const [isSalon, setIsSalon] = useState<boolean>(
    user ? user.role === "salon" || Number(user.capacity || user.working_chairs || 1) > 1 : true
  );
  const [capacity, setCapacity] = useState<number>(
    Math.max(1, parseInt(String(user?.capacity || user?.working_chairs || "4"), 10) || 4)
  );
  const [chairNames, setChairNames] = useState<string[]>([]);
  const [chairStatuses, setChairStatuses] = useState<Record<number, ChairSlotStatus>>({});
  const [salonBio, setSalonBio] = useState(
    user?.about_us || (user as any)?.bio || ""
  );
  const [salonLogo, setSalonLogo] = useState<string | null>(
    user?.logo_url || null
  );
  const [address, setAddress] = useState<string>(
    (user as any)?.address || "Boulevard de la Liberté, Akwa"
  );
  const [city, setCity] = useState<string>(
    (user as any)?.city || "Douala, Cameroon"
  );
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    "ac",
    "wifi",
    "pos",
    "lounge",
  ]);
  const [uploadedDocName, setUploadedDocName] = useState<string | null>(null);
  const [uploadedDocUri, setUploadedDocUri] = useState<string | null>((user as any)?.business_license_url || null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude && user?.longitude
      ? { latitude: user.latitude, longitude: user.longitude }
      : { latitude: 4.0511, longitude: 9.7679 }
  );

  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [docModalVisible, setDocModalVisible] = useState(false);

  const fetchSalonData = useCallback(async () => {
    try {
      const capData = await barberService.getSalonCapacity(salonId);
      if (capData) {
        const chairs = Math.max(1, parseInt(String(capData.capacity || capData.working_chairs || 1), 10) || 1);
        setCapacity(chairs);
        setIsSalon(capData.is_salon);
        if (Array.isArray(capData.chair_occupants) && capData.chair_occupants.length > 0) {
          const names: string[] = [];
          const statuses: Record<number, ChairSlotStatus> = {};
          capData.chair_occupants.forEach((occ: any, idx: number) => {
            names.push(occ.name || "");
            statuses[idx] = {
              status: "verified",
              message: "Linked & Bookable",
              barber: occ,
            };
          });
          setChairNames(names);
          setChairStatuses(statuses);
        }
      }
    } catch {
      // Keep existing state fallback
    }
  }, [salonId]);

  const fetchStaff = useCallback(async () => {
    try {
      const staff = await barberService.listSalonStaff(salonId);
      const list = Array.isArray(staff) ? staff : [];
      setStaffList(list);
      setChairNames((prev) => {
        if (prev.some((n) => n && n.trim())) return prev;
        return list.map((s: any) => s.name || "");
      });
      setChairStatuses((prev) => {
        if (Object.keys(prev).length > 0) return prev;
        const next: Record<number, ChairSlotStatus> = {};
        list.forEach((s: any, idx: number) => {
          if (s.name) {
            next[idx] = {
              status: "verified",
              message: "Linked & Bookable",
              barber: {
                id: s.id,
                name: s.name,
                role: s.role,
                staff_title: s.role,
                is_owner: Boolean(s.is_lead && s.id === salonId),
              },
            };
          }
        });
        return next;
      });
    } catch {
      setStaffList([]);
    }
  }, [salonId]);

  useEffect(() => {
    async function initialLoad() {
      setIsLoadingStaff(true);
      await Promise.all([fetchSalonData(), fetchStaff()]);
      setIsLoadingStaff(false);
    }
    initialLoad();
  }, [fetchSalonData, fetchStaff]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchSalonData(), fetchStaff()]);
    setRefreshing(false);
    showToast("Salon profile synced.", "info");
  }, [fetchSalonData, fetchStaff]);

  const handlePickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Photo library access is required to choose a salon logo.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setSalonLogo(result.assets[0].uri);
      showToast("Salon logo updated from gallery.", "success");
    }
  };

  const handleTakeLogoPhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("Camera access is required to take a shop photo.", "warning");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setSalonLogo(result.assets[0].uri);
      showToast("Shop photo captured and updated.", "success");
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setUploadedDocName(file.name);
        setUploadedDocUri(file.uri);
        showToast(
          language === "fr"
            ? `Document sélectionné : ${file.name}. Enregistrez pour transmettre à l'administration.`
            : `Document selected: ${file.name}. Save to submit for admin verification.`,
          "success"
        );
      }
    } catch {
      showToast("Could not select document. Please try again.", "error");
    }
  };

  const toggleAmenity = (id: string) => {
    if (selectedAmenities.includes(id)) {
      setSelectedAmenities(selectedAmenities.filter((a) => a !== id));
    } else {
      setSelectedAmenities([...selectedAmenities, id]);
    }
  };

  const handleStepChairs = (delta: number) => {
    setCapacity((prev) => Math.max(1, prev + delta));
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const capNumber = Math.max(1, capacity);
      const verification = await verifyAllChairOccupants(
        capNumber,
        chairNames,
        salonId,
        user?.name
      );
      setChairStatuses((prev) => ({ ...prev, ...verification.statuses }));
      if (!verification.valid) {
        showToast(verification.errorMessage || "User not found", "error");
        setIsSaving(false);
        return;
      }

      await barberService.updateSalonCapacity(salonId, {
        bio: salonBio,
        is_salon: isSalon,
        capacity: capNumber,
        chair_barber_names: verification.verifiedNames,
      });
      await fetchStaff();
      const licenseUrl = uploadedDocUri || (user as any)?.business_license_url || (uploadedDocName ? `https://trimly237.com/docs/licenses/${uploadedDocName}` : undefined);
      await barberService.updateProfileDetails({
        about_us: salonBio,
        logo_url: salonLogo,
        city: city,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        ...(licenseUrl ? {
          business_license_url: licenseUrl,
          verification_status: "pending_review",
        } : {})
      });
      if (updateUser) {
        updateUser({
          capacity: capNumber,
          working_chairs: capNumber,
          about_us: salonBio,
          logo_url: salonLogo,
          city: city,
          ...(licenseUrl ? {
            business_license_url: licenseUrl,
            verification_status: "pending_review",
          } : {})
        } as any);
      }
      showToast(
        language === "fr"
          ? (uploadedDocUri ? "Configuration et licence commerciale transmises avec succès à l'administration pour validation." : "Configuration du salon enregistrée avec succès.")
          : (uploadedDocUri ? "Salon details & business license successfully submitted for admin verification." : "Salon configuration & capacity saved successfully."),
        "success"
      );
      router.back();
    } catch (err: any) {
      showToast(err?.message || "Configuration updated locally.", "info");
      if (updateUser) {
        updateUser({
          capacity: capacity,
          working_chairs: capacity,
          about_us: salonBio,
          logo_url: salonLogo,
          city: city,
        } as any);
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const salonTitle = user?.name || "Enterprise Grooming Salon";
  const userInitials =
    salonTitle
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((w: string) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "EG";

  const activeStaffCount = staffList.filter((s) => s.status === "Active").length;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Executive Clean Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primaryText} />
        </TouchableOpacity>

        <View style={{ flex: 1, paddingHorizontal: 4 }}>
          <Text style={[styles.headerTitle, { color: colors.primaryText }]} numberOfLines={1}>{language === "fr" ? "Gestion du Salon" : "Salon Management"}</Text>
          <Text style={[styles.headerSub, { color: colors.secondaryText }]}>
            {t("salonManagement.capacityProfile") || "Capacity, credentials & studio profile"}
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setTutorialVisible(true)}
            style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="help-circle-outline" size={19} color={colors.brand} />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={isSaving}
            onPress={handleSaveAll}
            style={[styles.headerSaveBtn, { backgroundColor: colors.brand }]}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <Text style={[styles.headerSaveBtnText, { color: colors.onBrand }]}>
                {t("common.save") || "Save"}
              </Text>
            )}
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
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        {/* Salon Branding & Identity Hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            <View style={styles.logoWrapper}>
              {salonLogo ? (
                <Image source={{ uri: salonLogo }} style={styles.logoImage} />
              ) : (
                <View style={[styles.logoMonogramWrap, { backgroundColor: colors.brand }]}>
                  <Text style={[styles.logoMonogramText, { color: colors.onBrand }]}>
                    {userInitials}
                  </Text>
                </View>
              )}
              <View style={[styles.verifiedBadge, { backgroundColor: "#22C55E" }]}>
                <Ionicons name="checkmark" size={11} color="#171918" />
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.salonName, { color: colors.primaryText }]} numberOfLines={1}>
                  {salonTitle}
                </Text>
              </View>
              <Text style={[styles.salonLocationText, { color: colors.secondaryText }]} numberOfLines={1}>
                {address} • {city}
              </Text>

              <View style={styles.statusPillsStrip}>
                <View style={[styles.statusBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                  <Ionicons name="business" size={11} color={colors.brand} />
                  <Text style={[styles.statusBadgeText, { color: colors.brand }]}>
                    {isSalon ? (language === "fr" ? "Salon Agréé" : "Licensed Salon") : (language === "fr" ? "Studio Solo" : "Solo Studio")}
                  </Text>
                </View>

                <View style={[styles.statusBadge, { backgroundColor: "rgba(34, 197, 94, 0.12)", borderColor: "rgba(34, 197, 94, 0.3)" }]}>
                  <Ionicons name="shield-checkmark" size={11} color="#22C55E" />
                  <Text style={[styles.statusBadgeText, { color: "#22C55E" }]}>{language === "fr" ? "Salon Vérifié" : "Verified Studio"}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={[styles.cardDivider, { backgroundColor: colors.border }]} />

          {/* Quick Photo Actions */}
          <View style={styles.photoActionsRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickLogo}
              style={[styles.photoActionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="image-outline" size={15} color={colors.brand} />
              <Text style={[styles.photoActionBtnText, { color: colors.primaryText }]}>{language === "fr" ? "Importer un logo" : "Upload Logo"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTakeLogoPhoto}
              style={[styles.photoActionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="camera-outline" size={15} color={colors.brand} />
              <Text style={[styles.photoActionBtnText, { color: colors.primaryText }]}>{language === "fr" ? "Prendre une photo" : "Take Photo"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 1: Working Chairs & Studio Capacity */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="cut" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Working Chairs & Capacity
              </Text>
              <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                {language === "fr" ? "Détermine le nombre de clients simultanés pouvant réserver" : "Determines how many simultaneous clients can book slots"}
              </Text>
            </View>
          </View>

          {/* Studio Mode Toggle (Solo Studio vs Multi-Chair Salon) */}
          <View style={[styles.modeToggleCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.modeToggleTitle, { color: colors.primaryText }]}>{language === "fr" ? "Mode Entreprise Multi-Fauteuils" : "Multi-Chair Enterprise Mode"}</Text>
              <Text style={[styles.modeToggleSub, { color: colors.secondaryText }]}>
                {t("salonManagement.enableMultipleBarbers") || "Enable if your shop has multiple staff barbers working simultaneously"}
              </Text>
            </View>
            <Switch
              value={isSalon}
              onValueChange={setIsSalon}
              trackColor={{ false: colors.border, true: colors.brand }}
              thumbColor={colors.onBrand}
            />
          </View>

          {/* Interactive Chairs Stepper */}
          <View style={styles.stepperContainer}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              {t("salonManagement.activeStylingChairs") || "Active Styling Chairs"}
            </Text>

            <View style={[styles.stepperBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleStepChairs(-1)}
                disabled={capacity <= 1}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: colors.card, opacity: capacity <= 1 ? 0.4 : 1 },
                ]}
              >
                <Ionicons name="remove" size={20} color={colors.primaryText} />
              </TouchableOpacity>

              <View style={styles.stepperValueCol}>
                <Text style={[styles.stepperValueText, { color: colors.brand }]}>
                  {capacity}
                </Text>
                <Text style={[styles.stepperSubText, { color: colors.secondaryText }]}>
                  {capacity === 1 ? "Station" : "Simultaneous Stations"}
                </Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleStepChairs(1)}
                style={[styles.stepperBtn, { backgroundColor: colors.card }]}
              >
                <Ionicons name="add" size={20} color={colors.brand} />
              </TouchableOpacity>
            </View>

            {/* Quick Preset Pills */}
            <View style={styles.presetsRow}>
              {PRESET_CHAIRS.map((count) => {
                const isSelected = capacity === count;
                return (
                  <TouchableOpacity
                    key={count}
                    activeOpacity={0.8}
                    onPress={() => setCapacity(count)}
                    style={[
                      styles.presetPill,
                      {
                        backgroundColor: isSelected ? colors.brand : colors.elevated,
                        borderColor: isSelected ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.presetPillText,
                        {
                          color: isSelected ? colors.onBrand : colors.primaryText,
                          fontWeight: isSelected ? "900" : "600",
                        },
                      ]}
                    >
                      {count} Chairs
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Synchronized Chair Occupants Container */}
            <ChairOccupantsEditor
              chairCount={capacity}
              chairNames={chairNames}
              onChangeChairNames={setChairNames}
              chairStatuses={chairStatuses}
              onChangeChairStatuses={setChairStatuses}
              salonId={salonId}
              ownerName={user?.name}
            />
          </View>

          {/* Salon Bio / Story */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              Salon Bio & Client Welcome Story
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  color: colors.primaryText,
                },
              ]}
              value={salonBio}
              onChangeText={setSalonBio}
              multiline
              numberOfLines={3}
              placeholder={t("salonManagement.aboutPlaceholder") || "Tell clients about your master barbers, hygiene standards, and shop atmosphere..."}
              placeholderTextColor={colors.inputPlaceholder}
            />
          </View>
        </View>

        {/* Section 2: Studio Location & Map Coordinates */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="location" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                {t("salonManagement.locationAddress") || "Location & Physical Address"}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                {t("salonManagement.displayedDirections") || "Displayed to clients on booking maps and directions"}
              </Text>
            </View>
          </View>

          {/* Street Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              {t("salonManagement.streetAddressQuarter") || "Street Address & Quarter"}
            </Text>
            <View style={[styles.inputBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Ionicons name="business-outline" size={17} color={colors.secondaryText} />
              <TextInput
                style={[styles.inputField, { color: colors.primaryText }]}
                value={address}
                onChangeText={setAddress}
                placeholder="e.g. Boulevard de la Liberté, Akwa"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* City */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              City & Region
            </Text>
            <View style={[styles.inputBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Ionicons name="navigate-outline" size={17} color={colors.secondaryText} />
              <TextInput
                style={[styles.inputField, { color: colors.primaryText }]}
                value={city}
                onChangeText={setCity}
                placeholder="e.g. Douala, Cameroon"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Interactive Map Pinpoint Trigger */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMapPickerVisible(true)}
            style={[styles.mapTriggerCard, { backgroundColor: colors.elevated, borderColor: colors.border }]}
          >
            <View style={[styles.mapTriggerIconWrap, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="map" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapTriggerHeading, { color: colors.primaryText }]}>
                Set Live GPS Map Pinpoint
              </Text>
              <Text style={[styles.mapTriggerCoords, { color: colors.secondaryText }]}>
                {coordinates
                  ? `GPS: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                  : (language === "fr" ? "Touchez pour localiser précisément le salon" : "Tap to pinpoint exact shop location")}
              </Text>
            </View>
            <View style={[styles.editCoordBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="location" size={13} color={colors.brand} />
              <Text style={[styles.editCoordText, { color: colors.brand }]}>{language === "fr" ? "Ajuster" : "Adjust"}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 3: Studio Amenities & Experience */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="sparkles" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Studio Amenities & Perks
              </Text>
              <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                {language === "fr" ? "Mis en avant sur la fiche publique de votre salon" : "Highlighted on your public client shop card"}
              </Text>
            </View>
          </View>

          <View style={styles.amenitiesWrap}>
            {AMENITIES_LIST.map((item) => {
              const isSelected = selectedAmenities.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => toggleAmenity(item.id)}
                  style={[
                    styles.amenityChip,
                    {
                      backgroundColor: isSelected ? "rgba(199, 243, 107, 0.12)" : colors.elevated,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={15}
                    color={isSelected ? colors.brand : colors.secondaryText}
                  />
                  <Text
                    style={[
                      styles.amenityChipText,
                      {
                        color: isSelected ? colors.brand : colors.primaryText,
                        fontWeight: isSelected ? "800" : "500",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Section 4: Trade License & Verification Document */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="shield-checkmark" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                Business License & Compliance
              </Text>
              <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                {t("salonManagement.tradeLicenseDesc") || "Trade license or health certificate for enterprise verification"}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handlePickDocument}
            style={[
              styles.docDropzone,
              {
                backgroundColor: uploadedDocName ? "rgba(199, 243, 107, 0.08)" : colors.elevated,
                borderColor: uploadedDocName ? colors.brand : colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.docIconWrap,
                {
                  backgroundColor: uploadedDocName ? colors.brand : colors.card,
                },
              ]}
            >
              <Ionicons
                name={uploadedDocName ? "checkmark-circle" : "document-text"}
                size={22}
                color={uploadedDocName ? colors.onBrand : colors.secondaryText}
              />
            </View>

            <View style={{ alignItems: "center", gap: 3 }}>
              <Text style={[styles.docMainText, { color: colors.primaryText }]}>
                {uploadedDocName || "Tap to Select Document (PDF / Image)"}
              </Text>
              <Text style={[styles.docSubText, { color: colors.secondaryText }]}>
                {uploadedDocName
                  ? "Attached & ready to submit with salon details"
                  : "Tax registration, trade license, or barber council certificate"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Section 5: Staff & Chair Roster Summary */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={[styles.sectionIconBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="people" size={16} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionTitle, { color: colors.primaryText }]}>
                {t("salonManagement.staffTeamRoster") || "Staff Team Roster"}
              </Text>
              <Text style={[styles.sectionSub, { color: colors.secondaryText }]}>
                {staffList.length} registered stylists ({activeStaffCount} currently active)
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => router.push("/Pages/manage-staff")}
              style={[styles.manageRosterBtn, { backgroundColor: colors.brand }]}
            >
              <Text style={[styles.manageRosterBtnText, { color: colors.onBrand }]}>
                {t("salonManagement.manageStaff") || "Manage Staff"}
              </Text>
              <Ionicons name="arrow-forward" size={13} color={colors.onBrand} />
            </TouchableOpacity>
          </View>

          {isLoadingStaff ? (
            <ActivityIndicator style={{ paddingVertical: 14 }} color={colors.brand} />
          ) : staffList.length === 0 ? (
            <View style={[styles.emptyRosterBox, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
              <Ionicons name="person-add-outline" size={20} color={colors.secondaryText} />
              <Text style={[styles.emptyRosterText, { color: colors.secondaryText }]}>
                {t("salonManagement.noStaffInvited") || "No staff members invited yet. Tap Manage Staff to invite stylists."}
              </Text>
            </View>
          ) : (
            <View style={styles.staffSummaryList}>
              {staffList.slice(0, 3).map((member) => (
                <View
                  key={member.id}
                  style={[styles.staffSnippetRow, { backgroundColor: colors.elevated, borderColor: colors.border }]}
                >
                  <View style={[styles.staffSnippetAvatar, { backgroundColor: colors.card }]}>
                    <Ionicons name="person" size={15} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.staffSnippetName, { color: colors.primaryText }]}>
                      {member.name}
                    </Text>
                    <Text style={[styles.staffSnippetRole, { color: colors.secondaryText }]}>
                      {member.role}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.staffSnippetStatus,
                      {
                        backgroundColor:
                          member.status === "Active"
                            ? "rgba(34, 197, 94, 0.15)"
                            : member.status === "On Break"
                            ? "rgba(245, 158, 11, 0.15)"
                            : "rgba(107, 114, 128, 0.15)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.staffSnippetStatusText,
                        {
                          color:
                            member.status === "Active"
                              ? "#22C55E"
                              : member.status === "On Break"
                              ? "#F59E0B"
                              : "#9CA3AF",
                        },
                      ]}
                    >
                      {member.status}
                    </Text>
                  </View>
                </View>
              ))}
              {staffList.length > 3 && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => router.push("/Pages/manage-staff")}
                  style={styles.moreStaffLink}
                >
                  <Text style={[styles.moreStaffText, { color: colors.brand }]}>
                    + {staffList.length - 3} more staff members in roster
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Primary Save Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSaving}
          onPress={handleSaveAll}
          style={[styles.saveAllBtn, { backgroundColor: colors.brand, opacity: isSaving ? 0.75 : 1 }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={19} color={colors.onBrand} />
              <Text style={[styles.saveAllBtnText, { color: colors.onBrand }]}>
                {t("salonManagement.saveSalonConfig") || "Save Salon Configuration"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Map Location Picker Modal */}
      <BarberLocationPickerModal
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        initialLatitude={coordinates?.latitude}
        initialLongitude={coordinates?.longitude}
        initialCity={city}
        onConfirmLocation={(loc) => {
          setCoordinates({ latitude: loc.latitude, longitude: loc.longitude });
          if (loc.city) setCity(loc.city);
          showToast(`Location coordinates saved: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`, "success");
        }}
      />

      {/* Page Tutorial Modal */}
      <PageTutorialModal
        screenKey="salon_management"
        title={SALON_MANAGEMENT_TUTORIAL.title}
        subtitle={SALON_MANAGEMENT_TUTORIAL.subtitle}
        steps={SALON_MANAGEMENT_TUTORIAL.steps}
        visible={tutorialVisible}
        onClose={() => setTutorialVisible(false)}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11.5,
    marginTop: 1,
    fontWeight: "500",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerSaveBtn: {
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSaveBtnText: {
    fontSize: 13,
    fontWeight: "900",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
    gap: 14,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  logoWrapper: {
    position: "relative",
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#C7F36B",
  },
  logoMonogramWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#C7F36B",
  },
  logoMonogramText: {
    fontSize: 26,
    fontWeight: "900",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#171918",
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  salonName: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  salonLocationText: {
    fontSize: 12.5,
    marginTop: 2,
    fontWeight: "500",
  },
  statusPillsStrip: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  cardDivider: {
    height: 1,
    marginVertical: 14,
  },
  photoActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
  },
  photoActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sectionIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sectionSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  modeToggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  modeToggleTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  modeToggleSub: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  stepperContainer: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  stepperBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueCol: {
    alignItems: "center",
  },
  stepperValueText: {
    fontSize: 32,
    fontWeight: "900",
  },
  stepperSubText: {
    fontSize: 11.5,
    fontWeight: "600",
    marginTop: -2,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 6,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  presetPillText: {
    fontSize: 11,
  },
  inputGroup: {
    gap: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
  },
  textArea: {
    minHeight: 80,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    textAlignVertical: "top",
    lineHeight: 19,
  },
  mapTriggerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  mapTriggerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTriggerHeading: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  mapTriggerCoords: {
    fontSize: 11.5,
    marginTop: 2,
  },
  editCoordBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  editCoordText: {
    fontSize: 11,
    fontWeight: "800",
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  amenityChipText: {
    fontSize: 12,
  },
  docDropzone: {
    padding: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    alignItems: "center",
    gap: 10,
  },
  docIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  docMainText: {
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center",
  },
  docSubText: {
    fontSize: 11.5,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 16,
  },
  manageRosterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  manageRosterBtnText: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  emptyRosterBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 13,
    borderWidth: 1,
  },
  emptyRosterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  staffSummaryList: {
    gap: 8,
  },
  staffSnippetRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  staffSnippetAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  staffSnippetName: {
    fontSize: 13,
    fontWeight: "700",
  },
  staffSnippetRole: {
    fontSize: 11,
    marginTop: 1,
  },
  staffSnippetStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  staffSnippetStatusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  moreStaffLink: {
    alignItems: "center",
    paddingVertical: 6,
  },
  moreStaffText: {
    fontSize: 12,
    fontWeight: "700",
  },
  saveAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    marginTop: 4,
    marginBottom: 20,
  },
  saveAllBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },
});
