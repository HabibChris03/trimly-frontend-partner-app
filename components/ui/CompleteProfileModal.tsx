import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { barberService } from "@/services/barberService";

interface CompleteProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const COMMON_CITIES = [
  "Douala",
  "Yaoundé",
  "Bafoussam",
  "Bamenda",
  "Buea",
  "Limbe",
  "Kribi",
  "Garoua",
];

const SPECIALTY_TITLES = [
  "Master Barber",
  "Hair Stylist",
  "Fade Specialist",
  "Beard Specialist",
  "Colorist",
  "Salon Manager",
];

export default function CompleteProfileModal({
  visible,
  onClose,
  onSaved,
}: CompleteProfileModalProps) {
  const { colors } = useTheme();
  const { user, updateUser } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  const isFr = language === "fr";

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [city, setCity] = useState(user?.city || "");
  const [staffTitle, setStaffTitle] = useState(user?.staff_title || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if user updates
  React.useEffect(() => {
    if (user) {
      if (!name && user.name) setName(user.name);
      if (!phone && user.phone) setPhone(user.phone);
      if (!city && user.city) setCity(user.city);
      if (!staffTitle && user.staff_title) setStaffTitle(user.staff_title);
    }
  }, [user]);

  const handleSave = async () => {
    if (!phone.trim()) {
      showToast(
        isFr
          ? "Veuillez renseigner votre numéro de téléphone professionnel."
          : "Please enter your business phone number.",
        "error"
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await barberService.updateProfileDetails({
        name: name.trim() || undefined,
        phone: phone.trim(),
        city: city.trim() || undefined,
      });

      updateUser({
        name: name.trim() || user?.name || null,
        phone: phone.trim(),
        city: city.trim() || user?.city || null,
        staff_title: staffTitle.trim() || user?.staff_title || null,
      });

      showToast(
        isFr
          ? "Profil partenaire complété avec succès !"
          : "Partner profile completed successfully!",
        "success"
      );
      onSaved?.();
      onClose();
    } catch (err: any) {
      showToast(
        err?.message ||
          (isFr
            ? "Impossible d'enregistrer le profil."
            : "Could not save partner profile."),
        "error"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputBackground = colors.inputBg || colors.surface;
  const placeholderColor = colors.mutedText || "#6B7280";
  const accentColor = colors.accent || colors.brand || "#C7F36B";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Header Icon */}
            <View style={[styles.iconWrapper, { backgroundColor: colors.card || colors.surface }]}>
              <Ionicons name="cut" size={26} color={accentColor} />
            </View>

            {/* Title & Description */}
            <Text style={[styles.title, { color: colors.primaryText }]}>
              {isFr ? "Complétez votre profil partenaire" : "Complete Your Partner Profile"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              {isFr
                ? "Bienvenue sur Trimly Partner ! Renseignez vos informations professionnelles pour recevoir des rendez-vous et être visible des clients."
                : "Welcome to Trimly Partner! Please complete your contact and professional details so clients can book appointments."}
            </Text>

            {/* Display / Business Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>
                {isFr ? "Nom professionnel ou Salon" : "Professional / Salon Name"}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: inputBackground, borderColor: colors.border }]}>
                <Ionicons name="business-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={isFr ? "Ex: VIP Fade Studio" : "e.g. VIP Fade Studio"}
                  placeholderTextColor={placeholderColor}
                  style={[styles.input, { color: colors.primaryText }]}
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>
                {isFr ? "Numéro de téléphone professionnel *" : "Business Phone Number *"}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: inputBackground, borderColor: colors.border }]}>
                <Ionicons name="call-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                <TextInput
                  value={phone}
                  onChangeText={(val) => setPhone(val.replace(/[^0-9]/g, "").slice(0, 10))}
                  placeholder="6xx xx xx xx"
                  placeholderTextColor={placeholderColor}
                  style={[styles.input, { color: colors.primaryText }]}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
            </View>

            {/* Staff Title / Specialty */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>
                {isFr ? "Spécialité / Titre" : "Specialty / Staff Title"}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: inputBackground, borderColor: colors.border }]}>
                <Ionicons name="ribbon-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                <TextInput
                  value={staffTitle}
                  onChangeText={setStaffTitle}
                  placeholder={isFr ? "Ex: Master Barber, Coiffeur pro..." : "e.g. Master Barber, Hair Stylist..."}
                  placeholderTextColor={placeholderColor}
                  style={[styles.input, { color: colors.primaryText }]}
                  autoCapitalize="words"
                />
              </View>

              {/* Specialty Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
              >
                {SPECIALTY_TITLES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setStaffTitle(st)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: staffTitle.toLowerCase() === st.toLowerCase()
                          ? accentColor
                          : (colors.card || colors.surface),
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: staffTitle.toLowerCase() === st.toLowerCase()
                            ? "#171918"
                            : colors.secondaryText,
                          fontWeight: staffTitle.toLowerCase() === st.toLowerCase() ? "700" : "500",
                        },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* City */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.secondaryText }]}>
                {isFr ? "Ville d'exercice" : "Operating City"}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: inputBackground, borderColor: colors.border }]}>
                <Ionicons name="location-outline" size={18} color={colors.secondaryText} style={styles.inputIcon} />
                <TextInput
                  value={city}
                  onChangeText={setCity}
                  placeholder={isFr ? "Ex: Douala, Yaoundé..." : "e.g. Douala, Yaounde..."}
                  placeholderTextColor={placeholderColor}
                  style={[styles.input, { color: colors.primaryText }]}
                  autoCapitalize="words"
                />
              </View>

              {/* Quick City Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipRow}
              >
                {COMMON_CITIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCity(c)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: city.toLowerCase() === c.toLowerCase()
                          ? accentColor
                          : (colors.card || colors.surface),
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color: city.toLowerCase() === c.toLowerCase()
                            ? "#171918"
                            : colors.secondaryText,
                          fontWeight: city.toLowerCase() === c.toLowerCase() ? "700" : "500",
                        },
                      ]}
                    >
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={isSubmitting}
              style={[styles.saveButton, { backgroundColor: accentColor }]}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#171918" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>
                  {isFr ? "Enregistrer mon profil" : "Save My Profile"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Skip Button */}
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <Text style={[styles.skipButtonText, { color: colors.secondaryText }]}>
                {isFr ? "Compléter plus tard" : "Complete later"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "88%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  scrollContent: {
    padding: 24,
    alignItems: "center",
  },
  iconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13.5,
    lineHeight: 19,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  inputGroup: {
    width: "100%",
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14.5,
    height: "100%",
  },
  chipRow: {
    marginTop: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 11.5,
  },
  saveButton: {
    width: "100%",
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  saveButtonText: {
    color: "#171918",
    fontSize: 15.5,
    fontWeight: "700",
  },
  skipButton: {
    paddingVertical: 10,
    marginTop: 4,
  },
  skipButtonText: {
    fontSize: 13.5,
    fontWeight: "500",
  },
});
