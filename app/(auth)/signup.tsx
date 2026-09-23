import AuthDivider from "@/components/auth/AuthDivider";
import AuthHeader from "@/components/auth/AuthHeader";
import InputField from "@/components/auth/InputField";
import RoleSelector, { UserRole } from "@/components/auth/RoleSelector";
import SocialButton from "@/components/auth/SocialButton";
import useColors from "@/hooks/usecolor";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import SpecialtiesDropdown from "@/components/auth/SpecialtiesDropdown";
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
  const [location, setLocation] = useState("");
  const [specialty, setSpecialty] = useState("");

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
        loginWithGoogle(token, role)
          .then(() => {
            showToast("Account created with Google successfully! 🎉", "success");
            router.replace("/(barbers)");
          })
          .catch((err: any) => {
            showToast(err?.message || "Google registration failed.", "error");
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      }
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
      newErrors.businessName = role === "salon" ? "Please enter your salon or shop name" : "Please enter your brand or business name";
    }

    if (!location.trim()) {
      newErrors.location = "Please enter your location or address";
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
          latitude: 4.0511,
          longitude: 9.7679,
        });

        // Persist entered specialty and location to profile
        if (specialty || location) {
          await barberService.updateProfileDetails({
            about_us: specialty ? `Specialties: ${specialty}` : undefined,
            city: location || undefined,
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

  const handleSocialAuth = (provider: "google" | "apple") => {
    if (provider === "google") {
      promptAsync();
    } else {
      showToast("Apple sign-up is currently unavailable. Please use Google or email.", "info");
    }
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
            label={role === "salon" ? "Salon or Shop Name" : "Brand or Business Name"}
            iconName="business-outline"
            placeholder={role === "salon" ? "e.g. VIP Barber Studio" : "e.g. Habib Hair Studio"}
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
            placeholder="barber@trimly237.com"
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

          {/* Location & Specialties */}
          <InputField
            label="Location / Address"
            iconName="location-outline"
            placeholder="Rond-Point Damas, Entree Frazati"
            value={location}
            onChangeText={(val) => {
              setLocation(val);
              if (errors.location)
                setErrors((prev) => ({ ...prev, location: "" }));
            }}
            autoCapitalize="words"
            error={errors.location}
          />

          <InputField
            label={role === "salon" ? "Services & Specialties Offered" : "Specialties / Cuts Offered"}
            iconName="cut-outline"
            placeholder="Skin Fades, Beard Sculpting, Hot Towel"
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
