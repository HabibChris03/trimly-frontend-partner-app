import InputField from "@/components/auth/InputField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { setActiveMode } from "@/services/api";
import { authService } from "@/services/authService";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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

export default function ForgotPasswordScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { login, logout } = useAuth();

  // Step 1: 'email' (request code), Step 2: 'verify' (enter code & new password)
  const [step, setStep] = useState<"email" | "verify">("email");

  // Form states
  const [email, setEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  // Countdown timer for resending reset code
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            if (interval) clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendCooldown]);

  // Step 1: Send reset code to email
  const handleRequestCode = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrors({ email: "Please enter your email address" });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(cleanEmail)) {
      setErrors({ email: "Please enter a valid email address" });
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    try {
      const res = await authService.forgotPassword(cleanEmail);
      showToast(
        res?.message || "Verification code sent to your email.",
        "success"
      );
      setStep("verify");
      setResendCooldown(60);
    } catch (err: any) {
      const raw = err?.message || "";
      const msg =
        raw && !raw.includes("status") && !raw.includes("500")
          ? raw
          : "Could not send verification code. Please try again shortly.";
      showToast(msg, "error");
      setErrors({ email: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend verification code in Step 2
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isSubmitting) return;

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setStep("email");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.forgotPassword(cleanEmail);
      showToast(
        res?.message || "A new verification code has been sent to your email.",
        "success"
      );
      setResendCooldown(60);
    } catch (err: any) {
      const raw = err?.message || "";
      const msg =
        raw && !raw.includes("status") && !raw.includes("500")
          ? raw
          : "Failed to resend verification code. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Validate code, reset password, and auto-login
  const handleResetAndLogin = async () => {
    const newErrors: {
      code?: string;
      newPassword?: string;
      confirmPassword?: string;
    } = {};
    const cleanCode = resetCode.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanCode) {
      newErrors.code = "Please enter the 6-digit verification code";
    } else if (cleanCode.length < 4) {
      newErrors.code = "Verification code is too short";
    }

    if (!newPassword.trim()) {
      newErrors.newPassword = "Please enter a new password";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters";
    }

    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your new password";
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Reset password on API
      await authService.resetPassword(cleanEmail, cleanCode, newPassword);

      // 2. Automatically log the user in immediately
      try {
        const res = await login(cleanEmail, newPassword);
        showToast("Password reset successfully. Welcome back.", "success");

        const actualRole = (res?.user?.role || "").toLowerCase();
        const hasParentSalon = Boolean(
          res?.user?.parent_salon_id || (res?.user as any)?.staff_title
        );

        if (actualRole === "client") {
          logout();
          showToast(
            "Password reset. This is a client account — please log in via the Trimly Client app.",
            "info"
          );
          router.replace("/(auth)/login");
          return;
        }

        if (
          actualRole === "barber" ||
          actualRole === "salon" ||
          actualRole === "hairdresser"
        ) {
          if (hasParentSalon) {
            await setActiveMode("sub-barber");
            router.replace("/(sub-barber)/bookings" as any);
          } else {
            await setActiveMode("barber");
            router.replace("/(barbers)");
          }
        } else {
          logout();
          router.replace("/(auth)/login");
        }
      } catch {
        showToast(
          "Password reset. Please sign in with your new password.",
          "success"
        );
        router.replace("/(auth)/login");
      }
    } catch (err: any) {
      const raw = err?.message || "";
      let msg =
        "Invalid verification code or reset failed. Please check and try again.";
      if (raw.toLowerCase().includes("expired")) {
        msg = "Verification code has expired. Please request a new code.";
      } else if (
        raw.toLowerCase().includes("invalid") ||
        raw.toLowerCase().includes("code")
      ) {
        msg =
          "Invalid verification code. Please check your email and try again.";
      } else if (raw.toLowerCase().includes("password")) {
        msg = raw;
      } else if (
        raw &&
        !raw.includes("status") &&
        !raw.includes("500") &&
        !raw.includes("error")
      ) {
        msg = raw;
      }
      showToast(msg, "error");
      setErrors((prev) => ({ ...prev, code: msg }));
    } finally {
      setIsSubmitting(false);
    }
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
          {/* Top Back Navigation Bar */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => {
                if (step === "verify") {
                  setStep("email");
                } else {
                  router.push("/(auth)/login");
                }
              }}
              style={[
                styles.backButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.75}
            >
              <Ionicons
                name="chevron-back"
                size={22}
                color={colors.primaryText}
              />
            </TouchableOpacity>
          </View>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons
              name={
                step === "email" ? "key-outline" : "shield-checkmark-outline"
              }
              size={34}
              color={colors.brand}
            />
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.mainTitle, { color: colors.primaryText }]}>
              {step === "email"
                ? t("auth.resetPasswordTitle") || "Reset Password"
                : t("auth.verifyCodeTitle") || "Enter Verification Code"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondaryText }]}>
              {step === "email"
                ? t("auth.resetPasswordSubtitle") ||
                  "Enter your email to receive a 6-digit verification code"
                : t("auth.verifyCodeSubtitle") ||
                  "Enter the 6-digit code sent to your email to reset your password"}
            </Text>
          </View>

          {/* Form Container */}
          <View style={styles.formContainer}>
            {step === "email" ? (
              <>
                <InputField
                  label={t("auth.emailPlaceholder") || "Email address"}
                  iconName="mail-outline"
                  placeholder="partner@example.com"
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

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  onPress={handleRequestCode}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.brand,
                      opacity: isSubmitting ? 0.7 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onBrand} />
                  ) : (
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: colors.onBrand },
                      ]}
                    >
                      {t("auth.sendCodeBtn") || "Send Verification Code"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Email badge chip with edit option */}
                <View
                  style={[
                    styles.emailBadge,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.emailBadgeContent}>
                    <Ionicons name="mail" size={16} color={colors.brand} />
                    <Text
                      style={[
                        styles.emailBadgeText,
                        { color: colors.primaryText },
                      ]}
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setStep("email")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text
                      style={[styles.changeEmailText, { color: colors.brand }]}
                    >
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>

                <InputField
                  label="Verification Code"
                  iconName="key-outline"
                  placeholder="6-digit code (e.g. 123456)"
                  value={resetCode}
                  onChangeText={(val) => {
                    setResetCode(val);
                    if (errors.code)
                      setErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  error={errors.code}
                />

                <InputField
                  label={t("auth.newPasswordPlaceholder") || "New password"}
                  iconName="lock-closed-outline"
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errors.newPassword)
                      setErrors((prev) => ({
                        ...prev,
                        newPassword: undefined,
                      }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.newPassword}
                />

                <InputField
                  label={
                    t("auth.confirmPasswordPlaceholder") ||
                    "Confirm new password"
                  }
                  iconName="lock-closed-outline"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({
                        ...prev,
                        confirmPassword: undefined,
                      }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.confirmPassword}
                />

                <View style={styles.resendContainer}>
                  {resendCooldown > 0 ? (
                    <Text
                      style={[
                        styles.resendCooldownText,
                        { color: colors.secondaryText },
                      ]}
                    >
                      Resend code in{" "}
                      <Text style={{ fontWeight: "700", color: colors.brand }}>
                        {resendCooldown}s
                      </Text>
                    </Text>
                  ) : (
                    <TouchableOpacity
                      onPress={handleResendCode}
                      disabled={isSubmitting}
                      style={styles.resendButton}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.resendText,
                          { color: colors.secondaryText },
                        ]}
                      >
                        Didn't receive the code?{" "}
                        <Text
                          style={{ fontWeight: "700", color: colors.brand }}
                        >
                          Resend Code
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  onPress={handleResetAndLogin}
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor: colors.brand,
                      opacity: isSubmitting ? 0.7 : 1,
                    },
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.onBrand} />
                  ) : (
                    <Text
                      style={[
                        styles.actionButtonText,
                        { color: colors.onBrand },
                      ]}
                    >
                      {t("auth.changePasswordBtn") || "Reset & Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Bottom Footer Link */}
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
    paddingTop: 10,
    paddingBottom: 36,
    alignItems: "center",
  },
  topBar: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
  },
  headerTextContainer: {
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  formContainer: {
    width: "100%",
  },
  emailBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    marginBottom: 16,
  },
  emailBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    marginRight: 10,
  },
  emailBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    flexShrink: 1,
  },
  changeEmailText: {
    fontSize: 13,
    fontWeight: "700",
  },
  resendContainer: {
    alignItems: "center",
    marginVertical: 14,
  },
  resendButton: {
    paddingVertical: 4,
  },
  resendText: {
    fontSize: 13.5,
  },
  resendCooldownText: {
    fontSize: 13.5,
  },
  actionButton: {
    width: "100%",
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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
