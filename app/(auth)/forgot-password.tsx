import InputField from "@/components/auth/InputField";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useToast } from "@/context/ToastContext";
import useColors from "@/hooks/usecolor";
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ForgotPasswordScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { login } = useAuth();

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
      showToast(res?.message || "Verification code sent to your email.", "success");
      setStep("verify");
      setResendCooldown(60);
    } catch (err: any) {
      const raw = err?.message || "";
      const msg = raw && !raw.includes("status") && !raw.includes("500")
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
      showToast(res?.message || "A new verification code has been sent to your email.", "success");
      setResendCooldown(60);
    } catch (err: any) {
      const raw = err?.message || "";
      const msg = raw && !raw.includes("status") && !raw.includes("500")
        ? raw
        : "Failed to resend verification code. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Validate code, reset password, and auto-login
  const handleResetAndLogin = async () => {
    const newErrors: { code?: string; newPassword?: string; confirmPassword?: string } = {};
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
        showToast("Password reset successfully! Welcome back.", "success");

        const actualRole = (res?.user?.role || "").toLowerCase();
        const hasParentSalon = Boolean(
          res?.user?.parent_salon_id || (res?.user as any)?.staff_title
        );

        if (actualRole === "barber" || actualRole === "salon" || actualRole === "hairdresser") {
          if (hasParentSalon) {
            await setActiveMode("sub-barber");
            router.replace("/(sub-barber)/bookings" as any);
          } else {
            await setActiveMode("barber");
            router.replace("/(barbers)");
          }
        } else {
          await setActiveMode("barber");
          router.replace("/(barbers)");
        }
      } catch {
        // In case auto-login fails, redirect gracefully to login
        showToast("Password reset! Please sign in with your new password.", "success");
        router.replace("/(auth)/login");
      }
    } catch (err: any) {
      const raw = err?.message || "";
      let msg = "Invalid verification code or reset failed. Please check and try again.";
      if (raw.toLowerCase().includes("expired")) {
        msg = "Verification code has expired. Please request a new code.";
      } else if (raw.toLowerCase().includes("invalid") || raw.toLowerCase().includes("code")) {
        msg = "Invalid verification code. Please check your email and try again.";
      } else if (raw.toLowerCase().includes("password")) {
        msg = raw;
      } else if (raw && !raw.includes("status") && !raw.includes("500") && !raw.includes("error")) {
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
                  backgroundColor: colors.surface,
                  borderColor: colors.inputBorder || colors.surfacevariant,
                },
              ]}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color={colors.primarytext} />
            </TouchableOpacity>
          </View>

          {/* Icon Badge */}
          <View
            style={[
              styles.iconCircle,
              {
                backgroundColor: colors.surface,
                borderColor: colors.inputBorder || colors.surfacevariant,
              },
            ]}
          >
            <Ionicons
              name={step === "email" ? "key-outline" : "shield-checkmark-outline"}
              size={36}
              color={colors.primary}
            />
          </View>

          {/* Screen Title & Subtitle */}
          <View style={styles.headerTextContainer}>
            <Text style={[styles.mainTitle, { color: colors.primarytext }]}>
              {step === "email"
                ? t("auth.resetPasswordTitle") || "Reset Password"
                : t("auth.verifyCodeTitle") || "Enter Verification Code"}
            </Text>
            <Text style={[styles.subtitle, { color: colors.secondarytext }]}>
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
              /* STEP 1: EMAIL REQUEST */
              <>
                <InputField
                  label={t("auth.emailPlaceholder") || "Email address"}
                  iconName="mail-outline"
                  placeholder="user@example.com"
                  value={email}
                  onChangeText={(val) => {
                    setEmail(val);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  error={errors.email}
                />

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  onPress={handleRequestCode}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: colors.background }]}>
                      {t("auth.sendCodeBtn") || "Send Verification Code"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              /* STEP 2: VERIFICATION CODE & NEW PASSWORD */
              <>
                {/* Email badge chip with edit option */}
                <View
                  style={[
                    styles.emailBadge,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.inputBorder || colors.surfacevariant,
                    },
                  ]}
                >
                  <View style={styles.emailBadgeContent}>
                    <Ionicons name="mail" size={16} color={colors.primary} />
                    <Text
                      style={[styles.emailBadgeText, { color: colors.primarytext }]}
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setStep("email")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.changeEmailText, { color: colors.primary }]}>
                      Change
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* 6-Digit Code */}
                <InputField
                  label="Verification Code"
                  iconName="key-outline"
                  placeholder="6-digit code (e.g. 123456)"
                  value={resetCode}
                  onChangeText={(val) => {
                    setResetCode(val);
                    if (errors.code) setErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  error={errors.code}
                />

                {/* New Password */}
                <InputField
                  label={t("auth.newPasswordPlaceholder") || "New password"}
                  iconName="lock-closed-outline"
                  placeholder="••••••••"
                  value={newPassword}
                  onChangeText={(val) => {
                    setNewPassword(val);
                    if (errors.newPassword)
                      setErrors((prev) => ({ ...prev, newPassword: undefined }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.newPassword}
                />

                {/* Confirm New Password */}
                <InputField
                  label={t("auth.confirmPasswordPlaceholder") || "Confirm new password"}
                  iconName="lock-closed-outline"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={(val) => {
                    setConfirmPassword(val);
                    if (errors.confirmPassword)
                      setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  error={errors.confirmPassword}
                />

                {/* Resend Code Section */}
                <View style={styles.resendContainer}>
                  {resendCooldown > 0 ? (
                    <Text style={[styles.resendCooldownText, { color: colors.secondarytext }]}>
                      Resend code in{" "}
                      <Text style={{ fontWeight: "700", color: colors.primary }}>
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
                      <Text style={[styles.resendText, { color: colors.secondarytext }]}>
                        Didn't receive the code?{" "}
                        <Text style={{ fontWeight: "700", color: colors.primary }}>
                          Resend Code
                        </Text>
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Submit Reset & Auto-Login Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmitting}
                  onPress={handleResetAndLogin}
                  style={[styles.actionButton, { backgroundColor: colors.primary }]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.background} />
                  ) : (
                    <Text style={[styles.actionButtonText, { color: colors.background }]}>
                      {t("auth.changePasswordBtn") || "Reset & Sign In"}
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {/* Bottom Footer Link */}
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
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
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
    fontWeight: "800",
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
    borderRadius: 14,
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
    height: 54,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    elevation: 3,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
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