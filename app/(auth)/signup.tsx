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
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = "446635548067-l57kdu46j2if0pd3rke70hsks4kibq03.apps.googleusercontent.com";

type SignupStep = 1 | 2 | 3;

export default function SignupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<SignupStep>(1);
  const [role, setRole] = useState<UserRole>("barber");

  // Step 1: Identity & Profile State
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Step 2: Location & Craft State
  const [location, setLocation] = useState("Douala, Akwa");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>({
    latitude: 4.0511,
    longitude: 9.7679,
  });
  const [showMapModal, setShowMapModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [specialty, setSpecialty] = useState("");

  // Step 3: Account & Security State
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-detect current location if permission is already granted
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

  // Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    androidClientId: GOOGLE_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_CLIENT_ID,
    redirectUri: "https://auth.expo.io/@habib_chris/trimly",
  });

  useEffect(() => {
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

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter your full name";
    }

    if (!businessName.trim()) {
      newErrors.businessName =
        role === "salon"
          ? "Please enter your salon or shop name"
          : role === "hairdresser"
          ? "Please enter your salon or hair studio name"
          : "Please enter your brand or business name";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!location.trim() && (!coords || !coords.latitude)) {
      newErrors.location = "Please pinpoint your location on the map";
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors: Record<string, string> = {};

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

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleNextFromStep1 = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handleNextFromStep2 = () => {
    if (validateStep2()) {
      setCurrentStep(3);
    }
  };

  const handleGoBack = () => {
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/(auth)/login");
      }
    }
  };

  const handleSignUp = async () => {
    // Validate each step
    if (!validateStep1()) {
      setCurrentStep(1);
      return;
    }
    if (!validateStep2()) {
      setCurrentStep(2);
      return;
    }
    if (!validateStep3()) {
      return;
    }

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

      showToast("Welcome to Trimly Partner! Account created successfully. 🎉", "success");
      router.replace("/(barbers)");
    } catch (err: any) {
      const errorMsg = err.message || "Failed to create account. Please try again.";
      showToast(errorMsg, "error");
      setErrors((prev) => ({ ...prev, general: errorMsg }));
    } finally {
      setIsSubmitting(false);
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

  const getStepTitles = () => {
    switch (currentStep) {
      case 1:
        return {
          title: t("auth.createAccount") || "Partner Identity",
          subtitle: "Step 1 of 3: Choose your partner craft & brand name",
        };
      case 2:
        return {
          title: "Location & Craft",
          subtitle: "Step 2 of 3: Pinpoint where you serve clients & specialties",
        };
      case 3:
        return {
          title: "Account & Security",
          subtitle: "Step 3 of 3: Set your login details and secure credentials",
        };
    }
  };

  const { title: stepTitle, subtitle: stepSubtitle } = getStepTitles();

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
          {/* Top Bar with Back Navigation & Step Counter */}
          <View style={styles.topNavBar}>
            <TouchableOpacity
              onPress={handleGoBack}
              style={[styles.navBackButton, { backgroundColor: colors.surfacevariant }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
            </TouchableOpacity>

            <View style={styles.navStepIndicator}>
              <Text style={[styles.navStepText, { color: colors.secondarytext }]}>
                STEP <Text style={{ color: colors.primary, fontWeight: "700" }}>{currentStep}</Text> OF 3
              </Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          {/* Stepper Progress Bar */}
          <View style={styles.stepperContainer}>
            {[1, 2, 3].map((stepNum) => {
              const isFilled = currentStep >= stepNum;
              const isCurrent = currentStep === stepNum;
              return (
                <View
                  key={stepNum}
                  style={[
                    styles.stepperSegment,
                    {
                      backgroundColor: isFilled ? colors.primary : colors.surfacevariant,
                      opacity: isCurrent ? 1 : isFilled ? 0.75 : 0.45,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Step Pill Indicators */}
          <View style={styles.stepPillsRow}>
            {[
              { step: 1, label: "Identity" },
              { step: 2, label: "Location" },
              { step: 3, label: "Account" },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step;
              return (
                <View key={item.step} style={styles.stepPillItem}>
                  <View
                    style={[
                      styles.stepPillDot,
                      {
                        backgroundColor: isDone || isActive ? colors.primary : colors.surfacevariant,
                        borderColor: isDone || isActive ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={11} color="#FFFFFF" />
                    ) : (
                      <Text
                        style={[
                          styles.stepPillDotNum,
                          { color: isActive ? "#FFFFFF" : colors.secondarytext },
                        ]}
                      >
                        {item.step}
                      </Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.stepPillLabel,
                      {
                        color: isActive || isDone ? colors.primarytext : colors.secondarytext,
                        fontWeight: isActive ? "700" : "500",
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Top Brand & Step Header */}
          <AuthHeader
            title={stepTitle}
            subtitle={stepSubtitle}
          />

          {/* ================= STEP 1: IDENTITY & ROLE ================= */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              {/* Role Switcher */}
              <RoleSelector role={role} onRoleChange={setRole} />

              {/* Full Name */}
              <InputField
                label={t("auth.fullNamePlaceholder") || "Full Name"}
                iconName="person-outline"
                placeholder={role === "barber" ? "Habib" : role === "hairdresser" ? "Sarah" : "Jordie"}
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

              {/* Next Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNextFromStep1}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryButtonText, { color: colors.primarytext }]}>
                  Continue to Location
                </Text>
                <Ionicons name="arrow-forward" size={18} color={colors.primarytext} style={{ marginLeft: 8 }} />
              </TouchableOpacity>

              {/* Social Auth Divider */}
              <AuthDivider text="or sign up fast" />

              <SocialButton
                provider="google"
                onPress={() => handleSocialAuth("google")}
                title="Continue with Google"
              />
              <SocialButton
                provider="apple"
                onPress={() => handleSocialAuth("apple")}
                title="Continue with Apple"
              />

              {/* Footer to Login */}
              <View style={styles.footerRow}>
                <Text style={[styles.footerPrompt, { color: colors.secondarytext }]}>
                  {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.footerLink, { color: colors.primary }]}>
                    {t("auth.signInBtn") || "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 2: LOCATION & CRAFT ================= */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
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

              {/* Specialties Input */}
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

              {/* Action Buttons Row */}
              <View style={styles.stepButtonRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleGoBack}
                  style={[styles.secondaryButton, { backgroundColor: colors.surfacevariant, borderColor: colors.border }]}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.primarytext} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primarytext }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleNextFromStep2}
                  style={[styles.primaryButtonFlex, { backgroundColor: colors.primary }]}
                >
                  <Text style={[styles.primaryButtonText, { color: colors.primarytext }]}>
                    Continue
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.primarytext} style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ================= STEP 3: SECURITY & ACCOUNT ================= */}
          {currentStep === 3 && (
            <View style={styles.stepCard}>
              {/* Email Address */}
              <InputField
                label={t("auth.emailPlaceholder") || "Email Address"}
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
                label={t("auth.phonePlaceholder") || "Phone Number"}
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

              {/* Password */}
              <InputField
                label={t("auth.passwordPlaceholder") || "Password"}
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
                label={t("auth.confirmPasswordPlaceholder") || "Confirm Password"}
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
                By creating an account, you agree to Trimly's{" "}
                <Text style={[styles.termsHighlight, { color: colors.primary }]}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={[styles.termsHighlight, { color: colors.primary }]}>
                  Privacy Policy
                </Text>
                .
              </Text>

              {/* Navigation & Submit Buttons */}
              <View style={styles.stepButtonRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleGoBack}
                  disabled={isSubmitting}
                  style={[styles.secondaryButton, { backgroundColor: colors.surfacevariant, borderColor: colors.border }]}
                >
                  <Ionicons name="arrow-back" size={16} color={colors.primarytext} style={{ marginRight: 6 }} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primarytext }]}>
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  onPress={handleSignUp}
                  style={[
                    styles.primaryButtonFlex,
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
                      style={[styles.primaryButtonText, { color: colors.primarytext }]}
                    >
                      {t("auth.createAccount") || "Complete Sign Up"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Social Auth Divider */}
              <AuthDivider text="or register with" />

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

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text style={[styles.footerPrompt, { color: colors.secondarytext }]}>
                  {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.footerLink, { color: colors.primary }]}>
                    {t("auth.signInBtn") || "Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 36,
    alignItems: "center",
  },
  topNavBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  navBackButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  navStepIndicator: {
    alignItems: "center",
    justifyContent: "center",
  },
  navStepText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 1.2,
  },
  stepperContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  stepperSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  stepPillsRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 6,
  },
  stepPillItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepPillDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillDotNum: {
    fontSize: 10,
    fontWeight: "700",
  },
  stepPillLabel: {
    fontSize: 12,
  },
  stepCard: {
    width: "100%",
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
  primaryButton: {
    width: "100%",
    height: 48,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  primaryButtonFlex: {
    flex: 2,
    height: 48,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    flex: 1,
    height: 48,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  stepButtonRow: {
    width: "100%",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    marginTop: 12,
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
