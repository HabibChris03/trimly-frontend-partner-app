import * as ImagePicker from "expo-image-picker";
import { barberService } from "@/services/barberService";
import { CustomModal } from "@/components/ui/CustomModal";
import { SelectOrAddInput } from "@/components/ui/SelectOrAddInput";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import useColors from "@/hooks/usecolor";
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
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { user, updateUser, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState(user?.name || "");
  const [username, setUsername] = useState(
    user?.email ? `@${user.email.split("@")[0]}` : ""
  );
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [city, setCity] = useState((user as any)?.city || "Douala, Cameroon");
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
      });

      if (updateUser) {
        updateUser({
          name: res?.user?.name || trimmedName,
          phone: res?.user?.phone || trimmedPhone,
          avatar_url: res?.user?.logo_url || avatarUri || user?.avatar_url,
          logo_url: res?.user?.logo_url || avatarUri || user?.logo_url,
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
        });
      }
      router.back();
    } finally {
      setIsSaving(false);
    }
  };

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

        <Text style={[styles.headerTitle, { color: colors.primarytext }]}>
          {t("profile.editProfile")}
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          disabled={isSaving}
          onPress={handleSave}
          style={styles.headerSaveBtn}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>{t("common.save")}</Text>
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
              { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
            ]}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={[styles.avatarMonogram, { color: colors.primarytext }]}>
                {userInitials}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setPhotoModalVisible(true)}
            style={[styles.cameraBadge, { backgroundColor: "#A3B39C" }]}
          >
            <Ionicons name="camera" size={16} color="#1C1E1B" />
          </TouchableOpacity>
        </View>

        {/* Personal Details Form */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            Personal Information
          </Text>

          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              Full Name
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.secondarytext}
              />
              <TextInput
                style={[styles.input, { color: colors.primarytext }]}
                value={fullName}
                onChangeText={setFullName}
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Username */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              Username
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons
                name="at-outline"
                size={18}
                color={colors.secondarytext}
              />
              <TextInput
                style={[styles.input, { color: colors.primarytext }]}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.secondarytext }]}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.secondarytext}
              />
              <TextInput
                style={[styles.input, { color: colors.primarytext }]}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* Phone */}
          <View style={styles.inputGroup}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <Text style={[styles.inputLabel, { color: colors.secondarytext, marginBottom: 0 }]}>
                {user?.role === "barber" || user?.role === "salon"
                  ? "Client Calling Line (Phone Number)"
                  : "Phone Number"}
              </Text>
              {(user?.role === "barber" || user?.role === "salon") && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="lock-closed" size={11} color="#10B981" />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: "#10B981" }}>Private</Text>
                </View>
              )}
            </View>
            {(user?.role === "barber" || user?.role === "salon") && (
              <Text style={{ fontSize: 11.5, color: colors.secondarytext, marginBottom: 8, lineHeight: 16 }}>
                Clients will only see a Call icon to dial you directly. Your phone digits will never be revealed.
              </Text>
            )}
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.surfacevariant,
                },
              ]}
            >
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.secondarytext}
              />
              <TextInput
                style={[styles.input, { color: colors.primarytext }]}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={colors.inputPlaceholder}
              />
            </View>
          </View>

          {/* City / Location */}
          <SelectOrAddInput
            label="Location / City"
            placeholder="Select or enter your city..."
            value={city}
            onChangeValue={setCity}
            options={KNOWN_LOCATIONS}
            iconName="location-outline"
            allowCustom={true}
            customPlaceholder="e.g. Douala, Akwa or Yaoundé, Bastos"
          />

          {/* Shop GPS Pinpoint Button for Barbers/Salons */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => setMapPickerVisible(true)}
            style={[
              styles.mapTriggerBtn,
              { backgroundColor: colors.surface, borderColor: colors.surfacevariant },
            ]}
          >
            <View style={styles.mapTriggerIcon}>
              <Ionicons name="map-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mapTriggerTitle, { color: colors.primarytext }]}>
                Pinpoint Shop Location on Map
              </Text>
              <Text style={[styles.mapTriggerSubtitle, { color: colors.secondarytext }]}>
                {coordinates
                  ? `GPS: ${coordinates.latitude.toFixed(4)}, ${coordinates.longitude.toFixed(4)}`
                  : "Tap to set shop coordinates"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.secondarytext} />
          </TouchableOpacity>
        </View>

        {/* Style Preferences Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.secondarytext }]}>
            Style Preferences
          </Text>
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
                      backgroundColor: isSelected ? "#A3B39C" : colors.surface,
                      borderColor: isSelected ? "#A3B39C" : colors.surfacevariant,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.styleChipText,
                      {
                        color: isSelected ? "#1C1E1B" : colors.primarytext,
                        fontWeight: isSelected ? "700" : "500",
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

        {/* Save Changes Bottom Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={isSaving}
          onPress={handleSave}
          style={[
            styles.saveBottomBtn,
            { backgroundColor: "#A3B39C", opacity: isSaving ? 0.75 : 1 },
          ]}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#1C1E1B" />
          ) : (
            <Text style={styles.saveBottomBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {/* Profile Photo Options Modal */}
        <CustomModal
          visible={photoModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          title="Update Profile Photo"
          description="Select an image source for your profile avatar."
          icon="camera-outline"
          primaryText="Take Photo"
          onPrimary={handleTakePhoto}
          secondaryText="Choose Gallery"
          onSecondary={handlePickFromGallery}
        />

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
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSaveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveText: {
    fontSize: 15,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  avatarWrapper: {
    alignSelf: "center",
    position: "relative",
    marginBottom: 24,
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
    fontWeight: "700",
  },
  cameraBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    marginBottom: 6,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 50,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    height: "100%",
  },
  stylesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  styleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  styleChipText: {
    fontSize: 13,
  },
  saveBottomBtn: {
    height: 52,
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveBottomBtnText: {
    color: "#1C1E1B",
    fontSize: 15.5,
    fontWeight: "700",
  },
  mapTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
  },
  mapTriggerIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(163, 179, 156, 0.15)",
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
});
