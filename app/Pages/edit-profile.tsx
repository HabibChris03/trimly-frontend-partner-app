import * as ImagePicker from "expo-image-picker";
import { barberService } from "@/services/barberService";
import { authService } from "@/services/authService";
import { CustomModal } from "@/components/ui/CustomModal";
import { SelectOrAddInput } from "@/components/ui/SelectOrAddInput";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { setAuthToken, setActiveMode } from "@/services/api";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import BarberLocationPickerModal from "@/components/map/BarberLocationPickerModal";

const KNOWN_LOCATIONS = [
  "Douala, Akwa",
  "Douala, Bonanjo",
  "Douala, Bonapriso",
  "Douala, Makepe",
  "Douala, Bonamoussadi",
  "Douala, Deido",
  "Yaoundé, Bastos",
  "Yaoundé, Omnisports",
  "Yaoundé, Tsinga",
  "Buea, Molyko",
  "Limbe, Down Beach",
  "Bamenda, Commercial Ave",
  "Bafoussam, Centre",
  "Kribi, Plage",
];

const PREF_STYLES = [
  "Skin Fade",
  "Classic Scissor",
  "Beard Sculpt",
  "Locs & Braids",
  "Hair Color",
  "Taper & Edge",
];

export default function EditProfileScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, updateUser, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.name || "");
  const [username, setUsername] = useState(
    user?.email ? `@${user.email.split("@")[0]}` : ""
  );
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [city, setCity] = useState((user as any)?.city || "Douala, Cameroon");
  const [salonId, setSalonId] = useState(
    user?.parent_salon_id ? String(user.parent_salon_id) : ""
  );
  const [verifiedSalonName, setVerifiedSalonName] = useState<string | null>(
    user?.parent_salon_name || null
  );
  const [isVerifyingSalon, setIsVerifyingSalon] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(
    user?.avatar_url || user?.logo_url || null
  );
  const [selectedStyles, setSelectedStyles] = useState<string[]>([
    "Skin Fade",
    "Beard Sculpt",
  ]);

  // Shop Location Coordinates State
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(
    user?.latitude && user?.longitude
      ? { latitude: user.latitude, longitude: user.longitude }
      : { latitude: 4.0511, longitude: 9.7679 }
  );
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Security & Password Change State
  const [passwordExpanded, setPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Switch to Salon state
  const [switchSalonModalVisible, setSwitchSalonModalVisible] = useState(false);
  const [newSalonRole, setNewSalonRole] = useState<"Salon Manager" | "Main Barber & Studio Owner">("Salon Manager");
  const [newSalonNameInput, setNewSalonNameInput] = useState(user?.name || "");
  const [newSalonChairsInput, setNewSalonChairsInput] = useState("5");
  const [newSalonCapacity, setNewSalonCapacity] = useState(5);
  const [newSalonCityInput, setNewSalonCityInput] = useState(user?.city || "");
  const [newSalonPhoneInput, setNewSalonPhoneInput] = useState(user?.phone || "");
  const [newSalonAboutInput, setNewSalonAboutInput] = useState(user?.about_us || "");
  const [isSwitchingToSalon, setIsSwitchingToSalon] = useState(false);
  const [isLeavingSalon, setIsLeavingSalon] = useState(false);
  const [leaveSalonModalVisible, setLeaveSalonModalVisible] = useState(false);
  const [isSwitchingToSolo, setIsSwitchingToSolo] = useState(false);
  const [switchToSoloModalVisible, setSwitchToSoloModalVisible] = useState(false);

  // Join a Salon state
  const [joinSalonModalVisible, setJoinSalonModalVisible] = useState(false);
  const [salonSearchQuery, setSalonSearchQuery] = useState("");
  const [isSearchingSalons, setIsSearchingSalons] = useState(false);
  const [searchedSalons, setSearchedSalons] = useState<any[]>([]);
  const [searchSalonsError, setSearchSalonsError] = useState<string | null>(null);
  const [pendingJoinRequest, setPendingJoinRequest] = useState<any | null>(null);
  const [isSendingJoinRequest, setIsSendingJoinRequest] = useState(false);
  const [isCancellingJoinRequest, setIsCancellingJoinRequest] = useState(false);

  const userInitials =
    (fullName || user?.name || "U")
      .trim()
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const checkPendingJoinRequest = useCallback(async () => {
    try {
      const res = await barberService.getMyPendingJoinRequest();
      if (res?.has_pending_request && res?.request) {
        setPendingJoinRequest(res.request);
      } else {
        setPendingJoinRequest(null);
      }
    } catch {
      setPendingJoinRequest(null);
    }
  }, []);

  useEffect(() => {
    checkPendingJoinRequest();
  }, [checkPendingJoinRequest]);

  const handleSearchSalons = async () => {
    const trimmed = salonSearchQuery.trim();
    if (!trimmed) {
      showToast(
        language === "fr"
          ? "Entrez le nom d'un salon pour rechercher."
          : "Please enter a salon name to search.",
        "warning"
      );
      return;
    }
    setIsSearchingSalons(true);
    setSearchSalonsError(null);
    try {
      const results: any = await barberService.searchSalonsByName(trimmed);
      if (results?.error || (!results?.length && trimmed)) {
        const errMsg = results?.error || (language === "fr" ? "Salon non trouvé." : "Salon not found.");
        setSearchSalonsError(errMsg);
        setSearchedSalons([]);
      } else {
        setSearchedSalons(Array.isArray(results) ? results : []);
        setSearchSalonsError(null);
      }
    } catch (e: any) {
      setSearchSalonsError(e?.message || (language === "fr" ? "Erreur de recherche." : "Search failed."));
      setSearchedSalons([]);
    } finally {
      setIsSearchingSalons(false);
    }
  };

  const handleSendJoinRequest = async (targetSalon: any) => {
    if (!targetSalon?.id) return;
    setIsSendingJoinRequest(true);
    try {
      const res = await barberService.sendJoinRequestToSalon(targetSalon.id, targetSalon.name);
      showToast(
        res?.message ||
          (language === "fr"
            ? "Demande d'adhésion envoyée au gérant du salon !"
            : "Join request sent to salon manager!"),
        "success"
      );
      await checkPendingJoinRequest();
      setSearchedSalons([]);
      setSalonSearchQuery("");
      setJoinSalonModalVisible(false);
    } catch (e: any) {
      showToast(
        e?.message ||
          (language === "fr"
            ? "Impossible d'envoyer la demande."
            : "Failed to send join request."),
        "error"
      );
    } finally {
      setIsSendingJoinRequest(false);
    }
  };

  const handleCancelPendingJoinRequest = async () => {
    setIsCancellingJoinRequest(true);
    try {
      await barberService.cancelPendingJoinRequest();
      setPendingJoinRequest(null);
      showToast(
        language === "fr"
          ? "Demande d'adhésion annulée."
          : "Join request cancelled successfully.",
        "success"
      );
    } catch (e: any) {
      showToast(
        e?.message ||
          (language === "fr"
            ? "Échec d'annulation de la demande."
            : "Failed to cancel join request."),
        "error"
      );
    } finally {
      setIsCancellingJoinRequest(false);
    }
  };

  const handleSwitchToSalonConfirm = async () => {
    setIsSwitchingToSalon(true);
    try {
      const parsedChairs = parseInt(newSalonChairsInput, 10);
      const targetCapacity = (!isNaN(parsedChairs) && parsedChairs >= 1)
        ? Math.min(50, parsedChairs)
        : Math.max(1, Math.min(50, newSalonCapacity || 5));
      const targetName =
        newSalonNameInput.trim() ||
        fullName.trim() ||
        user?.name ||
        "Trimly Partner Salon";
      const res = await barberService.switchToSalon({
        salon_name: targetName,
        capacity: targetCapacity,
        staff_title: newSalonRole,
        city: newSalonCityInput.trim() || city.trim() || undefined,
        phone: newSalonPhoneInput.trim() || phone.trim() || undefined,
        about_us: newSalonAboutInput.trim() || user?.about_us || undefined,
      });

      if (res?.access_token) {
        await setAuthToken(res.access_token);
      }

      if (updateUser) {
        updateUser(res?.user || {
          role: "salon",
          name: targetName,
          is_manager: true,
          has_admin_rights: true,
          is_lead: true,
          parent_salon_id: null,
          parent_salon_name: null,
          is_sub_barber: false,
          capacity: targetCapacity,
          staff_title: newSalonRole,
        });
      }

      await setActiveMode("barber");
      setFullName(targetName);
      setSalonId(String(user?.id || res?.user?.id || ""));
      setVerifiedSalonName(null);
      setSwitchSalonModalVisible(false);

      if (refreshUser) {
        await refreshUser().catch(() => null);
      }

      showToast(
        res?.message ||
          (language === "fr"
            ? `Compte converti en Salon (${newSalonRole}) avec succès !`
            : `Account successfully switched to Salon as ${newSalonRole}!`),
        "success"
      );

      // Take user to the main dashboard of the partner app for barbers
      router.replace("/(barbers)");
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr"
            ? "Échec de la transition vers le compte Salon."
            : "Failed to switch to salon account."),
        "error"
      );
    } finally {
      setIsSwitchingToSalon(false);
    }
  };

  const isSalon = Boolean(user?.role === "salon");
  const isUnderSalon = Boolean(user?.parent_salon_id);
  const isSolo = !isSalon && !isUnderSalon;
  const isSalonManager = isSalon;

  const handleConfirmLeaveSalon = async () => {
    setIsLeavingSalon(true);
    try {
      await barberService.unlinkFromSalon();
      if (updateUser) {
        updateUser({
          parent_salon_id: null,
          parent_salon_name: null,
          staff_status: "Active",
          is_sub_barber: false,
          staff_title: user?.role === "hairdresser" ? "Hairdresser" : "Solo Barber",
        });
      }
      setSalonId("");
      setVerifiedSalonName(null);
      setLeaveSalonModalVisible(false);
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      showToast(
        language === "fr"
          ? "Vous avez quitté le salon avec succès. Vous opérez désormais en tant que professionnel solo."
          : "You have successfully left the salon. You are now operating as an independent solo provider.",
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr" ? "Erreur lors du départ du salon." : "Failed to leave salon."),
        "error"
      );
    } finally {
      setIsLeavingSalon(false);
    }
  };

  const handleConfirmSwitchToSolo = async () => {
    setIsSwitchingToSolo(true);
    try {
      const res = await barberService.switchToSolo();
      if (res?.access_token) {
        await setAuthToken(res.access_token);
      }
      if (updateUser) {
        updateUser({
          role: "barber",
          is_manager: false,
          has_admin_rights: false,
          parent_salon_id: null,
          parent_salon_name: null,
          capacity: 1,
          staff_title: "Solo Barber",
        });
      }
      setSalonId("");
      setVerifiedSalonName(null);
      setSwitchToSoloModalVisible(false);
      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      showToast(
        language === "fr"
          ? "Compte converti en barbier solo avec succès."
          : "Account converted to independent solo barber successfully.",
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message || (language === "fr" ? "Échec de la transition." : "Failed to switch to solo."),
        "error"
      );
    } finally {
      setIsSwitchingToSolo(false);
    }
  };

  const handleCopySalonId = () => {
    const idToCopy = String(user?.id || 4);
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(idToCopy);
    }
    showToast(`Salon ID #${idToCopy} copied! Staff can use this to sign up under your salon.`, "success");
  };

  const handleVerifySalon = async () => {
    const cleanNum = parseInt(salonId.replace(/[^0-9]/g, ""), 10);
    if (!cleanNum || isNaN(cleanNum)) {
      showToast("Please enter a valid numeric Salon ID (e.g. 4 or SALON-04).", "warning");
      return;
    }
    setIsVerifyingSalon(true);
    try {
      const salon = await barberService.getSalonById(cleanNum);
      if (salon && salon.name) {
        setVerifiedSalonName(salon.name);
        showToast(`Verified: ${salon.name}`, "success");
      } else {
        const fallback = `Partner Salon #${cleanNum}`;
        setVerifiedSalonName(fallback);
        showToast(`Found: ${fallback}`, "info");
      }
    } catch {
      const fallback = `Partner Salon #${cleanNum}`;
      setVerifiedSalonName(fallback);
      showToast(`Found: ${fallback}`, "info");
    } finally {
      setIsVerifyingSalon(false);
    }
  };

  const handleJoinSalonById = async () => {
    const cleanNum = parseInt(salonId.replace(/[^0-9]/g, ""), 10);
    if (!cleanNum || isNaN(cleanNum)) {
      showToast(
        language === "fr"
          ? "Veuillez entrer un ID de salon valide (ex: 4 ou TRM-SALON-04)."
          : "Please enter a valid numeric Salon ID (e.g. 4 or TRM-SALON-04).",
        "warning"
      );
      return;
    }
    setIsVerifyingSalon(true);
    try {
      const salon = await barberService.getSalonById(cleanNum);
      const targetSalonName = salon?.name || `Partner Salon #${cleanNum}`;
      setVerifiedSalonName(targetSalonName);

      const res = await barberService.updateProfileDetails({
        parent_salon_id: cleanNum,
      });

      if (updateUser) {
        updateUser({
          parent_salon_id: cleanNum,
          parent_salon_name: res?.user?.parent_salon_name || targetSalonName,
          is_sub_barber: true,
          staff_status: "Active",
          staff_title: user?.role === "hairdresser" ? "Hairdresser" : "Staff Barber",
        });
      }

      if (refreshUser) {
        await refreshUser().catch(() => null);
      }

      showToast(
        language === "fr"
          ? `Vous avez rejoint ${targetSalonName} avec succès !`
          : `You have successfully joined ${targetSalonName}!`,
        "success"
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === "fr" ? "Échec de connexion au salon." : "Failed to join salon."),
        "error"
      );
    } finally {
      setIsVerifyingSalon(false);
    }
  };

  const handlePickFromGallery = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast("Permission to access photo gallery is required.", "warning");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      showToast("Avatar image updated from gallery.", "success");
    }
  };

  const handleTakePhoto = async () => {
    setPhotoModalVisible(false);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast("Permission to use camera is required.", "warning");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
      showToast("Photo captured and set as avatar.", "success");
    }
  };

  const handleSave = async () => {
    const trimmedName = fullName.trim() || user?.name || "";
    const trimmedPhone = phone.trim() || user?.phone || "";
    const parsedSalonId = salonId.trim()
      ? parseInt(salonId.replace(/[^0-9]/g, ""), 10) || null
      : 0;

    setIsSaving(true);
    try {
      const res = await barberService.updateProfileDetails({
        name: trimmedName,
        about_us: `${city} - ${trimmedName}`,
        logo_url: avatarUri,
        city: city,
        phone: trimmedPhone,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude,
        parent_salon_id: parsedSalonId !== null ? parsedSalonId : undefined,
      });

      if (updateUser) {
        updateUser({
          name: res?.user?.name || trimmedName,
          phone: res?.user?.phone || trimmedPhone,
          avatar_url: res?.user?.logo_url || avatarUri || user?.avatar_url,
          logo_url: res?.user?.logo_url || avatarUri || user?.logo_url,
          parent_salon_id: parsedSalonId === 0 ? null : (parsedSalonId ?? user?.parent_salon_id),
          parent_salon_name: res?.user?.parent_salon_name || (parsedSalonId === 0 ? null : user?.parent_salon_name),
          is_sub_barber: parsedSalonId === 0 ? false : Boolean(parsedSalonId || user?.is_sub_barber),
        });
      }

      if (refreshUser) {
        await refreshUser().catch(() => null);
      }
      showToast("Profile details updated successfully.", "success");
      router.back();
    } catch (err: any) {
      showToast(err?.message || "Profile updated locally.", "info");
      if (updateUser) {
        updateUser({
          name: trimmedName,
          phone: trimmedPhone,
          avatar_url: avatarUri || user?.avatar_url,
          logo_url: avatarUri || user?.logo_url,
          parent_salon_id: parsedSalonId === 0 ? null : (parsedSalonId ?? user?.parent_salon_id),
          parent_salon_name: parsedSalonId === 0 ? null : user?.parent_salon_name,
          is_sub_barber: parsedSalonId === 0 ? false : Boolean(parsedSalonId || user?.is_sub_barber),
        });
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim()) {
      showToast("Please enter your current password.", "error");
      return;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters long.", "error");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authService.changePassword(currentPassword, newPassword);
      showToast(res?.message || "Password updated successfully!", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordExpanded(false);
    } catch (err: any) {
      showToast(err?.message || "Failed to update password. Check your current password.", "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={[styles.headerBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.primaryText} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.primaryText }]}>
          {t("profile.editProfile") || "Edit Partner Profile"}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={handleSave}
          style={[styles.headerSaveBtn, { backgroundColor: colors.brand }]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={[styles.saveText, { color: colors.onBrand }]}>{t("common.save")}</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Avatar Section with Camera Edit Badge */}
        <View style={styles.avatarWrapper}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPhotoModalVisible(true)}
            style={[
              styles.avatarContainer,
              { backgroundColor: colors.card, borderColor: colors.brand },
            ]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarMonogram, { color: colors.primaryText }]}>
                {userInitials}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPhotoModalVisible(true)}
            style={[styles.cameraBadge, { backgroundColor: colors.brand }]}
          >
            <Ionicons name="camera" size={16} color={colors.onBrand} />
          </TouchableOpacity>
        </View>

        {/* Personal & Shop Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{t("editProfile.personalAndShopDetails")}</Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>{language === "fr" ? "Nom du barbier / salon" : "Barber / Shop Name"}</Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="person-outline" size={18} color={colors.secondaryText} />
              <TextInput
                style={[styles.input, { color: colors.primaryText }]}
                value={fullName}
                onChangeText={setFullName}
                placeholder={language === "fr" ? "Nom du maître barbier / coiffeur" : "Master Barber Name"}
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Username / Handle */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              Username / Handle
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="at-outline" size={18} color={colors.secondaryText} />
              <TextInput
                style={[styles.input, { color: colors.primaryText }]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder="@handle"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Email Address */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.secondaryText} />
              <TextInput
                style={[styles.input, { color: colors.primaryText }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Client Calling Line */}
          <View style={styles.inputGroup}>
            <View style={styles.phoneLabelRow}>
              <Text style={[styles.inputLabel, { color: colors.secondaryText, marginBottom: 0 }]}>
                Client Calling Line
              </Text>
              <View style={[styles.privateBadge, { backgroundColor: "rgba(34, 197, 94, 0.12)", borderColor: "rgba(34, 197, 94, 0.3)" }]}>
                <Ionicons name="lock-closed" size={11} color="#22C55E" />
                <Text style={styles.privateBadgeText}>{language === "fr" ? "Ligne d'appel direct privée" : "Private Direct Dial"}</Text>
              </View>
            </View>
            <Text style={[styles.inputHelperText, { color: colors.secondaryText }]}>
              {language === "fr" ? "Les clients peuvent vous appeler directement via Trimly. Votre numéro privé n'est jamais affiché en clair." : "Clients can tap to call you directly through Trimly. Your private number is never exposed in plain text."}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="call-outline" size={18} color={colors.brand} />
              <TextInput
                style={[styles.input, { color: colors.primaryText }]}
                value={phone}
                onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, "").slice(0, 10))}
                keyboardType="phone-pad"
                maxLength={10}
                placeholder="6XX XXX XXX"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* City / Location Picker */}
          <SelectOrAddInput
            label={t("editProfile.shopLocationCity")}
            placeholder={t("editProfile.selectCityPlaceholder") || "Select or enter your city..."}
            value={city}
            onChangeValue={setCity}
            options={KNOWN_LOCATIONS}
            iconName="location-outline"
            allowCustom={true}
            customPlaceholder={t("editProfile.customCityPlaceholder") || "e.g. Douala, Akwa or Yaoundé, Bastos"}
          />

          {/* Shop GPS Pinpoint Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMapPickerVisible(true)}
            style={[
              styles.mapTriggerBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={[styles.mapTriggerIcon, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="map" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapTriggerTitle, { color: colors.primaryText }]}>
                Pinpoint Shop Location on Map
              </Text>
              <Text style={[styles.mapTriggerSubtitle, { color: colors.secondaryText }]}>
                {coordinates
                  ? `GPS: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                  : "Tap to set live GPS pin"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondaryText} />
          </TouchableOpacity>
        </View>

                {/* Salon Identifier Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
            {isSalon
              ? (language === "fr" ? "IDENTIFIANT DU SALON" : "SALON IDENTIFIER")
              : isUnderSalon
                ? (language === "fr" ? "AFFILIATION AU SALON" : "SALON AFFILIATION")
                : (language === "fr" ? "IDENTIFIANT DU SALON" : "SALON IDENTIFIER")}
          </Text>

          {isSalon ? (
            /* CASE 1: SALON OWNER / STUDIO - Displays Official Salon ID for Staff */
            <View
              style={[
                styles.salonCard,
                { backgroundColor: colors.card, borderColor: "rgba(199, 243, 107, 0.3)" },
              ]}
            >
              <View style={styles.salonCardHeader}>
                <View style={[styles.salonIconBox, { backgroundColor: "rgba(199, 243, 107, 0.15)" }]}>
                  <Ionicons name="business" size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.salonCardTitle, { color: colors.primaryText }]}>
                    {language === "fr" ? `Votre ID de salon : #${user?.id || 4}` : `Your Salon ID: #${user?.id || 4}`}
                  </Text>
                  <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText }]}>
                    {language === "fr"
                      ? "Partagez cet ID avec vos barbiers et coiffeurs pour qu'ils s'inscrivent ou se rattachent à votre salon."
                      : "Share this ID with barbers & hairdressers so they can sign up or link under your salon."}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleCopySalonId}
                style={[styles.salonActionBtn, { backgroundColor: colors.brand }]}
              >
                <Ionicons name="copy-outline" size={16} color={colors.onBrand} />
                <Text style={[styles.salonActionBtnText, { color: colors.onBrand }]}>
                  {language === "fr" ? `Copier l'ID du salon #${user?.id || 4}` : `Copy Salon ID #${user?.id || 4}`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setSwitchToSoloModalVisible(true)}
                style={[
                  styles.salonActionBtn,
                  { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, marginTop: 10 },
                ]}
              >
                <Ionicons name="person-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.salonActionBtnText, { color: colors.primaryText }]}>
                  {language === "fr" ? "Passer en barbier solo indépendant" : "Switch to Independent Solo Barber"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : isUnderSalon ? (
            /* CASE 2: PROVIDER WORKING UNDER A SALON - Must leave first */
            <View style={{ gap: 14 }}>
              <View
                style={[
                  styles.salonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: "rgba(199, 243, 107, 0.35)",
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.salonCardHeader}>
                  <View style={[styles.salonIconBox, { backgroundColor: "rgba(199, 243, 107, 0.15)" }]}>
                    <Ionicons name="business" size={20} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <Text style={[styles.salonCardTitle, { color: colors.primaryText }]}>
                        {user?.parent_salon_name || verifiedSalonName || `Salon #${user?.parent_salon_id}`}
                      </Text>
                      <View style={{ backgroundColor: "rgba(199, 243, 107, 0.15)", borderColor: colors.brand, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colors.brand }}>
                          {language === "fr" ? "MEMBRE DU PERSONNEL" : "SALON EMPLOYEE"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText, marginTop: 4 }]}>
                      {language === "fr"
                        ? `Vous travaillez actuellement sous ce salon (${user?.parent_salon_name || `Salon #${user?.parent_salon_id}`}). Lorsque vous êtes sous un salon, vous ne pouvez passer en barbier solo que si vous quittez d'abord le salon.`
                        : `You are currently working under this salon (${user?.parent_salon_name || `Salon #${user?.parent_salon_id}`}). When you are under a salon, you can switch as a solo barber only if you have left the salon.`}
                    </Text>
                  </View>
                </View>

                {/* Primary Action: Leave Salon to become solo */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setLeaveSalonModalVisible(true)}
                  style={[
                    styles.salonActionBtn,
                    { backgroundColor: "rgba(239, 68, 68, 0.12)", borderColor: "rgba(239, 68, 68, 0.35)", borderWidth: 1, marginTop: 6 },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={16} color="#EF4444" />
                  <Text style={[styles.salonActionBtnText, { color: "#EF4444" }]}>
                    {language === "fr" ? "Quitter le salon pour passer en Solo" : "Leave Salon to Switch to Solo"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Informational Callout */}
              <View
                style={{
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 8,
                }}
              >
                <Ionicons name="information-circle-outline" size={18} color={colors.secondaryText} style={{ marginTop: 1 }} />
                <Text style={{ fontSize: 12, color: colors.secondaryText, flex: 1, lineHeight: 17 }}>
                  {language === "fr"
                    ? "Pour créer votre propre salon avec du personnel, quittez d'abord votre salon actuel ci-dessus afin de redevenir solo."
                    : "To create your own salon with staff, first leave your current salon above to return to solo status."}
                </Text>
              </View>
            </View>
          ) : (
            /* CASE 3: SOLO BARBER - SECTION FOR SALON IDENTIFIER IS AN INPUT FIELD TO JOIN A SALON (NO SALON ID) */
            <View style={{ gap: 14 }}>
              <View
                style={[
                  styles.salonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: "rgba(199, 243, 107, 0.35)",
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.salonCardHeader}>
                  <View style={[styles.salonIconBox, { backgroundColor: "rgba(199, 243, 107, 0.15)" }]}>
                    <Ionicons name="business" size={20} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <Text style={[styles.salonCardTitle, { color: colors.primaryText }]}>
                        {language === "fr" ? "Rejoindre un salon" : "Join a Salon"}
                      </Text>
                      <View style={{ backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: colors.brand, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colors.brand }}>
                          {language === "fr" ? "BARBIER SOLO" : "SOLO BARBER"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText, marginTop: 4 }]}>
                      {language === "fr"
                        ? "En tant que barbier solo, vous n'avez pas d'identifiant de salon. Entrez l'identifiant du salon ci-dessous pour rejoindre son établissement."
                        : "As a solo barber, you do not have a Salon ID. Enter a Salon ID below to join an established salon floor."}
                    </Text>
                  </View>
                </View>

                {/* Input Field to Join a Salon */}
                <View style={{ gap: 6, marginTop: 6 }}>
                  <Text style={[styles.inputLabel, { color: colors.secondaryText, marginBottom: 2 }]}>
                    {language === "fr" ? "Entrez l'identifiant du salon à rejoindre :" : "Enter Salon Identifier to Join:"}
                  </Text>
                  <View style={styles.salonInputRow}>
                    <View
                      style={[
                        styles.salonInputWrapper,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                      ]}
                    >
                      <Ionicons name="business-outline" size={17} color={colors.secondaryText} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.salonTextInput, { color: colors.primaryText }]}
                        placeholder={language === "fr" ? "ex: 4 ou TRM-SALON-04" : "e.g. 4 or TRM-SALON-04"}
                        placeholderTextColor={colors.inputPlaceholder}
                        value={salonId}
                        onChangeText={(val) => {
                          setSalonId(val);
                          if (!val.trim()) {
                            setVerifiedSalonName(null);
                          }
                        }}
                        keyboardType="numeric"
                        autoCapitalize="none"
                      />
                      {salonId.length > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setSalonId("");
                            setVerifiedSalonName(null);
                          }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="close-circle" size={18} color={colors.secondaryText} />
                        </TouchableOpacity>
                      )}
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleJoinSalonById}
                      disabled={isVerifyingSalon || !salonId.trim()}
                      style={[
                        styles.verifyBtn,
                        {
                          backgroundColor: colors.brand,
                          opacity: isVerifyingSalon || !salonId.trim() ? 0.6 : 1,
                        },
                      ]}
                    >
                      {isVerifyingSalon ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <Text style={[styles.verifyBtnText, { color: colors.onBrand }]}>
                          {language === "fr" ? "Rejoindre" : "Join Salon"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Verified feedback */}
                {verifiedSalonName && (
                  <View
                    style={[
                      styles.verifiedSalonBox,
                      { backgroundColor: "rgba(199, 243, 107, 0.08)", borderColor: "rgba(199, 243, 107, 0.25)" },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={18} color={colors.brand} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.verifiedSalonTitle, { color: colors.primaryText }]}>
                        {verifiedSalonName}
                      </Text>
                      <Text style={[styles.verifiedSalonSub, { color: colors.secondaryText }]}>
                        {language === "fr"
                          ? "Salon identifié ! Appuyez sur Rejoindre pour vous lier à ce salon."
                          : "Salon identified! Tap Join Salon to link under this salon."}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setSalonId("");
                        setVerifiedSalonName(null);
                      }}
                      style={styles.unlinkMiniBtn}
                    >
                      <Text style={styles.unlinkMiniText}>{language === "fr" ? "Effacer" : "Clear"}</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Search by Name button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setJoinSalonModalVisible(true)}
                  style={[
                    styles.salonActionBtn,
                    { backgroundColor: colors.elevated, borderColor: colors.border, borderWidth: 1, marginTop: 4 },
                  ]}
                >
                  <Ionicons name="search" size={15} color={colors.brand} />
                  <Text style={[styles.salonActionBtnText, { color: colors.primaryText }]}>
                    {language === "fr" ? "Ou rechercher un salon par nom" : "Or Search Salon by Name"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Option to Switch to a Salon (as a solo barber you cannot have staff, but can switch to a salon) */}
              <View
                style={[
                  styles.salonCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.salonCardHeader}>
                  <View style={[styles.salonIconBox, { backgroundColor: colors.elevated }]}>
                    <Ionicons name="storefront" size={20} color={colors.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                      <Text style={[styles.salonCardTitle, { color: colors.primaryText }]}>
                        {language === "fr" ? "Passer en compte Salon" : "Switch to a Salon"}
                      </Text>
                      <View style={{ backgroundColor: "rgba(199, 243, 107, 0.15)", borderColor: colors.brand, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: colors.brand }}>
                          {language === "fr" ? "RECRUTER DU PERSONNEL" : "GET & INVITE STAFF"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText, marginTop: 4 }]}>
                      {language === "fr"
                        ? "En tant que coiffeur ou barbier solo, vous ne pouvez pas avoir de personnel. Passez votre compte en Salon si vous souhaitez inviter, recruter et gérer des collaborateurs sous votre établissement."
                        : "As a solo barber or hairdresser, you cannot have staff. Switch your account to a Salon if you want to get or invite staff to work under your establishment."}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setNewSalonNameInput(fullName || user?.name || "");
                    setNewSalonChairsInput(String(newSalonCapacity || 5));
                    setNewSalonCityInput(city || user?.city || "");
                    setNewSalonPhoneInput(phone || user?.phone || "");
                    setNewSalonAboutInput(user?.about_us || "");
                    setSwitchSalonModalVisible(true);
                  }}
                  style={[styles.salonActionBtn, { backgroundColor: colors.brand, marginTop: 4 }]}
                >
                  <Ionicons name="business" size={16} color={colors.onBrand} />
                  <Text style={[styles.salonActionBtnText, { color: colors.onBrand }]}>
                    {language === "fr" ? "Passer en compte Salon" : "Switch to a Salon Account"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Style Specialties Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>{language === "fr" ? "SPÉCIALITÉS & STYLES" : "STYLE SPECIALTIES & FOCUS"}</Text>
          <View style={styles.stylesWrap}>
            {PREF_STYLES.map((style) => {
              const isSelected = selectedStyles.includes(style);
              return (
                <TouchableOpacity
                  key={style}
                  activeOpacity={0.8}
                  onPress={() => toggleStyle(style)}
                  style={[
                    styles.styleChip,
                    {
                      backgroundColor: isSelected ? colors.brand : colors.card,
                      borderColor: isSelected ? colors.brand : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.styleChipText,
                      {
                        color: isSelected ? colors.onBrand : colors.primaryText,
                        fontWeight: isSelected ? "800" : "500",
                      },
                    ]}
                  >
                    {style}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Security & Password Section */}
        <View style={styles.section}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPasswordExpanded(!passwordExpanded)}
            style={[styles.securitySectionHeader, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.securityIconBox, { backgroundColor: "rgba(199, 243, 107, 0.12)" }]}>
              <Ionicons name="key" size={18} color={colors.brand} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.securityTitle, { color: colors.primaryText }]}>{language === "fr" ? "Changer le mot de passe du compte" : "Change Account Password"}</Text>
              <Text style={[styles.securitySubtitle, { color: colors.secondaryText }]}>
                {passwordExpanded ? (language === "fr" ? "Mettez à jour votre mot de passe secret ci-dessous" : "Update your secret password below") : (language === "fr" ? "Appuyez pour ouvrir et définir un nouveau mot de passe" : "Tap to expand and set a new password")}
              </Text>
            </View>
            <Ionicons
              name={passwordExpanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.secondaryText}
            />
          </TouchableOpacity>

          {passwordExpanded && (
            <View style={[styles.passwordFormCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Current Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
                  {t("editProfile.currentPassword") || "Current Password"}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Ionicons name="lock-closed-outline" size={17} color={colors.secondaryText} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText }]}
                    secureTextEntry={!showCurrentPassword}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder={t("editProfile.enterExistingPassword") || "Enter existing password"}
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showCurrentPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
                  {t("editProfile.newPasswordMin6") || "New Password (min. 6 characters)"}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Ionicons name="shield-outline" size={17} color={colors.secondaryText} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText }]}
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder={t("editProfile.createStrongPassword") || "Create a strong password"}
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm New Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.secondaryText }]}>
                  {t("editProfile.confirmNewPassword") || "Confirm New Password"}
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
                  <Ionicons name="checkmark-done-outline" size={17} color={colors.secondaryText} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText }]}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder={t("editProfile.retypeNewPassword") || "Retype your new password"}
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                      size={18}
                      color={colors.secondaryText}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Password Change Button */}
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isChangingPassword}
                onPress={handleUpdatePassword}
                style={[styles.updatePasswordBtn, { backgroundColor: colors.brand }]}
              >
                {isChangingPassword ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="key" size={16} color={colors.onBrand} />
                    <Text style={[styles.updatePasswordBtnText, { color: colors.onBrand }]}>
                      {t("editProfile.saveNewPassword") || "Save New Password"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save Changes Bottom Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSaving}
          onPress={handleSave}
          style={[
            styles.saveBottomBtn,
            { backgroundColor: colors.brand, opacity: isSaving ? 0.75 : 1 },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <Text style={[styles.saveBottomBtnText, { color: colors.onBrand }]}>
              {t("common.save") || "Save Profile Changes"}
            </Text>
          )}
        </TouchableOpacity>

        {/* Photo Selection Modal */}
        <CustomModal
          visible={photoModalVisible}
          title={t("editProfile.updatePhotoTitle") || "Update Profile Photo"}
          onClose={() => setPhotoModalVisible(false)}
        >
          <View style={{ gap: 12, paddingVertical: 8 }}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleTakePhoto}
              style={[styles.photoOptionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="camera-outline" size={20} color={colors.brand} />
              <Text style={[styles.photoOptionText, { color: colors.primaryText }]}>
                {language === "fr" ? "Prendre une photo" : "Take Photo with Camera"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handlePickFromGallery}
              style={[styles.photoOptionBtn, { backgroundColor: colors.elevated, borderColor: colors.border }]}
            >
              <Ionicons name="images-outline" size={20} color={colors.brand} />
              <Text style={[styles.photoOptionText, { color: colors.primaryText }]}>
                {language === "fr" ? "Choisir dans la galerie" : "Choose from Gallery"}
              </Text>
            </TouchableOpacity>

            {avatarUri && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  setAvatarUri(null);
                  setPhotoModalVisible(false);
                  showToast("Avatar cleared.", "info");
                }}
                style={[styles.photoOptionBtn, { backgroundColor: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.3)" }]}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text style={[styles.photoOptionText, { color: "#EF4444" }]}>
                  {language === "fr" ? "Supprimer l'avatar actuel" : "Remove Current Avatar"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </CustomModal>

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
            showToast(`Shop location updated: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`, "success");
          }}
        />

        {/* Switch to Salon Confirmation Modal */}
        <CustomModal
          visible={switchSalonModalVisible}
          onClose={() => !isSwitchingToSalon && setSwitchSalonModalVisible(false)}
          title={language === "fr" ? "Passer en compte Salon" : "Switch to a Salon Account"}
        >
          <View style={{ gap: 14, paddingVertical: 4 }}>
            {/* Feature highlights callout */}
            <View
              style={{
                backgroundColor: "rgba(199, 243, 107, 0.1)",
                borderColor: "rgba(199, 243, 107, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="sparkles" size={18} color={colors.brand} />
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.primaryText }}>
                  {language === "fr" ? "Avantages du Compte Salon" : "Salon Manager Features"}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.brand} />
                  <Text style={{ fontSize: 12, color: colors.primaryText }}>
                    {language === "fr" ? "Inviter et gérer plusieurs barbiers & coiffeurs" : "Invite, hire and manage team barbers & hairdressers"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.brand} />
                  <Text style={{ fontSize: 12, color: colors.primaryText }}>
                    {language === "fr" ? "Identifiant unique de salon pour l'inscription du staff" : "Unique Salon ID for instant staff onboarding"}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={15} color={colors.brand} />
                  <Text style={{ fontSize: 12, color: colors.primaryText }}>
                    {language === "fr" ? "Gestion des fauteuils actifs et suivi des revenus" : "Active chairs capacity & team revenue breakdown"}
                  </Text>
                </View>
              </View>
            </View>

            {/* Role Selection: Manager vs Main Barber */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                {language === "fr" ? "Choisissez votre rôle dans le salon :" : "Choose your operational salon role:"}
              </Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                {/* Salon Manager */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNewSalonRole("Salon Manager")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: newSalonRole === "Salon Manager" ? "rgba(199, 243, 107, 0.12)" : colors.surface,
                    borderColor: newSalonRole === "Salon Manager" ? colors.brand : colors.border,
                    borderWidth: 1.5,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Ionicons name="briefcase-outline" size={18} color={newSalonRole === "Salon Manager" ? colors.brand : colors.secondaryText} />
                    {newSalonRole === "Salon Manager" && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryText }}>
                    {language === "fr" ? "Gérant du Salon" : "Salon Manager"}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.secondaryText, lineHeight: 14 }}>
                    {language === "fr" ? "Gestion complète des opérations et de l'équipe" : "Full operations, staff and booking oversight"}
                  </Text>
                </TouchableOpacity>

                {/* Main Barber */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setNewSalonRole("Main Barber & Studio Owner")}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: newSalonRole === "Main Barber & Studio Owner" ? "rgba(199, 243, 107, 0.12)" : colors.surface,
                    borderColor: newSalonRole === "Main Barber & Studio Owner" ? colors.brand : colors.border,
                    borderWidth: 1.5,
                    gap: 6,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Ionicons name="cut-outline" size={18} color={newSalonRole === "Main Barber & Studio Owner" ? colors.brand : colors.secondaryText} />
                    {newSalonRole === "Main Barber & Studio Owner" && (
                      <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                    )}
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primaryText }}>
                    {language === "fr" ? "Barbier Principal" : "Main Barber"}
                  </Text>
                  <Text style={{ fontSize: 10.5, color: colors.secondaryText, lineHeight: 14 }}>
                    {language === "fr" ? "Barbier en chef & gérant de l'établissement" : "Lead barber cutting hair & managing shop"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Chair Capacity Inputted by User */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                {language === "fr" ? "Nombre de fauteuils / postes de coiffure :" : "Number of Chairs / Workstations:"}
              </Text>
              
              {/* Stepper + Input */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const current = parseInt(newSalonChairsInput, 10) || 5;
                    const next = Math.max(1, current - 1);
                    setNewSalonChairsInput(String(next));
                    setNewSalonCapacity(next);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="remove" size={20} color={colors.primaryText} />
                </TouchableOpacity>

                <View
                  style={[
                    styles.inputWrapper,
                    { flex: 1, backgroundColor: colors.surface, borderColor: colors.border, height: 44 },
                  ]}
                >
                  <Ionicons name="cube-outline" size={17} color={colors.brand} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText, textAlign: "center", fontWeight: "800", fontSize: 15 }]}
                    value={newSalonChairsInput}
                    onChangeText={(val) => {
                      const cleaned = val.replace(/[^0-9]/g, "");
                      setNewSalonChairsInput(cleaned);
                      const n = parseInt(cleaned, 10);
                      if (!isNaN(n)) setNewSalonCapacity(n);
                    }}
                    keyboardType="number-pad"
                    placeholder="5"
                    placeholderTextColor={colors.inputPlaceholder}
                    maxLength={3}
                  />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText, marginRight: 8 }}>
                    {language === "fr" ? "fauteuils" : "chairs"}
                  </Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    const current = parseInt(newSalonChairsInput, 10) || 5;
                    const next = Math.min(50, current + 1);
                    setNewSalonChairsInput(String(next));
                    setNewSalonCapacity(next);
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Ionicons name="add" size={20} color={colors.primaryText} />
                </TouchableOpacity>
              </View>

              {/* Preset Chips */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                {[2, 3, 5, 8, 10].map((cap) => (
                  <TouchableOpacity
                    key={cap}
                    activeOpacity={0.8}
                    onPress={() => {
                      setNewSalonChairsInput(String(cap));
                      setNewSalonCapacity(cap);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 7,
                      borderRadius: 8,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: (parseInt(newSalonChairsInput, 10) === cap) ? colors.brand : colors.surface,
                      borderColor: (parseInt(newSalonChairsInput, 10) === cap) ? colors.brand : colors.border,
                      borderWidth: 1,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "800",
                        color: (parseInt(newSalonChairsInput, 10) === cap) ? colors.onBrand : colors.primaryText,
                      }}
                    >
                      {cap}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Salon Name Input */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                {language === "fr" ? "Nom officiel du salon :" : "Official Salon Name:"}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                ]}
              >
                <Ionicons name="business-outline" size={17} color={colors.brand} />
                <TextInput
                  style={[styles.input, { color: colors.primaryText }]}
                  value={newSalonNameInput}
                  onChangeText={setNewSalonNameInput}
                  placeholder={language === "fr" ? "ex: Prestige Barbershop" : "e.g. Prestige Barbershop"}
                  placeholderTextColor={colors.inputPlaceholder}
                />
              </View>
            </View>

            {/* Salon City & Phone */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Ville / Région :" : "City / Region:"}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="location-outline" size={16} color={colors.brand} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText }]}
                    value={newSalonCityInput}
                    onChangeText={setNewSalonCityInput}
                    placeholder="Yaoundé"
                    placeholderTextColor={colors.inputPlaceholder}
                  />
                </View>
              </View>

              <View style={{ flex: 1, gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Téléphone :" : "Phone Contact:"}
                </Text>
                <View
                  style={[
                    styles.inputWrapper,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                  ]}
                >
                  <Ionicons name="call-outline" size={16} color={colors.brand} />
                  <TextInput
                    style={[styles.input, { color: colors.primaryText }]}
                    value={newSalonPhoneInput}
                    onChangeText={setNewSalonPhoneInput}
                    placeholder="+237 6..."
                    placeholderTextColor={colors.inputPlaceholder}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            {/* About Us / Description */}
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                {language === "fr" ? "À propos du salon (Bio) :" : "Salon Bio / About Us:"}
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.surface, borderColor: colors.border, height: 68, alignItems: "flex-start", paddingTop: 8 },
                ]}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.brand} style={{ marginTop: 2 }} />
                <TextInput
                  style={[styles.input, { color: colors.primaryText, textAlignVertical: "top", height: "100%" }]}
                  value={newSalonAboutInput}
                  onChangeText={setNewSalonAboutInput}
                  placeholder={language === "fr" ? "Description de votre salon..." : "Describe your salon vibe, team and specialties..."}
                  placeholderTextColor={colors.inputPlaceholder}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            {/* Action Buttons */}
            <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSwitchingToSalon}
                onPress={() => setSwitchSalonModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSwitchingToSalon}
                onPress={handleSwitchToSalonConfirm}
                style={{
                  flex: 1.6,
                  flexDirection: "row",
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isSwitchingToSalon ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.onBrand }}>
                      {language === "fr" ? "Confirmer & Passer au Salon" : "Confirm & Switch to Salon"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CustomModal>

        {/* Leave Salon Confirmation Modal */}
        <CustomModal
          visible={leaveSalonModalVisible}
          onClose={() => !isLeavingSalon && setLeaveSalonModalVisible(false)}
          title={language === "fr" ? "Quitter le salon" : "Leave Salon"}
        >
          <View style={{ gap: 14, paddingVertical: 4 }}>
            <View
              style={{
                backgroundColor: "rgba(239, 68, 68, 0.1)",
                borderColor: "rgba(239, 68, 68, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="warning" size={18} color="#EF4444" />
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.primaryText }}>
                  {language === "fr" ? "Passer en professionnel solo" : "Switch to Solo Provider"}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.secondaryText, lineHeight: 17 }}>
                {language === "fr"
                  ? `Vous serez dissocié(e) de ${user?.parent_salon_name || "votre salon actuel"} et opérerez en indépendant(e). Vos rendez-vous existants et votre portfolio restent conservés.`
                  : `You will be disconnected from ${user?.parent_salon_name || "your current salon"} and will operate as an independent solo provider. Your existing appointments and portfolio remain safe.`}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isLeavingSalon}
                onPress={() => setLeaveSalonModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isLeavingSalon}
                onPress={handleConfirmLeaveSalon}
                style={{
                  flex: 1.5,
                  flexDirection: "row",
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: "#EF4444",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isLeavingSalon ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="log-out-outline" size={17} color="#FFFFFF" />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: "#FFFFFF" }}>
                      {language === "fr" ? "Confirmer le départ" : "Confirm Leave"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CustomModal>

        {/* Switch to Solo Confirmation Modal (for Salon Owners) */}
        <CustomModal
          visible={switchToSoloModalVisible}
          onClose={() => !isSwitchingToSolo && setSwitchToSoloModalVisible(false)}
          title={language === "fr" ? "Passer en barbier solo" : "Switch to Solo Barber"}
        >
          <View style={{ gap: 14, paddingVertical: 4 }}>
            <View
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderColor: "rgba(245, 158, 11, 0.3)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                gap: 8,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="alert-circle" size={18} color="#F59E0B" />
                <Text style={{ fontSize: 13.5, fontWeight: "800", color: colors.primaryText }}>
                  {language === "fr" ? "Convertir en compte Solo" : "Convert to Solo Account"}
                </Text>
              </View>
              <Text style={{ fontSize: 12, color: colors.secondaryText, lineHeight: 17 }}>
                {language === "fr"
                  ? "Votre compte passera en barbier solo indépendant. Vous n'aurez plus de gestion de fauteuils ou de personnel."
                  : "Your account will switch to an independent solo barber. You will no longer manage staff or salon chairs."}
              </Text>
            </View>

            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={isSwitchingToSolo}
                onPress={() => setSwitchToSoloModalVisible(false)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.elevated,
                  borderColor: colors.border,
                  borderWidth: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isSwitchingToSolo}
                onPress={handleConfirmSwitchToSolo}
                style={{
                  flex: 1.5,
                  flexDirection: "row",
                  paddingVertical: 12,
                  borderRadius: 12,
                  backgroundColor: colors.brand,
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                {isSwitchingToSolo ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={17} color={colors.onBrand} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.onBrand }}>
                      {language === "fr" ? "Confirmer Solo" : "Confirm Solo"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </CustomModal>

        {/* Dedicated Join a Salon Search Modal */}
        <CustomModal
          visible={joinSalonModalVisible}
          onClose={() => {
            setJoinSalonModalVisible(false);
            setSearchedSalons([]);
            setSearchSalonsError(null);
          }}
          title={language === "fr" ? "Rejoindre un salon" : "Join a Salon"}
          scrollable
          showCloseButton
          maxHeight="85%"
        >
          <View style={{ gap: 14, paddingBottom: 8 }}>
            {/* Warning Callout */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                borderColor: "rgba(245, 158, 11, 0.3)",
                borderWidth: 1,
                borderRadius: 8,
                padding: 10,
              }}
            >
              <Ionicons name="warning-outline" size={16} color="#F59E0B" style={{ marginTop: 2 }} />
              <Text style={{ flex: 1, fontSize: 12, lineHeight: 17, color: colors.primaryText }}>
                {language === "fr"
                  ? "Remarque : Lorsque vous rejoignez un salon, vous travaillez désormais en tant que membre du personnel sous ce salon."
                  : "Notice: When you join a salon, you will work under that salon floor as a team staff member."}
              </Text>
            </View>

            {/* Search Input */}
            <View style={{ gap: 8 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  borderWidth: 1,
                  borderRadius: 10,
                  paddingHorizontal: 10,
                }}
              >
                <Ionicons name="search" size={17} color={colors.secondaryText} style={{ marginRight: 6 }} />
                <TextInput
                  style={{
                    flex: 1,
                    height: 44,
                    fontSize: 14,
                    color: colors.primaryText,
                  }}
                  placeholder={
                    language === "fr"
                      ? "Nom du salon uniquement (ex: Prestige Cutz)..."
                      : "Search salon by name only (e.g. Prestige Cutz)..."
                  }
                  placeholderTextColor={colors.secondaryText}
                  value={salonSearchQuery}
                  onChangeText={(val) => {
                    setSalonSearchQuery(val);
                    if (searchSalonsError) setSearchSalonsError(null);
                  }}
                  onSubmitEditing={handleSearchSalons}
                  returnKeyType="search"
                  autoCapitalize="words"
                />
                {isSearchingSalons ? (
                  <ActivityIndicator size="small" color={colors.brand} />
                ) : (
                  <TouchableOpacity
                    onPress={handleSearchSalons}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      backgroundColor: colors.brand,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onBrand }}>
                      {language === "fr" ? "Chercher" : "Search"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {searchSalonsError ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    padding: 8,
                    borderRadius: 8,
                    backgroundColor: "rgba(239, 68, 68, 0.1)",
                    borderWidth: 1,
                    borderColor: "rgba(239, 68, 68, 0.25)",
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={14} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: "#EF4444" }}>{searchSalonsError}</Text>
                </View>
              ) : null}
            </View>

            {/* Results List */}
            {searchedSalons.length > 0 && (
              <View style={{ gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: colors.secondaryText }}>
                  {language === "fr" ? "Salons trouvés :" : "Matching Salons:"}
                </Text>
                {searchedSalons.map((salon) => (
                  <View
                    key={salon.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: colors.card,
                      borderWidth: 1,
                      borderColor: colors.border,
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.primaryText }}>
                        {salon.name}
                      </Text>
                      <Text style={{ fontSize: 11.5, color: colors.secondaryText, marginTop: 2 }}>
                        {salon.city || (language === "fr" ? "Cameroun" : "Cameroon")} • ID #{salon.id}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isSendingJoinRequest}
                      onPress={() => handleSendJoinRequest(salon)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 8,
                        backgroundColor: colors.brand,
                      }}
                    >
                      {isSendingJoinRequest ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: "700", color: colors.onBrand }}>
                          {language === "fr" ? "Rejoindre" : "Join"}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </CustomModal>
      </ScrollView>
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
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  headerSaveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  saveText: {
    fontSize: 13,
    fontWeight: "900",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 60,
  },
  avatarWrapper: {
    alignSelf: "center",
    position: "relative",
    marginBottom: 20,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarMonogram: {
    fontSize: 32,
    fontWeight: "900",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11.5,
    fontWeight: "800",
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "600",
  },
  phoneLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  privateBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#22C55E",
  },
  inputHelperText: {
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 13,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    height: "100%",
  },
  stylesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  styleChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  styleChipText: {
    fontSize: 12.5,
  },
  securitySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  securityIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  securitySubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  passwordFormCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    gap: 4,
  },
  updatePasswordBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 13,
    marginTop: 8,
  },
  updatePasswordBtnText: {
    fontSize: 13.5,
    fontWeight: "900",
  },
  saveBottomBtn: {
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  saveBottomBtnText: {
    fontSize: 15,
    fontWeight: "900",
  },
  mapTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  mapTriggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mapTriggerTitle: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  mapTriggerSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  photoOptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  photoOptionText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  salonCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    gap: 12,
  },
  salonCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  salonIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  salonCardTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  salonCardSubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  salonActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 44,
    borderRadius: 12,
  },
  salonActionBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  salonInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  salonInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  salonTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  verifyBtn: {
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  verifiedSalonBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  verifiedSalonTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  verifiedSalonSub: {
    fontSize: 11,
    marginTop: 1,
  },
  unlinkMiniBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "rgba(255, 68, 68, 0.15)",
  },
  unlinkMiniText: {
    color: "#FF5E5E",
    fontSize: 11,
    fontWeight: "700",
  },
  salonHelperNote: {
    fontSize: 11,
    lineHeight: 15,
  },
});
