import AuthDivider from "@/components/auth/AuthDivider";
import AuthHeader from "@/components/auth/AuthHeader";
import InputField from "@/components/auth/InputField";
import RoleSelector, { UserRole } from "@/components/auth/RoleSelector";
import SocialButton from "@/components/auth/SocialButton";
import TrimlyLogoLoader from "@/components/ui/TrimlyLogoLoader";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
import { authService } from "@/services/authService";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { GOOGLE_OAUTH_CONFIG } from "@/constants/oauth";

WebBrowser.maybeCompleteAuthSession();

type SignupStep = 1 | 2 | 3;

export default function SignupScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { signup, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState<SignupStep>(1);

  // Registration Option Hierarchy State
  const [primaryCategory, setPrimaryCategory] = useState<"salon" | "barber">("salon");
  const [salonSubOption, setSalonSubOption] = useState<"manager" | "manager_lead">("manager");
  const [barberSubOption, setBarberSubOption] = useState<"solo" | "under_salon">("solo");
  const [barberCraft, setBarberCraft] = useState<"barber" | "hairdresser">("barber");
  const role = primaryCategory === "salon" ? "salon" : barberCraft;

  // Linked Emails & Live Verification State
  const [barberEmailInput, setBarberEmailInput] = useState("");
  const [isVerifyingBarberEmail, setIsVerifyingBarberEmail] = useState(false);
  const [verifiedBarberName, setVerifiedBarberName] = useState<string | null>(null);

  const [salonEmailInput, setSalonEmailInput] = useState("");
  const [isVerifyingSalonEmail, setIsVerifyingSalonEmail] = useState(false);
  const [verifiedSalonName, setVerifiedSalonName] = useState<string | null>(null);

  // Step 1: Identity & Profile State
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");

  // Step 2: Location & Craft State
  const [location, setLocation] = useState("Douala, Akwa");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>(
    {
      latitude: 4.0511,
      longitude: 9.7679,
    }
  );
  const [showMapModal, setShowMapModal] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [specialty, setSpecialty] = useState("");

  // Step 2: Salon Initial Mandatory Service (Every salon must have at least 1 service)
  const [initialServiceName, setInitialServiceName] = useState(
    "Signature Salon Haircut"
  );
  const [initialServicePrice, setInitialServicePrice] = useState("1000");

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
            const [geo] = await Location.reverseGeocodeAsync({
              latitude: lat,
              longitude: lng,
            });
            if (geo && isMounted) {
              const parts = [
                geo.street,
                geo.district,
                geo.city || geo.subregion,
                geo.region,
              ].filter(Boolean);
              setLocation(
                parts.join(", ") || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
              );
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
    clientId: GOOGLE_OAUTH_CONFIG.clientId,
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
    responseType: GOOGLE_OAUTH_CONFIG.responseType,
    scopes: GOOGLE_OAUTH_CONFIG.scopes,
    redirectUri: GOOGLE_OAUTH_CONFIG.redirectUri,
  });

  const processGoogleLogin = React.useCallback(
    async (token: string, accessToken?: string) => {
      setIsSubmitting(true);
      try {
        await loginWithGoogle(token, role, accessToken);
        showToast("Account created with Google successfully.", "success");
        await setActiveMode("barber");
        router.replace("/(barbers)");
      } catch (err: any) {
        showToast(err?.message || "Google registration failed.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [loginWithGoogle, role, router, showToast]
  );

  useEffect(() => {
    if (response?.type === "success") {
      const { id_token, access_token } = response.params;
      const token = id_token || access_token;
      if (token) {
        processGoogleLogin(token, access_token);
      } else if (response.params?.code) {
        showToast(
          "Google authorization code received. Retrying with token...",
          "error"
        );
      }
    } else if (response?.type === "error") {
      showToast(
        response.error?.message ||
          "Google registration encountered an error.",
        "error"
      );
      setIsSubmitting(false);
    }
  }, [response, processGoogleLogin, showToast]);

  const handleVerifyBarberEmail = async () => {
    if (!barberEmailInput.trim()) {
      showToast("Please enter an existing barber or hairdresser email.", "warning");
      return;
    }
    setIsVerifyingBarberEmail(true);
    try {
      const res = await authService.validateBarberEmail(barberEmailInput.trim());
      if (res.valid && res.barber) {
        setVerifiedBarberName(res.barber.name || res.barber.email);
        showToast(`Found registered stylist: ${res.barber.name || res.barber.email}`, "success");
        setErrors((prev) => ({ ...prev, barberEmail: "" }));
      } else {
        setVerifiedBarberName(null);
        showToast(res.message || "No registered barber found with this email on Trimly.", "error");
        setErrors((prev) => ({
          ...prev,
          barberEmail: res.message || "No registered barber found with this email on Trimly",
        }));
      }
    } catch {
      setVerifiedBarberName(null);
      showToast("Could not verify barber email. Please check network connection.", "error");
    } finally {
      setIsVerifyingBarberEmail(false);
    }
  };

  const handleVerifySalonEmail = async () => {
    if (!salonEmailInput.trim()) {
      showToast("Please enter a salon email address.", "warning");
      return;
    }
    setIsVerifyingSalonEmail(true);
    try {
      const res = await authService.validateSalonEmail(salonEmailInput.trim());
      if (res.valid && res.salon) {
        setVerifiedSalonName(res.salon.name || res.salon.email);
        showToast(`Found salon: ${res.salon.name || res.salon.email}`, "success");
        setErrors((prev) => ({ ...prev, salonEmail: "" }));
      } else {
        setVerifiedSalonName(null);
        showToast(res.message || "No registered salon found with this email on Trimly.", "error");
        setErrors((prev) => ({
          ...prev,
          salonEmail: res.message || "No registered salon found with this email on Trimly",
        }));
      }
    } catch {
      setVerifiedSalonName(null);
      showToast("Could not verify salon email. Please check network connection.", "error");
    } finally {
      setIsVerifyingSalonEmail(false);
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = "Please enter your full name";
    }

    if (primaryCategory === "salon") {
      if (!businessName.trim()) {
        newErrors.businessName = "Please enter your salon or shop name";
      }
      if (salonSubOption === "manager") {
        if (!barberEmailInput.trim()) {
          newErrors.barberEmail = "Please enter an existing registered barber's email";
        }
      }
    } else {
      if (barberSubOption === "solo") {
        if (!businessName.trim()) {
          newErrors.businessName = "Please enter your brand or studio name";
        }
      } else {
        if (!salonEmailInput.trim()) {
          newErrors.salonEmail = "Please enter the salon's email address";
        }
      }
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};

    if (!location.trim() && (!coords || !coords.latitude)) {
      newErrors.location = "Please pinpoint your location on the map";
    }

    const needsInitialService =
      primaryCategory === "salon"
        ? salonSubOption === "manager_lead"
        : barberSubOption === "solo";

    if (needsInitialService) {
      if (!initialServiceName.trim()) {
        newErrors.initialServiceName =
          "At least 1 service is required to set up your profile";
      }
      const priceNum =
        parseFloat(initialServicePrice.replace(/[^0-9.]/g, "")) || 0;
      if (priceNum < 1000) {
        newErrors.initialServicePrice =
          "Default/minimum service price is 1,000 CFA";
      }
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

  const handleNextFromStep1 = async () => {
    if (!validateStep1()) return;

    if (primaryCategory === "salon" && salonSubOption === "manager") {
      setIsVerifyingBarberEmail(true);
      try {
        const res = await authService.validateBarberEmail(barberEmailInput.trim());
        if (!res.valid) {
          setErrors((prev) => ({
            ...prev,
            barberEmail: res.message || "Barber email not found on Trimly",
          }));
          showToast(res.message || "No registered barber found with this email on Trimly.", "error");
          setIsVerifyingBarberEmail(false);
          return;
        }
        setVerifiedBarberName(res.barber?.name || res.barber?.email);
      } catch {
        // Continue if network check fails
      } finally {
        setIsVerifyingBarberEmail(false);
      }
    } else if (primaryCategory === "barber" && barberSubOption === "under_salon") {
      setIsVerifyingSalonEmail(true);
      try {
        const res = await authService.validateSalonEmail(salonEmailInput.trim());
        if (!res.valid) {
          setErrors((prev) => ({
            ...prev,
            salonEmail: res.message || "Salon email not found on Trimly",
          }));
          showToast(res.message || "No registered salon found with this email on Trimly.", "error");
          setIsVerifyingSalonEmail(false);
          return;
        }
        setVerifiedSalonName(res.salon?.name || res.salon?.email);
      } catch {
        // Continue if network check fails
      } finally {
        setIsVerifyingSalonEmail(false);
      }
    }

    setCurrentStep(2);
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
      let signupType: "salon_manager" | "salon_manager_lead" | "solo_barber" | "salon_barber" = "solo_barber";
      let targetRole: "salon" | "barber" | "hairdresser" = "barber";
      let targetLinkedEmail: string | null = null;
      let targetStaffTitle: string | undefined = undefined;

      if (primaryCategory === "salon") {
        targetRole = "salon";
        if (salonSubOption === "manager") {
          signupType = "salon_manager";
          targetLinkedEmail = barberEmailInput.trim();
          targetStaffTitle = "Salon Manager";
        } else {
          signupType = "salon_manager_lead";
          targetStaffTitle = "Lead Stylist";
        }
      } else {
        targetRole = barberCraft;
        if (barberSubOption === "solo") {
          signupType = "solo_barber";
        } else {
          signupType = "salon_barber";
          targetLinkedEmail = salonEmailInput.trim();
          targetStaffTitle = barberCraft === "hairdresser" ? "Hairdresser" : "Staff Barber";
        }
      }

      const res: any = await signup({
        email: email.trim(),
        password: password,
        role: targetRole,
        name: businessName ? `${fullName} (${businessName})` : fullName,
        phone: phone.trim(),
        latitude: coords.latitude,
        longitude: coords.longitude,
        signup_type: signupType,
        linked_email: targetLinkedEmail,
        staff_title: targetStaffTitle,
        is_manager: primaryCategory === "salon",
        is_lead: salonSubOption === "manager_lead",
        has_admin_rights: primaryCategory === "salon",
      });

      // Persist entered specialty and pinpoint location to profile
      if (specialty || location || coords.latitude) {
        await barberService
          .updateProfileDetails({
            about_us: specialty ? `Specialties: ${specialty}` : undefined,
            city: location || undefined,
            latitude: coords.latitude,
            longitude: coords.longitude,
          })
          .catch(() => null);
      }

      // If salon manager lead or solo barber, register the initial mandatory service
      const needsInitialService =
        primaryCategory === "salon"
          ? salonSubOption === "manager_lead"
          : barberSubOption === "solo";

      if (needsInitialService) {
        const servicePriceNum = Math.max(
          1000,
          parseFloat(initialServicePrice.replace(/[^0-9.]/g, "")) || 1000
        );
        await barberService
          .addService({
            name:
              initialServiceName.trim() ||
              (targetRole === "hairdresser"
                ? "Signature Hair Styling"
                : "Signature Haircut"),
            category: "Haircuts & Styling",
            duration_minutes: 45,
            price: servicePriceNum,
            is_extra: false,
          })
          .catch(() => null);
      }

      if (res?.account_status === "pending_barber_approval") {
        showToast(
          `Salon created! An invitation was sent to ${barberEmailInput.trim()}. Your salon floor activates once they accept.`,
          "info"
        );
        await setActiveMode("barber");
        router.replace("/(barbers)");
      } else if (res?.account_status === "pending_salon_approval") {
        showToast(
          `Join request sent to ${salonEmailInput.trim()}! You will appear on the salon floor once approved.`,
          "info"
        );
        await setActiveMode("sub-barber");
        router.replace("/(sub-barber)/bookings" as any);
      } else if (primaryCategory === "salon") {
        showToast(
          "Welcome to Trimly Partner. Salon account created successfully.",
          "success"
        );
        await setActiveMode("barber");
        router.replace("/(barbers)");
      } else {
        showToast(
          "Welcome to Trimly Partner. Stylist account created successfully.",
          "success"
        );
        await setActiveMode("barber");
        router.replace("/(barbers)");
      }
    } catch (err: any) {
      const errorMsg =
        err.message || "Failed to create account. Please try again.";
      showToast(errorMsg, "error");
      setErrors((prev) => ({ ...prev, general: errorMsg }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    if (provider === "google") {
      if (!request) {
        showToast(
          "Google Sign-In is initializing. Please tap again in a moment.",
          "info"
        );
        return;
      }
      try {
        setIsSubmitting(true);
        if (Platform.OS === "web") {
          const result = await promptAsync();
          if (result.type === "success") {
            const { id_token, access_token } = result.params;
            const token = id_token || access_token;
            if (token) {
              await processGoogleLogin(token, access_token);
            }
          } else if (result.type === "error") {
            showToast(
              result.error?.message ||
                "Google registration encountered an error.",
              "error"
            );
          }
        } else {
          const authUrl =
            request.url ||
            (await request.makeAuthUrlAsync({
              authorizationEndpoint:
                "https://accounts.google.com/o/oauth2/v2/auth",
            }));

          const returnUrl = AuthSession.getDefaultReturnUrl();
          const startUrl = `https://auth.expo.io/@habib_chris/trimly/start?authUrl=${encodeURIComponent(
            authUrl
          )}&returnUrl=${encodeURIComponent(returnUrl)}`;

          const result = await WebBrowser.openAuthSessionAsync(
            startUrl,
            returnUrl
          );
          if (result.type === "success" && result.url) {
            const parsed =
              (AuthSession as any).QueryParams?.getQueryParams(result.url) || {
                params: {},
              };
            const token =
              parsed.params?.id_token || parsed.params?.access_token;
            if (token) {
              await processGoogleLogin(token, parsed.params?.access_token);
            } else if (parsed.params?.error) {
              showToast(
                parsed.params.error_description ||
                  parsed.params.error ||
                  "Google registration was declined.",
                "error"
              );
            }
          }
        }
      } catch (e: any) {
        showToast(e?.message || "Could not launch Google Sign-In", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    showToast(
      "Apple sign-up is currently unavailable. Please use Google or email.",
      "info"
    );
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
          title: t("auth.step2Title"),
          subtitle: t("auth.step2Sub"),
        };
      case 3:
        return {
          title: t("auth.step3Title"),
          subtitle: t("auth.step3Sub"),
        };
    }
  };

  const { title: stepTitle, subtitle: stepSubtitle } = getStepTitles();

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
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
              style={[
                styles.navBackButton,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.8}
            >
              <Ionicons
                name="chevron-back"
                size={21}
                color={colors.primaryText}
              />
            </TouchableOpacity>

            <View
              style={[
                styles.navStepIndicator,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text
                style={[styles.navStepText, { color: colors.secondaryText }]}
              >
                STEP{" "}
                <Text style={{ color: colors.brand, fontWeight: "800" }}>
                  0{currentStep}
                </Text>{" "}
                / 03
              </Text>
            </View>

            <View style={{ width: 42 }} />
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
                      backgroundColor: isFilled ? colors.brand : colors.border,
                      opacity: isCurrent ? 1 : isFilled ? 0.78 : 1,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* Step Pill Indicators */}
          <View style={styles.stepPillsRow}>
            {[
              { step: 1, label: t("auth.stepIdentity") },
              { step: 2, label: t("auth.stepLocation") },
              { step: 3, label: t("auth.stepAccount") },
            ].map((item) => {
              const isActive = currentStep === item.step;
              const isDone = currentStep > item.step;
              return (
                <View key={item.step} style={styles.stepPillItem}>
                  <View
                    style={[
                      styles.stepPillDot,
                      {
                        backgroundColor:
                          isDone || isActive ? colors.brand : colors.card,
                        borderColor:
                          isDone || isActive ? colors.brand : colors.border,
                      },
                    ]}
                  >
                    {isDone ? (
                      <Ionicons
                        name="checkmark"
                        size={11}
                        color={colors.onBrand}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.stepPillDotNum,
                          {
                            color: isActive
                              ? colors.onBrand
                              : colors.secondaryText,
                          },
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
                        color:
                          isActive || isDone
                            ? colors.primaryText
                            : colors.secondaryText,
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
          <AuthHeader title={stepTitle} subtitle={stepSubtitle} />

          {/* ================= STEP 1: IDENTITY & ROLE ================= */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              {/* TIER 1: PRIMARY CATEGORY SELECTION */}
              <View style={styles.tier1Wrap}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setPrimaryCategory("salon");
                    setErrors({});
                  }}
                  style={[
                    styles.tier1Card,
                    {
                      backgroundColor: primaryCategory === "salon" ? colors.card : colors.surface,
                      borderColor: primaryCategory === "salon" ? colors.brand : colors.border,
                      borderWidth: primaryCategory === "salon" ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tier1IconWrap,
                      {
                        backgroundColor:
                          primaryCategory === "salon"
                            ? colors.brand
                            : "rgba(199, 243, 107, 0.1)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="business"
                      size={20}
                      color={primaryCategory === "salon" ? colors.onBrand : colors.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.tier1Title,
                        {
                          color:
                            primaryCategory === "salon"
                              ? colors.brand
                              : colors.primaryText,
                        },
                      ]}
                    >{t("auth.registerAsSalon")}</Text>
                    <Text style={[styles.tier1Subtitle, { color: colors.secondaryText }]}>{t("auth.registerAsSalonSub")}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          primaryCategory === "salon" ? colors.brand : colors.border,
                        backgroundColor:
                          primaryCategory === "salon" ? colors.brand : "transparent",
                      },
                    ]}
                  >
                    {primaryCategory === "salon" && (
                      <Ionicons name="checkmark" size={13} color={colors.onBrand} />
                    )}
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    setPrimaryCategory("barber");
                    setErrors({});
                  }}
                  style={[
                    styles.tier1Card,
                    {
                      backgroundColor: primaryCategory === "barber" ? colors.card : colors.surface,
                      borderColor: primaryCategory === "barber" ? colors.brand : colors.border,
                      borderWidth: primaryCategory === "barber" ? 2 : 1,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tier1IconWrap,
                      {
                        backgroundColor:
                          primaryCategory === "barber"
                            ? colors.brand
                            : "rgba(199, 243, 107, 0.1)",
                      },
                    ]}
                  >
                    <Ionicons
                      name="cut"
                      size={20}
                      color={primaryCategory === "barber" ? colors.onBrand : colors.brand}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.tier1Title,
                        {
                          color:
                            primaryCategory === "barber"
                              ? colors.brand
                              : colors.primaryText,
                        },
                      ]}
                    >{t("auth.registerAsBarber")}</Text>
                    <Text style={[styles.tier1Subtitle, { color: colors.secondaryText }]}>{t("auth.registerAsBarberSub")}</Text>
                  </View>
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          primaryCategory === "barber" ? colors.brand : colors.border,
                        backgroundColor:
                          primaryCategory === "barber" ? colors.brand : "transparent",
                      },
                    ]}
                  >
                    {primaryCategory === "barber" && (
                      <Ionicons name="checkmark" size={13} color={colors.onBrand} />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              {/* TIER 2 SUB-OPTIONS */}
              {primaryCategory === "salon" ? (
                /* SALON SUB-OPTIONS */
                <View style={styles.tier2Container}>
                  <Text style={[styles.tier2HeaderLabel, { color: colors.secondaryText }]}>{t("auth.selectSalonRole")}</Text>
                  <View style={styles.tier2Row}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setSalonSubOption("manager");
                        setErrors((prev) => ({ ...prev, barberEmail: "" }));
                      }}
                      style={[
                        styles.tier2OptionBtn,
                        {
                          backgroundColor:
                            salonSubOption === "manager" ? colors.brand : colors.card,
                          borderColor:
                            salonSubOption === "manager" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={salonSubOption === "manager" ? colors.onBrand : colors.secondaryText}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tier2OptionTitle,
                            {
                              color: salonSubOption === "manager" ? colors.onBrand : colors.primaryText,
                              fontWeight: salonSubOption === "manager" ? "800" : "600",
                            },
                          ]}
                        >{t("auth.registerAsManager")}</Text>
                        <Text
                          style={[
                            styles.tier2OptionDesc,
                            {
                              color: salonSubOption === "manager" ? colors.onBrand : colors.secondaryText,
                            },
                          ]}
                        >
                          {t("auth.adminRightsOnly") || "Admin rights only. Link 1 existing barber."}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setSalonSubOption("manager_lead");
                        setErrors((prev) => ({ ...prev, barberEmail: "" }));
                      }}
                      style={[
                        styles.tier2OptionBtn,
                        {
                          backgroundColor:
                            salonSubOption === "manager_lead" ? colors.brand : colors.card,
                          borderColor:
                            salonSubOption === "manager_lead" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="ribbon"
                        size={18}
                        color={salonSubOption === "manager_lead" ? colors.onBrand : colors.secondaryText}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tier2OptionTitle,
                            {
                              color: salonSubOption === "manager_lead" ? colors.onBrand : colors.primaryText,
                              fontWeight: salonSubOption === "manager_lead" ? "800" : "600",
                            },
                          ]}
                        >{t("auth.registerAsManagerLead")}</Text>
                        <Text
                          style={[
                            styles.tier2OptionDesc,
                            {
                              color: salonSubOption === "manager_lead" ? colors.onBrand : colors.secondaryText,
                            },
                          ]}
                        >
                          {t("auth.adminRightsLead") || "Admin rights + Lead Stylist on floor (Max 1)."}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Informational helper for Salon sub-options */}
                  {salonSubOption === "manager" ? (
                    <View style={[styles.infoCallout, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
                      <Text style={[styles.infoCalloutText, { color: colors.secondaryText }]}>
                        {t("auth.managerRightsNote") || "Only the manager has admin rights on the salon. Barbers/hairdressers under your salon will not have admin rights."}
                      </Text>
                    </View>
                  ) : (
                    <View style={[styles.infoCallout, { backgroundColor: colors.card, borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                      <Ionicons name="sparkles" size={16} color={colors.brand} />
                      <Text style={[styles.infoCalloutText, { color: colors.secondaryText }]}>
                        {t("auth.managerLeadRightsNote") || "You will have full admin rights and serve as the Lead Hairdresser. There can be a maximum of 1 Lead Hairdresser per salon."}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                /* BARBER / HAIR DRESSER SUB-OPTIONS */
                <View style={styles.tier2Container}>
                  <Text style={[styles.tier2HeaderLabel, { color: colors.secondaryText }]}>
                    {t("auth.selectStylistCraft") || "SELECT STYLIST CRAFT & WORKSPACE"}
                  </Text>

                  {/* Craft Selector: Barber vs Hairdresser */}
                  <View style={styles.craftSelectorRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setBarberCraft("barber")}
                      style={[
                        styles.craftBtn,
                        {
                          backgroundColor: barberCraft === "barber" ? colors.brand : colors.card,
                          borderColor: barberCraft === "barber" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="cut-outline"
                        size={15}
                        color={barberCraft === "barber" ? colors.onBrand : colors.secondaryText}
                      />
                      <Text
                        style={[
                          styles.craftBtnText,
                          {
                            color: barberCraft === "barber" ? colors.onBrand : colors.primaryText,
                            fontWeight: barberCraft === "barber" ? "800" : "600",
                          },
                        ]}
                      >{t("auth.barberCraft") || "Barber"}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => setBarberCraft("hairdresser")}
                      style={[
                        styles.craftBtn,
                        {
                          backgroundColor: barberCraft === "hairdresser" ? colors.brand : colors.card,
                          borderColor: barberCraft === "hairdresser" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="sparkles-outline"
                        size={15}
                        color={barberCraft === "hairdresser" ? colors.onBrand : colors.secondaryText}
                      />
                      <Text
                        style={[
                          styles.craftBtnText,
                          {
                            color: barberCraft === "hairdresser" ? colors.onBrand : colors.primaryText,
                            fontWeight: barberCraft === "hairdresser" ? "800" : "600",
                          },
                        ]}
                      >{t("auth.hairdresserCraft") || "Hairdresser"}</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.tier2Row}>
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setBarberSubOption("solo");
                        setErrors((prev) => ({ ...prev, salonEmail: "" }));
                      }}
                      style={[
                        styles.tier2OptionBtn,
                        {
                          backgroundColor:
                            barberSubOption === "solo" ? colors.brand : colors.card,
                          borderColor:
                            barberSubOption === "solo" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="person"
                        size={16}
                        color={barberSubOption === "solo" ? colors.onBrand : colors.secondaryText}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tier2OptionTitle,
                            {
                              color: barberSubOption === "solo" ? colors.onBrand : colors.primaryText,
                              fontWeight: barberSubOption === "solo" ? "800" : "600",
                            },
                          ]}
                        >{t("auth.registerAsSolo")}</Text>
                        <Text
                          style={[
                            styles.tier2OptionDesc,
                            {
                              color: barberSubOption === "solo" ? colors.onBrand : colors.secondaryText,
                            },
                          ]}
                        >
                          {t("auth.soloWorkDesc") || "Work independently with your own clients & schedule."}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => {
                        setBarberSubOption("under_salon");
                        setErrors((prev) => ({ ...prev, salonEmail: "" }));
                      }}
                      style={[
                        styles.tier2OptionBtn,
                        {
                          backgroundColor:
                            barberSubOption === "under_salon" ? colors.brand : colors.card,
                          borderColor:
                            barberSubOption === "under_salon" ? colors.brand : colors.border,
                        },
                      ]}
                    >
                      <Ionicons
                        name="git-network"
                        size={16}
                        color={barberSubOption === "under_salon" ? colors.onBrand : colors.secondaryText}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.tier2OptionTitle,
                            {
                              color: barberSubOption === "under_salon" ? colors.onBrand : colors.primaryText,
                              fontWeight: barberSubOption === "under_salon" ? "800" : "600",
                            },
                          ]}
                        >{t("auth.registerUnderSalon")}</Text>
                        <Text
                          style={[
                            styles.tier2OptionDesc,
                            {
                              color: barberSubOption === "under_salon" ? colors.onBrand : colors.secondaryText,
                            },
                          ]}
                        >
                          {t("auth.underSalonDesc") || "Work under a salon floor. Requires salon manager approval."}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Full Name */}
              <InputField
                label={t("auth.fullNamePlaceholder") || "Full Name"}
                iconName="person-outline"
                placeholder={primaryCategory === "salon" ? "e.g. John Doe" : "e.g. Sarah / Habib"}
                value={fullName}
                onChangeText={(val) => {
                  setFullName(val);
                  if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: "" }));
                }}
                autoCapitalize="words"
                error={errors.fullName}
              />

              {/* Shop / Brand Name (Only for Salon & Solo Stylist) */}
              {(primaryCategory === "salon" || barberSubOption === "solo") && (
                <InputField
                  label={primaryCategory === "salon" ? t("auth.salonOrShopName") : t("auth.studioOrBrandName")}
                  iconName="business-outline"
                  placeholder={primaryCategory === "salon" ? "e.g. Prestige Hair & Barber Lounge" : "e.g. Habib Cuts & Fades"}
                  value={businessName}
                  onChangeText={(val) => {
                    setBusinessName(val);
                    if (errors.businessName) setErrors((prev) => ({ ...prev, businessName: "" }));
                  }}
                  autoCapitalize="words"
                  error={errors.businessName}
                />
              )}

              {/* Conditional Input 1: Manager entering existing Barber's email */}
              {primaryCategory === "salon" && salonSubOption === "manager" && (
                <View style={styles.linkedInputSection}>
                  <Text style={[styles.fieldLabel, { color: colors.primaryText }]}>
                    {t("auth.existingBarberRequired") || "Existing Barber or Hairdresser Email (Required)"}
                  </Text>
                  <View style={styles.verifyInputRow}>
                    <View style={[styles.verifyInputBox, { backgroundColor: colors.card, borderColor: errors.barberEmail ? "#EF4444" : colors.border }]}>
                      <Ionicons name="mail-outline" size={18} color={colors.secondaryText} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.verifyTextInput, { color: colors.primaryText }]}
                        placeholder="barber@example.com"
                        placeholderTextColor={colors.secondaryText}
                        value={barberEmailInput}
                        onChangeText={(val) => {
                          setBarberEmailInput(val);
                          setVerifiedBarberName(null);
                          if (errors.barberEmail) setErrors((prev) => ({ ...prev, barberEmail: "" }));
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleVerifyBarberEmail}
                      disabled={isVerifyingBarberEmail || !barberEmailInput.trim()}
                      style={[
                        styles.verifyBtn,
                        {
                          backgroundColor: colors.brand,
                          opacity: isVerifyingBarberEmail || !barberEmailInput.trim() ? 0.6 : 1,
                        },
                      ]}
                    >
                      {isVerifyingBarberEmail ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <Text style={[styles.verifyBtnText, { color: colors.onBrand }]}>{t("auth.verify") || "Verify"}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.barberEmail ? (
                    <Text style={styles.fieldErrorText}>{errors.barberEmail}</Text>
                  ) : null}
                  {verifiedBarberName ? (
                    <View style={[styles.verifiedBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                      <Text style={[styles.verifiedBadgeText, { color: colors.primaryText }]}>
                        Verified Stylist: {verifiedBarberName}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.fieldHelperText, { color: colors.secondaryText }]}>
                      {t("auth.existingBarberHelper") || "Trimly will send an invite request to this barber. Your salon floor activates once accepted."}
                    </Text>
                  )}
                </View>
              )}

              {/* Conditional Input 2: Stylist entering Salon's email */}
              {primaryCategory === "barber" && barberSubOption === "under_salon" && (
                <View style={styles.linkedInputSection}>
                  <Text style={[styles.fieldLabel, { color: colors.primaryText }]}>
                    {t("auth.salonEmailRequired") || "Salon Email Address (Required)"}
                  </Text>
                  <View style={styles.verifyInputRow}>
                    <View style={[styles.verifyInputBox, { backgroundColor: colors.card, borderColor: errors.salonEmail ? "#EF4444" : colors.border }]}>
                      <Ionicons name="business-outline" size={18} color={colors.secondaryText} style={{ marginRight: 8 }} />
                      <TextInput
                        style={[styles.verifyTextInput, { color: colors.primaryText }]}
                        placeholder="salon@example.com"
                        placeholderTextColor={colors.secondaryText}
                        value={salonEmailInput}
                        onChangeText={(val) => {
                          setSalonEmailInput(val);
                          setVerifiedSalonName(null);
                          if (errors.salonEmail) setErrors((prev) => ({ ...prev, salonEmail: "" }));
                        }}
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleVerifySalonEmail}
                      disabled={isVerifyingSalonEmail || !salonEmailInput.trim()}
                      style={[
                        styles.verifyBtn,
                        {
                          backgroundColor: colors.brand,
                          opacity: isVerifyingSalonEmail || !salonEmailInput.trim() ? 0.6 : 1,
                        },
                      ]}
                    >
                      {isVerifyingSalonEmail ? (
                        <ActivityIndicator size="small" color={colors.onBrand} />
                      ) : (
                        <Text style={[styles.verifyBtnText, { color: colors.onBrand }]}>{t("auth.verify") || "Verify"}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                  {errors.salonEmail ? (
                    <Text style={styles.fieldErrorText}>{errors.salonEmail}</Text>
                  ) : null}
                  {verifiedSalonName ? (
                    <View style={[styles.verifiedBadge, { backgroundColor: "rgba(199, 243, 107, 0.12)", borderColor: "rgba(199, 243, 107, 0.3)" }]}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.brand} />
                      <Text style={[styles.verifiedBadgeText, { color: colors.primaryText }]}>
                        Verified Salon: {verifiedSalonName}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.fieldHelperText, { color: colors.secondaryText }]}>
                      {t("auth.salonEmailHelper") || "A join request will be sent to the salon manager. If approved, you will be added to the salon floor."}
                    </Text>
                  )}
                </View>
              )}

              {/* Next Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleNextFromStep1}
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.brand },
                ]}
              >
                <Text
                  style={[styles.primaryButtonText, { color: colors.onBrand }]}
                >{t("auth.continueToLocation") || "Continue to Location"}</Text>
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={colors.onBrand}
                  style={{ marginLeft: 8 }}
                />
              </TouchableOpacity>

              {/* Social Auth Divider */}
              <AuthDivider text={t("auth.orSignUpFast") || "or sign up fast"} />

              <SocialButton
                provider="google"
                onPress={() => handleSocialAuth("google")}
                title={t("auth.continueWithGoogle")}
              />
              <SocialButton
                provider="apple"
                onPress={() => handleSocialAuth("apple")}
                title={t("auth.continueWithApple")}
              />

              {/* Footer to Login */}
              <View style={styles.footerRow}>
                <Text
                  style={[styles.footerPrompt, { color: colors.secondaryText }]}
                >
                  {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.footerLink, { color: colors.brand }]}>
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
                  <Text
                    style={[
                      styles.locationLabel,
                      { color: colors.primaryText },
                    ]}
                  >
                    {role === "salon"
                      ? "Salon / Shop Location"
                      : role === "hairdresser"
                        ? "Hair Studio Location"
                        : "Barber Location"}
                  </Text>
                  <View
                    style={[
                      styles.locationBadgeWrap,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="location"
                      size={11}
                      color={colors.brand}
                      style={{ marginRight: 3 }}
                    />
                    <Text
                      style={[styles.locationBadge, { color: colors.brand }]}
                    >{t("auth.pinOnMap") || "Pin on Map"}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={() => setShowMapModal(true)}
                  style={[
                    styles.locationCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: errors.location
                        ? colors.error
                        : colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.locationIconWrap,
                      {
                        backgroundColor: colors.brandSoft,
                        borderColor: colors.brandBorder,
                      },
                    ]}
                  >
                    <Ionicons name="pin" size={19} color={colors.brand} />
                  </View>

                  <View style={styles.locationInfo}>
                    <Text
                      style={[
                        styles.locationText,
                        { color: colors.primaryText },
                      ]}
                      numberOfLines={1}
                    >
                      {isDetectingLocation
                        ? "Detecting current location..."
                        : location || "Tap to pinpoint on map"}
                    </Text>
                    <Text
                      style={[
                        styles.locationCoords,
                        { color: colors.secondaryText },
                      ]}
                      numberOfLines={1}
                    >
                      {coords.latitude
                        ? `${coords.latitude.toFixed(4)}° N, ${coords.longitude.toFixed(4)}° E • Tap to change`
                        : "Tap to select on map"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.changePinBtn,
                      { backgroundColor: colors.brand },
                    ]}
                  >
                    <Ionicons
                      name="map-outline"
                      size={13}
                      color={colors.onBrand}
                      style={{ marginRight: 4 }}
                    />
                    <Text
                      style={[
                        styles.changePinText,
                        { color: colors.onBrand },
                      ]}
                    >{t("auth.change") || "Change"}</Text>
                  </View>
                </TouchableOpacity>

                {errors.location ? (
                  <Text style={[styles.errorText, { color: colors.error }]}>
                    {errors.location}
                  </Text>
                ) : (
                  <Text
                    style={[
                      styles.locationHelper,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {t("auth.tapToPinpoint") || "Tap to pinpoint your exact shop or chair location on the map."}
                  </Text>
                )}
              </View>

              {/* Specialties Input */}
              <InputField
                label={
                  role === "salon"
                    ? (t("auth.servicesSpecialtiesOffered") || "Services & Specialties Offered")
                    : role === "hairdresser"
                      ? "Styles & Specialties Offered"
                      : "Specialties / Cuts Offered"
                }
                iconName="cut-outline"
                placeholder={
                  role === "hairdresser"
                    ? "Box Braids, Locs, Weave Installation"
                    : "Skin Fades, Beard Sculpting, Hot Towel"
                }
                value={specialty}
                onChangeText={(val) => setSpecialty(val)}
                autoCapitalize="words"
              />

              {/* Specialties Dropdown with preset & custom specialties */}
              <SpecialtiesDropdown
                value={specialty}
                onChangeValue={(val) => setSpecialty(val)}
              />

              {/* Mandatory Primary Service for Lead Stylist and Solo Barbers */}
              {((primaryCategory === "salon" && salonSubOption === "manager_lead") ||
                (primaryCategory === "barber" && barberSubOption === "solo")) && (
                <View
                  style={[
                    styles.primaryServiceContainer,
                    {
                      borderColor: colors.border,
                      backgroundColor: "rgba(37, 41, 38, 0.38)",
                    },
                  ]}
                >
                  <View style={styles.serviceHeaderRow}>
                    <Text
                      style={[
                        styles.sectionTitle,
                        { color: colors.primaryText },
                      ]}
                    >
                      {primaryCategory === "salon"
                        ? (t("auth.leadStylistServiceRequired") || "Lead Stylist Primary Service (Required)")
                        : (t("auth.primaryServiceRequired") || "Primary Service (Required)")}
                    </Text>
                    <View
                      style={[
                        styles.serviceRequiredBadge,
                        {
                          backgroundColor: colors.brandSoft,
                          borderColor: colors.brandBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.serviceRequiredBadgeText,
                          { color: colors.brand },
                        ]}
                      >{t("auth.atLeastOneService") || "At least 1 service"}</Text>
                    </View>
                  </View>
                  <Text
                    style={[
                      styles.serviceHelperText,
                      { color: colors.secondaryText },
                    ]}
                  >
                    {t("auth.serviceMinPriceNotice") || "Every active stylist on Trimly must offer at least 1 service. The default minimum price is 1,000 CFA."}
                  </Text>

                  <InputField
                    label={t("auth.primaryServiceName")}
                    iconName="cut-outline"
                    placeholder="e.g. Signature Salon Haircut"
                    value={initialServiceName}
                    onChangeText={(val) => {
                      setInitialServiceName(val);
                      if (errors.initialServiceName) {
                        setErrors((prev) => ({
                          ...prev,
                          initialServiceName: "",
                        }));
                      }
                    }}
                    error={errors.initialServiceName}
                  />

                  <InputField
                    label={t("auth.primaryServicePrice")}
                    iconName="pricetag-outline"
                    placeholder="1000"
                    value={initialServicePrice}
                    onChangeText={(val) => {
                      setInitialServicePrice(val);
                      if (errors.initialServicePrice) {
                        setErrors((prev) => ({
                          ...prev,
                          initialServicePrice: "",
                        }));
                      }
                    }}
                    keyboardType="numeric"
                    error={errors.initialServicePrice}
                  />
                </View>
              )}

              {/* Action Buttons Row */}
              <View style={styles.stepButtonRow}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleGoBack}
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-back"
                    size={16}
                    color={colors.primaryText}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.primaryText },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleNextFromStep2}
                  style={[
                    styles.primaryButtonFlex,
                    { backgroundColor: colors.brand },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.onBrand },
                    ]}
                  >
                    Continue
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={colors.onBrand}
                    style={{ marginLeft: 6 }}
                  />
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
                label={
                  t("auth.confirmPasswordPlaceholder") || "Confirm Password"
                }
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
              <Text style={[styles.termsText, { color: colors.secondaryText }]}>
                By creating an account, you agree to Trimly's{" "}
                <Text style={[styles.termsHighlight, { color: colors.brand }]}>
                  Terms of Service
                </Text>{" "}
                and{" "}
                <Text style={[styles.termsHighlight, { color: colors.brand }]}>
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
                  style={[
                    styles.secondaryButton,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Ionicons
                    name="arrow-back"
                    size={16}
                    color={colors.primaryText}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.primaryText },
                    ]}
                  >
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
                      backgroundColor: colors.brand,
                      opacity: isSubmitting ? 0.7 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <TrimlyLogoLoader size="small" tintColor={colors.onBrand} />
                  ) : (
                    <Text
                      style={[
                        styles.primaryButtonText,
                        { color: colors.onBrand },
                      ]}
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
                title={t("auth.signUpWithGoogle")}
              />
              <SocialButton
                provider="apple"
                onPress={() => handleSocialAuth("apple")}
                title={t("auth.signUpWithApple")}
              />

              {/* Footer */}
              <View style={styles.footerRow}>
                <Text
                  style={[styles.footerPrompt, { color: colors.secondaryText }]}
                >
                  {t("auth.alreadyHaveAccount") || "Already have an account?"}{" "}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push("/(auth)/login")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.footerLink, { color: colors.brand }]}>
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
            setLocation(
              `${picked.latitude.toFixed(4)}, ${picked.longitude.toFixed(4)}`
            );
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    alignItems: "center",
  },
  topNavBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  navBackButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navStepIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navStepText: {
    fontSize: 11.5,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  stepperContainer: {
    width: "100%",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
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
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  stepPillItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepPillDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillDotNum: {
    fontSize: 10.5,
    fontWeight: "800",
  },
  stepPillLabel: {
    fontSize: 12.5,
  },
  stepCard: {
    width: "100%",
    alignItems: "center",
  },
  tier1Wrap: {
    width: "100%",
    gap: 12,
    marginBottom: 18,
  },
  tier1Card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 16,
    gap: 14,
  },
  tier1IconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  tier1Title: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  tier1Subtitle: {
    fontSize: 11.5,
    marginTop: 2,
    lineHeight: 15,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tier2Container: {
    width: "100%",
    marginBottom: 16,
  },
  tier2HeaderLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  tier2Row: {
    width: "100%",
    gap: 10,
    marginBottom: 10,
  },
  tier2OptionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  tier2OptionTitle: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
  tier2OptionDesc: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 14,
  },
  infoCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  craftSelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  craftBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  craftBtnText: {
    fontSize: 12.5,
  },
  linkedInputSection: {
    width: "100%",
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  verifyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  verifyInputBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  verifyTextInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  verifyBtn: {
    height: 48,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  verifyBtnText: {
    fontSize: 13,
    fontWeight: "800",
  },
  fieldErrorText: {
    color: "#EF4444",
    fontSize: 11.5,
    marginTop: 5,
    paddingHorizontal: 2,
    fontWeight: "600",
  },
  fieldHelperText: {
    fontSize: 11.5,
    marginTop: 5,
    paddingHorizontal: 2,
    lineHeight: 16,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: "700",
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
    fontSize: 13.5,
    fontWeight: "600",
  },
  locationBadgeWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  locationBadge: {
    fontSize: 10.5,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 13,
    paddingHorizontal: 14,
    minHeight: 62,
  },
  locationIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 11.5,
    fontWeight: "400",
  },
  changePinBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 10,
  },
  changePinText: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationHelper: {
    fontSize: 11.5,
    marginTop: 6,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 12,
    marginTop: 5,
    paddingHorizontal: 2,
    fontWeight: "500",
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
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonFlex: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 15.5,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 14.5,
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
  primaryServiceContainer: {
    width: "100%",
    marginTop: 6,
    marginBottom: 8,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  serviceRequiredBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  serviceRequiredBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  serviceHelperText: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
});
