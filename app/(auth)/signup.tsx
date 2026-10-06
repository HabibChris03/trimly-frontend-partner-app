import AuthDivider from "@/components/auth/AuthDivider";
import AuthHeader from "@/components/auth/AuthHeader";
import InputField from "@/components/auth/InputField";
import RoleSelector, { UserRole } from "@/components/auth/RoleSelector";
import SocialButton from "@/components/auth/SocialButton";
import useColors from "@/hooks/usecolor";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { setActiveMode } from "@/services/api";
import SpecialtiesDropdown from "@/components/auth/SpecialtiesDropdown";
import BarberLocationPickerModal from "@/components/map/BarberLocationPickerModal";
import { barberService } from "@/services/barberService";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = "446635548067-l57kdu46j2if0pd3rke70hsks4kibq03.apps.googleusercontent.com";

export default function SignupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [role, setRole] = useState<UserRole>("barber");

  // Form State
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Douala, Akwa");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 4.0511,
    longitude: 9.7679,
  });
  const [showMapModal, setShowMapModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [specialty, setSpecialty] = useState("");

  // Attempt to auto-detect current location if permission is already granted
  useEffect(() => {
    let isMounted = true;
    async function detectInitialLocation() {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === "granted") {
          setIsDetectingLocation(true);
          const pos = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (!isMounted) return;
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setCoords({ latitude: lat, longitude: lng });

          try {
            const [geo] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (geo && isMounted) {
              const parts = [geo.street, geo.district, geo.city || geo.subregion, geo.region].filter(Boolean);
              setLocation(parts.join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch {
            if (isMounted) {
              setLocation(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
        }
      } catch {
        // Fallback default retained
      } finally {
        if (isMounted) setIsDetectingLocation(false);
      }
    }
    detectInitialLocation();
    return () => {
      isMounted = false;
    };
  }, []);

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri: "https://auth.expo.io/@habib_chris/trimly",
  });

  React.useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;
      const token = id_token || access_token;
      if (token) {
        setIsSubmitting(true);
        loginWithGoogle(token, role, access_token)
          .then(async () => {
            showToast("Account created with Google successfully! 🎉", "success");
            await setActiveMode("barber");
            router.replace("/(barbers)");
          })
          .catch((err: any) => {
            showToast(err?.message || "Google registration failed.", "error");
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      }
    } else if (response?.type === "error") {
      showToast(response.error?.message || "Google registration encountered an error.", "error");
      setIsSubmitting(false);
    }
  }, [response]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter your full name";
    }

    if (!businessName.trim()) {
      newErrors.businessName = role === "salon" ? "Please enter your salon or shop name" : role === "hairdresser" ? "Please enter your salon or hair studio name" : "Please enter your brand or business name";
    }

    if (!location.trim() && (!coords || !coords.latitude)) {
      newErrors.location = "Please pinpoint your location on the map";
    }

    if (!email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!phone.trim()) {
      newErrors.phone = "Please enter your phone number";
    }

    if (!password) {
      newErrors.password = "Please create a password";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (validateForm()) {
      setIsSubmitting(true);
      try {
        await signup({
          email: email.trim(),
          password: password,
          role: role,
          name: businessName ? `${fullName} (${businessName})` : fullName,
          phone: phone.trim(),
          latitude: coords.latitude,
          longitude: coords.longitude,
        });

        // Persist entered specialty and pinpoint location to profile
        if (specialty || location || coords.latitude) {
          await barberService.updateProfileDetails({
            about_us: specialty ? `Specialties: ${specialty}` : undefined,
            city: location || undefined,
            latitude: coords.latitude,
            longitude: coords.longitude,
          }).catch(() => null);
        }

        showToast("Welcome to Trimly Partner! Account created successfully.", "success");
        router.replace("/(barbers)");
      } catch (err: any) {
        const errorMsg = err.message || "Failed to create account. Please try again.";
        showToast(errorMsg, "error");
        setErrors((prev) => ({ ...prev, general: errorMsg }));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    if (provider === "google") {
      if (!request) {
        showToast("Google Sign-In is initializing. Please tap again in a moment.", "info");
        return;
      }
      try {
        await promptAsync();
      } catch (e: any) {
        showToast(e?.message || "Could not launch Google Sign-In", "error");
      }
      return;
    }
    showToast("Apple sign-up is currently unavailable. Please use Google or email.", "info");
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Brand Header */}
          <AuthHeader
            title={t("auth.createAccount")}
            subtitle={t("auth.createAccountSubtitle")}
          />

          {/* Role Switcher */}
          <RoleSelector role={role} onRoleChange={setRole} />

          {/* Full Name */}
          <InputField
            label={t("auth.fullNamePlaceholder")}
            iconName="person-outline"
            placeholder={role === "barber" ? "Habib" : "Jordie"}
            value={fullName}
            onChangeText={(val) => {
              setFullName(val);
              if (errors.fullName)
                setErrors((prev) => ({ ...prev, fullName: "" }));
            }}
            autoCapitalize="words"
            error={errors.fullName}
          />

          {/* Shop / Brand Name */}
          <InputField
            label={role === "salon" ? "Salon or Shop Name" : role === "hairdresser" ? "Hair Studio Name" : "Brand or Business Name"}
            iconName="business-outline"
            placeholder={role === "salon" ? "e.g. VIP Barber Studio" : role === "hairdresser" ? "e.g. Grace Hair Studio" : "e.g. Habib Hair Studio"}
            value={businessName}
            onChangeText={(val) => {
              setBusinessName(val);
              if (errors.businessName)
                setErrors((prev) => ({ ...prev, businessName: "" }));
            }}
            autoCapitalize="words"
            error={errors.businessName}
          />

          {/* Email Address */}
          <InputField
            label={t("auth.emailPlaceholder")}
            iconName="mail-outline"
            placeholder="partner@trimly237.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          {/* Phone Number */}
          <InputField
            label={t("auth.phonePlaceholder")}
            iconName="call-outline"
            placeholder="+237 673492314"
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              if (errors.phone) setErrors((prev) => ({ ...prev, phone: "" }));
            }}
            keyboardType="phone-pad"
            error={errors.phone}
          />

          {/* Pinpoint Location Selector */}
          <View style={styles.locationContainer}>
            <View style={styles.locationHeaderRow}>
              <Text style={[styles.locationLabel, { color: colors.primarytext }]}>
                {role === "salon" ? "Salon / Shop Location" : role === "hairdresser" ? "Hair Studio Location" : "Barber Location"}
              </Text>
              <View style={[styles.locationBadgeWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="location" size={11} color={colors.primary} style={{ marginRight: 3 }} />
                <Text style={[styles.locationBadge, { color: colors.primary }]}>
                  Pin on Map
                </Text>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowMapModal(true)}
              style={[
                styles.locationCard,
                {
                  backgroundColor: colors.surfacevariant || colors.surface,
                  borderColor: errors.location ? colors.error : colors.border,
                },
              ]}
            >
              <View style={[styles.locationIconWrap, { backgroundColor: `${colors.primary}15` }]}>
                <Ionicons name="pin" size={20} color={colors.primary} />
              </View>

              <View style={styles.locationInfo}>
                <Text
                  style={[styles.locationText, { color: colors.primarytext }]}
                  numberOfLines={1}
                >
                  {isDetectingLocation ? "Detecting current location..." : (location || "Tap to pinpoint on map")}
                </Text>
                <Text style={[styles.locationCoords, { color: colors.secondarytext }]} numberOfLines={1}>
                  {coords.latitude ? `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E • Tap to change` : "Tap to select on map"}
                </Text>
              </View>

              <View style={[styles.changePinBtn, { backgroundColor: colors.primary }]}>
                <Ionicons name="map-outline" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.changePinText}>Change</Text>
              </View>
            </TouchableOpacity>

            {errors.location ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {errors.location}
              </Text>
            ) : (
              <Text style={[styles.locationHelper, { color: colors.secondarytext }]}>
                Tap to pinpoint your exact shop or chair location on the map.
              </Text>
            )}
          </View>

          <InputField
            label={role === "salon" ? "Services & Specialties Offered" : role === "hairdresser" ? "Styles & Specialties Offered" : "Specialties / Cuts Offered"}
            iconName="cut-outline"
            placeholder={role === "hairdresser" ? "Box Braids, Locs, Weave Installation" : "Skin Fades, Beard Sculpting, Hot Towel"}
            value={specialty}
            onChangeText={(val) => setSpecialty(val)}
            autoCapitalize="words"
          />

          {/* Specialties Dropdown with preset & custom specialties */}
          <SpecialtiesDropdown
            value={specialty}
            onChangeValue={(val) => setSpecialty(val)}
          />

          {/* Password */}
          <InputField
            label={t("auth.passwordPlaceholder")}
            iconName="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errors.password)
                setErrors((prev) => ({ ...prev, password: "" }));
            }}
            secureTextEntry
            error={errors.password}
          />

          {/* Confirm Password */}
          <InputField
            label={t("auth.confirmPasswordPlaceholder")}
            iconName="lock-closed-outline"
            placeholder="••••••••"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (errors.confirmPassword)
                setErrors((prev) => ({ ...prev, confirmPassword: "" }));
            }}
            secureTextEntry
            error={errors.confirmPassword}
          />

          {/* Terms Agreement Note */}
          <Text style={[styles.termsText, { color: colors.secondarytext }]}>
            By continuing, you agree to Trimly's{" "}
            <Text style={[styles.termsHighlight, { color: colors.primary }]}>
              Terms of Service
            </Text>{" "}
            and{" "}
            <Text style={[styles.termsHighlight, { color: colors.primary }]}>
              Privacy Policy
            </Text>
            .
          </Text>

          {/* Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleSignUp}
            style={[
              styles.signUpButton,
              {
                backgroundColor: colors.primary,
                opacity: isSubmitting ? 0.7 : 1,
              },
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text
                style={[styles.signUpButtonText, { color: colors.primarytext }]}
              >
                {t("auth.createAccount")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <AuthDivider text="or" />

          {/* Social Sign Up */}
          <SocialButton
            provider="google"
            onPress={() => handleSocialAuth("google")}
            title="Sign up with Google"
          />
          <SocialButton
            provider="apple"
            onPress={() => handleSocialAuth("apple")}
            title="Sign up with Apple"
          />

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text
              style={[styles.footerPrompt, { color: colors.secondarytext }]}
            >
              {t("auth.alreadyHaveAccount")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/login")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
                {t("auth.signInBtn")}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Barber Location Picker Modal */}
      <BarberLocationPickerModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        initialLatitude={coords.latitude}
        initialLongitude={coords.longitude}
        initialCity={location || "Douala, Akwa"}
        onConfirmLocation={(picked) => {
          setCoords({
            latitude: picked.latitude,
            longitude: picked.longitude,
          });
          if (picked.city) {
            setLocation(picked.city);
          } else {
            setLocation(`${picked.latitude.toFixed(4)}, ${picked.longitude.toFixed(4)}`);
          }
          if (errors.location) {
            setErrors((prev) => ({ ...prev, location: "" }));
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    alignItems: "center",
  },
  locationContainer: {
    width: "100%",
    marginBottom: 16,
  },
  locationHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  locationLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  locationBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  locationBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    minHeight: 58,
  },
  locationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  locationInfo: {
    flex: 1,
    marginRight: 8,
  },
  locationText: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  locationCoords: {
    fontSize: 11,
    fontWeight: "400",
  },
  changePinBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changePinText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  locationHelper: {
    fontSize: 11,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginVertical: 12,
    paddingHorizontal: 8,
  },
  termsHighlight: {
    fontWeight: "600",
  },
  signUpButton: {
    width: "100%",
    height: 45,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  signUpButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    paddingBottom: 12,
  },
  footerPrompt: {
    fontSize: 14,
    fontWeight: "400",
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "700",
  },
});
