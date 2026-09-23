import React, { useState, useEffect } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import useColors from "@/hooks/usecolor";

export interface TutorialStep {
  title: string;
  badge?: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  tip?: string;
}

export interface PageTutorialModalProps {
  screenKey: string;
  title: string;
  subtitle?: string;
  steps: TutorialStep[];
  visible?: boolean;
  onClose?: () => void;
  autoTrigger?: boolean;
}

const STORAGE_PREFIX = "trimly_tutorial_seen_";

async function isTutorialSeen(key: string): Promise<boolean> {
  try {
    if (Platform.OS === "web") {
      return localStorage.getItem(STORAGE_PREFIX + key) === "true";
    }
    const val = await SecureStore.getItemAsync(STORAGE_PREFIX + key);
    return val === "true";
  } catch {
    return false;
  }
}

async function markTutorialSeen(key: string): Promise<void> {
  try {
    if (Platform.OS === "web") {
      localStorage.setItem(STORAGE_PREFIX + key, "true");
    } else {
      await SecureStore.setItemAsync(STORAGE_PREFIX + key, "true");
    }
  } catch {}
}

export function PageTutorialModal({
  screenKey,
  title,
  subtitle,
  steps,
  visible: controlledVisible,
  onClose,
  autoTrigger = true,
}: PageTutorialModalProps) {
  const colors = useColors();
  const [internalVisible, setInternalVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isControlled = controlledVisible !== undefined;
  const isModalVisible = isControlled ? controlledVisible : internalVisible;

  useEffect(() => {
    if (autoTrigger && !isControlled) {
      isTutorialSeen(screenKey).then((seen) => {
        if (!seen) {
          setInternalVisible(true);
        }
      });
    }
  }, [screenKey, autoTrigger, isControlled]);

  useEffect(() => {
    if (isModalVisible) {
      setCurrentStep(0);
    }
  }, [isModalVisible]);

  const handleClose = async () => {
    await markTutorialSeen(screenKey);
    if (!isControlled) {
      setInternalVisible(false);
    }
    onClose?.();
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      await handleClose();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!isModalVisible || !steps || steps.length === 0) {
    return null;
  }

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Modal
      visible={isModalVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfacevariant,
            },
          ]}
        >
          {/* Top Bar with Step Counter & Close Button */}
          <View style={styles.topBar}>
            <View
              style={[
                styles.stepCounterBadge,
                { backgroundColor: "rgba(163, 179, 156, 0.15)" },
              ]}
            >
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text
                style={[styles.stepCounterText, { color: colors.primary }]}
              >
                Guide • Step {currentStep + 1} of {steps.length}
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleClose}
              style={[
                styles.closeButton,
                { backgroundColor: colors.background },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.primarytext} />
            </TouchableOpacity>
          </View>

          {/* Progress Indicators */}
          <View style={styles.progressRow}>
            {steps.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.progressPill,
                  {
                    backgroundColor:
                      idx === currentStep
                        ? colors.primary
                        : idx < currentStep
                        ? colors.surfacevariant
                        : colors.surfacevariant,
                    width: idx === currentStep ? 24 : 8,
                    opacity: idx === currentStep ? 1 : 0.4,
                  },
                ]}
              />
            ))}
          </View>

          {/* Page Title Context */}
          <View style={styles.headerInfo}>
            <Text style={[styles.pageTitle, { color: colors.primarytext }]}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[styles.pageSubtitle, { color: colors.secondarytext }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>

          {/* Step Hero Visual & Content */}
          <View
            style={[
              styles.stepHeroCard,
              {
                backgroundColor: colors.background,
                borderColor: colors.surfacevariant,
              },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: "rgba(163, 179, 156, 0.18)" },
              ]}
            >
              <Ionicons name={step.icon} size={32} color={colors.primary} />
            </View>

            {step.badge ? (
              <View
                style={[
                  styles.highlightBadge,
                  { backgroundColor: "rgba(163, 179, 156, 0.2)" },
                ]}
              >
                <Text
                  style={[styles.highlightBadgeText, { color: colors.primary }]}
                >
                  {step.badge}
                </Text>
              </View>
            ) : null}

            <Text style={[styles.stepTitle, { color: colors.primarytext }]}>
              {step.title}
            </Text>

            <Text
              style={[styles.stepDescription, { color: colors.secondarytext }]}
            >
              {step.description}
            </Text>

            {step.tip ? (
              <View
                style={[
                  styles.proTipBox,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfacevariant,
                  },
                ]}
              >
                <Ionicons name="bulb-outline" size={16} color="#F59E0B" />
                <Text
                  style={[styles.proTipText, { color: colors.primarytext }]}
                >
                  <Text style={{ fontWeight: "700", color: "#F59E0B" }}>
                    Pro Tip:{" "}
                  </Text>
                  {step.tip}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Action Buttons Row */}
          <View style={styles.actionsRow}>
            {currentStep > 0 ? (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleBack}
                style={[
                  styles.backBtn,
                  { borderColor: colors.surfacevariant },
                ]}
              >
                <Ionicons
                  name="arrow-back"
                  size={16}
                  color={colors.primarytext}
                />
                <Text
                  style={[styles.backBtnText, { color: colors.primarytext }]}
                >
                  Back
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleClose}
                style={styles.skipBtn}
              >
                <Text
                  style={[styles.skipBtnText, { color: colors.secondarytext }]}
                >
                  Skip Tour
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleNext}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.nextBtnText}>
                {isLastStep ? "Got It, Let's Go! 🚀" : "Next Step"}
              </Text>
              {!isLastStep && (
                <Ionicons name="arrow-forward" size={16} color="#1C1E1B" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  stepCounterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepCounterText: {
    fontSize: 12,
    fontWeight: "700",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 14,
  },
  progressPill: {
    height: 4,
    borderRadius: 2,
  },
  headerInfo: {
    marginBottom: 14,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  stepHeroCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  highlightBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginBottom: 8,
  },
  highlightBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  proTipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    marginTop: 12,
    width: "100%",
  },
  proTipText: {
    flex: 1,
    fontSize: 11.5,
    lineHeight: 16,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
  },
  nextBtnText: {
    color: "#1C1E1B",
    fontSize: 14,
    fontWeight: "800",
  },
});
