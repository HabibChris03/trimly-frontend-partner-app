import AuthDivider from "@/components/auth/AuthDivider";
import AuthHeader from "@/components/auth/AuthHeader";
import InputField from "@/components/auth/InputField";
import { UserRole } from "@/components/auth/RoleSelector";
import SocialButton from "@/components/auth/SocialButton";
import TrimlyLogoLoader from "@/components/ui/TrimlyLogoLoader";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useLanguage } from "@/context/LanguageContext";
import { setActiveMode } from "@/services/api";
import { promptGoogleAuth } from "@/services/googleAuth";

export default function LoginScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { login, loginWithGoogle, logout } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [role] = useState<UserRole>("barber");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});


  const processGoogleLogin = React.useCallback(
    async (token: string, accessToken?: string) => {
      setIsSubmitting(true);
      try {
        const res = await loginWithGoogle(token, role, accessToken);
        if (res?.user?.role === "client") {
          const errMsg =
            "This account is registered as a client. Please use the Trimly Client app to log in.";
          showToast(errMsg, "error");
          logout();
          return;
        }

        const isSalonOwnerOrManager = Boolean(
          res?.user?.role === "salon" ||
          (res?.user as any)?.is_manager ||
          (res?.user as any)?.has_admin_rights
        );
        const isSubBarber = Boolean(
          !isSalonOwnerOrManager &&
          (res?.user?.parent_salon_id || res?.user?.is_sub_barber)
        );

        showToast("Signed in successfully.", "success");

        if (isSubBarber) {
          await setActiveMode("sub-barber");
          router.replace("/(sub-barber)/bookings" as any);
        } else {
          await setActiveMode("barber");
          router.replace("/(barbers)");
        }
      } catch (err: any) {
        logout();
        showToast(err?.message || "Google sign-in failed.", "error");
      } finally {
        setIsSubmitting(false);
      }
    },
    [loginWithGoogle, role, logout, router, showToast]
  );


  const handleSignIn = async () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = "Please enter your email address";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      newErrors.password = "Please enter your password";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setIsSubmitting(true);
      try {
        const res = await login(email.trim(), password);

        if (res?.user?.role === "client") {
          const errMsg =
            "This account is registered as a client. Please use the Trimly Client app to log in.";
          showToast(errMsg, "error");
          setErrors((prev) => ({ ...prev, email: errMsg, general: errMsg }));
          logout();
          return;
        }

        const isSalonOwnerOrManager = Boolean(
          res?.user?.role === "salon" ||
          (res?.user as any)?.is_manager ||
          (res?.user as any)?.has_admin_rights
        );
        const isSubBarber = Boolean(
          !isSalonOwnerOrManager &&
          (res?.user?.parent_salon_id || res?.user?.is_sub_barber)
        );

        if (isSubBarber) {
          await setActiveMode("sub-barber");
          showToast("Signed in as Stylist.", "success");
          router.replace("/(sub-barber)/bookings" as any);
        } else {
          await setActiveMode("barber");
          showToast("Signed in to Salon & Barber workspace.", "success");
          router.replace("/(barbers)");
        }
      } catch (err: any) {
        logout();
        const errorMsg =
          err.message || "Failed to sign in. Please verify your credentials.";
        showToast(errorMsg, "error");
        const lowerErr = errorMsg.toLowerCase();
        if (
          lowerErr.includes("client") ||
          lowerErr.includes("email") ||
          lowerErr.includes("account")
        ) {
          setErrors((prev) => ({ ...prev, email: errorMsg, general: errorMsg }));
        } else {
          setErrors((prev) => ({ ...prev, general: errorMsg }));
        }
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSocialAuth = async (provider: "google" | "apple") => {
    if (provider === "google") {
      try {
        setIsSubmitting(true);
        const res = await promptGoogleAuth();
        if (res.type === "success" && (res.idToken || res.accessToken)) {
          await processGoogleLogin(res.idToken || res.accessToken!, res.accessToken);
        } else if (res.type === "error" && res.error) {
          showToast(res.error, "error");
        }
      } catch (e: any) {
        showToast(e?.message || "Could not launch Google Sign-In", "error");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }
    showToast("Apple sign-in is currently unavailable. Please use Google or email.", "info");
  };

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
          <AuthHeader
            title={t("auth.welcomeBack")}
            subtitle={t("auth.loginSubtitle")}
          />

          {/* Stylist & Barber Salon Linking Tip */}
          <View
            style={[
              styles.salonStaffBanner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.salonStaffIcon,
                { backgroundColor: "rgba(199, 243, 107, 0.12)" },
              ]}
            >
              <Ionicons name="business" size={16} color={colors.brand} />
            </View>
            <Text
              style={[styles.salonStaffText, { color: colors.secondaryText }]}
            >
              {t("auth.salonLoginHelper") || "Stylists working under a salon: Log in with your email to automatically sync your Salon ID floor and bookings."}
            </Text>
          </View>

          <InputField
            label={t("auth.emailPlaceholder")}
            iconName="mail-outline"
            placeholder="barber@example.com"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (errors.email)
                setErrors((prev) => ({ ...prev, email: undefined }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            error={errors.email}
          />

          <InputField
            label={t("auth.passwordPlaceholder")}
            iconName="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (errors.password)
                setErrors((prev) => ({ ...prev, password: undefined }));
            }}
            secureTextEntry
            error={errors.password}
            rightLabelAction={
              <TouchableOpacity
                onPress={() => router.push("/(auth)/forgot-password")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.forgotText, { color: colors.brand }]}>
                  {t("auth.forgotPassword")}
                </Text>
              </TouchableOpacity>
            }
          />

          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleSignIn}
            style={[
              styles.signInButton,
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
                style={[styles.signInButtonText, { color: colors.onBrand }]}
              >
                {t("auth.signInBtn")}
              </Text>
            )}
          </TouchableOpacity>


          <View style={styles.footerRow}>
            <Text
              style={[styles.footerPrompt, { color: colors.secondaryText }]}
            >
              {t("auth.dontHaveAccount")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.footerLink, { color: colors.brand }]}>
                {t("auth.signUp")}
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
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
  signInButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
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
  salonStaffBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 16,
  },
  salonStaffIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  salonStaffText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "500",
  },
});
