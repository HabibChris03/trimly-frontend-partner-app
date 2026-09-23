import React from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
}: BottomSheetProps) {
  const { colors, radius, spacing, typography, shadows } = useTheme();

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.card,
                  borderTopLeftRadius: radius["2xl"],
                  borderTopRightRadius: radius["2xl"],
                  padding: spacing.xl,
                },
                shadows.modal,
              ]}
            >
              <View style={styles.handleContainer}>
                <View
                  style={[
                    styles.handle,
                    { backgroundColor: colors.border, borderRadius: radius.full },
                  ]}
                />
              </View>

              {title && (
                <Text
                  style={[
                    styles.title,
                    {
                      color: colors.primaryText,
                      fontFamily: typography.fontFamily.bold,
                      marginBottom: spacing.md,
                    },
                  ]}
                >
                  {title}
                </Text>
              )}

              {children}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "85%",
    minHeight: 200,
  },
  handleContainer: {
    alignItems: "center",
    marginBottom: 12,
  },
  handle: {
    width: 44,
    height: 5,
  },
  title: {
    fontSize: 18,
    textAlign: "center",
  },
});

export default BottomSheet;
