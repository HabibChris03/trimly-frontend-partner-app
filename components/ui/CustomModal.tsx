import React, { useState } from "react";
import {
  ActivityIndicator,
  DimensionValue,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import useColors from "@/hooks/usecolor";
import { useLanguage } from "@/context/LanguageContext";

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBg?: string;
  primaryText?: string | null;
  onPrimary?: () => void | Promise<void>;
  primaryDanger?: boolean;
  primaryDisabled?: boolean;
  secondaryText?: string | null;
  onSecondary?: () => void;
  loading?: boolean;
  scrollable?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export function CustomModal({
  visible,
  onClose,
  title,
  description,
  icon,
  iconColor,
  iconBg,
  primaryText,
  onPrimary,
  primaryDanger = false,
  primaryDisabled = false,
  secondaryText,
  onSecondary,
  loading = false,
  scrollable = false,
  cardStyle,
  maxHeight,
  showCloseButton = false,
  children,
}: CustomModalProps) {
  const colors = useColors();
  const [internalLoading, setInternalLoading] = useState(false);
  const langCtx = useLanguage();

  if (!visible) return null;

  const isActionLoading = loading || internalLoading;
  const currentLang = langCtx?.language || "en";

  const defaultConfirm = currentLang === "fr" ? "Confirmer" : "Confirm";
  const defaultCancel = currentLang === "fr" ? "Annuler" : "Cancel";

  const effectivePrimaryText =
    primaryText !== undefined
      ? primaryText
      : children && !onPrimary
      ? null
      : defaultConfirm;

  const effectiveSecondaryText =
    secondaryText !== undefined
      ? secondaryText
      : children && !onSecondary
      ? null
      : defaultCancel;

  const shouldShowClose = showCloseButton || scrollable;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.card,
                  {
                    backgroundColor: colors.card || "#252926",
                    borderColor: colors.border || "#383D38",
                  },
                  scrollable && {
                    maxHeight: maxHeight || Dimensions.get("window").height * 0.85,
                    paddingBottom: 16,
                  },
                  cardStyle,
                ]}
              >
                {shouldShowClose && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={onClose}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={[
                      styles.closeBtn,
                      {
                        backgroundColor: colors.secondarySurface || "#2E332F",
                        borderColor: colors.border || "#383D38",
                      },
                    ]}
                  >
                    <Ionicons name="close" size={18} color={colors.secondaryText} />
                  </TouchableOpacity>
                )}

                {icon ? (
                  <View
                    style={[
                      styles.iconWrapper,
                      {
                        backgroundColor:
                          iconBg ||
                          (primaryDanger
                            ? "rgba(239, 68, 68, 0.14)"
                            : "rgba(199, 243, 107, 0.14)"),
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={26}
                      color={
                        iconColor ||
                        (primaryDanger ? "#EF4444" : colors.brand || "#C7F36B")
                      }
                    />
                  </View>
                ) : null}

                <Text style={[styles.title, { color: colors.primaryText }]}>
                  {title}
                </Text>

                {description ? (
                  <Text style={[styles.description, { color: colors.secondaryText }]}>
                    {description}
                  </Text>
                ) : null}

                {scrollable ? (
                  <ScrollView
                    style={{ width: "100%" }}
                    contentContainerStyle={{ flexGrow: 0, paddingBottom: 10 }}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    nestedScrollEnabled={true}
                  >
                    {children}
                  </ScrollView>
                ) : (
                  children
                )}

                {effectiveSecondaryText || effectivePrimaryText ? (
                  <View style={styles.buttonRow}>
                    {effectiveSecondaryText ? (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isActionLoading}
                        onPress={onSecondary || onClose}
                        style={[
                          styles.btn,
                          styles.secondaryBtn,
                          {
                            backgroundColor: colors.secondarySurface || "#2E332F",
                            borderColor: colors.border || "#383D38",
                            opacity: isActionLoading ? 0.5 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.secondaryBtnText,
                            { color: colors.primaryText },
                          ]}
                        >
                          {effectiveSecondaryText}
                        </Text>
                      </TouchableOpacity>
                    ) : null}

                    {effectivePrimaryText ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        disabled={isActionLoading || primaryDisabled}
                        onPress={async () => {
                          if (isActionLoading || primaryDisabled) return;
                          if (onPrimary) {
                            try {
                              const res = onPrimary();
                              if (res && typeof (res as any).then === "function") {
                                setInternalLoading(true);
                                await res;
                              }
                            } finally {
                              setInternalLoading(false);
                            }
                          }
                          onClose();
                        }}
                        style={[
                          styles.btn,
                          styles.primaryBtn,
                          {
                            backgroundColor: primaryDanger
                              ? "#EF4444"
                              : colors.brand || "#C7F36B",
                            opacity: isActionLoading || primaryDisabled ? 0.4 : 1,
                          },
                        ]}
                      >
                        {isActionLoading ? (
                          <ActivityIndicator
                            size="small"
                            color={primaryDanger ? "#FFFFFF" : colors.onBrand || "#171918"}
                          />
                        ) : (
                          <Text
                            style={[
                              styles.primaryBtnText,
                              {
                                color: primaryDanger
                                  ? "#FFFFFF"
                                  : colors.onBrand || "#171918",
                              },
                            ]}
                          >
                            {effectivePrimaryText}
                          </Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(10, 11, 10, 0.78)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 22,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 14,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  secondaryBtn: {
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryBtn: {},
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  keyboardAvoid: {
    flex: 1,
  },
  closeBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
