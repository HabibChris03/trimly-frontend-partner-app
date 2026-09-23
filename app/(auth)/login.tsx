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
import { setActiveMode } from "@/services/api";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = "446635548067-l57kdu46j2if0pd3rke70hsks4kibq03.apps.googleusercontent.com";

export default function LoginScreen() {
  const colors = useColors();
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();

  const [role, setRole] = useState<UserRole>("barber");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>(
    {},
  );

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
          .then(async (res) => {
            const isSubBarber = Boolean(
              res?.user?.parent_salon_id ||
              res?.user?.is_sub_barber ||
              (res?.user as any)?.staff_title
            );

            if (res?.user?.role === "client" && !isSubBarber) {
              showToast("This account is not registered as a barber or affiliated with any salon.", "error");
              return;
            }

            showToast("Signed in successfully! 🎉", "success");

            if (isSubBarber) {
              await setActiveMode("sub-barber");
              router.replace("/(sub-barber)/bookings" as any);
            } else {
              await setActiveMode("barber");
              router.replace("/(barbers)");
            }
          })
          .catch((err: any) => {
            showToast(err?.message || "Google sign-in failed.", "error");
          })
          .finally(() => {
            setIsSubmitting(false);
          });
      }
    }
  }, [response]);

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
        const isSubBarber = Boolean(
          res?.user?.parent_salon_id ||
          res?.user?.is_sub_barber ||
          (res?.user as any)?.staff_title
        );

        if (res?.user?.role === "client" && !isSubBarber) {
          const errMsg = "This account is registered as a client and is not affiliated with any salon. Please use the Trimly Client app.";
          showToast(errMsg, "error");
          setErrors((prev) => ({ ...prev, general: errMsg }));
          return;
        }

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
        const errorMsg = err.message || "Failed to sign in. Please verify your credentials.";
        showToast(errorMsg, "error");
        setErrors((prev) => ({ ...prev, general: errorMsg }));
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSocialAuth = (provider: "google" | "apple") => {
    if (provider === "google") {
      if (__DEV__) {
        console.log("==========================================");
        console.log("GOOGLE REQUEST REDIRECT URI:", request?.redirectUri);
        console.log("==========================================");
      }
      promptAsync();
    } else {
      showToast("Apple sign-in is currently unavailable. Please use Google or email.", "info");
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
            title={t("auth.welcomeBack")}
            subtitle={t("auth.loginSubtitle")}
          />

          {/* Form Fields */}
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
                <Text style={[styles.forgotText, { color: colors.primary }]}>
                  {t("auth.forgotPassword")}
                </Text>
              </TouchableOpacity>
            }
          />

          {/* Primary Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={isSubmitting}
            onPress={handleSignIn}
            style={[
              styles.signInButton,
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
                style={[styles.signInButtonText, { color: colors.primarytext }]}
              >
                {t("auth.signInBtn")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <AuthDivider text="or" />

          {/* Social Auth Buttons */}
          <SocialButton
            provider="google"
            onPress={() => handleSocialAuth("google")}
          />
          <SocialButton
            provider="apple"
            onPress={() => handleSocialAuth("apple")}
          />

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text
              style={[styles.footerPrompt, { color: colors.secondarytext }]}
            >
              {t("auth.dontHaveAccount")}{" "}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/signup")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[styles.footerLink, { color: colors.primary }]}>
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
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 28,
    alignItems: "center",
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "600",
  },
  signInButton: {
    width: "100%",
    height: 45,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  signInButtonText: {
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
