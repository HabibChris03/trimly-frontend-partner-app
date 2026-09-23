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
  const isActionLoading = loading || internalLoading;

  if (!visible) return null;

  const effectivePrimaryText =
    primaryText !== undefined
      ? primaryText
      : children && !onPrimary
      ? null
      : "Confirm";

  const effectiveSecondaryText =
    secondaryText !== undefined
      ? secondaryText
      : children && !onSecondary
      ? null
      : "Cancel";

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
                    backgroundColor: colors.surface || "#222620",
                    borderColor: colors.surfacevariant || "#383D33",
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
                    style={styles.closeBtn}
                  >
                    <Ionicons name="close" size={20} color={colors.secondarytext} />
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
                            ? "rgba(239, 68, 68, 0.15)"
                            : "rgba(163, 179, 156, 0.15)"),
                      },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={28}
                      color={
                        iconColor ||
                        (primaryDanger ? "#EF4444" : colors.primary || "#A3B39C")
                      }
                    />
                  </View>
                ) : null}

                <Text style={[styles.title, { color: colors.primarytext }]}>
                  {title}
                </Text>

                {description ? (
                  <Text style={[styles.description, { color: colors.secondarytext }]}>
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

              {(effectiveSecondaryText || effectivePrimaryText) ? (
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
                          backgroundColor: colors.surface,
                          borderColor: colors.surfacevariant,
                          opacity: isActionLoading ? 0.5 : 1,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.secondaryBtnText,
                          { color: colors.secondarytext },
                        ]}
                      >
                        {effectiveSecondaryText}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {effectivePrimaryText ? (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={isActionLoading}
                      onPress={async () => {
                        if (isActionLoading) return;
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
                            : colors.primary || "#A3B39C",
                          opacity: isActionLoading ? 0.75 : 1,
                        },
                      ]}
                    >
                      {isActionLoading ? (
                        <ActivityIndicator
                          size="small"
                          color={primaryDanger ? "#FFFFFF" : "#1C1E1B"}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.primaryBtnText,
                            {
                              color: primaryDanger
                                ? "#FFFFFF"
                                : colors.background || "#181B16",
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 15,
  },
  iconWrapper: {
    width: 58,
    height: 58,
    borderRadius: 20,
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
    gap: 12,
    width: "100%",
    marginTop: 4,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
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
    top: 16,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
});
