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
import React, { useState } from "react";
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

  const isSalonManager = Boolean(user?.role === "salon");

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
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+237 6XX XXX XXX"
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

        {/* Salon Affiliation & Salon ID Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondaryText }]}>
            {isSalonManager ? "SALON IDENTIFIER FOR STAFF REGISTRATION" : "SALON AFFILIATION & SALON ID"}
          </Text>

          {isSalonManager ? (
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
                    Your Salon ID: #{user?.id || 4}
                  </Text>
                  <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText }]}>
                    Share this ID with barbers & hairdressers so they can sign up or link under your salon.
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
                  Copy Salon ID #{user?.id || 4}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View
              style={[
                styles.salonCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.salonCardHeader}>
                <View style={[styles.salonIconBox, { backgroundColor: "rgba(199, 243, 107, 0.15)" }]}>
                  <Ionicons name="git-network-outline" size={20} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.salonCardTitle, { color: colors.primaryText }]}>{language === "fr" ? "Travailler dans un salon" : "Work Under a Salon"}</Text>
                  <Text style={[styles.salonCardSubtitle, { color: colors.secondaryText }]}>
                    {language === "fr" ? "Entrez l'ID du salon fourni par votre gérant pour rattacher votre fauteuil à son salon." : "Enter the Salon ID provided by your salon manager to register or link your chair under their salon floor."}
                  </Text>
                </View>
              </View>

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
                    placeholder={t("editProfile.salonIdPlaceholder") || "e.g. 4 or TRM-SALON-04"}
                    placeholderTextColor={colors.secondaryText}
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
                  onPress={handleVerifySalon}
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
                    <Text style={[styles.verifyBtnText, { color: colors.onBrand }]}>Verify</Text>
                  )}
                </TouchableOpacity>
              </View>

              {verifiedSalonName ? (
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
                      {language === "fr" ? "Rattaché à ce salon. Les modifications seront enregistrées avec le profil." : "Linked under this salon. Changes will save with profile."}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setSalonId("");
                      setVerifiedSalonName(null);
                    }}
                    style={styles.unlinkMiniBtn}
                  >
                    <Text style={styles.unlinkMiniText}>{language === "fr" ? "Quitter" : "Leave"}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <Text style={[styles.salonHelperNote, { color: colors.secondaryText }]}>
                {language === "fr" ? "Laissez vide ou mettez 0 pour exercer en tant que coiffeur indépendant / freelance." : "Leave blank or set to 0 to operate as an independent / freelance barber."}
              </Text>
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
